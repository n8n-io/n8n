// Copyright (c) 2016, 2025, Oracle and/or its affiliates.

//-----------------------------------------------------------------------------
//
// This software is dual-licensed to you under the Universal Permissive License
// (UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
// 2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
// either license.
//
// If you elect to accept the software under the Apache License, Version 2.0,
// the following applies:
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
//-----------------------------------------------------------------------------

'use strict';

const { Buffer } = require('buffer');
const errors = require('./errors.js');
const process = require('process');
const util = require('util');
const types = require('./types.js');
const constants = require('./constants.js');
const traceHandler = require('./traceHandler.js');
const crypto = require("crypto");

const pemHeaders = [
  '-----BEGIN CERTIFICATE-----',
  '-----BEGIN PUBLIC KEY-----',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  '-----BEGIN DSA PRIVATE KEY-----',
  '-----BEGIN EC PRIVATE KEY-----',
  '-----BEGIN ENCRYPTED PRIVATE KEY-----'
];
const pemFooters = [
  '-----END CERTIFICATE-----',
  '-----END PUBLIC KEY-----',
  '-----END PRIVATE KEY-----',
  '-----END RSA PRIVATE KEY-----',
  '-----END DSA PRIVATE KEY-----',
  '-----END EC PRIVATE KEY-----',
  '-----END ENCRYPTED PRIVATE KEY-----'
];

// set of valid network characters
const validNetworkCharacterSet = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
  'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k',
  'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '<', '>', '/', '\\', ',',
  '.', ':', ';', '\'', '"', '-', '_', '$', '+', '*', '#', '&', '!', '%', '?',
  '@']);

// node-oracledb version number
let packageJSON;
try {
  packageJSON = require('../package.json');
} catch (err) {
  errors.throwErr(errors.ERR_MISSING_FILE, 'package.json');
}
const PACKAGE_JSON_VERSION = packageJSON.version;

// Directory containing the node-oracledb add-on binary
const RELEASE_DIR = 'build/Release';

// The default node-oracledb add-on binary filename for this Node.js
const BINARY_FILE = 'oracledb-' + PACKAGE_JSON_VERSION + '-' + process.platform + '-' + process.arch + '.node';

// The node-oracledb binary filename when it is built from source
const BUILD_FILE = 'oracledb.node';

// Staging directory used by maintainers building the npm package
const STAGING_DIR = 'package/Staging';

//-----------------------------------------------------------------------------
// assertParamPropNetworkName()
//
// Asserts input vaue and sanitized value passes specified condition
// -----------------------------------------------------------------------------
function assertParamPropNetworkName(obj, parameterNum, propName) {
  errors.assertParamPropString(obj, parameterNum, propName);
  const sanitizedValue = sanitize(obj[propName]);
  errors.assertParamPropValue(obj[propName] === sanitizedValue, parameterNum, propName);
}

// getInstallURL returns a string with installation URL
function getInstallURL() {
  return ('Node-oracledb installation instructions: https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html');
}

// check if a file has contents of a .pem file
function isPemFile(content) {
  //remove any line breaks at the end of the content
  content = content.trim();
  return pemHeaders.some(header => content.includes(header)) &&
       pemFooters.some(footer => content.endsWith(footer));
}

// getInstallHelp returns a string with installation usage tips that may be helpful
function getInstallHelp() {
  let arch, url;
  let mesg = getInstallURL() + '\n';
  if (process.platform === 'linux') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'https://www.oracle.com/database/technologies/instant-client/linux-x86-32-downloads.html\n';
      arch = '32-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have Linux ' + arch + ' Oracle Client libraries configured with ldconfig, or in LD_LIBRARY_PATH.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from \n';
    mesg += url;
  } else if (process.platform === 'darwin') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html\n';
      arch = '64-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have macOS ' + arch + ' Oracle Instant Client Basic or Basic Light package libraries in\n';
    mesg += '/usr/local/lib or set by calling oracledb.initOracleClient({libDir: "/my/instant_client_directory"}).\n';
    mesg += 'Oracle Instant Client can be downloaded from ' + url;
  } else if (process.platform === 'win32') {
    if (process.arch === 'x64') {
      url = 'https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html\n';
      arch = '64-bit';
    } else if (process.arch === 'x32') {
      url = 'https://www.oracle.com/database/technologies/instant-client/microsoft-windows-32-downloads.html\n';
      arch = '32-bit';
    } else {
      url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
      arch = process.arch;
    }
    mesg += 'You must have Windows ' + arch + ' Oracle Client libraries in your PATH environment variable.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install the Instant Client Basic or Basic Light package from\n';
    mesg += url;
    mesg += 'A Microsoft Visual Studio Redistributable suitable for your Oracle client library version must be available.\n';
  } else {
    url = 'https://www.oracle.com/database/technologies/instant-client.html\n';
    mesg += 'You must have ' + process.arch + ' Oracle Client libraries in your operating system library search path.\n';
    mesg += 'If you do not have Oracle Database on this computer, then install an Instant Client Basic or Basic Light package from: \n';
    mesg += url;
  }
  return mesg;
}

function getOperationName(methodName) {
  const className = (this.constructor.name === 'Object') ? 'oracledb'
    : `oracledb.${this.constructor.name}`;
  return `${className}.${methodName}`;
}

// It returns an userContext after populating the traceContext with this below data.
//    Operation derived from className, methodName.
//    Initialize the callLevelTraceData.
//    traceContext is filled.
function traceEnterFn(traceContext) {
  if (!traceHandler.isEnabled()) {
    return;
  }

  // initialize callLevel data
  if (this._impl) {
    this._impl._callLevelTraceData = {};
  }

  // fill the traceContext.
  traceContext.additionalConfig = {};
  traceContext.additionalConfig.self = this;
  traceContext.additionalConfig.args = traceContext.args;
  traceContext.operation = getOperationName.call(this, traceContext.fn.name);
  traceContext.connectLevelConfig = this._impl?._getConnectTraceConfig();
  traceHandler.getTraceInstance().onEnterFn(traceContext);
}

// It calls the onExitFn method providing the userContext resturned in onEnterFn.
function traceExitFn(traceContext, result, err) {
  const callExitFn = traceHandler.isEnabled();
  if (!callExitFn) {
    return;
  }

  // Fill the traceContext.
  traceContext.error = err;
  traceContext.additionalConfig.result = result;
  if (this._impl) {
    // fill function call state.
    traceContext.callLevelConfig = this._impl._callLevelTraceData;
  }
  if (['oracledb.getConnection', 'oracledb.createPool'].includes(traceContext.operation)) {
    if (err) {
      if (traceContext.args && traceContext.args.length >= 1) {
        // connectString and user information is populated in traceContext,
        // which is useful if an error happens and connection object is not created.
        const config = {};
        const inp = traceContext.args[0];
        config.user = inp.user || inp.username;
        config.connectString = inp.connectString || inp.connectionString;
        traceContext.connectLevelConfig = config;
      }
    } else {
      traceContext.connectLevelConfig = result._impl._getConnectTraceConfig();
    }
  } else if (traceContext.operation === 'oracledb.Pool.getConnection') {
    if (!err) {
      // we update the connectTraceConfig with more values with returned conn.
      traceContext.connectLevelConfig = result._impl._getConnectTraceConfig();
    }
  }

  traceHandler.getTraceInstance().onExitFn(traceContext);
  if (this._impl) {
    // cleanup the function call state.
    this._impl._callLevelTraceData = undefined;
  }
}

// The callbackify function is used to wrap async methods to add optional
// callback support. If the last parameter passed to a method is a function,
// then it is assumed that the callback pattern is being used and the promise
// is resolved or rejected and the callback invoked; otherwise, the function is
// called unchanged and a promise is returned
function callbackify(func) {
  const wrapper = function() {

    // if last argument is not a function, simply invoke the function as usual
    // and a promise will be returned
    if (typeof arguments[arguments.length - 1] !== 'function') {
      return func.apply(this, arguments);
    }

    // otherwise, resolve or reject the promise and invoke the callback
    const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);
    const cb = arguments[arguments.length - 1];
    func.apply(this, args).then(function(result) {
      cb(null, result);
    }, cb);
  };
  if (func.name) {
    Object.defineProperty(wrapper, 'name', { value: func.name });
  }
  return wrapper;
}

// the wrapFn() function is used to wrap a single method to ensure that calls
// are serialized and that concurrent calls are prevented where that is needed;
// this method also ensures that error information is captured correctly.
// If tracing is enabled, the hooks onEnterFn and onExitFn are called after
// the input traceContext is prepared. The func is passed in traceContext
// which is filled with additional context inside onEnterFn.
function wrapFn(func, serialize, preventConcurrentErrorCode) {
  const wrapper = async function wrapper() {

    let connImpl;
    const traceEnabled = traceHandler.isEnabled();
    const traceContext = {fn: func, args: arguments};

    // if concurrent operations are to be prevented, check for that now
    if (preventConcurrentErrorCode) {
      if (this._isActive)
        errors.throwErr(preventConcurrentErrorCode);
      this._isActive = true;
    }

    // determine the connection implementation associated with the object, if
    // one currently exists and acquire the "lock"; this simply checks to see
    // if another operation is in progress, and if so, waits for it to complete
    if (serialize && this._impl) {
      connImpl = this._impl._getConnImpl();
      await connImpl._acquireLock();
    }

    // call the function and ensure that the lock is "released" once the
    // function has completed -- either successfully or in failure -- but only
    // if a connection implementation is currently associated with this object
    let result, tErr;
    try {
      if (traceEnabled) {
        traceEnterFn.call(this, traceContext);
      }
      result = await traceContext.fn.apply(this, arguments);
      return result;
    } catch (err) {
      tErr = errors.transformErr(err, wrapper);
      throw tErr;
    } finally {
      if (connImpl)
        connImpl._releaseLock();
      if (preventConcurrentErrorCode) {
        this._isActive = false;
      }
      if (traceEnabled) {
        traceExitFn.call(this, traceContext, result, tErr);
      }
    }

  };
  if (func.name) {
    Object.defineProperty(wrapper, 'name', { value: func.name });
  }
  return wrapper;
}

// The wrapFns() function is used to wrap the named methods on the prototype
// so that a number of common tasks can be done in a single place; the
// arguments following the formal arguments contain the names of methods to
// wrap on the prototype; if the first extra argument is an error code, it is
// used to wrap to prevent concurrent access
function wrapFns(proto) {
  let nameIndex = 1;
  let serialize = true;
  let preventConcurrentErrorCode;
  if (typeof arguments[1] === 'number') {
    nameIndex++;
    preventConcurrentErrorCode = arguments[1];
  } else if (typeof arguments[1] === 'boolean') {
    nameIndex++;
    serialize = arguments[1];
  }
  for (let i = nameIndex; i < arguments.length; i++) {
    const name = arguments[i];
    const f = proto[name];
    proto[name] = callbackify(wrapFn(f, serialize, preventConcurrentErrorCode));
  }
}

function isArrayOfStrings(value) {
  if (!Array.isArray(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== 'string')
      return false;
  }
  return true;
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

function isObjectOrArray(value) {
  return (value !== null && typeof value === 'object') || Array.isArray(value);
}

//---------------------------------------------------------------------------
// isPrivilege()
//
// Returns a boolean indicating if the supplied value is a valid privilege.
//---------------------------------------------------------------------------
function isPrivilege(value) {
  // Privileges are mutually exclusive and cannot be specified together
  // except SYSPRELIM, which cannot be specified alone, it is specified in a
  // combo with SYSOPER or SYSDBA.  SYSPRELIM is used only for
  // startup/shutdown

  // If SYSPRELIM specified, clear the bit
  if (value & constants.SYSPRELIM) {
    value = value ^ constants.SYSPRELIM;
  }
  return (
    value === constants.SYSASM ||
    value === constants.SYSBACKUP ||
    value === constants.SYSDBA ||
    value === constants.SYSDG ||
    value === constants.SYSKM ||
    value === constants.SYSOPER ||
    value === constants.SYSRAC
  );
}

function isShardingKey(value) {
  if (!Array.isArray(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    const ok = typeof element === 'string' ||
      typeof element === 'number' || Buffer.isBuffer(element) ||
      util.types.isDate(element);
    if (!ok)
      return false;
  }
  return true;
}

function isAppContext(value) {
  if (!Array.isArray(value))
    return false;
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    if (!Array.isArray(element) || element.length !== 3)
      return false;
    for (let j = 0; j < 3; j++) {
      if (typeof element[j] !== 'string')
        return false;
    }
  }
  return true;
}

function isSodaDocument(value) {
  return (value != null && value._sodaDocumentMarker);
}

function isXid(value) {
  return (isObject(value) && Number.isInteger(value.formatId) &&
    (Buffer.isBuffer(value.globalTransactionId) ||
      typeof value.globalTransactionId === 'string') &&
    (Buffer.isBuffer(value.branchQualifier) ||
      typeof value.branchQualifier === 'string'));
}

function normalizeXid(value) {
  let normalizedXid;
  if (Buffer.isBuffer(value.globalTransactionId) &&
    Buffer.isBuffer(value.branchQualifier)) {
    normalizedXid = value;
  } else {
    normalizedXid = {
      formatId: value.formatId,
      globalTransactionId: value.globalTransactionId,
      branchQualifier: value.branchQualifier
    };
    if (typeof value.globalTransactionId === 'string') {
      normalizedXid.globalTransactionId = Buffer.from(value.globalTransactionId);
    }
    if (typeof value.branchQualifier === 'string') {
      normalizedXid.branchQualifier = Buffer.from(value.branchQualifier);
    }
  }
  if (normalizedXid.globalTransactionId.length > 64) {
    errors.throwErr(errors.ERR_INVALID_TRANSACTION_SIZE,
      normalizedXid.globalTransactionId.length);
  }
  if (normalizedXid.branchQualifier.length > 64) {
    errors.throwErr(errors.ERR_INVALID_BRANCH_SIZE,
      normalizedXid.branchQualifier.length);
  }

  return normalizedXid;
}

//---------------------------------------------------------------------------
// isTransactionId()
//
// Validates if the given value is a sessionless transactionId
//---------------------------------------------------------------------------
function isTransactionId(value) {
  return Buffer.isBuffer(value) || (typeof value === 'string');
}

//---------------------------------------------------------------------------
// normalizeTransactionId()
//
// Returns the normalized value of a sessionless transactionId as a buffer
// In case the value is null a random 36-byte UUID buffer is returned
//---------------------------------------------------------------------------
function normalizeTransactionId(value) {
  let normalizedTransactionId = value;
  if (normalizedTransactionId === undefined)
    normalizedTransactionId = crypto.randomUUID();
  if (typeof normalizedTransactionId === 'string') {
    normalizedTransactionId = Buffer.from(normalizedTransactionId);
    const len = normalizedTransactionId.length;
    if ((len === 0) || (len > 64))
      errors.throwErr(errors.ERR_INVALID_TRANSACTION_SIZE, len);
  }
  return normalizedTransactionId;
}

function verifySodaDoc(content) {
  if (isSodaDocument(content))
    return content._impl;
  errors.assertParamValue(isObject(content), 1);
  return Buffer.from(JSON.stringify(content));
}

function isTokenExpired(token) {
  errors.assert(typeof token === 'string', errors.ERR_TOKEN_BASED_AUTH);
  if (token.split('.')[1] === undefined) {
    errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
  }

  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const buff = Buffer.from(base64, 'base64');
  const payloadInit = buff.toString('ascii');

  let expiry = JSON.parse(payloadInit).exp;
  errors.assert(expiry != undefined, errors.ERR_TOKEN_BASED_AUTH);
  expiry = expiry * 1000;

  return (new Date().getTime() > expiry);
}

function isTokenValid(accessToken) {
  switch (typeof accessToken) {
    case 'string':
      if (accessToken === '') {
        errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
      }

      return !isTokenExpired(accessToken);
    case 'object':
      if (accessToken.token === undefined ||
          accessToken.token === '' ||
          accessToken.privateKey === undefined ||
          accessToken.privateKey === '') {
        errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
      }

      return !isTokenExpired(accessToken.token);
    default:
      errors.throwErr(errors.ERR_TOKEN_BASED_AUTH);
  }
}

function denormalizePrivateKey(privateKey) {
  privateKey = privateKey.replace(/\n/g, '');
  privateKey = privateKey.replace('-----BEGIN PRIVATE KEY-----', '');
  privateKey = privateKey.replace('-----END PRIVATE KEY-----', '');
  return privateKey;
}

//-----------------------------------------------------------------------------
// addTypeProperties()
//
// Adds derived properties about the type as a convenience to the user.
// Currently this is only the name of type, which is either the name of the
// database object type (if the value refers to a database object) or the name
// of the Oracle database type.
// -----------------------------------------------------------------------------
function addTypeProperties(obj, attrName) {
  const clsAttrName = attrName + "Class";
  const nameAttrName = attrName + "Name";
  const cls = obj[clsAttrName];
  let dbType = obj[attrName];
  if (typeof dbType === 'number') {
    dbType = obj[attrName] = types.getTypeByNum(dbType);
  }
  if (cls) {
    obj[nameAttrName] = cls.prototype.fqn;
  } else if (dbType) {
    obj[nameAttrName] = dbType.columnTypeName;
  }
}

//-----------------------------------------------------------------------------
// isVectorValue()
//
// Returns true for list of typed arrays supported for vector column types
//
// -----------------------------------------------------------------------------
function isVectorValue(value) {
  return (value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof Int8Array || (Object.getPrototypeOf(value)
      === Uint8Array.prototype) || value instanceof types.SparseVector);
}

//-----------------------------------------------------------------------------
// makeDate()
//
// Returns a date from the given components.
//
// -----------------------------------------------------------------------------
function makeDate(useLocal, year, month, day, hour, minute,
  second, fseconds, offset) {
  if (useLocal) {
    return new Date(year, month - 1, day, hour, minute, second, fseconds);
  }
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second,
    fseconds) - offset * 60000);
}

//---------------------------------------------------------------------------
// sanitize()
//
// this function replaces invalid characters in a string with characters
// guaranteed to be in the Network Character Set.
//---------------------------------------------------------------------------
function sanitize(text) {
  let value = text.split('');

  // if first character is single/double quote
  if ((value[0] === '\'' || value[0] === '"')) {
    value = value.splice(1);
  }

  // if last character is single/double quote
  if ((value[value.length - 1] === '\'' || value[value.length - 1] === '"')) {
    value.pop();
  }

  // look for invalid characters, and replace them with '?'
  // in case of default values and throw an error
  // for user provided values
  for (let i = 0; i < value.length; i++) {
    if (!validNetworkCharacterSet.has(value[i])) {
      value[i] = '?';
    }
  }

  // if last character is a backslash
  if (value[value.length - 1] === '\\') {
    value[value.length - 1] = '?';
  }

  return value.join('');
}

// define exports
module.exports = {
  BINARY_FILE,
  BUILD_FILE,
  PACKAGE_JSON_VERSION,
  RELEASE_DIR,
  STAGING_DIR,
  addTypeProperties,
  assertParamPropNetworkName,
  callbackify,
  denormalizePrivateKey,
  getInstallURL,
  getInstallHelp,
  isArrayOfStrings,
  isObject,
  isObjectOrArray,
  isPrivilege,
  isShardingKey,
  isAppContext,
  isSodaDocument,
  isTokenExpired,
  isTokenValid,
  isTransactionId,
  isVectorValue,
  isXid,
  normalizeTransactionId,
  normalizeXid,
  makeDate,
  sanitize,
  verifySodaDoc,
  wrapFn,
  wrapFns,
  isPemFile
};
