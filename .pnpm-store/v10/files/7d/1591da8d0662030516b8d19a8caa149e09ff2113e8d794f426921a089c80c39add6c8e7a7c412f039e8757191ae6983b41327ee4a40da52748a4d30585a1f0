// Copyright (c) 2015, 2025, Oracle and/or its affiliates.

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

const constants = require('./constants.js');
const nodbUtil = require('./util.js');
const errors = require('./errors.js');
const types = require('./types.js');
const impl = require('./impl');
const process = require('process');
const util = require('util');

// This version of node-oracledb works with Node.js 14.17 or later.
// Note: the checked version is the minimum required for Node-API
// compatibility.  When new Node.js versions are released, older Node.js
// versions are dropped from the node-oracledb test plan.
//
// Keep this code in sync with package/install.js
const vs = process.version.substring(1).split(".").map(Number);
errors.assert(vs[0] > 14 || (vs[0] === 14 && vs[1] >= 17),
  errors.ERR_NODE_TOO_OLD, nodbUtil.PACKAGE_JSON_VERSION, "14.17");

const AqDeqOptions = require('./aqDeqOptions.js');
const AqEnqOptions = require('./aqEnqOptions.js');
const AqMessage = require('./aqMessage.js');
const protocolUtil = require('./thin/protocol/utils.js');
const AqQueue = require('./aqQueue.js');
const future = require('./future.js');
const traceHandler = require('./traceHandler.js');
const BaseDbObject = require('./dbObject.js');
const Connection = require('./connection.js');
const Lob = require('./lob.js');
const Pool = require('./pool.js');
const PoolStatistics = require('./poolStatistics.js');
const ResultSet = require('./resultset.js');
const settings = require('./settings.js');
const SodaDatabase = require('./sodaDatabase.js');
const SodaCollection = require('./sodaCollection.js');
const SodaDocCursor = require('./sodaDocCursor.js');
const SodaDocument = require('./sodaDocument.js');
const SodaOperation = require('./sodaOperation.js');

const poolCache = {};
const tempUsedPoolAliases = {};
const defaultPoolAlias = 'default';
const registeredHooks = [];
const registeredConfigProviderHooks = new Map();
let configProviderCache;

// save arguments for call to initOracleClient()
let _initOracleClientArgs;

// Load the Oracledb binary
function _initCLib(options) {
  // Ensure that webpack compile does not throw any issues or warnings
  // See https://github.com/oracle/node-oracledb/issues/1156
  // and https://github.com/oracle/node-oracledb/issues/1678
  const nodeVer = typeof process !== 'undefined' && process.versions?.node;
  /*global __non_webpack_require__*/  // quieten eslint
  const requireBinary = nodeVer
    ? (typeof __webpack_require__ === 'function')
      ? __non_webpack_require__
      : require
    : undefined;
  const binaryLocations = [
    '../' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,  // pre-built binary
    '../' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BUILD_FILE,   // binary built from source
    '../build/Debug/' + nodbUtil.BUILD_FILE,                    // debug binary
    // Paths for Webpack.
    // Note: to use node-oracledb Thick mode, you will need a Webpack copy plugin to
    // copy 'node_modules/oracledb/build/' to the output directory,
    // see https://github.com/oracle/node-oracledb/issues/1156
    // If you want to use only node-oracledb Thin mode, a copy plugin is not needed.
    './node_modules/oracledb/' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BINARY_FILE,
    './node_modules/oracledb/' + nodbUtil.RELEASE_DIR + '/' + nodbUtil.BUILD_FILE
  ];

  if (options.binaryDir !== undefined) {
    binaryLocations.splice(0, 0, options.binaryDir + '/' + nodbUtil.BINARY_FILE,
      options.binaryDir + '/' + nodbUtil.BUILD_FILE);
  }
  let oracledbCLib;
  for (let i = 0; i < binaryLocations.length; i++) {
    try {
      oracledbCLib = requireBinary(binaryLocations[i]);
      break;
    } catch (err) {
      if (err.code !== 'MODULE_NOT_FOUND' || i == binaryLocations.length - 1) {
        let nodeInfo;
        if (err.code === 'MODULE_NOT_FOUND') {
          // A binary was not found in any of the search directories.
          // Note this message may not be accurate for Webpack users since Webpack changes __dirname
          nodeInfo = `\n  Looked for ${binaryLocations.map(x => require('path').resolve(__dirname, x)).join(', ')}\n  ${nodbUtil.getInstallURL()}\n`;
        } else {
          nodeInfo = `\n  Node.js require('oracledb') error was:\n  ${err.message}\n  ${nodbUtil.getInstallHelp()}\n`;
        }
        errors.throwErr(errors.ERR_CANNOT_LOAD_BINARY, nodeInfo);
      }
    }
  }
  return oracledbCLib;
}

// top-level functions

function _initializeThinDriver() {
  require('./thin');
}

//-----------------------------------------------------------------------------
// _verifyOptions()
//
// Verify that the values passed by the user for connection and pool creation
// options are acceptable. Performs any transformations that are necessary.
//-----------------------------------------------------------------------------
async function _verifyOptions(options, inCreatePool) {

  // define normalized options (value returned to caller)
  const outOptions = {};

  options = await _checkConfigProvider(options);
  // only one of "user" and "username" may be specified (and must be strings)
  if (options.user !== undefined) {
    errors.assertParamPropValue(typeof options.user === 'string', 1, "user");
    outOptions.user = options.user;
  }
  if (options.username !== undefined) {
    errors.assert(outOptions.user === undefined, errors.ERR_DBL_USER);
    errors.assertParamPropValue(typeof options.username === 'string', 1,
      "username");
    outOptions.user = options.username;
  }

  // password must be a string
  if (options.password !== undefined) {
    errors.assertParamPropValue(typeof options.password === 'string', 1,
      "password");
    outOptions.password = options.password;
  }

  // only one of "connectString" and "connectionString" may be specified (and
  // must be strings)
  if (options.connectString !== undefined) {
    errors.assertParamPropValue(typeof options.connectString === 'string', 1,
      "connectString");
    outOptions.connectString = options.connectString;
  }
  if (options.connectionString !== undefined) {
    errors.assert(outOptions.connectString === undefined,
      errors.ERR_DBL_CONNECT_STRING);
    errors.assertParamPropValue(typeof options.connectionString === 'string',
      1, "connectionString");
    outOptions.connectString = options.connectionString;
  }

  // wallet password must be string
  if (options.walletPassword !== undefined) {
    errors.assertParamPropValue(typeof options.walletPassword === 'string', 1,
      "walletPassword");
    outOptions.walletPassword = options.walletPassword;
  }

  //wallet location must be a string
  if (options.walletLocation !== undefined) {
    errors.assertParamPropValue(typeof options.walletLocation === 'string', 1,
      "walletLocation");
    outOptions.walletLocation = options.walletLocation;
  }
  if (options.networkCompression !== undefined) {
    errors.assertParamPropValue(typeof options.networkCompression === 'boolean', 1,
      "networkCompression");
    outOptions.networkCompression = options.networkCompression;
    outOptions.networkCompressionLevels = [];
    outOptions.networkCompressionLevels.push('high');
  }

  if (options.networkCompressionThreshold !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.networkCompressionThreshold), 1, "networkCompressionThreshold");
    outOptions.networkCompressionThreshold = options.networkCompressionThreshold;
  }

  //wallet content must be a string
  if (options.walletContent !== undefined) {
    errors.assertParamPropValue(typeof options.walletContent === 'string', 1,
      "walletContent");
    outOptions.walletContent = options.walletContent;
  }

  // edition must be a string
  if (options.edition !== undefined) {
    errors.assertParamPropValue(typeof options.edition === 'string', 1,
      "edition");
    outOptions.edition = options.edition;
  }

  // stmtCacheSize must be an integer (>= 0)
  if (options.stmtCacheSize !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.stmtCacheSize) &&
      options.stmtCacheSize >= 0, 1, "stmtCacheSize");
    outOptions.stmtCacheSize = options.stmtCacheSize;
  }

  // externalAuth must be a boolean
  outOptions.externalAuth = settings.externalAuth;
  if (options.externalAuth !== undefined) {
    errors.assertParamPropValue(typeof options.externalAuth === 'boolean', 1,
      "externalAuth");
    outOptions.externalAuth = options.externalAuth;
  }

  // events must be a boolean
  if (options.events !== undefined) {
    errors.assertParamPropValue(typeof options.events === 'boolean', 1,
      "events");
    outOptions.events = options.events;
  }

  // poolAlias must be a string
  if (options.poolAlias !== undefined) {
    errors.assertParamPropValue(typeof options.poolAlias === 'string' &&
      options.poolAlias.length > 0, 1, "poolAlias");
    outOptions.poolAlias = options.poolAlias;
  }

  // configDir must be a string
  if (options.configDir !== undefined) {
    errors.assertParamPropValue(typeof options.configDir === 'string',
      1, "configDir");
    outOptions.configDir = options.configDir;
  }

  // sslServerServerCertDN must be a string
  if (options.sslServerCertDN !== undefined) {
    errors.assertParamPropValue(typeof options.sslServerCertDN === 'string',
      1, "sslServerCertDN");
    outOptions.sslServerCertDN = options.sslServerCertDN;
  }

  // sslServerServerDNMatch must be a boolean
  if (options.sslServerDNMatch !== undefined) {
    errors.assertParamPropValue(typeof options.sslServerDNMatch === 'boolean',
      1, "sslServerDNMatch");
    outOptions.sslServerDNMatch = options.sslServerDNMatch;
  }

  // sslAllowWeakDNMatch must be a boolean
  if (options.sslAllowWeakDNMatch !== undefined) {
    errors.assertParamPropValue(typeof options.sslAllowWeakDNMatch === 'boolean',
      1, "sslAllowWeakDNMatch");
    outOptions.sslAllowWeakDNMatch = options.sslAllowWeakDNMatch;
  }
  // httpsProxy must be a string
  if (options.httpsProxy !== undefined) {
    errors.assertParamPropValue(typeof options.httpsProxy === 'string',
      1, "httpsProxy");
    outOptions.httpsProxy = options.httpsProxy;
  }

  // httpsProxyPort must be an integer (>= 0)
  if (options.httpsProxyPort !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.httpsProxyPort) &&
      options.httpsProxyPort >= 0, 1, "httpsProxyPort");
    outOptions.httpsProxyPort = options.httpsProxyPort;
  }

  //retryCount must be an integer (>=0)
  if (options.retryCount !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.retryCount) &&
    options.retryCount >= 0, 1, "retryCount");
    outOptions.retryCount = options.retryCount;
  }

  //retryDelay must be an integer (>=0)
  if (options.retryDelay !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.retryDelay) &&
      options.retryDelay >= 0, 1, "retryDelay");
    outOptions.retryDelay = options.retryDelay;
  }

  // connectTimeout must be an integer (>= 0)
  if (options.connectTimeout !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.connectTimeout) &&
    options.connectTimeout >= 0, 1, "connectTimeout");
    outOptions.connectTimeout = options.connectTimeout;
  }

  // transportConnectTimeout must be an integer (>= 0)
  if (options.transportConnectTimeout !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.transportConnectTimeout) &&
    options.transportConnectTimeout >= 0, 1, "transportConnectTimeout");
    outOptions.transportConnectTimeout = options.transportConnectTimeout;
  }

  // expireTime must be an integer (>= 0)
  if (options.expireTime !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.expireTime) &&
    options.expireTime >= 0, 1, "expireTime");
    outOptions.expireTime = options.expireTime;

  }

  // sdu must be an integer (> 0)
  if (options.sdu !== undefined) {
    errors.assertParamPropValue(Number.isInteger(options.sdu) &&
    options.sdu > 0, 1, "sdu");
    outOptions.sdu = options.sdu;
  }

  // connectionIdPrefix must be a string
  if (options.connectionIdPrefix !== undefined) {
    errors.assertParamPropValue(typeof options.connectionIdPrefix === 'string',
      1, "connectionIdPrefix");
    outOptions.connectionIdPrefix = options.connectionIdPrefix;
  }

  // privilege must be one of a set of named constants
  if (options.privilege !== undefined) {
    errors.assertParamPropValue(nodbUtil.isPrivilege(options.privilege), 1,
      "privilege");
    outOptions.privilege = options.privilege;
  }

  // machine must be a string
  if (options.machine !== undefined) {
    nodbUtil.assertParamPropNetworkName(options, 1, "machine");
    outOptions.machine = options.machine;
  }

  // osUser must be a string
  if (options.osUser !== undefined) {
    nodbUtil.assertParamPropNetworkName(options, 1, "osUser");
    outOptions.osUser = options.osUser;
  }

  // driverName must be a string
  if (options.driverName !== undefined) {
    errors.assertParamPropValue(typeof options.driverName === 'string',
      1, "driverName");
    outOptions.driverName = options.driverName;
  }

  // program must be a string
  if (options.program !== undefined) {
    nodbUtil.assertParamPropNetworkName(options, 1, "program");
    outOptions.program = options.program;
  }

  // terminal must be a string
  if (options.terminal !== undefined) {
    errors.assertParamPropValue(typeof options.terminal === 'string',
      1, "terminal");
    outOptions.terminal = options.terminal;
  }

  // useSNI must be a boolean
  if (options.useSNI !== undefined) {
    errors.assertParamPropValue(typeof options.useSNI === 'boolean', 1,
      "useSNI");
    outOptions.useSNI = options.useSNI;
  }

  // appContext must be an array of array values. The element arrays should
  // have 3 string values (namespace, name and value).
  if (options.appContext !== undefined) {
    const value = options.appContext;
    errors.assertParamPropValue(nodbUtil.isAppContext(value), 1,
      "appContext");
    outOptions.appContext = options.appContext;
  }

  // check pool specific options
  if (inCreatePool) {

    // poolMax must be an integer > 0
    if (options.poolMax !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolMax) &&
        options.poolMax > 0, 1, "poolMax");
      outOptions.poolMax = options.poolMax;
    }

    // poolMaxPerShard must be an integer >= 0
    if (options.poolMaxPerShard !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolMaxPerShard) &&
        options.poolMaxPerShard >= 0, 1, "poolMaxPerShard");
      outOptions.poolMaxPerShard = options.poolMaxPerShard;
    }

    // poolMin must be an integer >= 0
    if (options.poolMin !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolMin) &&
        options.poolMin >= 0, 1, "poolMin");
      outOptions.poolMin = options.poolMin;
    }

    // poolIncrement must be an integer >= 0
    if (options.poolIncrement !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolIncrement) &&
        options.poolIncrement >= 0, 1, "poolIncrement");
      outOptions.poolIncrement = options.poolIncrement;
    }

    // poolTimeout must be an integer >= 0
    if (options.poolTimeout !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolTimeout) &&
        options.poolTimeout >= 0, 1, "poolTimeout");
      outOptions.poolTimeout = options.poolTimeout;
    }

    // poolPingInterval must be an integer
    if (options.poolPingInterval !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolPingInterval) &&
        options.poolPingInterval >= -2147483648 &&
        options.poolPingInterval <= 2147483647, 1, "poolPingInterval");
      outOptions.poolPingInterval = options.poolPingInterval;
    }

    // poolPingTimeout must be an integer (>= 0)
    if (options.poolPingTimeout !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.poolPingTimeout) &&
    options.poolPingTimeout >= 0, 1, "poolPingTimeout");
      outOptions.poolPingTimeout = options.poolPingTimeout;
    }

    // maxLifeTime must be an unsigned integer
    if (options.maxLifetimeSession !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.maxLifetimeSession) &&
    options.maxLifetimeSession >= 0, 1, "maxLifetimeSession");
      outOptions.maxLifetimeSession = options.maxLifetimeSession;
    }

    // homogeneous must be a boolean (and defaults to True)
    outOptions.homogeneous = true;
    if (options.homogeneous !== undefined) {
      errors.assertParamPropValue(typeof options.homogeneous === 'boolean', 1,
        "homogeneous");
      outOptions.homogeneous = options.homogeneous;
    }

    // queueTimeout must be an integer >= 0
    if (options.queueTimeout !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.queueTimeout) &&
        options.queueTimeout >= 0, 1, "queueTimeout");
      outOptions.queueTimeout = options.queueTimeout;
    }

    // queueMax must be an integer
    if (options.queueMax !== undefined) {
      errors.assertParamPropValue(Number.isInteger(options.queueMax), 1,
        "queueMax");
      outOptions.queueMax = options.queueMax;
    }

    // sodaMetaDataCache must be a boolean (and defaults to True)
    outOptions.sodaMetaDataCache = false;
    if (options.sodaMetaDataCache !== undefined) {
      errors.assertParamPropValue(typeof options.sodaMetaDataCache ===
        'boolean', 1, "sodaMetaDataCache");
      outOptions.sodaMetaDataCache = options.sodaMetaDataCache;
    }

    // sessionCallback must be a function or a string
    if (options.sessionCallback !== undefined) {
      errors.assertParamPropValue(typeof options.sessionCallback === 'string' ||
        typeof options.sessionCallback === 'function', 1, "sessionCallback");
      outOptions.sessionCallback = options.sessionCallback;
    }

    // enableStatistics must be a boolean (_enableStats is DEPRECATED)
    outOptions.enableStatistics = false;
    if (options.enableStatistics !== undefined) {
      errors.assertParamPropValue(typeof options.enableStatistics ===
        'boolean', 1, "enableStatistics");
      outOptions.enableStatistics = options.enableStatistics;
    }
    if (!outOptions.enableStatistics && options._enableStats !== undefined) {
      errors.assertParamPropValue(typeof options._enableStats === 'boolean', 1,
        "_enableStats");
      outOptions.enableStatistics = options._enableStats;
    }

  // check connection creation specific options
  } else {

    // newPassword must be a string
    if (options.newPassword !== undefined) {
      errors.assertParamPropValue(typeof options.newPassword === 'string', 1,
        "newPassword");
      outOptions.newPassword = options.newPassword;
    }

    // shardingKey must be an array of values
    if (options.shardingKey !== undefined) {
      const value = options.shardingKey;
      errors.assertParamPropValue(nodbUtil.isShardingKey(value), 1,
        "shardingKey");
      outOptions.shardingKey = options.shardingKey;
    }

    // superShardingKey must be an array of values
    if (options.superShardingKey !== undefined) {
      const value = options.superShardingKey;
      errors.assertParamPropValue(nodbUtil.isShardingKey(value), 1,
        "superShardingKey");
      outOptions.superShardingKey = options.superShardingKey;
    }

  }

  // check access token
  if (options.accessToken !== undefined) {

    // cannot set username or password for token based authentication
    errors.assert(outOptions.user === undefined &&
      outOptions.password === undefined, errors.ERR_TOKEN_BASED_AUTH);

    // homogenous (for pool) and externalAuth (both) must be set
    if (inCreatePool) {
      errors.assert(outOptions.homogeneous && outOptions.externalAuth,
        errors.ERR_POOL_TOKEN_BASED_AUTH);
    } else {
      errors.assert(outOptions.externalAuth, errors.ERR_CONN_TOKEN_BASED_AUTH);
    }

    // check the token is valid
    let accessToken;
    if (typeof options.accessToken === 'function') {
      outOptions.accessTokenFn = options.accessToken;
      outOptions.accessTokenConfig = options.accessTokenConfig;
      try {
        accessToken = await options.accessToken(false, outOptions.accessTokenConfig);
        if (!nodbUtil.isTokenValid(accessToken)) {
          accessToken = await options.accessToken(true, outOptions.accessTokenConfig);
        }
      } catch (error) {
        errors.throwWrapErr(error, errors.ERR_ACCESS_TOKEN);
      }
    } else {
      accessToken = options.accessToken;
    }
    errors.assert(nodbUtil.isTokenValid(accessToken),
      errors.ERR_TOKEN_HAS_EXPIRED);
    if (accessToken.privateKey !== undefined) {
      errors.assert(typeof accessToken.privateKey === 'string', errors.ERR_TOKEN_BASED_AUTH);
      accessToken.privateKey = nodbUtil.denormalizePrivateKey(accessToken.privateKey);
    }

    // store token and privatekey
    if (typeof accessToken === 'string') {
      outOptions.token = accessToken;
    } else {
      outOptions.token = accessToken.token;
      outOptions.privateKey = accessToken.privateKey;
    }

  }

  // Check external Auth config.
  // Allow Session User enclosed in [] for proxy authentication.
  if (outOptions.token === undefined && outOptions.externalAuth) {
    if (outOptions.password) {
      errors.throwErr(errors.ERR_WRONG_CRED_FOR_EXTAUTH);
    }
    if (outOptions.user) {
      if (inCreatePool) {
        errors.throwErr(errors.ERR_WRONG_CRED_FOR_EXTAUTH);
      } else if (outOptions.user[0] !== '[' || outOptions.user.slice(-1) !== ']') {
        // username is not enclosed in [].
        errors.throwErr(errors.ERR_WRONG_USER_FORMAT_EXTAUTH_PROXY);
      }
    }
  }

  return outOptions;
}


//-----------------------------------------------------------------------------
// createPool()
//
// Create a pool with the specified options and return it to the caller.
//-----------------------------------------------------------------------------
async function createPool(options) {
  let poolAlias;

  // check arguments
  errors.assertArgCount(arguments, 1, 1);
  errors.assertParamValue(nodbUtil.isObject(options), 1);

  // this will invoke hookFn() written in application side.
  // for token based auth it will generate access token and save it in options.
  for (const hookFn of registeredHooks) {
    // eslint-disable-next-line no-useless-catch
    try {
      await hookFn(options);
    } catch (error) {
      errors.throwWrapErr(error, errors.ERR_CALLOUT_FN);
    }
  }

  options = await _verifyOptions(options, true);
  const sessionCallback = options.sessionCallback;
  if (typeof sessionCallback === 'function')
    delete options.sessionCallback;

  // determine pool alias
  if (options.poolAlias !== undefined) {
    poolAlias = options.poolAlias;
  } else if (options.poolAlias === undefined
      && !poolCache[defaultPoolAlias]
      && !tempUsedPoolAliases[defaultPoolAlias]) {
    poolAlias = defaultPoolAlias;
  }
  if (poolCache[poolAlias] || tempUsedPoolAliases[poolAlias]) {
    errors.throwErr(errors.ERR_POOL_WITH_ALIAS_ALREADY_EXISTS, poolAlias);
  }

  // add defaults to options, if needed
  settings.addToOptions(options,
    "connectionClass",
    "driverName",
    "edition",
    "events",
    "externalAuth",
    "machine",
    "osUser",
    "stmtCacheSize",
    "poolMax",
    "poolMaxPerShard",
    "poolMin",
    "poolIncrement",
    "poolTimeout",
    "poolPingInterval",
    "poolPingTimeout",
    "program",
    "terminal",
    "queueMax",
    "queueTimeout");

  // poolMax must be greater than or equal to poolMin
  if (options.poolMin > options.poolMax) {
    errors.throwErr(errors.ERR_INVALID_NUMBER_OF_CONNECTIONS, options.poolMax,
      options.poolMin);
  }

  // initialize the Oracle client, if necessary
  if (_initOracleClientArgs === undefined && !settings.thinDriverInitialized) {
    _initializeThinDriver();
  }

  // Need to prevent another call in the same stack from succeeding, otherwise
  // two pools could be created with the same poolAlias and the second one that
  // comes back would overwrite the first in the cache.
  if (poolAlias) {
    tempUsedPoolAliases[poolAlias] = true;
  }

  // create the pool, ensuring that the temporary pool alias cache is removed
  // once this has completed (either successfully or unsuccessfully)
  const pool = new Pool();
  pool._impl._connectString = options.connectString;
  pool._impl._user = options.user;
  try {
    await pool._impl.create(options);
  } finally {
    if (poolAlias) {
      delete tempUsedPoolAliases[poolAlias];
    }
  }

  if (poolAlias) {
    poolCache[poolAlias] = pool;
  }

  pool._setup(options, poolAlias);
  pool._sessionCallback = sessionCallback;
  pool.on('_afterPoolClose', () => {
    if (pool.poolAlias) {
      delete poolCache[pool.poolAlias];
    }
  });
  if (_initOracleClientArgs === undefined) {
    settings.thinDriverInitialized = true;
  }

  return pool;
}

//-----------------------------------------------------------------------------
// getNetworkServiceNames()
//
// Returns a list of the network service names found in the
// tnsnames.ora file which is inside the directory
// configDir or the $TNS_ADMIN dir
// If a tnsnames.ora file does not exist, then an exception is raised
//-----------------------------------------------------------------------------
async function getNetworkServiceNames(configDir) {
  const { NLParamParser, tnsnamesFilePath } = require('./thin/sqlnet/paramParser.js');
  const nlParamParser =  new NLParamParser;
  const filePath = tnsnamesFilePath(configDir);
  const aliasht = await nlParamParser.initializeNlpa(filePath);
  const keysArr = [ ...aliasht.keys() ];
  return keysArr;
}

//-----------------------------------------------------------------------------
// getConnection()
//
// Gets either a standalone connection, or a connection from a pool (stored in
// the pool cache).
//-----------------------------------------------------------------------------
async function getConnection(a1) {
  let options = {};
  let poolAlias;

  // determine if the connection should be acquired from a pool
  errors.assertArgCount(arguments, 0, 1);
  if (arguments.length == 0) {
    poolAlias = defaultPoolAlias;
  } else if (typeof a1 === 'string') {
    poolAlias = a1;
  } else {
    options = a1;
    errors.assertParamValue(nodbUtil.isObject(options), 1);
    poolAlias = options.poolAlias;
  }
  if (poolAlias) {
    const pool = poolCache[poolAlias];
    errors.assert(pool, errors.ERR_POOL_WITH_ALIAS_NOT_FOUND, poolAlias);
    return await pool.getConnection(options);
  }

  // this will invoke hookFn() written in application side.
  // for token based auth it will generate access token and save it in options.
  for (const hookFn of registeredHooks) {
    // eslint-disable-next-line no-useless-catch
    try {
      await hookFn(options);
    } catch (error) {
      errors.throwWrapErr(error, errors.ERR_CALLOUT_FN);
    }
  }

  // create a standalone connection
  options = await _verifyOptions(options, false);
  settings.addToOptions(options,
    "connectionClass",
    "driverName",
    "edition",
    "events",
    "externalAuth",
    "machine",
    "osUser",
    "program",
    "stmtCacheSize",
    "terminal");
  if (_initOracleClientArgs === undefined && !settings.thinDriverInitialized) {
    _initializeThinDriver();
  }
  const conn = new Connection();
  conn._impl = new impl.ConnectionImpl();

  conn._impl._connectString = options.connectString;
  conn._impl._user = options.user;
  await conn._impl.connect(options);
  if (_initOracleClientArgs === undefined) {
    settings.thinDriverInitialized = true;
  }
  return conn;
}

//-----------------------------------------------------------------------------
// getPool()
//
// Returns a pool for the given alias.
//-----------------------------------------------------------------------------
function getPool(poolAlias) {

  errors.assertArgCount(arguments, 0, 1);

  if (poolAlias) {
    errors.assertParamValue(typeof poolAlias === 'string' ||
        typeof poolAlias === 'number', 1);
  }

  poolAlias = poolAlias || defaultPoolAlias;

  const pool = poolCache[poolAlias];

  if (!pool) {
    errors.throwErr(errors.ERR_POOL_WITH_ALIAS_NOT_FOUND, poolAlias);
  }

  return pool;
}

//-----------------------------------------------------------------------------
// initOracleClient()
//
// Initializes the Oracle Client.
//-----------------------------------------------------------------------------
function initOracleClient(arg1) {
  let options = {};
  errors.assertArgCount(arguments, 0, 1);
  if (arg1 !== undefined) {
    errors.assertParamValue(nodbUtil.isObject(arg1), 1);
    options = {...arg1};
    errors.assertParamPropString(options, 1, "libDir");
    errors.assertParamPropString(options, 1, "configDir");
    errors.assertParamPropString(options, 1, "errorUrl");
    errors.assertParamPropString(options, 1, "driverName");
    errors.assertParamPropString(options, 1, "binaryDir");
  }
  if (settings.thinDriverInitialized) {
    errors.throwErr(errors.ERR_THIN_CONNECTION_ALREADY_CREATED);
  }
  if (_initOracleClientArgs === undefined) {
    const oracledbCLib = _initCLib(options);
    if (options.driverName === undefined)
      options.driverName = constants.DEFAULT_DRIVER_NAME + " thk";
    if (options.errorUrl === undefined)
      options.errorUrl = constants.DEFAULT_ERROR_URL;
    try {
      oracledbCLib.initOracleClient(options, impl, settings);
    } catch (err) {
      const newErr = errors.transformErr(err);
      if (newErr.code === "DPI-1047") {
        newErr.message += "\n" + nodbUtil.getInstallHelp();
      }
      throw newErr;
    }
    _initOracleClientArgs = arg1 || {};
  } else if (!util.isDeepStrictEqual(_initOracleClientArgs, options)) {
    errors.throwErr(errors.ERR_INIT_ORACLE_CLIENT_ARGS);
  }

  // driver mode initialization
  // _initOracleClientArgs is populated and thin connection not created
  settings.thin = false;
}


//-----------------------------------------------------------------------------
// shutdown()
//
// Shuts down the database.
//-----------------------------------------------------------------------------
async function shutdown(a1, a2) {
  let connAttr = {};
  let shutdownMode = constants.SHUTDOWN_MODE_DEFAULT;

  // verify the number and types of arguments
  errors.assertArgCount(arguments, 0, 2);
  if (arguments.length == 2) {
    errors.assertParamValue(typeof a1 === 'object', 1);
    errors.assertParamValue(typeof a2 === 'number', 2);
    connAttr = a1;
    shutdownMode = a2;
  } else if (arguments.length == 1) {
    errors.assertParamValue(typeof a1 === 'object', 1);
    connAttr = a1;
  }

  // only look for the keys that are used for shutting down the database
  // use SYSOPER privilege
  const dbConfig = {
    user: connAttr.user,
    password: connAttr.password,
    connectString: connAttr.connectString,
    connectionString: connAttr.connectionString,
    externalAuth: connAttr.externalAuth,
    privilege: constants.SYSOPER
  };

  const conn = await this.getConnection(dbConfig);
  await conn.shutdown(shutdownMode);
  if (shutdownMode != this.SHUTDOWN_MODE_ABORT) {
    await conn.execute("ALTER DATABASE CLOSE");
    await conn.execute("ALTER DATABASE DISMOUNT");
    await conn.shutdown(this.SHUTDOWN_MODE_FINAL);
  }
  await conn.close();
}

async function _setConfigParameters(obj, credential, configProvider) {
  const configObject = {};
  const pmSection = 'njs';
  const params = obj[pmSection];
  for (const key in params) {
    const val = params[key];
    configObject[key] = val;
  }
  configObject.connectString = obj.connect_descriptor;
  if (!configObject.connectString)
    errors.throwErr(errors.ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG, 'connect_descriptor must be set');

  configObject.user = obj.user;
  if (obj.password) {
    configObject.password = await _retrieveParamValueFromVault(obj['password'], credential, configProvider);
  }
  if (obj.wallet_location) {
    // retrieve wallet_location
    configObject.walletContent = await _retrieveParamValueFromVault(obj['wallet_location'], credential, configProvider);
    //only Pem file supported
    if (!nodbUtil.isPemFile(configObject.walletContent))
      errors.throwErr(errors.ERR_WALLET_TYPE_NOT_SUPPORTED);
  }
  return configObject;
}

async function _retrieveParamValueFromVault(paramObj, credential, configProvider) {
  const paramMap = new Map();
  const auth = paramObj.authentication;
  if (auth) {
    for (const key in auth) {
      if (key == 'method')
        paramMap.set('authentication', auth[key]);
      const val = auth[key];
      paramMap.set(key.toLowerCase(), val);
    }
  }
  const args = {};
  if (paramObj.type == "base64") {
    console.log("WARNING: Base64 Encoding in a JSON Password should only be used in development environments");
    return Buffer.from(paramObj.value, "base64").toString("utf-8");
  } else if (paramObj.type == "text") {
    if (configProvider == 'azurevault' || configProvider == 'ocivault') {
      console.log("WARNING: Plain Text in a JSON Password should only be used in development environments");
      return paramObj.value;
    } else
      errors.throwErr(errors.ERR_CONFIG_PROVIDER_PARAM_TYPE, 'password type text is only allowed in ocivault and azurevault');
  } else if (paramObj.type == "azurevault") {
    paramMap.set('azuresecreturl', paramObj.value);
    if (!(configProvider == 'azure' || configProvider == 'azurevault'))
      credential = null;
    const hookFn = registeredConfigProviderHooks['azurevault'];
    if (hookFn == undefined)
      errors.throwErr(errors.ERR_REGISTER_HOOKFN_CONFIGPROVIDER, 'azurevault');
    args.credential = credential;
    args.paramMap = paramMap;
    const vaultReturn = await hookFn(args);
    const paramValue = vaultReturn[0];
    return paramValue;

  } else if (paramObj.type == "ocivault") {

    paramMap.set('ocidvault', paramObj.value);
    if (!(configProvider == 'ociobject' || configProvider == 'ocivault'))
      credential = null;
    const hookFn = registeredConfigProviderHooks['ocivault'];
    if (hookFn == undefined)
      errors.throwErr(errors.ERR_REGISTER_HOOKFN_CONFIGPROVIDER, 'ocivault');
    const args = {};
    args.credential = credential;
    args.paramMap = paramMap;
    const vaultReturn = await hookFn(args);
    const paramValue = vaultReturn[0];
    return paramValue;
  }  else {
    errors.throwErr(errors.ERR_CONFIG_PROVIDER_PARAM_TYPE, 'password/wallet_location');
  }
}
//-----------------------------------------------------------------------------
// _checkConfigProvider()
//
// Look for the config provider in the connection string and retreives
// object stored in the config Provider.
// Returns object based on precedence between input object and the one retrieved
// from Config Provider.
//-----------------------------------------------------------------------------
async function _checkConfigProvider(options) {
  // Time for Cache entries to be deleted in milliseconds
  const cacheEntriesDuration = settings.configProviderCacheTimeout * 1000;
  let secondOpts;
  const url = options.connectString || options.connectionString;
  if (!url)
    return options;

  if (configProviderCache && configProviderCache.has(url) && ((Date.now() - configProviderCache.get(url).timeAdded) < cacheEntriesDuration)) {
    const cacheOpts1 = configProviderCache.get(url).cacheOpts;
    secondOpts = { ...cacheOpts1};

    //deobfuscate password
    if (secondOpts.password)
      secondOpts.password = protocolUtil.getDeobfuscatedValue(secondOpts.password.value, secondOpts.password.obfuscatedValue);

    //deobfuscate walletContent
    if (secondOpts.walletContent)
      secondOpts.walletContent = protocolUtil.getDeobfuscatedValue(secondOpts.walletContent.value, secondOpts.walletContent.obfuscatedValue);

  } else {
    let parsedUrl = url;
    let urlExtendedPart;
    const baseRegex = new RegExp("^config-(?<provider>[A-Za-z0-9]+)(://)(?<provider_arg>[^?]+)");
    if (url.indexOf('?') != -1) {
      parsedUrl = url.substring(0, url.indexOf('?'));
      urlExtendedPart = url.substring(url.indexOf('?'), url.length); //extended part
    }
    const match = parsedUrl.match(baseRegex);
    if (match) {
      const provider = match.groups.provider;
      const provider_arg = match.groups.provider_arg;
      const hookFn = registeredConfigProviderHooks[provider];
      if (hookFn == undefined)
        errors.throwErr(errors.ERR_REGISTER_HOOKFN_CONFIGPROVIDER, provider);
      const args = {};
      args.provider_arg = provider_arg;
      args.urlExtendedPart = urlExtendedPart;

      try {
      // hookFn returns an array with first element as the config stored in the configProvider
      // second being the credential to the configProvider
        const configProviderReturn = await hookFn(args);
        secondOpts = configProviderReturn[0];
        if (!configProviderCache) {
          configProviderCache = new Map();
        }
        if (!secondOpts) {
          errors.throwErr(errors.ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG, 'no configuration found in ' + provider);
        }
        if (provider != 'azure')
          secondOpts = await _setConfigParameters(secondOpts, configProviderReturn[1], provider);

        // obfuscate password & walletcontent and store config in the cache
        const cacheOpts = { ...secondOpts};
        if (secondOpts.password)
          cacheOpts.password = protocolUtil.setObfuscatedValue(secondOpts.password);
        if (secondOpts.walletContent)
          cacheOpts.walletContent = protocolUtil.setObfuscatedValue(secondOpts.walletContent);
        configProviderCache.set(url, { cacheOpts, timeAdded: Date.now()});
      } catch (err) {
        errors.throwErr(errors.ERR_CONFIG_PROVIDER_FAILED_TO_RETRIEVE_CONFIG, err.message);
      }
    }
  }
  if (secondOpts) {
    options = modifyOptionsPrecedence(secondOpts, options);
  }
  return options;
}
/**
  * Sets precedence for different parameters in cloudConfig/userConfig
  * @param {cloudConfig} object - object retreived from cloud
  * @param {userConfig} object -  user input Object
  */
function modifyOptionsPrecedence(cloudConfig, userConfig) {
  // create a copy of userConfig object
  userConfig = { ...userConfig };
  if (!userConfig.user)
    userConfig.user = cloudConfig.user;
  if (!userConfig.password)
    userConfig.password = cloudConfig.password;
  if (cloudConfig.connectString) {
    userConfig.connectString = cloudConfig.connectString;
    userConfig.connectionString = undefined;
  }
  if (cloudConfig.walletContent)
    userConfig.walletContent = cloudConfig.walletContent;
  if (cloudConfig.poolMin)
    userConfig.poolMin = cloudConfig.poolMin;
  if (cloudConfig.poolMax)
    userConfig.poolMax = cloudConfig.poolMax;
  if (cloudConfig.poolIncrement)
    userConfig.poolIncrement = cloudConfig.poolIncrement;
  if (cloudConfig.poolTimeout)
    userConfig.poolTimeout = cloudConfig.poolTimeout;
  if (cloudConfig.poolPingInterval)
    userConfig.poolPingInterval = cloudConfig.poolPingInterval;
  if (cloudConfig.poolPingTimeout)
    userConfig.poolPingTimeout = cloudConfig.poolPingTimeout;
  if (cloudConfig.stmtCacheSize)
    userConfig.stmtCacheSize = cloudConfig.stmtCacheSize;
  if (cloudConfig.prefetchRows)
    userConfig.prefetchRows = cloudConfig.prefetchRows;
  if (cloudConfig.lobPrefetch)
    userConfig.lobPrefetch = cloudConfig.lobPrefetch;

  return userConfig;

}
//-----------------------------------------------------------------------------
// startup()
//
// Starts up the database.
//-----------------------------------------------------------------------------
async function startup(a1, a2) {
  let connAttr = {};
  let startupAttr = {};

  // verify the number and types of arguments
  errors.assertArgCount(arguments, 0, 2);
  if (arguments.length == 2) {
    errors.assertParamValue(typeof a1 === 'object', 1);
    errors.assertParamValue(typeof a2 === 'object', 2);
    connAttr = a1;
    startupAttr = a2;
  } else if (arguments.length == 1) {
    errors.assertParamValue(typeof a1 === 'object', 1);
    connAttr = a1;
  }

  // only look for the keys that are used for starting up the database
  // use SYSOPER and SYSPRELIM privileges
  const dbConfig = {
    user: connAttr.user,
    password: connAttr.password,
    connectString: connAttr.connectString,
    connectionString: connAttr.connectionString,
    externalAuth: connAttr.externalAuth,
    privilege: this.SYSOPER | this.SYSPRELIM
  };

  let conn = await this.getConnection(dbConfig);
  await conn.startup(startupAttr);
  await conn.close();

  dbConfig.privilege = this.SYSOPER;
  conn = await this.getConnection(dbConfig);
  await conn.execute("ALTER DATABASE MOUNT");
  await conn.execute("ALTER DATABASE OPEN");
  await conn.close();
}

//-----------------------------------------------------------------------------
// registerProcessConfigurationHook()
//
// Registers extension modules and registered modules will be called and
// executed during pool and standalone connection creation.
//-----------------------------------------------------------------------------
function registerProcessConfigurationHook(fn) {
  errors.assertArgCount(arguments, 1, 1);
  errors.assertParamValue(typeof fn === 'function', 1);
  registeredHooks.push(fn);
}

//-----------------------------------------------------------------------------
// registerConfigurationProviderHook()
//
// Registers Configuration Provider plugin modules and registered modules will
// be called and executed during pool and standalone connection creation.
//-----------------------------------------------------------------------------
function registerConfigurationProviderHook(configProvider, fn) {
  errors.assertArgCount(arguments, 2, 2);
  errors.assertParamValue(typeof fn === 'function', 1);
  errors.assertParamValue(typeof configProvider === 'string', 1);
  registeredConfigProviderHooks[configProvider] = fn;
}

// module exports
module.exports = {

  // classes
  AqDeqOptions,
  AqEnqOptions,
  AqMessage,
  AqQueue,
  BaseDbObject,
  Connection,
  JsonId: types.JsonId,
  Lob,
  Pool,
  PoolStatistics,
  ResultSet,
  SodaDatabase,
  SodaCollection,
  SodaDocCursor,
  SodaDocument,
  SodaOperation,
  SparseVector: types.SparseVector,
  IntervalYM: types.IntervalYM,
  IntervalDS: types.IntervalDS,

  // top-level functions
  getConnection: nodbUtil.callbackify(nodbUtil.wrapFn(getConnection)),
  createPool: nodbUtil.callbackify(nodbUtil.wrapFn(createPool)),
  getNetworkServiceNames: nodbUtil.callbackify(nodbUtil.wrapFn(getNetworkServiceNames)),
  getPool,
  initOracleClient,
  registerProcessConfigurationHook,
  registerConfigurationProviderHook,
  shutdown: nodbUtil.callbackify(nodbUtil.wrapFn(shutdown)),
  startup: nodbUtil.callbackify(nodbUtil.wrapFn(startup)),

  // CQN operation codes
  CQN_OPCODE_ALL_OPS: constants.CQN_OPCODE_ALL_OPS,
  CQN_OPCODE_ALL_ROWS: constants.CQN_OPCODE_ALL_ROWS,
  CQN_OPCODE_ALTER: constants.CQN_OPCODE_ALTER,
  CQN_OPCODE_DELETE: constants.CQN_OPCODE_DELETE,
  CQN_OPCODE_DROP: constants.CQN_OPCODE_DROP,
  CQN_OPCODE_INSERT: constants.CQN_OPCODE_INSERT,
  CQN_OPCODE_UPDATE: constants.CQN_OPCODE_UPDATE,

  // database types
  DB_TYPE_BFILE: types.DB_TYPE_BFILE,
  DB_TYPE_BINARY_DOUBLE: types.DB_TYPE_BINARY_DOUBLE,
  DB_TYPE_BINARY_FLOAT: types.DB_TYPE_BINARY_FLOAT,
  DB_TYPE_BINARY_INTEGER: types.DB_TYPE_BINARY_INTEGER,
  DB_TYPE_BLOB: types.DB_TYPE_BLOB,
  DB_TYPE_BOOLEAN: types.DB_TYPE_BOOLEAN,
  DB_TYPE_CHAR: types.DB_TYPE_CHAR,
  DB_TYPE_CLOB: types.DB_TYPE_CLOB,
  DB_TYPE_CURSOR: types.DB_TYPE_CURSOR,
  DB_TYPE_DATE: types.DB_TYPE_DATE,
  DB_TYPE_INTERVAL_DS: types.DB_TYPE_INTERVAL_DS,
  DB_TYPE_INTERVAL_YM: types.DB_TYPE_INTERVAL_YM,
  DB_TYPE_JSON: types.DB_TYPE_JSON,
  DB_TYPE_LONG: types.DB_TYPE_LONG,
  DB_TYPE_LONG_NVARCHAR: types.DB_TYPE_LONG_NVARCHAR,
  DB_TYPE_LONG_RAW: types.DB_TYPE_LONG_RAW,
  DB_TYPE_NCHAR: types.DB_TYPE_NCHAR,
  DB_TYPE_NCLOB: types.DB_TYPE_NCLOB,
  DB_TYPE_NUMBER: types.DB_TYPE_NUMBER,
  DB_TYPE_NVARCHAR: types.DB_TYPE_NVARCHAR,
  DB_TYPE_OBJECT: types.DB_TYPE_OBJECT,
  DB_TYPE_RAW: types.DB_TYPE_RAW,
  DB_TYPE_ROWID: types.DB_TYPE_ROWID,
  DB_TYPE_TIMESTAMP: types.DB_TYPE_TIMESTAMP,
  DB_TYPE_TIMESTAMP_LTZ: types.DB_TYPE_TIMESTAMP_LTZ,
  DB_TYPE_TIMESTAMP_TZ: types.DB_TYPE_TIMESTAMP_TZ,
  DB_TYPE_VARCHAR: types.DB_TYPE_VARCHAR,
  DB_TYPE_XMLTYPE: types.DB_TYPE_XMLTYPE,
  DB_TYPE_VECTOR: types.DB_TYPE_VECTOR,

  // fetchInfo type defaulting
  DEFAULT: constants.DEFAULT,

  // statement types
  STMT_TYPE_UNKNOWN: constants.STMT_TYPE_UNKNOWN,
  STMT_TYPE_SELECT: constants.STMT_TYPE_SELECT,
  STMT_TYPE_UPDATE: constants.STMT_TYPE_UPDATE,
  STMT_TYPE_DELETE: constants.STMT_TYPE_DELETE,
  STMT_TYPE_INSERT: constants.STMT_TYPE_INSERT,
  STMT_TYPE_CREATE: constants.STMT_TYPE_CREATE,
  STMT_TYPE_DROP: constants.STMT_TYPE_DROP,
  STMT_TYPE_ALTER: constants.STMT_TYPE_ALTER,
  STMT_TYPE_BEGIN: constants.STMT_TYPE_BEGIN,
  STMT_TYPE_DECLARE: constants.STMT_TYPE_DECLARE,
  STMT_TYPE_CALL: constants.STMT_TYPE_CALL,
  STMT_TYPE_EXPLAIN_PLAN: constants.STMT_TYPE_EXPLAIN_PLAN,
  STMT_TYPE_MERGE: constants.STMT_TYPE_MERGE,
  STMT_TYPE_ROLLBACK: constants.STMT_TYPE_ROLLBACK,
  STMT_TYPE_COMMIT: constants.STMT_TYPE_COMMIT,

  // shutdown modes
  SHUTDOWN_MODE_DEFAULT: constants.SHUTDOWN_MODE_DEFAULT,
  SHUTDOWN_MODE_TRANSACTIONAL: constants.SHUTDOWN_MODE_TRANSACTIONAL,
  SHUTDOWN_MODE_TRANSACTIONAL_LOCAL:
      constants.SHUTDOWN_MODE_TRANSACTIONAL_LOCAL,
  SHUTDOWN_MODE_IMMEDIATE: constants.SHUTDOWN_MODE_IMMEDIATE,
  SHUTDOWN_MODE_ABORT: constants.SHUTDOWN_MODE_ABORT,
  SHUTDOWN_MODE_FINAL: constants.SHUTDOWN_MODE_FINAL,

  // startup modes
  STARTUP_MODE_DEFAULT: constants.STARTUP_MODE_DEFAULT,
  STARTUP_MODE_FORCE: constants.STARTUP_MODE_FORCE,
  STARTUP_MODE_RESTRICT: constants.STARTUP_MODE_RESTRICT,

  // subscription event types
  SUBSCR_EVENT_TYPE_SHUTDOWN: constants.SUBSCR_EVENT_TYPE_SHUTDOWN,
  SUBSCR_EVENT_TYPE_SHUTDOWN_ANY: constants.SUBSCR_EVENT_TYPE_SHUTDOWN_ANY,
  SUBSCR_EVENT_TYPE_STARTUP: constants.SUBSCR_EVENT_TYPE_STARTUP,
  SUBSCR_EVENT_TYPE_DEREG: constants.SUBSCR_EVENT_TYPE_DEREG,
  SUBSCR_EVENT_TYPE_OBJ_CHANGE: constants.SUBSCR_EVENT_TYPE_OBJ_CHANGE,
  SUBSCR_EVENT_TYPE_QUERY_CHANGE: constants.SUBSCR_EVENT_TYPE_QUERY_CHANGE,
  SUBSCR_EVENT_TYPE_AQ: constants.SUBSCR_EVENT_TYPE_AQ,

  // subscription grouping classes
  SUBSCR_GROUPING_CLASS_TIME: constants.SUBSCR_GROUPING_CLASS_TIME,

  // subscription grouping types
  SUBSCR_GROUPING_TYPE_SUMMARY: constants.SUBSCR_GROUPING_TYPE_SUMMARY,
  SUBSCR_GROUPING_TYPE_LAST: constants.SUBSCR_GROUPING_TYPE_LAST,

  // subscription namespaces
  SUBSCR_NAMESPACE_AQ: constants.SUBSCR_NAMESPACE_AQ,
  SUBSCR_NAMESPACE_DBCHANGE: constants.SUBSCR_NAMESPACE_DBCHANGE,

  // subscription quality of service flags
  SUBSCR_QOS_BEST_EFFORT: constants.SUBSCR_QOS_BEST_EFFORT,
  SUBSCR_QOS_DEREG_NFY: constants.SUBSCR_QOS_DEREG_NFY,
  SUBSCR_QOS_QUERY: constants.SUBSCR_QOS_QUERY,
  SUBSCR_QOS_RELIABLE: constants.SUBSCR_QOS_RELIABLE,
  SUBSCR_QOS_ROWIDS: constants.SUBSCR_QOS_ROWIDS,

  // privileges
  SYSASM: constants.SYSASM,
  SYSBACKUP: constants.SYSBACKUP,
  SYSDBA: constants.SYSDBA,
  SYSDG: constants.SYSDG,
  SYSKM: constants.SYSKM,
  SYSOPER: constants.SYSOPER,
  SYSPRELIM: constants.SYSPRELIM,
  SYSRAC: constants.SYSRAC,

  // bind directions
  BIND_IN: constants.BIND_IN,
  BIND_INOUT: constants.BIND_INOUT,
  BIND_OUT: constants.BIND_OUT,

  // outFormat values
  OUT_FORMAT_ARRAY: constants.OUT_FORMAT_ARRAY,
  OUT_FORMAT_OBJECT: constants.OUT_FORMAT_OBJECT,

  // SODA collection creation modes
  SODA_COLL_MAP_MODE: constants.SODA_COLL_MAP_MODE,

  // pool statuses
  POOL_STATUS_OPEN: constants.POOL_STATUS_OPEN,
  POOL_STATUS_DRAINING: constants.POOL_STATUS_DRAINING,
  POOL_STATUS_CLOSED: constants.POOL_STATUS_CLOSED,
  POOL_STATUS_RECONFIGURING: constants.POOL_STATUS_RECONFIGURING,

  // AQ dequeue wait options
  AQ_DEQ_NO_WAIT: constants.AQ_DEQ_NO_WAIT,
  AQ_DEQ_WAIT_FOREVER: constants.AQ_DEQ_WAIT_FOREVER,

  // AQ dequeue modes
  AQ_DEQ_MODE_BROWSE: constants.AQ_DEQ_MODE_BROWSE,
  AQ_DEQ_MODE_LOCKED: constants.AQ_DEQ_MODE_LOCKED,
  AQ_DEQ_MODE_REMOVE: constants.AQ_DEQ_MODE_REMOVE,
  AQ_DEQ_MODE_REMOVE_NO_DATA: constants.AQ_DEQ_MODE_REMOVE_NO_DATA,

  // AQ dequeue navigation flags
  AQ_DEQ_NAV_FIRST_MSG: constants.AQ_DEQ_NAV_FIRST_MSG,
  AQ_DEQ_NAV_NEXT_TRANSACTION: constants.AQ_DEQ_NAV_NEXT_TRANSACTION,
  AQ_DEQ_NAV_NEXT_MSG: constants.AQ_DEQ_NAV_NEXT_MSG,

  // AQ message delivery modes
  AQ_MSG_DELIV_MODE_PERSISTENT: constants.AQ_MSG_DELIV_MODE_PERSISTENT,
  AQ_MSG_DELIV_MODE_BUFFERED: constants.AQ_MSG_DELIV_MODE_BUFFERED,
  AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED:
      constants.AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED,

  // AQ message states
  AQ_MSG_STATE_READY: constants.AQ_MSG_STATE_READY,
  AQ_MSG_STATE_WAITING: constants.AQ_MSG_STATE_WAITING,
  AQ_MSG_STATE_PROCESSED: constants.AQ_MSG_STATE_PROCESSED,
  AQ_MSG_STATE_EXPIRED: constants.AQ_MSG_STATE_EXPIRED,

  // AQ visibility flags
  AQ_VISIBILITY_IMMEDIATE: constants.AQ_VISIBILITY_IMMEDIATE,
  AQ_VISIBILITY_ON_COMMIT: constants.AQ_VISIBILITY_ON_COMMIT,

  // TPC/XA begin flags Constants
  TPC_BEGIN_JOIN: constants.TPC_BEGIN_JOIN,
  TPC_BEGIN_NEW: constants.TPC_BEGIN_NEW,
  TPC_BEGIN_PROMOTE: constants.TPC_BEGIN_PROMOTE,
  TPC_BEGIN_RESUME: constants.TPC_BEGIN_RESUME,

  // TPC/XA two-phase commit flags
  TPC_END_NORMAL: constants.TPC_END_NORMAL,
  TPC_END_SUSPEND: constants.TPC_END_SUSPEND,

  // vector types
  VECTOR_FORMAT_FLOAT32: constants.VECTOR_FORMAT_FLOAT32,
  VECTOR_FORMAT_FLOAT64: constants.VECTOR_FORMAT_FLOAT64,
  VECTOR_FORMAT_INT8: constants.VECTOR_FORMAT_INT8,
  VECTOR_FORMAT_BINARY: constants.VECTOR_FORMAT_BINARY,

  // database type aliases
  BLOB: types.DB_TYPE_BLOB,
  BUFFER: types.DB_TYPE_RAW,
  CLOB: types.DB_TYPE_CLOB,
  CURSOR: types.DB_TYPE_CURSOR,
  DATE: types.DB_TYPE_TIMESTAMP,
  NCLOB: types.DB_TYPE_NCLOB,
  NUMBER: types.DB_TYPE_NUMBER,
  STRING: types.DB_TYPE_VARCHAR,

  // outFormat aliases
  ARRAY: constants.OUT_FORMAT_ARRAY,
  OBJECT: constants.OUT_FORMAT_OBJECT,

  // Trace Interface
  traceHandler,

  // Instances
  future,

  // property getters
  get autoCommit() {
    return settings.autoCommit;
  },

  get connectionClass() {
    return settings.connectionClass;
  },

  get dbObjectAsPojo() {
    return settings.dbObjectAsPojo;
  },

  get edition() {
    return settings.edition;
  },

  get errorOnConcurrentExecute() {
    return settings.errorOnConcurrentExecute;
  },

  get events() {
    return settings.events;
  },

  get externalAuth() {
    return settings.externalAuth;
  },

  get fetchArraySize() {
    return settings.fetchArraySize;
  },

  get fetchAsBuffer() {
    return settings.fetchAsBuffer;
  },

  get fetchAsString() {
    return settings.fetchAsString;
  },

  get fetchTypeHandler() {
    return settings.fetchTypeHandler;
  },

  get dbObjectTypeHandler() {
    return settings.dbObjectTypeHandler;
  },

  get lobPrefetchSize() {
    return settings.lobPrefetchSize;
  },

  get maxRows() {
    return settings.maxRows;
  },

  get oracleClientVersion() {
    return settings.oracleClientVersion;
  },

  get oracleClientVersionString() {
    return settings.oracleClientVersionString;
  },

  get outFormat() {
    return settings.outFormat;
  },

  get poolIncrement() {
    return settings.poolIncrement;
  },

  get poolMax() {
    return settings.poolMax;
  },

  get poolMaxPerShard() {
    return settings.poolMaxPerShard;
  },

  get poolMin() {
    return settings.poolMin;
  },

  get poolPingInterval() {
    return settings.poolPingInterval;
  },

  get poolPingTimeout() {
    return settings.poolPingTimeout;
  },

  get poolTimeout() {
    return settings.poolTimeout;
  },

  get prefetchRows() {
    return settings.prefetchRows;
  },

  get stmtCacheSize() {
    return settings.stmtCacheSize;
  },

  get configProviderCacheTimeout() {
    return settings.configProviderCacheTimeout;
  },


  get thin() {
    return settings.thin;
  },

  get version() {
    return constants.VERSION_MAJOR * 10000 + constants.VERSION_MINOR * 100 +
        constants.VERSION_PATCH;
  },

  get versionString() {
    return constants.VERSION_STRING;
  },

  get versionSuffix() {
    return constants.VERSION_SUFFIX;
  },

  // property setters
  set autoCommit(value) {
    errors.assertPropValue(typeof value === 'boolean', "autoCommit");
    settings.autoCommit = value;
  },

  set connectionClass(value) {
    errors.assertPropValue(typeof value === 'string', "connectionClass");
    settings.connectionClass = value;
  },

  set dbObjectAsPojo(value) {
    errors.assertPropValue(typeof value === 'boolean', "dbObjectAsPojo");
    settings.dbObjectAsPojo = value;
  },

  set driverName(value) {
    errors.assertPropValue(typeof value === 'string', "driverName");
    settings.driverName = value;
  },

  set edition(value) {
    errors.assertPropValue(typeof value === 'string', "edition");
    settings.edition = value;
  },

  set errorOnConcurrentExecute(value) {
    errors.assertPropValue(typeof value === 'boolean',
      "errorOnConcurrentExecute");
    settings.errorOnConcurrentExecute = value;
  },

  set events(value) {
    errors.assertPropValue(typeof value === 'boolean', "events");
    settings.events = value;
  },

  set externalAuth(value) {
    errors.assertPropValue(typeof value === 'boolean', "externalAuth");
    settings.externalAuth = value;
  },

  set fetchArraySize(value) {
    errors.assertPropValue(Number.isInteger(value) && value > 0,
      "fetchArraySize");
    settings.fetchArraySize = value;
  },

  set fetchAsBuffer(value) {
    errors.assertPropValue(Array.isArray(value), "fetchAsBuffer");
    settings.createFetchTypeMap(settings.fetchAsString, value);
    settings.fetchAsBuffer = value;
  },

  set fetchAsString(value) {
    errors.assertPropValue(Array.isArray(value), "fetchAsString");
    settings.createFetchTypeMap(value, settings.fetchAsBuffer);
    settings.fetchAsString = value;
  },

  set fetchTypeHandler(value) {
    if (value !== undefined) {
      errors.assertPropValue(typeof value === 'function', "fetchTypeHandler");
    }
    settings.fetchTypeHandler = value;
  },

  set dbObjectTypeHandler(value) {
    if (value !== undefined) {
      errors.assertPropValue(typeof value === 'function', "dbObjectTypeHandler");
    }
    settings.dbObjectTypeHandler = value;
  },

  set lobPrefetchSize(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "lobPrefetchSize");
    settings.lobPrefetchSize = value;
  },

  set machine(value) {
    errors.assertPropValue(typeof value === 'string', "machine");
    const sanitizedValue = nodbUtil.sanitize(value);
    errors.assertPropValue(value == sanitizedValue, "machine");
    settings.machine = value;
  },

  set maxRows(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0, "maxRows");
    settings.maxRows = value;
  },

  set osUser(value) {
    errors.assertPropValue(typeof value === 'string', "osUser");
    const sanitizedValue = nodbUtil.sanitize(value);
    errors.assertPropValue(value == sanitizedValue, "osUser");
    settings.osUser = value;
  },

  set outFormat(value) {
    if (value !== constants.OUT_FORMAT_ARRAY &&
        value !== constants.OUT_FORMAT_OBJECT) {
      errors.throwErr(errors.ERR_INVALID_PROPERTY_VALUE, "outFormat");
    }
    settings.outFormat = value;
  },

  set poolIncrement(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "poolIncrement");
    settings.poolIncrement = value;
  },

  set poolMax(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0, "poolMax");
    settings.poolMax = value;
  },

  set poolMaxPerShard(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "poolMaxPerShard");
    settings.poolMaxPerShard = value;
  },

  set poolMin(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0, "poolMin");
    settings.poolMin = value;
  },

  set poolPingInterval(value) {
    errors.assertPropValue(Number.isInteger(value) && value < 2 ** 31 &&
        value >= (-2) ** 31, "poolPingInterval");
    settings.poolPingInterval = value;
  },

  set poolPingTimeout(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "poolPingTimeout");
    settings.poolPingTimeout = value;
  },

  set poolTimeout(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "poolTimeout");
    settings.poolTimeout = value;
  },

  set prefetchRows(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "prefetchRows");
    settings.prefetchRows = value;
  },

  set program(value) {
    errors.assertPropValue(typeof value === 'string', "program");
    const sanitizedValue = nodbUtil.sanitize(value);
    errors.assertPropValue(value == sanitizedValue, "program");
    settings.program = value;
  },

  set stmtCacheSize(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "stmtCacheSize");
    settings.stmtCacheSize = value;
  },

  set terminal(value) {
    errors.assertPropValue(typeof value === 'string', "terminal");
    settings.terminal = value;
  },

  set configProviderCacheTimeout(value) {
    errors.assertPropValue(Number.isInteger(value) && value >= 0,
      "configProviderCacheTimeout");
    settings.configProviderCacheTimeout = value;
  }

};
