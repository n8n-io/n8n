const http = require('http');
const url = require('url');

const path = require('path');
const fs = require('fs');
const SimpleCache = require('simple-lru-cache');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;
const Util = require('../util');
const CertUtil = require('./cert_util');
const GlobalConfig = require('../global_config');
const Logger = require('../logger');

const status = {
  NOT_START: 'not_start',
  STARTED: 'started',
  FINISHED: 'finish',
};

// validate input
const sizeLimit = GlobalConfig.getOcspResponseCacheSizeLimit();
// ocsp cache max age in second
let maxAgeSec = GlobalConfig.getOcspResponseCacheMaxAge();

Errors.assertInternal(Util.number.isPositiveInteger(sizeLimit));
Errors.assertInternal(Util.number.isPositiveInteger(maxAgeSec));

const cacheDir = GlobalConfig.mkdirCacheDir();
const cacheFileName = path.join(cacheDir, 'ocsp_response_cache.json');
// create a cache to store the responses, dynamically changes in size
let cache;
// Cache updated time, in seconds, initialized as current time.
// Will be updated when load from local cache file or refresh by downloading

function deleteCache() {
  try {
    cache.reset();
    fs.unlinkSync(cacheFileName);
  } catch (e) {
    Logger.getInstance()
      .debug('Failed to delete OCSP cache file: %s, err: %s', cacheFileName, e);
  }
}

exports.deleteCache = deleteCache;

/**
 * Cache for storing OCSP responses. This covers both client and server caches.
 *
 * @constructor
 */
function OcspResponseCache() {
  let downloadStatus = status.NOT_START;
  let cacheUpdated = false;
  let cacheInitialized = false;
  let proxyAgent = null;

  /**
   * Reads OCSP cache file.
   */
  // Cache update time in second
  let cacheUpdateTimeSec = Date.now() / 1000;

  let OCSP_URL = process.env.SF_OCSP_RESPONSE_CACHE_SERVER_URL;
  if (!OCSP_URL) {
    OCSP_URL = 'http://ocsp.snowflakecomputing.com/ocsp_response_cache.json';
  }
  try {
    Logger.getInstance().debug('Reading OCSP cache file. %s', cacheFileName);
    const contents = fs.readFileSync(cacheFileName, 'utf-8');
    const jsonCacheFromFile = JSON.parse(contents);
    updateCache(jsonCacheFromFile);
    cacheInitialized = true;
  } catch (e) {
    Logger.getInstance().debug('Failed to read OCSP cache file: %s, err: %s', cacheFileName, e);
  }

  /**
   * set proxy agent for ocsp validation
   *
   * @param agent
   */
  this.setAgent = function setAgent(agent) {
    proxyAgent = agent;
  };

  /**
   * Initializes the cache
   * 
   * @param cert 
   * @param response 
   */
  this.initCache = function initCache(cert, response) {
    cache = new SimpleCache({ maxSize: 1 });
    this.set(cert, response);
  };

  /**
   * Is OCSP Cache initialized?
   * @returns {boolean}
   */
  this.isInitialized = function () {
    return cacheInitialized;
  };

  /**
   * Is OCSP Cache download finished?
   * @returns {boolean}
   */
  this.isDownloadFinished = function () {
    return downloadStatus === status.FINISHED;
  };

  /**
   * Forces download status to finish
   */
  this.forceDownloadToFinish = function () {
    downloadStatus = status.FINISHED;
  };

  /**
   * Is local OCSP Cache expired?
   * @returns {boolean}
   */
  this.IsCacheExpired = function () {
    if (!cacheInitialized) {
      return false;
    }

    // Update maxAge in case it could be changed through environment variable
    maxAgeSec = GlobalConfig.getOcspResponseCacheMaxAge();

    // Current time in seconds
    const currentTimeSec = Date.now() / 1000;

    if ((currentTimeSec - cacheUpdateTimeSec) > maxAgeSec) {
      Logger.getInstance().debug(
        'OCSP local cache validity is out of range. currentTime: %s, timestamp: %s, maxAge: %s',
        currentTimeSec, cacheUpdateTimeSec, maxAgeSec);
      return true;
    }

    return false;
  };

  /**
   * Resets OCSP Cache status
   */
  this.resetCacheStatus = function () {
    downloadStatus = status.NOT_START;
    if (cacheUpdated) {
      Logger.getInstance().debug(cacheFileName);

      // current time in second
      const currentTimeSec = Date.now() / 1000;
      const cacheOutput = {};
      cache.forEach(function (v, k) {
        const certIdInBase64 = CertUtil.decodeKey(k);
        const ocspResponseInBase64 = v.toString('BASE64');
        cacheOutput[certIdInBase64] = [currentTimeSec, ocspResponseInBase64];
      });
      const writeContent = JSON.stringify(cacheOutput);
      Logger.getInstance().debug('Writing OCSP cache file. %s', cacheFileName);
      try {
        fs.writeFileSync(cacheFileName, writeContent, 'utf-8');
      } catch (e) {
        Logger.getInstance().debug('Failed to update OCSP cache file: %s, err: %s', cacheFileName, e);
      }
      cacheUpdated = false;
    }
  };

  /**
   * Adds an entry to the cache.
   *
   * @param cert
   * @param response
   */
  this.set = function set(cert, response) {
    try {
      const certId = CertUtil.buildCertId(cert);
      cache.set(certId, response);
      cacheUpdated = true;
    } catch (e) {
      Logger.getInstance().debug('Failed to add certificate to OCSP cache file. err: %s', e);
    }
  };

  /**
   * Returns an entry from the cache.
   *
   * @param cert
   * @returns {*}
   */
  this.get = function get(cert) {
    try {
      const certId = CertUtil.buildCertId(cert);
      return cache.get(certId);
    } catch (e) {
      Logger.getInstance().debug('Failed to get certificate from OCSP cache. err: %s', e);
      return null;
    }
  };

  /**
   * Downloads OCSP cache from the Snowflake OCSP cache server.
   * @param cb callback
   */
  this.downloadCache = function (cb) {
    if (downloadStatus === status.STARTED) {
      // reschedule calling cb
      return false;
    } else if (downloadStatus === status.FINISHED) {
      // call cb immediately
      cb(null, false);
      return true;
    }
    downloadStatus = status.STARTED;

    function checkOCSPResponse(err, cacheContent) {
      if (downloadStatus === status.FINISHED) {
        return;
      }
      downloadStatus = status.FINISHED;
      Logger.getInstance().debug('Finish OCSP Cache Server: %s', OCSP_URL);
      if (err) {
        Logger.getInstance()
          .debug('Failed to download OCSP cache file. %s. Ignored', err);
        return cb(err, false);
      }
      try {
        const jsonParsed = JSON.parse(cacheContent);
        updateCache(jsonParsed);
        cacheUpdated = true;
        return cb(null, false);
      } catch (e) {
        cb(e, false);
      }
    }

    function onResponse(response) {
      if (response.statusCode < 200 || response.statusCode >= 400) {
        return checkOCSPResponse(
          new Error('Failed to obtain OCSP response: ' +
            response.statusCode), null);
      }

      let rawData = '';

      // A chunk of data has been received.
      response.on('data', function (chunk) {
        rawData += chunk;
      });

      // The whole response has been received. Print out the result.
      response.on('end', function () {
        checkOCSPResponse(null, rawData);
      });
    }

    const uri = url.parse(OCSP_URL);
    const timeout = process.env.SF_OCSP_TEST_OCSP_RESPONSE_CACHE_SERVER_TIMEOUT || 5000;
    const options = Object.assign({
      timeout: Number(timeout),
      method: 'GET',
      agent: proxyAgent,
    }, uri);
    const httpRequest = http.request(options, onResponse);
    httpRequest.on('error', function (e) {
      downloadStatus = status.FINISHED;
      if (cb) {
        cb(e, false);
      }
      cb = null;
    });
    httpRequest.on('timeout', function () {
      downloadStatus = status.FINISHED;
      httpRequest.abort();
      Logger.getInstance().debug('Timeout OCSP responder: %s, %ss', OCSP_URL, options.timeout);
      if (cb) {
        cb(Errors.createOCSPError(ErrorCodes.ERR_OCSP_CACHE_SERVER_TIMEOUT), false);
      }
      cb = null;
    });
    httpRequest.end();
    Logger.getInstance().trace('Contact OCSP Cache Server: %s', OCSP_URL);

    return true;
  };

  /**
   * Validate cache entry
   * @param certIdBase64 cache key
   * @param ocspResponseBase64 cache value
   * @returns {Object}
   */
  function validateCacheEntry(certIdBase64, ocspResponseBase64) {
    let err;
    if (ocspResponseBase64.length !== 2) {
      Logger.getInstance()
        .debug('OCSP cache value doesn\'t consist of two elements. Ignored.');
      err = Errors.createOCSPError(ErrorCodes.ERR_OCSP_NOT_TWO_ELEMENTS);
    }
    const cacheEntryWriteTime = ocspResponseBase64[0];
    const currentTimeSec = Date.now() / 1000;
    if ((currentTimeSec - cacheEntryWriteTime) > maxAgeSec) {
      Logger.getInstance().debug(
        'OCSP cache validity is out of range. currentTime: %s, timestamp: %s, maxAge: %s',
        currentTimeSec, cacheEntryWriteTime, maxAgeSec);
      err = Errors.createOCSPError(ErrorCodes.ERR_OCSP_CACHE_EXPIRED);
    }
    try {
      const k = CertUtil.encodeKey(certIdBase64);
      if (err) {
        return { err: err, key: k };
      }
      const cacheEntryOcspResponse = ocspResponseBase64[1];
      const rawOCSPResponse = Buffer.from(cacheEntryOcspResponse, 'base64');
      const status = CertUtil.verifyOCSPResponse(null, rawOCSPResponse);
      if (!status.err) {
        return { err: null, key: k, value: rawOCSPResponse };
      }
      return { err: status.err };
    } catch (e) {
      Logger.getInstance()
        .debug('Failed to parse OCSP response. %s. Ignored.', e);
      return { err: Errors.createOCSPError(ErrorCodes.ERR_OCSP_FAILED_PARSE_RESPONSE) };
    }
  }

  function updateCache(jsonObject) {
    // Get the size of cache
    const cacheSize = Object.keys(jsonObject).length;
    // Create cache using response cache size if it doesn't exceed the upper limit
    cache = new SimpleCache({ maxSize: cacheSize < sizeLimit ? cacheSize : sizeLimit });
    // Add new entries
    setCacheEntries(jsonObject);
    // set cache update time
    cacheInitialized = true;
  }

  function setCacheEntries(jsonObject) {
    let cacheUpdateTime = Date.now() / 1000;
    for (const entry in jsonObject) {
      if (Object.prototype.hasOwnProperty.call(jsonObject, entry)) {
        const newUpdateTime = validateAndSetEntry(jsonObject, entry, cacheUpdateTime);
        if (newUpdateTime) {
          cacheUpdateTime = newUpdateTime;
        }
      }
    }
    cacheUpdateTimeSec = cacheUpdateTime;
  }

  function validateAndSetEntry(jsonObject, entry, cacheUpdateTime) {
    const status = validateCacheEntry(entry, jsonObject[entry]);
    if (!status.err) {
      // Add new entry or update existing one
      cache.set(status.key, status.value);
      // change cache update time if needed
      if (jsonObject[entry][0] < cacheUpdateTime) {
        return jsonObject[entry][0];
      }
    } else {
      Logger.getInstance().trace('Error when validating OCSP cache entry %s, %s', entry, status.err.toString());
    }
  }
}

exports.OcspResponseCache = OcspResponseCache;
