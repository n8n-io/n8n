const util = require('util');
const Url = require('url');
const os = require('os');
const Logger = require('./logger');
const fs = require('fs');
const Errors = require('./errors');
const net = require('net');

/**
 * Note: A simple wrapper around util.inherits() for now, but this might change
 * in the future.
 *
 * Inherits the prototype methods from one constructor into another. The
 * prototype of constructor will be set to a new object created from
 * superConstructor.
 *
 * @param constructor
 * @param superConstructor
 *
 * @returns {Object}
 */
exports.inherits = function (constructor, superConstructor) {
  return util.inherits.apply(util, [constructor, superConstructor]);
};

/**
 * Note: A simple wrapper around util.format() for now, but this will likely
 * change in the future.
 *
 * Returns a formatted string using the first argument as a printf-like format.
 *
 * The first argument is a string that contains zero or more placeholders.
 * Each placeholder is replaced with the converted value from its corresponding
 * argument. Supported placeholders are:
 *   %s - String.
 *   %d - Number (both integer and float).
 *   %j - JSON. Replaced with the string '[Circular]' if the argument contains
 *        circular references.
 *   %% - single percent sign ('%'). This does not consume an argument.
 *
 * If the placeholder does not have a corresponding argument, the placeholder is
 * not replaced.
 *
 * If there are more arguments than placeholders, the extra arguments are
 * coerced to strings (for objects and symbols, util.inspect() is used) and then
 * concatenated, delimited by a space.
 *
 * If the first argument is not a format string then util.format() returns a
 * string that is the concatenation of all its arguments separated by spaces.
 * Each argument is converted to a string with util.inspect().
 *
 * @returns {String}
 */
exports.format = function (format, ...params) {
  return util.format.apply(util, [format, ...params]);
};

/**
 * Determines if a given value is a function.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isFunction = function (value) {
  return !!value && typeof value === 'function';
};

const toString = Object.prototype.toString;

/**
 * Determines if a given value is an object.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isObject = function (value) {
  return toString.call(value) === '[object Object]';
};

/**
 * Determines if a given value is a Date.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isDate = function (value) {
  return toString.call(value) === '[object Date]';
};

/**
 * Determines if a given value is an array.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isArray = function (value) {
  return toString.call(value) === '[object Array]';
};

/**
 * Determines if a given value is a string.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isString = function (value) {
  return typeof value === 'string';
};

/**
 * Determines if a given value is a boolean.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isBoolean = function (value) {
  return typeof value === 'boolean';
};

/**
 * Determines if a given value is a number.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isNumber = function (value) {
  return typeof value === 'number' && isFinite(value);
};

/**
 * Determines if a given value is a private key string in pem format of type pkcs8.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.isPrivateKey = function (value) {
  const trimmedValue = value.trim();
  // The private key is expected to be decrypted when set in the connection string
  // secret scanner complains about first check since it looks like private key, but it's only check
  // pragma: allowlist nextline secret
  return (trimmedValue.startsWith('-----BEGIN PRIVATE KEY-----') &&
    trimmedValue.endsWith('\n-----END PRIVATE KEY-----'));
};

/**
 * A collection of number-related utility functions.
 */
exports.number =
  {
    /**
     * Determines if a given value is a positive number.
     *
     * @param value
     *
     * @returns {Boolean}
     */
    isPositive: function (value) {
      return exports.isNumber(value) && (value > 0);
    },

    /**
     * Determines if a given value is a non-negative number.
     *
     * @param value
     *
     * @returns {Boolean}
     */
    isNonNegative: function (value) {
      return exports.isNumber(value) && (value >= 0);
    },

    /**
     * Determines if a given value is an integer.
     *
     * @param value
     *
     * @returns {Boolean}
     */
    isInteger: function (value) {
      return exports.isNumber(value) && (Math.floor(value) === value);
    },

    /**
     * Determines if a given value is a positive integer.
     *
     * @param value
     *
     * @returns {Boolean}
     */
    isPositiveInteger: function (value) {
      return this.isInteger(value) && (value > 0);
    },

    /**
     * Determines if a given value is a non-negative integer.
     *
     * @param value
     *
     * @returns {Boolean}
     */
    isNonNegativeInteger: function (value) {
      return this.isInteger(value) && (value >= 0);
    }
  };

/**
 * A collection of string-related utility functions.
 */
exports.string =
  {
    /**
     * Determines if a given string is not null or empty.
     *
     * @param {*} value
     *
     * @returns {Boolean}
     */
    isNotNullOrEmpty: function (value) {
      return exports.isString(value) && value;
    },

    /**
     * Compares two version numbers of the form 'a.b.c' where a, b and c are
     * numbers (e.g. '1.0.12'). If one or both inputs are invalid versions, the
     * function will return NaN, otherwise, it will return -1 if the first
     * version is smaller, 1 if the first version is bigger, and 0 if the two
     * versions are equal.
     *
     * @param {String} version1
     * @param {String} version2
     *
     * @returns {Number}
     */
    compareVersions: function (version1, version2) {
      // if one or both inputs are valid, return NaN
      if (!exports.isString(version1) || !exports.isString(version2)) {
        return NaN;
      }

      // split on dot
      const version1Parts = version1.split('.');
      const version2Parts = version2.split('.');

      // add trailing zeros to make the parts arrays the same length
      while (version1Parts.length < version2Parts.length) {
        version1Parts.push('0');
      }
      while (version2Parts.length < version1Parts.length) {
        version2Parts.push('0');
      }

      // compare elements in the two arrays one by one
      let result = 0;
      let version1Part, version2Part;
      for (let index = 0, length = version1Parts.length; index < length; index++) {
        // convert to number before doing any arithmetic
        version1Part = Number(version1Parts[index]);
        version2Part = Number(version2Parts[index]);

        // if one or both values are not numerical, consider the input invalid
        if (!exports.isNumber(version1Part) || !exports.isNumber(version2Part)) {
          result = NaN;
          break;
        }

        // if the two values are different, pick the
        // correct result based on which value is smaller
        if (version1Part !== version2Part) {
          result = version1Part < version2Part ? -1 : 1;
          break;
        }
      }

      return result;
    }
  };

/**
 * Determines if a given value is not null or undefined.
 *
 * @param value
 *
 * @returns {Boolean}
 */
exports.exists = function (value) {
  return (value !== null) && (value !== undefined);
};

/**
 * A collection of url-related utility functions.
 */
exports.url =
  {
    /**
     * Appends a query parameter to a url. If an invalid url is specified, an
     * exception is thrown.
     *
     * @param {String} url
     * @param {String} paramName the name of the query parameter.
     * @param {String} paramValue the value of the query parameter.
     *
     * @returns {String}
     */
    appendParam: function (url, paramName, paramValue) {
      // if the specified url is valid
      const urlAsObject = Url.parse(url);
      if (urlAsObject) {
        // if the url already has query parameters, use '&' as the separator
        // when appending the additional query parameter, otherwise use '?'
        url += (urlAsObject.search ? '&' : '?') + paramName + '=' + paramValue;
      }

      return url;
    },

    appendRetryParam: function (option) {
      let retryUrl = this.appendParam(option.url, 'retryCount', option.retryCount);
      if (option.includeRetryReason) {
        retryUrl = this.appendParam(retryUrl, 'retryReason', option.retryReason);
      }

      return retryUrl;
    }
  };

/**
 * Shallow-copies everything from a source object into a destination object.
 *
 * @param {Object} dst the object to copy properties to.
 * @param {Object} src the object to copy properties from.
 *
 * @returns {Object} the destination object.
 */
exports.apply = function (dst, src) {
  // if both dst and src are objects, copy everything from src to dst
  if (this.isObject(dst) && this.isObject(src)) {
    for (const key in src) {
      if (Object.prototype.hasOwnProperty.call(src, key)) {
        dst[key] = src[key];
      }
    }
  }

  return dst;
};

/**
 * Returns true if the code is currently being run in the browser, false
 * otherwise.
 *
 * @returns {Boolean}
 */
exports.isBrowser = function () {
  return !!(process && process.browser);
};

/**
 * Returns true if the code is currently being run in node, false otherwise.
 *
 * @returns {Boolean}
 */
exports.isNode = function () {
  return !this.isBrowser();
};

/**
 * Returns the next sleep time calculated by exponential backoff with
 * decorrelated jitter.
 * sleep = min(cap, random_between(base, sleep * 3))
 * for more details, check out:
 * http://www.awsarchitectureblog.com/2015/03/backoff.html
 * @param base minimum seconds
 * @param cap maximum seconds
 * @param previousSleep previous sleep time
 * @returns {number} next sleep time
 */
exports.nextSleepTime = function (
  base, cap, previousSleep) {
  return Math.min(cap, Math.abs(previousSleep * 3 - base) * Math.random() +
    Math.min(base, previousSleep * 3));
};


/**
 * Return next sleep time calculated by the jitter rule.
 *
 * @param {Number} numofRetries
 * @param {Number} currentSleepTime
 * @param {Number} totalElapsedTime
 * @param {Number} maxRetryTimeout
 * @returns {JSON} return next sleep Time and totalTime.
 */
exports.getJitteredSleepTime = function (numofRetries, currentSleepTime, totalElapsedTime, maxRetryTimeout) {
  const nextsleep = getNextSleepTime(numofRetries, currentSleepTime);
  const sleep = maxRetryTimeout !== 0 ? Math.min((maxRetryTimeout - totalElapsedTime), nextsleep) : nextsleep;
  totalElapsedTime += sleep;
  return { sleep, totalElapsedTime };
};

/**
 * Choose one of the number between two numbers.
 *
 * @param {Number} firstNumber
 * @param {Number} secondNumber
 * @returns {Number} return a random number between two numbers.
 */
function chooseRandom(firstNumber, secondNumber) {
  return Math.random() * (firstNumber - secondNumber) + secondNumber;
}

exports.chooseRandom = chooseRandom;

/**
 * return the next sleep Time.
 * @param {Number} numofRetries
 * @param {Number} currentSleepTime
 * @returns {Number} return jitter.
 */
function getNextSleepTime(numofRetries,  currentSleepTime) {
  const nextSleep = (2 ** (numofRetries));
  return chooseRandom(currentSleepTime + getJitter(currentSleepTime), nextSleep + getJitter(currentSleepTime));
}

exports.getNextSleepTime = getNextSleepTime;

/**
 * return the jitter value.
 * @param {Number} currentSleepTime
 * @returns {Number} return jitter.
 */
function getJitter(currentSleepTime) {
  const multiplicationFactor = chooseRandom(1, -1);
  return 0.5 * currentSleepTime * multiplicationFactor;
}

exports.getJitter = getJitter;

/**
 * Check whether the request is the login-request or not.
 *
 * @param loginUrl HTTP request url
 * @returns {Boolean} true if it is loginRequest, otherwise false.
 */
exports.isLoginRequest = function (loginUrl) {
  const endPoints = ['/v1/login-request', '/authenticator-request',];
  return endPoints.some((endPoint) => loginUrl.includes(endPoint));
};

/**
 * Checks if the HTTP response code is retryable
 *
 * @param response HTTP response object
 * @param retry403 will retry HTTP 403?
 * @returns {*|boolean} true if retryable otherwise false
 */
exports.isRetryableHttpError = function (response, retry403) {
  return response &&
    ((response.statusCode >= 500 && response.statusCode < 600) ||
      (retry403 && response.statusCode === 403) ||
      (response.statusCode === 408) ||
      (response.statusCode === 429));
};

exports.validateClientSessionKeepAliveHeartbeatFrequency = function (input, masterValidity) {
  let heartbeatFrequency = input;
  const realMax = Math.floor(masterValidity / 4);
  const realMin = Math.floor(realMax / 4);
  if (input > realMax) {
    heartbeatFrequency = realMax;
  } else if (input < realMin) {
    heartbeatFrequency = realMin;
  }

  heartbeatFrequency = Math.floor(heartbeatFrequency);
  return heartbeatFrequency;
};

// driver name
const driverName = require('./../package.json').name;
exports.driverName = driverName;

// driver version
const driverVersion = require('./../package.json').version;
exports.driverVersion = driverVersion;

// nodeJS version
let nodeJSVersion = process.version;
if (nodeJSVersion && nodeJSVersion.startsWith('v')) {
  nodeJSVersion = nodeJSVersion.substring(1);
}
// user-agent HTTP header
const userAgent = 'JavaScript' + '/' + driverVersion
  + ' (' + process.platform + '-' + process.arch + ') ' + 'NodeJS' + '/' + nodeJSVersion;

exports.userAgent = userAgent;

/**
 * Constructs host name using region and account
 *
 * @param region where the account is located
 * @param account which account to connect to
 * @returns {string} host name
 */
exports.constructHostname = function (region, account) {
  let host;
  if (region === 'us-west-2') {
    host = account + '.snowflakecomputing.com';
  } else if (region != null) {
    if (account.indexOf('.') > 0) {
      account = account.substring(0, account.indexOf('.'));
    }
    if (region.startsWith('cn-') || region.startsWith('CN-')) {
      host = account + '.' + region + '.snowflakecomputing.cn';
    } else {
      host = account + '.' + region + '.snowflakecomputing.com';
    }

  } else {
    host = account + '.snowflakecomputing.com';
  }
  return host;
};

/**
 * Returns true if host indicates private link
 *
 * @returns {boolean}
 */
exports.isPrivateLink = function (host) {
  Errors.checkArgumentExists(this.exists(host), Errors.codes.ERR_CONN_CREATE_MISSING_HOST);
  return host.toLowerCase().includes('privatelink.snowflakecomputing.');
};
/**
 * Returns true if host indicates private link
 *
 * @returns {boolean}
 */
exports.createOcspResponseCacheServerUrl = function (host) {
  return `http://ocsp.${host}/ocsp_response_cache.json`;
};

/**
 * Returns if command is a PUT command
 *
 * @param sqlText the query command
 * @returns {boolean}
 */
exports.isPutCommand = function (sqlText) {
  return (sqlText.trim().substring(0, 3).toUpperCase() === 'PUT');
};

/**
 * Returns if command is a GET command
 *
 * @param sqlText the query command
 * @returns {boolean}
 */
exports.isGetCommand = function (sqlText) {
  return (sqlText.trim().substring(0, 3).toUpperCase() === 'GET');
};

/**
 * Add double quotes to smkId's value to parse it as a string instead of integer
 * to preserve precision of numbers exceeding JavaScript's max safe integer
 * e.g (inputting 32621973126123526	outputs 32621973126123530)
 *
 * @param body the data in JSON
 * @returns {string}
 */
exports.convertSmkIdToString = function (body) {
  return body.replace(/"smkId"(\s*):(\s*)([0-9]+)/g, '"smkId"$1:$2"$3"');
};

/**
 * Under some circumstances the object passed to JSON.stringify in exception handling
 * can contain circular reference, on which JSON.stringify bails out
 * MDN way of handling such error
 * @returns string
 */
exports.getCircularReplacer = function () {
  const ancestors = [];
  return function (key, value) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    // `this` is the object that value is contained in,
    // i.e., its direct parent.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return '[Circular]';
    }
    ancestors.push(value);
    return value;
  };
};

/**
 * Returns if the provided string is a valid subdomain.
 * @param value
 * @returns {boolean}
 */
exports.isCorrectSubdomain = function (value) {
  const subdomainRegex = RegExp(/^\w+([.-]\w+)*$/i);
  return subdomainRegex.test(value);
};

exports.buildCredentialCacheKey = function (host, username, credType) {
  if (!host || !username || !credType) {
    Logger.getInstance().debug('Cannot build the credential cache key because one of host, username, and credType is null');
    return null;
  }
  return `{${host.toUpperCase()}}:{${username.toUpperCase()}}:{${credType.toUpperCase()}}`;
};

/**
 * 
 * @param {Object} customCredentialManager 
 * @returns 
 */
exports.checkValidCustomCredentialManager = function (customCredentialManager) {
  if ( typeof customCredentialManager !== 'object') {
    return false;
  }

  const requireMethods = ['write', 'read', 'remove'];

  for (const method of requireMethods) {
    if (!Object.hasOwnProperty.call(customCredentialManager, method) || typeof customCredentialManager[method] !== 'function') {
      return false;
    }
  }
  return true;
};

exports.checkParametersDefined = function (...parameters) {
  return parameters.every((element) => element !== undefined && element !== null);
};

exports.shouldPerformGCPBucket = function (accessToken) {
  return !!accessToken && process.env.SNOWFLAKE_FORCE_GCP_USE_DOWNSCOPED_CREDENTIAL !== 'true';
};

/**
 * Checks if the provided file or directory permissions are correct.
 * @param filePath
 * @param expectedMode
 * @param fsPromises
 * @returns {Promise<boolean>} resolves always to true for Windows
 */
exports.isFileModeCorrect = async function (filePath, expectedMode, fsPromises) {
  if (os.platform() === 'win32') {
    return true;
  }
  return await fsPromises.stat(filePath).then((stats) => {
    // we have to limit the number of LSB bits to 9 with the mask, as the stats.mode starts with the file type,
    // e.g. the directory with permissions 755 will have stats.mask of 40755.
    const mask = (1 << 9) - 1;
    return (stats.mode & mask) === expectedMode;
  });
};

/**
 * Checks if the provided file or directory is writable only by the user.
 * @param configFilePath
 * @param fsPromises
 * @returns {Promise<boolean>} resolves always to true for Windows
 */
exports.isFileNotWritableByGroupOrOthers = async function (configFilePath, fsPromises) {
  if (os.platform() === 'win32') {
    return true;
  }
  const stats = await fsPromises.stat(configFilePath);
  return (stats.mode & (1 << 4)) === 0 && (stats.mode & (1 << 1)) === 0;
};

exports.shouldRetryOktaAuth = function ({ maxRetryTimeout, maxRetryCount, numRetries, startTime, remainingTimeout }) {
  return  (maxRetryTimeout === 0 || Date.now() < startTime + remainingTimeout) && numRetries <= maxRetryCount;
};

exports.getDriverDirectory = function () {
  return __dirname;
};

exports.validatePath = function (dir) {
  try {
    const stat = fs.statSync(dir);
    return stat.isDirectory();
  } catch {
    Logger.getInstance().error('The location is invalid. Please check this location is accessible or existing');
    return false;
  }
};

exports.getEnvVar = function (variable) {
  return process.env[variable.toLowerCase()] || process.env[variable.toUpperCase()];
};

exports.validateEmptyString = function (value) {
  return value !== '' ? value : undefined;
};

exports.isNotEmptyAsString = function (variable) {
  if (typeof variable === 'string') {
    return variable;
  }
  return exports.exists(variable);
};

exports.isNotEmptyString = function (variable) {
  return exports.exists(variable) && variable !== '';
};
/**
 * Checks Whether the object is empty (can be null or undefined) or not.
 * @param object
 * @returns {boolean} 
 */
exports.isEmptyObject = (object) => {
  if (!exports.exists(object)) {
    return true;
  }
  if (typeof object !== 'object') {
    return false;
  }
  return Object.keys(object).length === 0;
};

exports.isWindows = function () {
  return os.platform() === 'win32';
};

exports.getFreePort = async function () {
  return new Promise(res => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => res(port));
    });
  });
};

exports.isPortOpen = async (port) => {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', (err) => {
      s.close();
      if (err['code'] === 'EADDRINUSE') {
        Logger.getInstance().trace(`Port: ${port} is not available. Verification failed`);
        reject('Port not available.');
      } else {
        Logger.getInstance().trace(`There is unexpected error during verification of port availability. Port: ${port}. Error: ${JSON.stringify(err)}`);
      }
    });
    s.once('listening', () => {
      s.close();
      Logger.getInstance().trace(`Closing server run for verification whether the port is available. Port: ${port}`);
      resolve('Listening');
    });
    s.listen(port);
  });
};


/**
* Left strip the specified character from a string.
*
* @param {String} str
* @param {Character} remove
*
* @returns {String}
*/
exports.lstrip = function (str, remove) {
  while (str.length > 0 && remove.indexOf(str.charAt(0)) !== -1) {
    str = str.substr(1);
  }
  return str;
};


/**
 * This method transforms HTML special characters into their corresponding entity representations.
 *
 * @param {String} value
 *
 * @returns {String}
 */
exports.escapeHTML = function (value) {
  if (!exports.exists(value)) {
    return value;
  }
  return value.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};