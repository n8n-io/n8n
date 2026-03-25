/*
 * This software is licensed under the MIT License.
 *
 * Copyright Fedor Indutny, 2015.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

const http = require('http');
const url = require('url');

const ocsp = require('@techteamer/ocsp');
const rfc2560 = require('asn1.js-rfc2560');

const SnowflakeUtil = require('../util');
const CertUtil = require('./cert_util');
const GlobalConfig = require('../global_config');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;

const Logger = require('../logger');

/**
 * OCSP specific HTTP retryable errors
 * @param statusCode
 * @returns {boolean}
 */
const isRetryableHttpError = function (statusCode) {
  return (statusCode >= 500 && statusCode < 600) ||
    statusCode === 404 || statusCode === 403 || statusCode === 408;
};

function getResponse(uri, req, cb) {
  uri = url.parse(uri);

  const timeout = process.env.SF_OCSP_TEST_OCSP_RESPONDER_TIMEOUT || 10000;
  const options = Object.assign({
    timeout: Number(timeout),
    method: 'POST',
    headers: {
      'Content-Type': 'application/ocsp-request',
      'Content-Length': req.length,
    }
  }, uri);

  function done(err, response) {
    if (cb) {
      cb(err, response);
    }
    cb = null;
  }

  function onResponse(response) {
    if (response.statusCode < 200 || response.statusCode >= 400) {
      return done(
        Errors.createOCSPError(ErrorCodes.ERR_OCSP_FAILED_OBTAIN_OCSP_RESPONSE,
          response.statusCode), response);
    }

    const chunks = [];
    response.on('readable', function () {
      const chunk = response.read();
      if (!chunk) {
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', function () {
      Logger.getInstance().debug('Finish OCSP responder: %s', uri.host);
      const ocsp = Buffer.concat(chunks);
      done(null, ocsp);
    });
  }

  const httpRequest = http.request(options, onResponse);
  httpRequest.on('error', function (e) {
    if (cb) {
      cb(e);
    }
    cb = null;
  });
  httpRequest.on('timeout', function () {
    httpRequest.abort();
    Logger.getInstance().debug('Timeout OCSP responder: %s', uri.host);
    if (cb) {
      cb(Errors.createOCSPError(ErrorCodes.ERR_OCSP_RESPONDER_TIMEOUT));
    }
    cb = null;
  });
  httpRequest.end(req);
}

module.exports = function check(options, cb, mock) {
  let sync = true;
  const isFailClosed = GlobalConfig.getOcspMode() === GlobalConfig.ocspModes.FAIL_CLOSED;
  const maxNumRetries = isFailClosed ? 2 : 1;

  function done(err, data) {
    if (sync) {
      sync = false;
      process.nextTick(function () {
        cb(err, data);
      });
      return;
    }

    cb(err, data);
  }

  let req;
  try {
    req = mock ? mock.req : ocsp.request.generate(options.cert, options.issuer);
  } catch (e) {
    return done(e);
  }

  const ocspMethod = rfc2560['id-pkix-ocsp'].join('.');

  let numRetries = 1;
  let sleep = 1;

  function ocspResponseVerify(err, raw) {
    let retry = false;
    if (err) {
      if (Object.prototype.hasOwnProperty.call(err, 'code') && err.code === ErrorCodes.ERR_OCSP_RESPONDER_TIMEOUT) {
        retry = true;
      } else if (Object.prototype.hasOwnProperty.call(err, 'message')) {
        const errorMessage = err.message.split(' ');
        if (errorMessage.length === 0) {
          return done(err);
        }
        try {
          const statusCode = parseInt(errorMessage[errorMessage.length - 1], 10);
          retry = isRetryableHttpError(statusCode);
        } catch (e) {
          // ignore
        }
      }
      if (numRetries < maxNumRetries && retry) {
        numRetries++;
        sleep = SnowflakeUtil.nextSleepTime(1, 10, sleep);
        setTimeout(ocspRequestSend, sleep * 1000);
      } else {
        Logger.getInstance().debug('Failed to all retries to OCSP responder.');
        return done(err);
      }
    } else {
      const status = CertUtil.verifyOCSPResponse(req.issuer, raw);
      done(status.err, status);
    }
  }

  function setOcspResponderUrl(uri) {
    let parsedUrl = require('url').parse(process.env.SF_OCSP_RESPONSE_CACHE_SERVER_URL);

    let targetUrl;
    if (parsedUrl.port) {
      targetUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}:${parsedUrl.port}/retry`;
    } else {
      targetUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/retry`;
    }

    const b64data = req.data.toString('base64');
    parsedUrl = require('url').parse(uri);

    process.env.SF_OCSP_RESPONDER_URL = targetUrl + '/' + parsedUrl.hostname + '/' + b64data;
  }

  function ocspRequestCallback(err, uri) {
    if (err) {
      //This error message is from @techteamer/ocsp (ocsp.utils.getAuthorityInfo)
      if (err.message === 'AuthorityInfoAccess not found in extensions') {
        if (!isFailClosed) {
          Logger.getInstance().debug('OCSP Responder URL is missing from the certificate.');
          return done(null);
        } else {
          Logger.getInstance().error('OCSP Responder URL is missing from the certificate, so cannot verify with OCSP. Aborting connection attempt due to OCSP being set to FAIL_CLOSE https://docs.snowflake.com/en/user-guide/ocsp#fail-close');
        }
      }
      return done(err);
    }

    if (process.env.SF_OCSP_RESPONSE_CACHE_SERVER_URL &&
      process.env.SF_OCSP_RESPONSE_CACHE_SERVER_URL.includes('ocsp_response_cache.json')) {
      setOcspResponderUrl(uri);
    }

    const responderUrl = process.env.SF_OCSP_RESPONDER_URL;
    if (responderUrl) {
      uri = responderUrl;
    }
    Logger.getInstance().trace(
      'Contact OCSP responder: %s, (%s/%s)', uri, numRetries, maxNumRetries);

    if (!mock) {
      getResponse(uri, req.data, ocspResponseVerify);
    }
  }

  function ocspRequestSend() {
    if (!mock) {
      ocsp.utils.getAuthorityInfo(req.cert, ocspMethod, ocspRequestCallback);
    } else {
      ocspRequestCallback(null, mock.uri);
    }
  }

  ocspRequestSend();

  sync = false;
};