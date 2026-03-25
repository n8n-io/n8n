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

const process = require('process');
const ocsp = require('@techteamer/ocsp');
const rfc2560 = require('asn1.js-rfc2560');
const rfc5280 = require('asn1.js-rfc5280');
const crypto = require('crypto');
const bn = require('bn.js');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;


const TOLERABLE_VALIDITY_RANGE_RATIO = 0.01;
const MAX_CLOCK_SKEW_IN_MILLISECONDS = 900000;
const MIN_CACHE_WARMUP_TIME_IN_MILLISECONDS = 18000000;

/**
 * Builds the certificate id for a given certificate.
 *
 * @param cert
 * @returns {*}
 */
exports.buildCertId = function (cert) {
  let issuer = cert.issuerCertificate;
  cert = cert.raw;

  try {
    cert = rfc5280.Certificate.decode(cert, 'der');
    if (issuer) {
      issuer = issuer.raw;
      issuer = rfc5280.Certificate.decode(issuer, 'der');
    }
  } catch (e) {
    return null; // if we encountered an error during decoding, return null
  }

  const tbsCert = cert.tbsCertificate;
  const tbsIssuer = issuer.tbsCertificate;

  const certID = {
    hashAlgorithm: {
      // algorithm: [ 2, 16, 840, 1, 101, 3, 4, 2, 1 ]  // sha256
      algorithm: [1, 3, 14, 3, 2, 26]  // sha1
    },
    issuerNameHash: sha1(rfc5280.Name.encode(tbsCert.issuer, 'der')),
    issuerKeyHash: sha1(
      tbsIssuer.subjectPublicKeyInfo.subjectPublicKey.data),
    serialNumber: tbsCert.serialNumber
  };
  const certIDDer = rfc2560.CertID.encode(certID, 'der');
  return encodeKey(certIDDer.toString('BASE64'));
};

function sha1(data) {
  return crypto.createHash('sha1').update(data).digest();
}

/**
 * Parses a certificate and returns an object that contains decoded versions
 * of the certificate and its issuer.
 *
 * Note: this method might throw an error, so use a try-catch when calling it.
 *
 * @param cert
 * @returns {{cert: *, issuer: *}}
 */
exports.decode = function (cert) {
  let issuer = cert.issuerCertificate;
  cert = cert.raw;

  // note: this block might throw an error
  cert = rfc5280.Certificate.decode(cert, 'der');
  if (issuer) {
    issuer = issuer.raw;
    issuer = rfc5280.Certificate.decode(issuer, 'der');
  }

  return {
    cert: cert,
    issuer: issuer
  };
};

/**
 * Encode certID to a cache key
 * @param base64Key {Object}
 * @return cache key {string}
 */
const encodeKey = function (base64Key) {
  const buff = Buffer.from(base64Key, 'base64');
  const certID = rfc2560.CertID.decode(buff, 'der');

  return certID.issuerNameHash.toString('BASE64')
    + '#' + certID.issuerKeyHash.toString('BASE64')
    + '#' + certID.serialNumber.toString(10);
};
exports.encodeKey = encodeKey;

/**
 * Encode certID to a cache key
 * @param cacheKey {Object}
 */
const decodeKey = function (cacheKey) {
  // serialNumber.eq(certID.serialNumber)
  const keys = cacheKey.split('#');
  const issuerNameHash = Buffer.from(keys[0], 'base64');
  const issuerKeyHash = Buffer.from(keys[1], 'base64');
  const serialNumber = new bn(keys[2], 10);

  const certID = {
    hashAlgorithm: {
      // algorithm: [ 2, 16, 840, 1, 101, 3, 4, 2, 1 ]  // sha256
      algorithm: [1, 3, 14, 3, 2, 26]  // sha1
    },
    issuerNameHash: issuerNameHash,
    issuerKeyHash: issuerKeyHash,
    serialNumber: serialNumber
  };

  const certIDDer = rfc2560.CertID.encode(certID, 'der');
  return certIDDer.toString('BASE64');
};
exports.decodeKey = decodeKey;

/**
 * Calculates Tolerable validity
 * @param thisUpdate last update
 * @param nextUpdate next update
 * @returns {number}
 */
const calculateTolerableVadility = function (thisUpdate, nextUpdate) {
  const currentRange = (nextUpdate - thisUpdate) *
    TOLERABLE_VALIDITY_RANGE_RATIO;
  return currentRange > MIN_CACHE_WARMUP_TIME_IN_MILLISECONDS ?
    currentRange : MIN_CACHE_WARMUP_TIME_IN_MILLISECONDS;
};

/**
 * Checks the validity
 * @param currentTime current time
 * @param thisUpdate last update
 * @param nextUpdate next update
 * @return {boolean}
 */
const isValidityRange = function (currentTime, thisUpdate, nextUpdate) {
  const tolerableValidity = calculateTolerableVadility(thisUpdate, nextUpdate);
  return thisUpdate - MAX_CLOCK_SKEW_IN_MILLISECONDS <= currentTime &&
    currentTime <= nextUpdate + tolerableValidity;
};
exports.isValidityRange = isValidityRange;

/**
 * Converts a epoch time in milliseconds to a UTC datetime string
 * @param epochInMilliSeconds
 * @returns {Date}
 */
const toUTCString = function (epochInMilliSeconds) {
  return new Date(epochInMilliSeconds);
};

/**
 * Return issuer certificate or signing certificate
 * @param issuer issuer certificate
 * @param certs
 * @param raws
 */
const findResponder = function (issuer, certs, raws) {
  let issuerKey = issuer.tbsCertificate.subjectPublicKeyInfo;
  issuerKey = ocsp.utils.toPEM(
    rfc5280.SubjectPublicKeyInfo.encode(issuerKey, 'der'), 'PUBLIC KEY');
  if (certs.length > 0) {
    const currentTime = Date.now();
    const cert = certs[0];
    const certValidity = cert.tbsCertificate.validity;
    if (certValidity.notAfter.value < currentTime || certValidity.notBefore.value > currentTime) {
      return {
        err: Errors.createOCSPError(
          ErrorCodes.ERR_OCSP_INVALID_CERTIFICATE_VALIDITY,
          'Valid from:', toUTCString(certValidity.notBefore.value),
          ', Valid to:', toUTCString(certValidity.notAfter.value)),
        responderKey: null
      };
    }
    const signAlg = ocsp.utils.sign[cert.signatureAlgorithm.algorithm.join('.')];
    if (!signAlg) {
      return {
        err: Errors.createOCSPError(ErrorCodes.ERR_OCSP_NO_SIGNATURE_ALGORITHM),
        responderKey: null
      };
    }

    const verify = crypto.createVerify(signAlg);

    verify.update(raws[0]);
    if (!verify.verify(issuerKey, cert.signature.data)) {
      return {
        err: Errors.createOCSPError(ErrorCodes.ERR_OCSP_INVALID_SIGNATURE),
        responderKey: null
      };
    }

    let certKey = cert.tbsCertificate.subjectPublicKeyInfo;
    certKey = ocsp.utils.toPEM(
      rfc5280.SubjectPublicKeyInfo.encode(certKey, 'der'), 'PUBLIC KEY');
    return { err: null, responderKey: certKey };
  }

  return { err: null, responderKey: issuerKey };
};

/**
 * Verify OCSP response. If issuer is not specified, the signature will not be
 * verified.
 * @param issuer issuer certificate
 * @param rawRes OCSP Response
 * @returns {{success, error, revoked}|{res, success, error}}
 */
const verifyOCSPResponse = function (issuer, rawRes) {
  function done(err) {
    return {
      err: err,
      res: rawRes
    };
  }

  let res;
  try {
    res = ocsp.utils.parseResponse(rawRes);
  } catch (e) {
    return done(e);
  }
  const value = res.value;
  if (issuer) {
    // verify signature only if issuer is given
    const certs = res.certs;
    const rawTBS = rawRes.slice(res.start, res.end);
    const raws = res.certsTbs.map(function (tbs) {
      return rawRes.slice(tbs.start, tbs.end);
    });
    const signAlg = ocsp.utils.sign[value.signatureAlgorithm.algorithm.join('.')];
    if (!signAlg) {
      return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_NO_SIGNATURE_ALGORITHM));
    }
    const responderStatus = findResponder(issuer, certs, raws);
    if (responderStatus.err) {
      return done(responderStatus.err);
    }
    const responderKey = responderStatus.responderKey;
    const v = crypto.createVerify(signAlg);
    const signature = value.signature.data;
    v.update(rawTBS);
    if (!v.verify(responderKey, signature)) {
      return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_INVALID_SIGNATURE));
    }
  }
  const tbs = value.tbsResponseData;
  if (tbs.responses.length < 1) {
    return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_NO_RESPONSE));
  }
  const sd = tbs.responses[0];
  if (sd.certStatus.type === 'revoked') {
    return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_REVOKED));
  }
  const currentTime = Date.now();
  const isInjectValidity = process.env.SF_OCSP_TEST_INJECT_VALIDITY_ERROR || '';
  if (isInjectValidity.toLowerCase() === 'true' || !isValidityRange(currentTime, sd.thisUpdate, sd.nextUpdate)) {
    return done(Errors.createOCSPError(
      ErrorCodes.ERR_OCSP_INVALID_VALIDITY,
      'Valid from:', toUTCString(sd.thisUpdate), ', Valid to:', toUTCString(sd.nextUpdate)));
  }
  const isInjectUnknown = process.env.SF_OCSP_TEST_INJECT_UNKNOWN_STATUS || '';
  if (isInjectUnknown.toLowerCase() === 'true' || sd.certStatus.type === 'unknown') {
    return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_UNKNOWN));
  }
  if (sd.certStatus.type === 'good') {
    return done(null);
  }
  return done(Errors.createOCSPError(ErrorCodes.ERR_OCSP_UNKNOWN_STATE));
};
exports.verifyOCSPResponse = verifyOCSPResponse;
