"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _crypto = _interopRequireDefault(require("crypto"));
var _os = _interopRequireDefault(require("os"));
var tls = _interopRequireWildcard(require("tls"));
var net = _interopRequireWildcard(require("net"));
var _dns = _interopRequireDefault(require("dns"));
var _constants = _interopRequireDefault(require("constants"));
var _stream = require("stream");
var _identity = require("@azure/identity");
var _coreAuth = require("@azure/core-auth");
var _bulkLoad = _interopRequireDefault(require("./bulk-load"));
var _debug = _interopRequireDefault(require("./debug"));
var _events = require("events");
var _instanceLookup = require("./instance-lookup");
var _transientErrorLookup = require("./transient-error-lookup");
var _packet = require("./packet");
var _preloginPayload = _interopRequireDefault(require("./prelogin-payload"));
var _login7Payload = _interopRequireDefault(require("./login7-payload"));
var _ntlmPayload = _interopRequireDefault(require("./ntlm-payload"));
var _request = _interopRequireDefault(require("./request"));
var _rpcrequestPayload = _interopRequireDefault(require("./rpcrequest-payload"));
var _sqlbatchPayload = _interopRequireDefault(require("./sqlbatch-payload"));
var _messageIo = _interopRequireDefault(require("./message-io"));
var _tokenStreamParser = require("./token/token-stream-parser");
var _transaction = require("./transaction");
var _errors = require("./errors");
var _connector = require("./connector");
var _library = require("./library");
var _tdsVersions = require("./tds-versions");
var _message = _interopRequireDefault(require("./message"));
var _ntlm = require("./ntlm");
var _dataType = require("./data-type");
var _bulkLoadPayload = require("./bulk-load-payload");
var _specialStoredProcedure = _interopRequireDefault(require("./special-stored-procedure"));
var _package = require("../package.json");
var _url = require("url");
var _handler = require("./token/handler");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * @private
 */
const KEEP_ALIVE_INITIAL_DELAY = 30 * 1000;
/**
 * @private
 */
const DEFAULT_CONNECT_TIMEOUT = 15 * 1000;
/**
 * @private
 */
const DEFAULT_CLIENT_REQUEST_TIMEOUT = 15 * 1000;
/**
 * @private
 */
const DEFAULT_CANCEL_TIMEOUT = 5 * 1000;
/**
 * @private
 */
const DEFAULT_CONNECT_RETRY_INTERVAL = 500;
/**
 * @private
 */
const DEFAULT_PACKET_SIZE = 4 * 1024;
/**
 * @private
 */
const DEFAULT_TEXTSIZE = 2147483647;
/**
 * @private
 */
const DEFAULT_DATEFIRST = 7;
/**
 * @private
 */
const DEFAULT_PORT = 1433;
/**
 * @private
 */
const DEFAULT_TDS_VERSION = '7_4';
/**
 * @private
 */
const DEFAULT_LANGUAGE = 'us_english';
/**
 * @private
 */
const DEFAULT_DATEFORMAT = 'mdy';

/** Structure that defines the options that are necessary to authenticate the Tedious.JS instance with an `@azure/identity` token credential. */

/**
 * @private
 */

/**
 * Helper function, equivalent to `Promise.withResolvers()`.
 *
 * @returns An object with the properties `promise`, `resolve`, and `reject`.
 */
function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve,
    reject: reject
  };
}

/**
 * A [[Connection]] instance represents a single connection to a database server.
 *
 * ```js
 * var Connection = require('tedious').Connection;
 * var config = {
 *  "authentication": {
 *    ...,
 *    "options": {...}
 *  },
 *  "options": {...}
 * };
 * var connection = new Connection(config);
 * ```
 *
 * Only one request at a time may be executed on a connection. Once a [[Request]]
 * has been initiated (with [[Connection.callProcedure]], [[Connection.execSql]],
 * or [[Connection.execSqlBatch]]), another should not be initiated until the
 * [[Request]]'s completion callback is called.
 */
class Connection extends _events.EventEmitter {
  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * Note: be aware of the different options field:
   * 1. config.authentication.options
   * 2. config.options
   *
   * ```js
   * const { Connection } = require('tedious');
   *
   * const config = {
   *  "authentication": {
   *    ...,
   *    "options": {...}
   *  },
   *  "options": {...}
   * };
   *
   * const connection = new Connection(config);
   * ```
   *
   * @param config
   */
  constructor(config) {
    super();
    if (typeof config !== 'object' || config === null) {
      throw new TypeError('The "config" argument is required and must be of type Object.');
    }
    if (typeof config.server !== 'string') {
      throw new TypeError('The "config.server" property is required and must be of type string.');
    }
    this.fedAuthRequired = false;
    let authentication;
    if (config.authentication !== undefined) {
      if (typeof config.authentication !== 'object' || config.authentication === null) {
        throw new TypeError('The "config.authentication" property must be of type Object.');
      }
      const type = config.authentication.type;
      const options = config.authentication.options === undefined ? {} : config.authentication.options;
      if (typeof type !== 'string') {
        throw new TypeError('The "config.authentication.type" property must be of type string.');
      }
      if (type !== 'default' && type !== 'ntlm' && type !== 'token-credential' && type !== 'azure-active-directory-password' && type !== 'azure-active-directory-access-token' && type !== 'azure-active-directory-msi-vm' && type !== 'azure-active-directory-msi-app-service' && type !== 'azure-active-directory-service-principal-secret' && type !== 'azure-active-directory-default') {
        throw new TypeError('The "type" property must one of "default", "ntlm", "token-credential", "azure-active-directory-password", "azure-active-directory-access-token", "azure-active-directory-default", "azure-active-directory-msi-vm" or "azure-active-directory-msi-app-service" or "azure-active-directory-service-principal-secret".');
      }
      if (typeof options !== 'object' || options === null) {
        throw new TypeError('The "config.authentication.options" property must be of type object.');
      }
      if (type === 'ntlm') {
        if (typeof options.domain !== 'string') {
          throw new TypeError('The "config.authentication.options.domain" property must be of type string.');
        }
        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }
        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }
        authentication = {
          type: 'ntlm',
          options: {
            userName: options.userName,
            password: options.password,
            domain: options.domain && options.domain.toUpperCase()
          }
        };
      } else if (type === 'token-credential') {
        if (!(0, _coreAuth.isTokenCredential)(options.credential)) {
          throw new TypeError('The "config.authentication.options.credential" property must be an instance of the token credential class.');
        }
        authentication = {
          type: 'token-credential',
          options: {
            credential: options.credential
          }
        };
      } else if (type === 'azure-active-directory-password') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }
        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }
        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }
        if (options.tenantId !== undefined && typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-password',
          options: {
            userName: options.userName,
            password: options.password,
            tenantId: options.tenantId,
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-access-token') {
        if (typeof options.token !== 'string') {
          throw new TypeError('The "config.authentication.options.token" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-access-token',
          options: {
            token: options.token
          }
        };
      } else if (type === 'azure-active-directory-msi-vm') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-msi-vm',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-default') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-default',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-msi-app-service') {
        if (options.clientId !== undefined && typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-msi-app-service',
          options: {
            clientId: options.clientId
          }
        };
      } else if (type === 'azure-active-directory-service-principal-secret') {
        if (typeof options.clientId !== 'string') {
          throw new TypeError('The "config.authentication.options.clientId" property must be of type string.');
        }
        if (typeof options.clientSecret !== 'string') {
          throw new TypeError('The "config.authentication.options.clientSecret" property must be of type string.');
        }
        if (typeof options.tenantId !== 'string') {
          throw new TypeError('The "config.authentication.options.tenantId" property must be of type string.');
        }
        authentication = {
          type: 'azure-active-directory-service-principal-secret',
          options: {
            clientId: options.clientId,
            clientSecret: options.clientSecret,
            tenantId: options.tenantId
          }
        };
      } else {
        if (options.userName !== undefined && typeof options.userName !== 'string') {
          throw new TypeError('The "config.authentication.options.userName" property must be of type string.');
        }
        if (options.password !== undefined && typeof options.password !== 'string') {
          throw new TypeError('The "config.authentication.options.password" property must be of type string.');
        }
        authentication = {
          type: 'default',
          options: {
            userName: options.userName,
            password: options.password
          }
        };
      }
    } else {
      authentication = {
        type: 'default',
        options: {
          userName: undefined,
          password: undefined
        }
      };
    }
    this.config = {
      server: config.server,
      authentication: authentication,
      options: {
        abortTransactionOnError: false,
        appName: undefined,
        camelCaseColumns: false,
        cancelTimeout: DEFAULT_CANCEL_TIMEOUT,
        columnEncryptionKeyCacheTTL: 2 * 60 * 60 * 1000,
        // Units: milliseconds
        columnEncryptionSetting: false,
        columnNameReplacer: undefined,
        connectionRetryInterval: DEFAULT_CONNECT_RETRY_INTERVAL,
        connectTimeout: DEFAULT_CONNECT_TIMEOUT,
        connector: undefined,
        connectionIsolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        cryptoCredentialsDetails: {},
        database: undefined,
        datefirst: DEFAULT_DATEFIRST,
        dateFormat: DEFAULT_DATEFORMAT,
        debug: {
          data: false,
          packet: false,
          payload: false,
          token: false
        },
        enableAnsiNull: true,
        enableAnsiNullDefault: true,
        enableAnsiPadding: true,
        enableAnsiWarnings: true,
        enableArithAbort: true,
        enableConcatNullYieldsNull: true,
        enableCursorCloseOnCommit: null,
        enableImplicitTransactions: false,
        enableNumericRoundabort: false,
        enableQuotedIdentifier: true,
        encrypt: true,
        fallbackToDefaultDb: false,
        encryptionKeyStoreProviders: undefined,
        instanceName: undefined,
        isolationLevel: _transaction.ISOLATION_LEVEL.READ_COMMITTED,
        language: DEFAULT_LANGUAGE,
        localAddress: undefined,
        maxRetriesOnTransientErrors: 3,
        multiSubnetFailover: false,
        packetSize: DEFAULT_PACKET_SIZE,
        port: DEFAULT_PORT,
        readOnlyIntent: false,
        requestTimeout: DEFAULT_CLIENT_REQUEST_TIMEOUT,
        rowCollectionOnDone: false,
        rowCollectionOnRequestCompletion: false,
        serverName: undefined,
        serverSupportsColumnEncryption: false,
        tdsVersion: DEFAULT_TDS_VERSION,
        textsize: DEFAULT_TEXTSIZE,
        trustedServerNameAE: undefined,
        trustServerCertificate: false,
        useColumnNames: false,
        useUTC: true,
        workstationId: undefined,
        lowerCaseGuids: false
      }
    };
    if (config.options) {
      if (config.options.port && config.options.instanceName) {
        throw new Error('Port and instanceName are mutually exclusive, but ' + config.options.port + ' and ' + config.options.instanceName + ' provided');
      }
      if (config.options.abortTransactionOnError !== undefined) {
        if (typeof config.options.abortTransactionOnError !== 'boolean' && config.options.abortTransactionOnError !== null) {
          throw new TypeError('The "config.options.abortTransactionOnError" property must be of type string or null.');
        }
        this.config.options.abortTransactionOnError = config.options.abortTransactionOnError;
      }
      if (config.options.appName !== undefined) {
        if (typeof config.options.appName !== 'string') {
          throw new TypeError('The "config.options.appName" property must be of type string.');
        }
        this.config.options.appName = config.options.appName;
      }
      if (config.options.camelCaseColumns !== undefined) {
        if (typeof config.options.camelCaseColumns !== 'boolean') {
          throw new TypeError('The "config.options.camelCaseColumns" property must be of type boolean.');
        }
        this.config.options.camelCaseColumns = config.options.camelCaseColumns;
      }
      if (config.options.cancelTimeout !== undefined) {
        if (typeof config.options.cancelTimeout !== 'number') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type number.');
        }
        this.config.options.cancelTimeout = config.options.cancelTimeout;
      }
      if (config.options.columnNameReplacer) {
        if (typeof config.options.columnNameReplacer !== 'function') {
          throw new TypeError('The "config.options.cancelTimeout" property must be of type function.');
        }
        this.config.options.columnNameReplacer = config.options.columnNameReplacer;
      }
      if (config.options.connectionIsolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.connectionIsolationLevel, 'config.options.connectionIsolationLevel');
        this.config.options.connectionIsolationLevel = config.options.connectionIsolationLevel;
      }
      if (config.options.connectTimeout !== undefined) {
        if (typeof config.options.connectTimeout !== 'number') {
          throw new TypeError('The "config.options.connectTimeout" property must be of type number.');
        }
        this.config.options.connectTimeout = config.options.connectTimeout;
      }
      if (config.options.connector !== undefined) {
        if (typeof config.options.connector !== 'function') {
          throw new TypeError('The "config.options.connector" property must be a function.');
        }
        this.config.options.connector = config.options.connector;
      }
      if (config.options.cryptoCredentialsDetails !== undefined) {
        if (typeof config.options.cryptoCredentialsDetails !== 'object' || config.options.cryptoCredentialsDetails === null) {
          throw new TypeError('The "config.options.cryptoCredentialsDetails" property must be of type Object.');
        }
        this.config.options.cryptoCredentialsDetails = config.options.cryptoCredentialsDetails;
      }
      if (config.options.database !== undefined) {
        if (typeof config.options.database !== 'string') {
          throw new TypeError('The "config.options.database" property must be of type string.');
        }
        this.config.options.database = config.options.database;
      }
      if (config.options.datefirst !== undefined) {
        if (typeof config.options.datefirst !== 'number' && config.options.datefirst !== null) {
          throw new TypeError('The "config.options.datefirst" property must be of type number.');
        }
        if (config.options.datefirst !== null && (config.options.datefirst < 1 || config.options.datefirst > 7)) {
          throw new RangeError('The "config.options.datefirst" property must be >= 1 and <= 7');
        }
        this.config.options.datefirst = config.options.datefirst;
      }
      if (config.options.dateFormat !== undefined) {
        if (typeof config.options.dateFormat !== 'string' && config.options.dateFormat !== null) {
          throw new TypeError('The "config.options.dateFormat" property must be of type string or null.');
        }
        this.config.options.dateFormat = config.options.dateFormat;
      }
      if (config.options.debug) {
        if (config.options.debug.data !== undefined) {
          if (typeof config.options.debug.data !== 'boolean') {
            throw new TypeError('The "config.options.debug.data" property must be of type boolean.');
          }
          this.config.options.debug.data = config.options.debug.data;
        }
        if (config.options.debug.packet !== undefined) {
          if (typeof config.options.debug.packet !== 'boolean') {
            throw new TypeError('The "config.options.debug.packet" property must be of type boolean.');
          }
          this.config.options.debug.packet = config.options.debug.packet;
        }
        if (config.options.debug.payload !== undefined) {
          if (typeof config.options.debug.payload !== 'boolean') {
            throw new TypeError('The "config.options.debug.payload" property must be of type boolean.');
          }
          this.config.options.debug.payload = config.options.debug.payload;
        }
        if (config.options.debug.token !== undefined) {
          if (typeof config.options.debug.token !== 'boolean') {
            throw new TypeError('The "config.options.debug.token" property must be of type boolean.');
          }
          this.config.options.debug.token = config.options.debug.token;
        }
      }
      if (config.options.enableAnsiNull !== undefined) {
        if (typeof config.options.enableAnsiNull !== 'boolean' && config.options.enableAnsiNull !== null) {
          throw new TypeError('The "config.options.enableAnsiNull" property must be of type boolean or null.');
        }
        this.config.options.enableAnsiNull = config.options.enableAnsiNull;
      }
      if (config.options.enableAnsiNullDefault !== undefined) {
        if (typeof config.options.enableAnsiNullDefault !== 'boolean' && config.options.enableAnsiNullDefault !== null) {
          throw new TypeError('The "config.options.enableAnsiNullDefault" property must be of type boolean or null.');
        }
        this.config.options.enableAnsiNullDefault = config.options.enableAnsiNullDefault;
      }
      if (config.options.enableAnsiPadding !== undefined) {
        if (typeof config.options.enableAnsiPadding !== 'boolean' && config.options.enableAnsiPadding !== null) {
          throw new TypeError('The "config.options.enableAnsiPadding" property must be of type boolean or null.');
        }
        this.config.options.enableAnsiPadding = config.options.enableAnsiPadding;
      }
      if (config.options.enableAnsiWarnings !== undefined) {
        if (typeof config.options.enableAnsiWarnings !== 'boolean' && config.options.enableAnsiWarnings !== null) {
          throw new TypeError('The "config.options.enableAnsiWarnings" property must be of type boolean or null.');
        }
        this.config.options.enableAnsiWarnings = config.options.enableAnsiWarnings;
      }
      if (config.options.enableArithAbort !== undefined) {
        if (typeof config.options.enableArithAbort !== 'boolean' && config.options.enableArithAbort !== null) {
          throw new TypeError('The "config.options.enableArithAbort" property must be of type boolean or null.');
        }
        this.config.options.enableArithAbort = config.options.enableArithAbort;
      }
      if (config.options.enableConcatNullYieldsNull !== undefined) {
        if (typeof config.options.enableConcatNullYieldsNull !== 'boolean' && config.options.enableConcatNullYieldsNull !== null) {
          throw new TypeError('The "config.options.enableConcatNullYieldsNull" property must be of type boolean or null.');
        }
        this.config.options.enableConcatNullYieldsNull = config.options.enableConcatNullYieldsNull;
      }
      if (config.options.enableCursorCloseOnCommit !== undefined) {
        if (typeof config.options.enableCursorCloseOnCommit !== 'boolean' && config.options.enableCursorCloseOnCommit !== null) {
          throw new TypeError('The "config.options.enableCursorCloseOnCommit" property must be of type boolean or null.');
        }
        this.config.options.enableCursorCloseOnCommit = config.options.enableCursorCloseOnCommit;
      }
      if (config.options.enableImplicitTransactions !== undefined) {
        if (typeof config.options.enableImplicitTransactions !== 'boolean' && config.options.enableImplicitTransactions !== null) {
          throw new TypeError('The "config.options.enableImplicitTransactions" property must be of type boolean or null.');
        }
        this.config.options.enableImplicitTransactions = config.options.enableImplicitTransactions;
      }
      if (config.options.enableNumericRoundabort !== undefined) {
        if (typeof config.options.enableNumericRoundabort !== 'boolean' && config.options.enableNumericRoundabort !== null) {
          throw new TypeError('The "config.options.enableNumericRoundabort" property must be of type boolean or null.');
        }
        this.config.options.enableNumericRoundabort = config.options.enableNumericRoundabort;
      }
      if (config.options.enableQuotedIdentifier !== undefined) {
        if (typeof config.options.enableQuotedIdentifier !== 'boolean' && config.options.enableQuotedIdentifier !== null) {
          throw new TypeError('The "config.options.enableQuotedIdentifier" property must be of type boolean or null.');
        }
        this.config.options.enableQuotedIdentifier = config.options.enableQuotedIdentifier;
      }
      if (config.options.encrypt !== undefined) {
        if (typeof config.options.encrypt !== 'boolean') {
          if (config.options.encrypt !== 'strict') {
            throw new TypeError('The "encrypt" property must be set to "strict", or of type boolean.');
          }
        }
        this.config.options.encrypt = config.options.encrypt;
      }
      if (config.options.fallbackToDefaultDb !== undefined) {
        if (typeof config.options.fallbackToDefaultDb !== 'boolean') {
          throw new TypeError('The "config.options.fallbackToDefaultDb" property must be of type boolean.');
        }
        this.config.options.fallbackToDefaultDb = config.options.fallbackToDefaultDb;
      }
      if (config.options.instanceName !== undefined) {
        if (typeof config.options.instanceName !== 'string') {
          throw new TypeError('The "config.options.instanceName" property must be of type string.');
        }
        this.config.options.instanceName = config.options.instanceName;
        this.config.options.port = undefined;
      }
      if (config.options.isolationLevel !== undefined) {
        (0, _transaction.assertValidIsolationLevel)(config.options.isolationLevel, 'config.options.isolationLevel');
        this.config.options.isolationLevel = config.options.isolationLevel;
      }
      if (config.options.language !== undefined) {
        if (typeof config.options.language !== 'string' && config.options.language !== null) {
          throw new TypeError('The "config.options.language" property must be of type string or null.');
        }
        this.config.options.language = config.options.language;
      }
      if (config.options.localAddress !== undefined) {
        if (typeof config.options.localAddress !== 'string') {
          throw new TypeError('The "config.options.localAddress" property must be of type string.');
        }
        this.config.options.localAddress = config.options.localAddress;
      }
      if (config.options.multiSubnetFailover !== undefined) {
        if (typeof config.options.multiSubnetFailover !== 'boolean') {
          throw new TypeError('The "config.options.multiSubnetFailover" property must be of type boolean.');
        }
        this.config.options.multiSubnetFailover = config.options.multiSubnetFailover;
      }
      if (config.options.packetSize !== undefined) {
        if (typeof config.options.packetSize !== 'number') {
          throw new TypeError('The "config.options.packetSize" property must be of type number.');
        }
        this.config.options.packetSize = config.options.packetSize;
      }
      if (config.options.port !== undefined) {
        if (typeof config.options.port !== 'number') {
          throw new TypeError('The "config.options.port" property must be of type number.');
        }
        if (config.options.port <= 0 || config.options.port >= 65536) {
          throw new RangeError('The "config.options.port" property must be > 0 and < 65536');
        }
        this.config.options.port = config.options.port;
        this.config.options.instanceName = undefined;
      }
      if (config.options.readOnlyIntent !== undefined) {
        if (typeof config.options.readOnlyIntent !== 'boolean') {
          throw new TypeError('The "config.options.readOnlyIntent" property must be of type boolean.');
        }
        this.config.options.readOnlyIntent = config.options.readOnlyIntent;
      }
      if (config.options.requestTimeout !== undefined) {
        if (typeof config.options.requestTimeout !== 'number') {
          throw new TypeError('The "config.options.requestTimeout" property must be of type number.');
        }
        this.config.options.requestTimeout = config.options.requestTimeout;
      }
      if (config.options.maxRetriesOnTransientErrors !== undefined) {
        if (typeof config.options.maxRetriesOnTransientErrors !== 'number') {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be of type number.');
        }
        if (config.options.maxRetriesOnTransientErrors < 0) {
          throw new TypeError('The "config.options.maxRetriesOnTransientErrors" property must be equal or greater than 0.');
        }
        this.config.options.maxRetriesOnTransientErrors = config.options.maxRetriesOnTransientErrors;
      }
      if (config.options.connectionRetryInterval !== undefined) {
        if (typeof config.options.connectionRetryInterval !== 'number') {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be of type number.');
        }
        if (config.options.connectionRetryInterval <= 0) {
          throw new TypeError('The "config.options.connectionRetryInterval" property must be greater than 0.');
        }
        this.config.options.connectionRetryInterval = config.options.connectionRetryInterval;
      }
      if (config.options.rowCollectionOnDone !== undefined) {
        if (typeof config.options.rowCollectionOnDone !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnDone" property must be of type boolean.');
        }
        this.config.options.rowCollectionOnDone = config.options.rowCollectionOnDone;
      }
      if (config.options.rowCollectionOnRequestCompletion !== undefined) {
        if (typeof config.options.rowCollectionOnRequestCompletion !== 'boolean') {
          throw new TypeError('The "config.options.rowCollectionOnRequestCompletion" property must be of type boolean.');
        }
        this.config.options.rowCollectionOnRequestCompletion = config.options.rowCollectionOnRequestCompletion;
      }
      if (config.options.tdsVersion !== undefined) {
        if (typeof config.options.tdsVersion !== 'string') {
          throw new TypeError('The "config.options.tdsVersion" property must be of type string.');
        }
        this.config.options.tdsVersion = config.options.tdsVersion;
      }
      if (config.options.textsize !== undefined) {
        if (typeof config.options.textsize !== 'number' && config.options.textsize !== null) {
          throw new TypeError('The "config.options.textsize" property must be of type number or null.');
        }
        if (config.options.textsize > 2147483647) {
          throw new TypeError('The "config.options.textsize" can\'t be greater than 2147483647.');
        } else if (config.options.textsize < -1) {
          throw new TypeError('The "config.options.textsize" can\'t be smaller than -1.');
        }
        this.config.options.textsize = config.options.textsize | 0;
      }
      if (config.options.trustServerCertificate !== undefined) {
        if (typeof config.options.trustServerCertificate !== 'boolean') {
          throw new TypeError('The "config.options.trustServerCertificate" property must be of type boolean.');
        }
        this.config.options.trustServerCertificate = config.options.trustServerCertificate;
      }
      if (config.options.serverName !== undefined) {
        if (typeof config.options.serverName !== 'string') {
          throw new TypeError('The "config.options.serverName" property must be of type string.');
        }
        this.config.options.serverName = config.options.serverName;
      }
      if (config.options.useColumnNames !== undefined) {
        if (typeof config.options.useColumnNames !== 'boolean') {
          throw new TypeError('The "config.options.useColumnNames" property must be of type boolean.');
        }
        this.config.options.useColumnNames = config.options.useColumnNames;
      }
      if (config.options.useUTC !== undefined) {
        if (typeof config.options.useUTC !== 'boolean') {
          throw new TypeError('The "config.options.useUTC" property must be of type boolean.');
        }
        this.config.options.useUTC = config.options.useUTC;
      }
      if (config.options.workstationId !== undefined) {
        if (typeof config.options.workstationId !== 'string') {
          throw new TypeError('The "config.options.workstationId" property must be of type string.');
        }
        this.config.options.workstationId = config.options.workstationId;
      }
      if (config.options.lowerCaseGuids !== undefined) {
        if (typeof config.options.lowerCaseGuids !== 'boolean') {
          throw new TypeError('The "config.options.lowerCaseGuids" property must be of type boolean.');
        }
        this.config.options.lowerCaseGuids = config.options.lowerCaseGuids;
      }
    }
    this.secureContextOptions = this.config.options.cryptoCredentialsDetails;
    if (this.secureContextOptions.secureOptions === undefined) {
      // If the caller has not specified their own `secureOptions`,
      // we set `SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS` here.
      // Older SQL Server instances running on older Windows versions have
      // trouble with the BEAST workaround in OpenSSL.
      // As BEAST is a browser specific exploit, we can just disable this option here.
      this.secureContextOptions = Object.create(this.secureContextOptions, {
        secureOptions: {
          value: _constants.default.SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS
        }
      });
    }
    this.debug = this.createDebug();
    this.inTransaction = false;
    this.transactionDescriptors = [Buffer.from([0, 0, 0, 0, 0, 0, 0, 0])];

    // 'beginTransaction', 'commitTransaction' and 'rollbackTransaction'
    // events are utilized to maintain inTransaction property state which in
    // turn is used in managing transactions. These events are only fired for
    // TDS version 7.2 and beyond. The properties below are used to emulate
    // equivalent behavior for TDS versions before 7.2.
    this.transactionDepth = 0;
    this.isSqlBatch = false;
    this.closed = false;
    this.messageBuffer = Buffer.alloc(0);
    this.curTransientRetryCount = 0;
    this.transientErrorLookup = new _transientErrorLookup.TransientErrorLookup();
    this.state = this.STATE.INITIALIZED;
    this._cancelAfterRequestSent = () => {
      this.messageIo.sendMessage(_packet.TYPE.ATTENTION);
      this.createCancelTimer();
    };
    this._onSocketClose = () => {
      this.socketClose();
    };
    this._onSocketEnd = () => {
      this.socketEnd();
    };
    this._onSocketError = error => {
      this.dispatchEvent('socketError', error);
      process.nextTick(() => {
        this.emit('error', this.wrapSocketError(error));
      });
    };
  }
  connect(connectListener) {
    if (this.state !== this.STATE.INITIALIZED) {
      throw new _errors.ConnectionError('`.connect` can not be called on a Connection in `' + this.state.name + '` state.');
    }
    if (connectListener) {
      const onConnect = err => {
        this.removeListener('error', onError);
        connectListener(err);
      };
      const onError = err => {
        this.removeListener('connect', onConnect);
        connectListener(err);
      };
      this.once('connect', onConnect);
      this.once('error', onError);
    }
    this.transitionTo(this.STATE.CONNECTING);
    this.initialiseConnection().then(() => {
      process.nextTick(() => {
        this.emit('connect');
      });
    }, err => {
      this.transitionTo(this.STATE.FINAL);
      this.closed = true;
      process.nextTick(() => {
        this.emit('connect', err);
      });
      process.nextTick(() => {
        this.emit('end');
      });
    });
  }

  /**
   * The server has reported that the charset has changed.
   */

  /**
   * The attempt to connect and validate has completed.
   */

  /**
   * The server has reported that the active database has changed.
   * This may be as a result of a successful login, or a `use` statement.
   */

  /**
   * A debug message is available. It may be logged or ignored.
   */

  /**
   * Internal error occurs.
   */

  /**
   * The server has issued an error message.
   */

  /**
   * The connection has ended.
   *
   * This may be as a result of the client calling [[close]], the server
   * closing the connection, or a network error.
   */

  /**
   * The server has issued an information message.
   */

  /**
   * The server has reported that the language has changed.
   */

  /**
   * The connection was reset.
   */

  /**
   * A secure connection has been established.
   */

  on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  /**
   * @private
   */

  emit(event, ...args) {
    return super.emit(event, ...args);
  }

  /**
   * Closes the connection to the database.
   *
   * The [[Event_end]] will be emitted once the connection has been closed.
   */
  close() {
    this.transitionTo(this.STATE.FINAL);
    this.cleanupConnection();
  }

  /**
   * @private
   */
  async initialiseConnection() {
    const timeoutController = new AbortController();
    const connectTimer = setTimeout(() => {
      const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
      // If we have routing data stored, this connection has been redirected
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? `:${this.routingData.port}` : hostPostfix;
      // Grab the target host from the connection configuration, and from a redirect message
      // otherwise, leave the message empty.
      const routingMessage = this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : '';
      const message = `Failed to connect to ${server}${port}${routingMessage} in ${this.config.options.connectTimeout}ms`;
      this.debug.log(message);
      timeoutController.abort(new _errors.ConnectionError(message, 'ETIMEOUT'));
    }, this.config.options.connectTimeout);
    try {
      let signal = timeoutController.signal;
      let port = this.config.options.port;
      if (!port) {
        try {
          port = await (0, _instanceLookup.instanceLookup)({
            server: this.config.server,
            instanceName: this.config.options.instanceName,
            timeout: this.config.options.connectTimeout,
            signal: signal
          });
        } catch (err) {
          signal.throwIfAborted();
          throw new _errors.ConnectionError(err.message, 'EINSTLOOKUP', {
            cause: err
          });
        }
      }
      let socket;
      try {
        socket = await this.connectOnPort(port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
      } catch (err) {
        signal.throwIfAborted();
        throw this.wrapSocketError(err);
      }
      try {
        const controller = new AbortController();
        const onError = err => {
          controller.abort(this.wrapSocketError(err));
        };
        const onClose = () => {
          this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');
        };
        const onEnd = () => {
          this.debug.log('socket ended');
          const error = new Error('socket hang up');
          error.code = 'ECONNRESET';
          controller.abort(this.wrapSocketError(error));
        };
        socket.once('error', onError);
        socket.once('close', onClose);
        socket.once('end', onEnd);
        try {
          signal = AbortSignal.any([signal, controller.signal]);
          socket.setKeepAlive(true, KEEP_ALIVE_INITIAL_DELAY);
          this.messageIo = new _messageIo.default(socket, this.config.options.packetSize, this.debug);
          this.messageIo.on('secure', cleartext => {
            this.emit('secure', cleartext);
          });
          this.socket = socket;
          this.closed = false;
          this.debug.log('connected to ' + this.config.server + ':' + this.config.options.port);
          this.sendPreLogin();
          this.transitionTo(this.STATE.SENT_PRELOGIN);
          const preloginResponse = await this.readPreloginResponse(signal);
          await this.performTlsNegotiation(preloginResponse, signal);
          this.sendLogin7Packet();
          try {
            const {
              authentication
            } = this.config;
            switch (authentication.type) {
              case 'token-credential':
              case 'azure-active-directory-password':
              case 'azure-active-directory-msi-vm':
              case 'azure-active-directory-msi-app-service':
              case 'azure-active-directory-service-principal-secret':
              case 'azure-active-directory-default':
                this.transitionTo(this.STATE.SENT_LOGIN7_WITH_FEDAUTH);
                this.routingData = await this.performSentLogin7WithFedAuth(signal);
                break;
              case 'ntlm':
                this.transitionTo(this.STATE.SENT_LOGIN7_WITH_NTLM);
                this.routingData = await this.performSentLogin7WithNTLMLogin(signal);
                break;
              default:
                this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
                this.routingData = await this.performSentLogin7WithStandardLogin(signal);
                break;
            }
          } catch (err) {
            if (isTransientError(err)) {
              this.debug.log('Initiating retry on transient error');
              this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
              return await this.performTransientFailureRetry();
            }
            throw err;
          }

          // If routing data is present, we need to re-route the connection
          if (this.routingData) {
            this.transitionTo(this.STATE.REROUTING);
            return await this.performReRouting();
          }
          this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          await this.performLoggedInSendingInitialSql(signal);
        } finally {
          socket.removeListener('error', onError);
          socket.removeListener('close', onClose);
          socket.removeListener('end', onEnd);
        }
      } catch (err) {
        socket.destroy();
        throw err;
      }
      socket.on('error', this._onSocketError);
      socket.on('close', this._onSocketClose);
      socket.on('end', this._onSocketEnd);
      this.transitionTo(this.STATE.LOGGED_IN);
    } finally {
      clearTimeout(connectTimer);
    }
  }

  /**
   * @private
   */
  cleanupConnection() {
    if (!this.closed) {
      this.clearRequestTimer();
      this.closeConnection();
      process.nextTick(() => {
        this.emit('end');
      });
      const request = this.request;
      if (request) {
        const err = new _errors.RequestError('Connection closed before request completed.', 'ECLOSE');
        request.callback(err);
        this.request = undefined;
      }
      this.closed = true;
    }
  }

  /**
   * @private
   */
  createDebug() {
    const debug = new _debug.default(this.config.options.debug);
    debug.on('debug', message => {
      this.emit('debug', message);
    });
    return debug;
  }

  /**
   * @private
   */
  createTokenStreamParser(message, handler) {
    return new _tokenStreamParser.Parser(message, this.debug, handler, this.config.options);
  }
  async wrapWithTls(socket, signal) {
    signal.throwIfAborted();
    const secureContext = tls.createSecureContext(this.secureContextOptions);
    // If connect to an ip address directly,
    // need to set the servername to an empty string
    // if the user has not given a servername explicitly
    const serverName = !net.isIP(this.config.server) ? this.config.server : '';
    const encryptOptions = {
      host: this.config.server,
      socket: socket,
      ALPNProtocols: ['tds/8.0'],
      secureContext: secureContext,
      servername: this.config.options.serverName ? this.config.options.serverName : serverName
    };
    const {
      promise,
      resolve,
      reject
    } = withResolvers();
    const encryptsocket = tls.connect(encryptOptions);
    try {
      const onAbort = () => {
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, {
        once: true
      });
      try {
        const onError = reject;
        const onConnect = () => {
          resolve(encryptsocket);
        };
        encryptsocket.once('error', onError);
        encryptsocket.once('secureConnect', onConnect);
        try {
          return await promise;
        } finally {
          encryptsocket.removeListener('error', onError);
          encryptsocket.removeListener('connect', onConnect);
        }
      } finally {
        signal.removeEventListener('abort', onAbort);
      }
    } catch (err) {
      encryptsocket.destroy();
      throw err;
    }
  }
  async connectOnPort(port, multiSubnetFailover, signal, customConnector) {
    const connectOpts = {
      host: this.routingData ? this.routingData.server : this.config.server,
      port: this.routingData ? this.routingData.port : port,
      localAddress: this.config.options.localAddress
    };
    const connect = customConnector || (multiSubnetFailover ? _connector.connectInParallel : _connector.connectInSequence);
    let socket = await connect(connectOpts, _dns.default.lookup, signal);
    if (this.config.options.encrypt === 'strict') {
      try {
        // Wrap the socket with TLS for TDS 8.0
        socket = await this.wrapWithTls(socket, signal);
      } catch (err) {
        socket.end();
        throw err;
      }
    }
    return socket;
  }

  /**
   * @private
   */
  closeConnection() {
    if (this.socket) {
      this.socket.destroy();
    }
  }

  /**
   * @private
   */
  createCancelTimer() {
    this.clearCancelTimer();
    const timeout = this.config.options.cancelTimeout;
    if (timeout > 0) {
      this.cancelTimer = setTimeout(() => {
        this.cancelTimeout();
      }, timeout);
    }
  }

  /**
   * @private
   */
  createRequestTimer() {
    this.clearRequestTimer(); // release old timer, just to be safe
    const request = this.request;
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;
    if (timeout) {
      this.requestTimer = setTimeout(() => {
        this.requestTimeout();
      }, timeout);
    }
  }

  /**
   * @private
   */
  cancelTimeout() {
    const message = `Failed to cancel request in ${this.config.options.cancelTimeout}ms`;
    this.debug.log(message);
    this.dispatchEvent('socketError', new _errors.ConnectionError(message, 'ETIMEOUT'));
  }

  /**
   * @private
   */
  requestTimeout() {
    this.requestTimer = undefined;
    const request = this.request;
    request.cancel();
    const timeout = request.timeout !== undefined ? request.timeout : this.config.options.requestTimeout;
    const message = 'Timeout: Request failed to complete in ' + timeout + 'ms';
    request.error = new _errors.RequestError(message, 'ETIMEOUT');
  }

  /**
   * @private
   */
  clearCancelTimer() {
    if (this.cancelTimer) {
      clearTimeout(this.cancelTimer);
      this.cancelTimer = undefined;
    }
  }

  /**
   * @private
   */
  clearRequestTimer() {
    if (this.requestTimer) {
      clearTimeout(this.requestTimer);
      this.requestTimer = undefined;
    }
  }

  /**
   * @private
   */
  transitionTo(newState) {
    if (this.state === newState) {
      this.debug.log('State is already ' + newState.name);
      return;
    }
    if (this.state && this.state.exit) {
      this.state.exit.call(this, newState);
    }
    this.debug.log('State change: ' + (this.state ? this.state.name : 'undefined') + ' -> ' + newState.name);
    this.state = newState;
    if (this.state.enter) {
      this.state.enter.apply(this);
    }
  }

  /**
   * @private
   */
  getEventHandler(eventName) {
    const handler = this.state.events[eventName];
    if (!handler) {
      throw new Error(`No event '${eventName}' in state '${this.state.name}'`);
    }
    return handler;
  }

  /**
   * @private
   */
  dispatchEvent(eventName, ...args) {
    const handler = this.state.events[eventName];
    if (handler) {
      handler.apply(this, args);
    } else {
      this.emit('error', new Error(`No event '${eventName}' in state '${this.state.name}'`));
      this.close();
    }
  }

  /**
   * @private
   */
  wrapSocketError(error) {
    if (this.state === this.STATE.CONNECTING || this.state === this.STATE.SENT_TLSSSLNEGOTIATION) {
      const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
      // If we have routing data stored, this connection has been redirected
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? `:${this.routingData.port}` : hostPostfix;
      // Grab the target host from the connection configuration, and from a redirect message
      // otherwise, leave the message empty.
      const routingMessage = this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : '';
      const message = `Failed to connect to ${server}${port}${routingMessage} - ${error.message}`;
      return new _errors.ConnectionError(message, 'ESOCKET', {
        cause: error
      });
    } else {
      const message = `Connection lost - ${error.message}`;
      return new _errors.ConnectionError(message, 'ESOCKET', {
        cause: error
      });
    }
  }

  /**
   * @private
   */
  socketEnd() {
    this.debug.log('socket ended');
    if (this.state !== this.STATE.FINAL) {
      const error = new Error('socket hang up');
      error.code = 'ECONNRESET';
      this.dispatchEvent('socketError', error);
      process.nextTick(() => {
        this.emit('error', this.wrapSocketError(error));
      });
    }
  }

  /**
   * @private
   */
  socketClose() {
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');
    this.transitionTo(this.STATE.FINAL);
    this.cleanupConnection();
  }

  /**
   * @private
   */
  sendPreLogin() {
    const [, major, minor, build] = /^(\d+)\.(\d+)\.(\d+)/.exec(_package.version) ?? ['0.0.0', '0', '0', '0'];
    const payload = new _preloginPayload.default({
      // If encrypt setting is set to 'strict', then we should have already done the encryption before calling
      // this function. Therefore, the encrypt will be set to false here.
      // Otherwise, we will set encrypt here based on the encrypt Boolean value from the configuration.
      encrypt: typeof this.config.options.encrypt === 'boolean' && this.config.options.encrypt,
      version: {
        major: Number(major),
        minor: Number(minor),
        build: Number(build),
        subbuild: 0
      }
    });
    this.messageIo.sendMessage(_packet.TYPE.PRELOGIN, payload.data);
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }

  /**
   * @private
   */
  sendLogin7Packet() {
    const payload = new _login7Payload.default({
      tdsVersion: _tdsVersions.versions[this.config.options.tdsVersion],
      packetSize: this.config.options.packetSize,
      clientProgVer: 0,
      clientPid: process.pid,
      connectionId: 0,
      clientTimeZone: new Date().getTimezoneOffset(),
      clientLcid: 0x00000409
    });
    const {
      authentication
    } = this.config;
    switch (authentication.type) {
      case 'azure-active-directory-password':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'default'
        };
        break;
      case 'azure-active-directory-access-token':
        payload.fedAuth = {
          type: 'SECURITYTOKEN',
          echo: this.fedAuthRequired,
          fedAuthToken: authentication.options.token
        };
        break;
      case 'token-credential':
      case 'azure-active-directory-msi-vm':
      case 'azure-active-directory-default':
      case 'azure-active-directory-msi-app-service':
      case 'azure-active-directory-service-principal-secret':
        payload.fedAuth = {
          type: 'ADAL',
          echo: this.fedAuthRequired,
          workflow: 'integrated'
        };
        break;
      case 'ntlm':
        payload.sspi = (0, _ntlm.createNTLMRequest)({
          domain: authentication.options.domain
        });
        break;
      default:
        payload.userName = authentication.options.userName;
        payload.password = authentication.options.password;
    }
    payload.hostname = this.config.options.workstationId || _os.default.hostname();
    payload.serverName = this.routingData ? `${this.routingData.server}${this.routingData.instance ? '\\' + this.routingData.instance : ''}` : this.config.server;
    payload.appName = this.config.options.appName || 'Tedious';
    payload.libraryName = _library.name;
    payload.language = this.config.options.language;
    payload.database = this.config.options.database;
    payload.clientId = Buffer.from([1, 2, 3, 4, 5, 6]);
    payload.readOnlyIntent = this.config.options.readOnlyIntent;
    payload.initDbFatal = !this.config.options.fallbackToDefaultDb;
    this.routingData = undefined;
    this.messageIo.sendMessage(_packet.TYPE.LOGIN7, payload.toBuffer());
    this.debug.payload(function () {
      return payload.toString('  ');
    });
  }

  /**
   * @private
   */
  sendFedAuthTokenMessage(token) {
    const accessTokenLen = Buffer.byteLength(token, 'ucs2');
    const data = Buffer.alloc(8 + accessTokenLen);
    let offset = 0;
    offset = data.writeUInt32LE(accessTokenLen + 4, offset);
    offset = data.writeUInt32LE(accessTokenLen, offset);
    data.write(token, offset, 'ucs2');
    this.messageIo.sendMessage(_packet.TYPE.FEDAUTH_TOKEN, data);
  }

  /**
   * @private
   */
  sendInitialSql() {
    const payload = new _sqlbatchPayload.default(this.getInitialSql(), this.currentTransactionDescriptor(), this.config.options);
    const message = new _message.default({
      type: _packet.TYPE.SQL_BATCH
    });
    this.messageIo.outgoingMessageStream.write(message);
    _stream.Readable.from(payload).pipe(message);
  }

  /**
   * @private
   */
  getInitialSql() {
    const options = [];
    if (this.config.options.enableAnsiNull === true) {
      options.push('set ansi_nulls on');
    } else if (this.config.options.enableAnsiNull === false) {
      options.push('set ansi_nulls off');
    }
    if (this.config.options.enableAnsiNullDefault === true) {
      options.push('set ansi_null_dflt_on on');
    } else if (this.config.options.enableAnsiNullDefault === false) {
      options.push('set ansi_null_dflt_on off');
    }
    if (this.config.options.enableAnsiPadding === true) {
      options.push('set ansi_padding on');
    } else if (this.config.options.enableAnsiPadding === false) {
      options.push('set ansi_padding off');
    }
    if (this.config.options.enableAnsiWarnings === true) {
      options.push('set ansi_warnings on');
    } else if (this.config.options.enableAnsiWarnings === false) {
      options.push('set ansi_warnings off');
    }
    if (this.config.options.enableArithAbort === true) {
      options.push('set arithabort on');
    } else if (this.config.options.enableArithAbort === false) {
      options.push('set arithabort off');
    }
    if (this.config.options.enableConcatNullYieldsNull === true) {
      options.push('set concat_null_yields_null on');
    } else if (this.config.options.enableConcatNullYieldsNull === false) {
      options.push('set concat_null_yields_null off');
    }
    if (this.config.options.enableCursorCloseOnCommit === true) {
      options.push('set cursor_close_on_commit on');
    } else if (this.config.options.enableCursorCloseOnCommit === false) {
      options.push('set cursor_close_on_commit off');
    }
    if (this.config.options.datefirst !== null) {
      options.push(`set datefirst ${this.config.options.datefirst}`);
    }
    if (this.config.options.dateFormat !== null) {
      options.push(`set dateformat ${this.config.options.dateFormat}`);
    }
    if (this.config.options.enableImplicitTransactions === true) {
      options.push('set implicit_transactions on');
    } else if (this.config.options.enableImplicitTransactions === false) {
      options.push('set implicit_transactions off');
    }
    if (this.config.options.language !== null) {
      options.push(`set language ${this.config.options.language}`);
    }
    if (this.config.options.enableNumericRoundabort === true) {
      options.push('set numeric_roundabort on');
    } else if (this.config.options.enableNumericRoundabort === false) {
      options.push('set numeric_roundabort off');
    }
    if (this.config.options.enableQuotedIdentifier === true) {
      options.push('set quoted_identifier on');
    } else if (this.config.options.enableQuotedIdentifier === false) {
      options.push('set quoted_identifier off');
    }
    if (this.config.options.textsize !== null) {
      options.push(`set textsize ${this.config.options.textsize}`);
    }
    if (this.config.options.connectionIsolationLevel !== null) {
      options.push(`set transaction isolation level ${this.getIsolationLevelText(this.config.options.connectionIsolationLevel)}`);
    }
    if (this.config.options.abortTransactionOnError === true) {
      options.push('set xact_abort on');
    } else if (this.config.options.abortTransactionOnError === false) {
      options.push('set xact_abort off');
    }
    return options.join('\n');
  }

  /**
   * Execute the SQL batch represented by [[Request]].
   * There is no param support, and unlike [[Request.execSql]],
   * it is not likely that SQL Server will reuse the execution plan it generates for the SQL.
   *
   * In almost all cases, [[Request.execSql]] will be a better choice.
   *
   * @param request A [[Request]] object representing the request.
   */
  execSqlBatch(request) {
    this.makeRequest(request, _packet.TYPE.SQL_BATCH, new _sqlbatchPayload.default(request.sqlTextOrProcedure, this.currentTransactionDescriptor(), this.config.options));
  }

  /**
   *  Execute the SQL represented by [[Request]].
   *
   * As `sp_executesql` is used to execute the SQL, if the same SQL is executed multiples times
   * using this function, the SQL Server query optimizer is likely to reuse the execution plan it generates
   * for the first execution. This may also result in SQL server treating the request like a stored procedure
   * which can result in the [[Event_doneInProc]] or [[Event_doneProc]] events being emitted instead of the
   * [[Event_done]] event you might expect. Using [[execSqlBatch]] will prevent this from occurring but may have a negative performance impact.
   *
   * Beware of the way that scoping rules apply, and how they may [affect local temp tables](http://weblogs.sqlteam.com/mladenp/archive/2006/11/03/17197.aspx)
   * If you're running in to scoping issues, then [[execSqlBatch]] may be a better choice.
   * See also [issue #24](https://github.com/pekim/tedious/issues/24)
   *
   * @param request A [[Request]] object representing the request.
   */
  execSql(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'statement',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    if (request.parameters.length) {
      parameters.push({
        type: _dataType.TYPES.NVarChar,
        name: 'params',
        value: request.makeParamsParameter(request.parameters),
        output: false,
        length: undefined,
        precision: undefined,
        scale: undefined
      });
      parameters.push(...request.parameters);
    }
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_ExecuteSql, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }

  /**
   * Creates a new BulkLoad instance.
   *
   * @param table The name of the table to bulk-insert into.
   * @param options A set of bulk load options.
   */

  newBulkLoad(table, callbackOrOptions, callback) {
    let options;
    if (callback === undefined) {
      callback = callbackOrOptions;
      options = {};
    } else {
      options = callbackOrOptions;
    }
    if (typeof options !== 'object') {
      throw new TypeError('"options" argument must be an object');
    }
    return new _bulkLoad.default(table, this.databaseCollation, this.config.options, options, callback);
  }

  /**
   * Execute a [[BulkLoad]].
   *
   * ```js
   * // We want to perform a bulk load into a table with the following format:
   * // CREATE TABLE employees (first_name nvarchar(255), last_name nvarchar(255), day_of_birth date);
   *
   * const bulkLoad = connection.newBulkLoad('employees', (err, rowCount) => {
   *   // ...
   * });
   *
   * // First, we need to specify the columns that we want to write to,
   * // and their definitions. These definitions must match the actual table,
   * // otherwise the bulk load will fail.
   * bulkLoad.addColumn('first_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('last_name', TYPES.NVarchar, { nullable: false });
   * bulkLoad.addColumn('date_of_birth', TYPES.Date, { nullable: false });
   *
   * // Execute a bulk load with a predefined list of rows.
   * //
   * // Note that these rows are held in memory until the
   * // bulk load was performed, so if you need to write a large
   * // number of rows (e.g. by reading from a CSV file),
   * // passing an `AsyncIterable` is advisable to keep memory usage low.
   * connection.execBulkLoad(bulkLoad, [
   *   { 'first_name': 'Steve', 'last_name': 'Jobs', 'day_of_birth': new Date('02-24-1955') },
   *   { 'first_name': 'Bill', 'last_name': 'Gates', 'day_of_birth': new Date('10-28-1955') }
   * ]);
   * ```
   *
   * @param bulkLoad A previously created [[BulkLoad]].
   * @param rows A [[Iterable]] or [[AsyncIterable]] that contains the rows that should be bulk loaded.
   */

  execBulkLoad(bulkLoad, rows) {
    bulkLoad.executionStarted = true;
    if (rows) {
      if (bulkLoad.streamingMode) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that was put in streaming mode.");
      }
      if (bulkLoad.firstRowWritten) {
        throw new Error("Connection.execBulkLoad can't be called with a BulkLoad that already has rows written to it.");
      }
      const rowStream = _stream.Readable.from(rows);

      // Destroy the packet transform if an error happens in the row stream,
      // e.g. if an error is thrown from within a generator or stream.
      rowStream.on('error', err => {
        bulkLoad.rowToPacketTransform.destroy(err);
      });

      // Destroy the row stream if an error happens in the packet transform,
      // e.g. if the bulk load is cancelled.
      bulkLoad.rowToPacketTransform.on('error', err => {
        rowStream.destroy(err);
      });
      rowStream.pipe(bulkLoad.rowToPacketTransform);
    } else if (!bulkLoad.streamingMode) {
      // If the bulkload was not put into streaming mode by the user,
      // we end the rowToPacketTransform here for them.
      //
      // If it was put into streaming mode, it's the user's responsibility
      // to end the stream.
      bulkLoad.rowToPacketTransform.end();
    }
    const onCancel = () => {
      request.cancel();
    };
    const payload = new _bulkLoadPayload.BulkLoadPayload(bulkLoad);
    const request = new _request.default(bulkLoad.getBulkInsertSql(), error => {
      bulkLoad.removeListener('cancel', onCancel);
      if (error) {
        if (error.code === 'UNKNOWN') {
          error.message += ' This is likely because the schema of the BulkLoad does not match the schema of the table you are attempting to insert into.';
        }
        bulkLoad.error = error;
        bulkLoad.callback(error);
        return;
      }
      this.makeRequest(bulkLoad, _packet.TYPE.BULK_LOAD, payload);
    });
    bulkLoad.once('cancel', onCancel);
    this.execSqlBatch(request);
  }

  /**
   * Prepare the SQL represented by the request.
   *
   * The request can then be used in subsequent calls to
   * [[execute]] and [[unprepare]]
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type. Parameter values are ignored.
   */
  prepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      value: undefined,
      output: true,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'params',
      value: request.parameters.length ? request.makeParamsParameter(request.parameters) : null,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    parameters.push({
      type: _dataType.TYPES.NVarChar,
      name: 'stmt',
      value: request.sqlTextOrProcedure,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    request.preparing = true;

    // TODO: We need to clean up this event handler, otherwise this leaks memory
    request.on('returnValue', (name, value) => {
      if (name === 'handle') {
        request.handle = value;
      } else {
        request.error = new _errors.RequestError(`Tedious > Unexpected output parameter ${name} from sp_prepare`);
      }
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Prepare, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }

  /**
   * Release the SQL Server resources associated with a previously prepared request.
   *
   * @param request A [[Request]] object representing the request.
   *   Parameters only require a name and type.
   *   Parameter values are ignored.
   */
  unprepare(request) {
    const parameters = [];
    parameters.push({
      type: _dataType.TYPES.Int,
      name: 'handle',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Unprepare, parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }

  /**
   * Execute previously prepared SQL, using the supplied parameters.
   *
   * @param request A previously prepared [[Request]].
   * @param parameters  An object whose names correspond to the names of
   *   parameters that were added to the [[Request]] before it was prepared.
   *   The object's values are passed as the parameters' values when the
   *   request is executed.
   */
  execute(request, parameters) {
    const executeParameters = [];
    executeParameters.push({
      type: _dataType.TYPES.Int,
      name: '',
      // TODO: Abort if `request.handle` is not set
      value: request.handle,
      output: false,
      length: undefined,
      precision: undefined,
      scale: undefined
    });
    try {
      for (let i = 0, len = request.parameters.length; i < len; i++) {
        const parameter = request.parameters[i];
        executeParameters.push({
          ...parameter,
          value: parameter.type.validate(parameters ? parameters[parameter.name] : null, this.databaseCollation)
        });
      }
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(_specialStoredProcedure.default.Sp_Execute, executeParameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }

  /**
   * Call a stored procedure represented by [[Request]].
   *
   * @param request A [[Request]] object representing the request.
   */
  callProcedure(request) {
    try {
      request.validateParameters(this.databaseCollation);
    } catch (error) {
      request.error = error;
      process.nextTick(() => {
        this.debug.log(error.message);
        request.callback(error);
      });
      return;
    }
    this.makeRequest(request, _packet.TYPE.RPC_REQUEST, new _rpcrequestPayload.default(request.sqlTextOrProcedure, request.parameters, this.currentTransactionDescriptor(), this.config.options, this.databaseCollation));
  }

  /**
   * Start a transaction.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`
   *   is present.
   * @param isolationLevel The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */
  beginTransaction(callback, name = '', isolationLevel = this.config.options.isolationLevel) {
    (0, _transaction.assertValidIsolationLevel)(isolationLevel, 'isolationLevel');
    const transaction = new _transaction.Transaction(name, isolationLevel);
    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SET TRANSACTION ISOLATION LEVEL ' + transaction.isolationLevelToTSQL() + ';BEGIN TRAN ' + transaction.name, err => {
        this.transactionDepth++;
        if (this.transactionDepth === 1) {
          this.inTransaction = true;
        }
        callback(err);
      }));
    }
    const request = new _request.default(undefined, err => {
      return callback(err, this.currentTransactionDescriptor());
    });
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.beginPayload(this.currentTransactionDescriptor()));
  }

  /**
   * Commit a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string. Required when `isolationLevel`is present.
   */
  commitTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);
    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('COMMIT TRAN ' + transaction.name, err => {
        this.transactionDepth--;
        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }
        callback(err);
      }));
    }
    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.commitPayload(this.currentTransactionDescriptor()));
  }

  /**
   * Rollback a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */
  rollbackTransaction(callback, name = '') {
    const transaction = new _transaction.Transaction(name);
    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('ROLLBACK TRAN ' + transaction.name, err => {
        this.transactionDepth--;
        if (this.transactionDepth === 0) {
          this.inTransaction = false;
        }
        callback(err);
      }));
    }
    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.rollbackPayload(this.currentTransactionDescriptor()));
  }

  /**
   * Set a savepoint within a transaction.
   *
   * There should be an active transaction - that is, [[beginTransaction]]
   * should have been previously called.
   *
   * @param callback
   * @param name A string representing a name to associate with the transaction.\
   *   Optional, and defaults to an empty string.
   *   Required when `isolationLevel` is present.
   */
  saveTransaction(callback, name) {
    const transaction = new _transaction.Transaction(name);
    if (this.config.options.tdsVersion < '7_2') {
      return this.execSqlBatch(new _request.default('SAVE TRAN ' + transaction.name, err => {
        this.transactionDepth++;
        callback(err);
      }));
    }
    const request = new _request.default(undefined, callback);
    return this.makeRequest(request, _packet.TYPE.TRANSACTION_MANAGER, transaction.savePayload(this.currentTransactionDescriptor()));
  }

  /**
   * Run the given callback after starting a transaction, and commit or
   * rollback the transaction afterwards.
   *
   * This is a helper that employs [[beginTransaction]], [[commitTransaction]],
   * [[rollbackTransaction]], and [[saveTransaction]] to greatly simplify the
   * use of database transactions and automatically handle transaction nesting.
   *
   * @param cb
   * @param isolationLevel
   *   The isolation level that the transaction is to be run with.
   *
   *   The isolation levels are available from `require('tedious').ISOLATION_LEVEL`.
   *   * `READ_UNCOMMITTED`
   *   * `READ_COMMITTED`
   *   * `REPEATABLE_READ`
   *   * `SERIALIZABLE`
   *   * `SNAPSHOT`
   *
   *   Optional, and defaults to the Connection's isolation level.
   */
  transaction(cb, isolationLevel) {
    if (typeof cb !== 'function') {
      throw new TypeError('`cb` must be a function');
    }
    const useSavepoint = this.inTransaction;
    const name = '_tedious_' + _crypto.default.randomBytes(10).toString('hex');
    const txDone = (err, done, ...args) => {
      if (err) {
        if (this.inTransaction && this.state === this.STATE.LOGGED_IN) {
          this.rollbackTransaction(txErr => {
            done(txErr || err, ...args);
          }, name);
        } else {
          done(err, ...args);
        }
      } else if (useSavepoint) {
        if (this.config.options.tdsVersion < '7_2') {
          this.transactionDepth--;
        }
        done(null, ...args);
      } else {
        this.commitTransaction(txErr => {
          done(txErr, ...args);
        }, name);
      }
    };
    if (useSavepoint) {
      return this.saveTransaction(err => {
        if (err) {
          return cb(err);
        }
        if (isolationLevel) {
          return this.execSqlBatch(new _request.default('SET transaction isolation level ' + this.getIsolationLevelText(isolationLevel), err => {
            return cb(err, txDone);
          }));
        } else {
          return cb(null, txDone);
        }
      }, name);
    } else {
      return this.beginTransaction(err => {
        if (err) {
          return cb(err);
        }
        return cb(null, txDone);
      }, name, isolationLevel);
    }
  }

  /**
   * @private
   */
  makeRequest(request, packetType, payload) {
    if (this.state !== this.STATE.LOGGED_IN) {
      const message = 'Requests can only be made in the ' + this.STATE.LOGGED_IN.name + ' state, not the ' + this.state.name + ' state';
      this.debug.log(message);
      request.callback(new _errors.RequestError(message, 'EINVALIDSTATE'));
    } else if (request.canceled) {
      process.nextTick(() => {
        request.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
      });
    } else {
      if (packetType === _packet.TYPE.SQL_BATCH) {
        this.isSqlBatch = true;
      } else {
        this.isSqlBatch = false;
      }
      this.request = request;
      request.connection = this;
      request.rowCount = 0;
      request.rows = [];
      request.rst = [];
      const onCancel = () => {
        payloadStream.unpipe(message);
        payloadStream.destroy(new _errors.RequestError('Canceled.', 'ECANCEL'));

        // set the ignore bit and end the message.
        message.ignore = true;
        message.end();
        if (request instanceof _request.default && request.paused) {
          // resume the request if it was paused so we can read the remaining tokens
          request.resume();
        }
      };
      request.once('cancel', onCancel);
      this.createRequestTimer();
      const message = new _message.default({
        type: packetType,
        resetConnection: this.resetConnectionOnNextRequest
      });
      this.messageIo.outgoingMessageStream.write(message);
      this.transitionTo(this.STATE.SENT_CLIENT_REQUEST);
      message.once('finish', () => {
        request.removeListener('cancel', onCancel);
        request.once('cancel', this._cancelAfterRequestSent);
        this.resetConnectionOnNextRequest = false;
        this.debug.payload(function () {
          return payload.toString('  ');
        });
      });
      const payloadStream = _stream.Readable.from(payload);
      payloadStream.once('error', error => {
        payloadStream.unpipe(message);

        // Only set a request error if no error was set yet.
        request.error ??= error;
        message.ignore = true;
        message.end();
      });
      payloadStream.pipe(message);
    }
  }

  /**
   * Cancel currently executed request.
   */
  cancel() {
    if (!this.request) {
      return false;
    }
    if (this.request.canceled) {
      return false;
    }
    this.request.cancel();
    return true;
  }

  /**
   * Reset the connection to its initial state.
   * Can be useful for connection pool implementations.
   *
   * @param callback
   */
  reset(callback) {
    const request = new _request.default(this.getInitialSql(), err => {
      if (this.config.options.tdsVersion < '7_2') {
        this.inTransaction = false;
      }
      callback(err);
    });
    this.resetConnectionOnNextRequest = true;
    this.execSqlBatch(request);
  }

  /**
   * @private
   */
  currentTransactionDescriptor() {
    return this.transactionDescriptors[this.transactionDescriptors.length - 1];
  }

  /**
   * @private
   */
  getIsolationLevelText(isolationLevel) {
    switch (isolationLevel) {
      case _transaction.ISOLATION_LEVEL.READ_UNCOMMITTED:
        return 'read uncommitted';
      case _transaction.ISOLATION_LEVEL.REPEATABLE_READ:
        return 'repeatable read';
      case _transaction.ISOLATION_LEVEL.SERIALIZABLE:
        return 'serializable';
      case _transaction.ISOLATION_LEVEL.SNAPSHOT:
        return 'snapshot';
      default:
        return 'read committed';
    }
  }

  /**
   * @private
   */
  async performTlsNegotiation(preloginPayload, signal) {
    signal.throwIfAborted();
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      if (preloginPayload.fedAuthRequired === 1) {
        this.fedAuthRequired = true;
      }
      if ('strict' !== this.config.options.encrypt && (preloginPayload.encryptionString === 'ON' || preloginPayload.encryptionString === 'REQ')) {
        if (!this.config.options.encrypt) {
          throw new _errors.ConnectionError("Server requires encryption, set 'encrypt' config option to true.", 'EENCRYPT');
        }
        this.transitionTo(this.STATE.SENT_TLSSSLNEGOTIATION);
        await Promise.race([this.messageIo.startTls(this.secureContextOptions, this.config.options.serverName ? this.config.options.serverName : this.routingData?.server ?? this.config.server, this.config.options.trustServerCertificate).catch(err => {
          throw this.wrapSocketError(err);
        }), signalAborted]);
      }
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }
  async readPreloginResponse(signal) {
    signal.throwIfAborted();
    let messageBuffer = Buffer.alloc(0);
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      const message = await Promise.race([this.messageIo.readMessage().catch(err => {
        throw this.wrapSocketError(err);
      }), signalAborted]);
      const iterator = message[Symbol.asyncIterator]();
      try {
        while (true) {
          const {
            done,
            value
          } = await Promise.race([iterator.next(), signalAborted]);
          if (done) {
            break;
          }
          messageBuffer = Buffer.concat([messageBuffer, value]);
        }
      } finally {
        if (iterator.return) {
          await iterator.return();
        }
      }
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
    const preloginPayload = new _preloginPayload.default(messageBuffer);
    this.debug.payload(function () {
      return preloginPayload.toString('  ');
    });
    return preloginPayload;
  }

  /**
   * @private
   */
  async performReRouting() {
    this.socket.removeListener('error', this._onSocketError);
    this.socket.removeListener('close', this._onSocketClose);
    this.socket.removeListener('end', this._onSocketEnd);
    this.socket.destroy();
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');
    this.emit('rerouting');
    this.debug.log('Rerouting to ' + this.routingData.server + ':' + this.routingData.port);

    // Attempt connecting to the rerouting target
    this.transitionTo(this.STATE.CONNECTING);
    await this.initialiseConnection();
  }

  /**
   * @private
   */
  async performTransientFailureRetry() {
    this.curTransientRetryCount++;
    this.socket.removeListener('error', this._onSocketError);
    this.socket.removeListener('close', this._onSocketClose);
    this.socket.removeListener('end', this._onSocketEnd);
    this.socket.destroy();
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');
    const server = this.routingData ? this.routingData.server : this.config.server;
    const port = this.routingData ? this.routingData.port : this.config.options.port;
    this.debug.log('Retry after transient failure connecting to ' + server + ':' + port);
    const {
      promise,
      resolve
    } = withResolvers();
    setTimeout(resolve, this.config.options.connectionRetryInterval);
    await promise;
    this.emit('retry');
    this.transitionTo(this.STATE.CONNECTING);
    await this.initialiseConnection();
  }

  /**
   * @private
   */
  async performSentLogin7WithStandardLogin(signal) {
    signal.throwIfAborted();
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      const message = await Promise.race([this.messageIo.readMessage().catch(err => {
        throw this.wrapSocketError(err);
      }), signalAborted]);
      const handler = new _handler.Login7TokenHandler(this);
      const tokenStreamParser = this.createTokenStreamParser(message, handler);
      await (0, _events.once)(tokenStreamParser, 'end');
      if (handler.loginAckReceived) {
        return handler.routingData;
      } else if (this.loginError) {
        throw this.loginError;
      } else {
        throw new _errors.ConnectionError('Login failed.', 'ELOGIN');
      }
    } finally {
      this.loginError = undefined;
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * @private
   */
  async performSentLogin7WithNTLMLogin(signal) {
    signal.throwIfAborted();
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      while (true) {
        const message = await Promise.race([this.messageIo.readMessage().catch(err => {
          throw this.wrapSocketError(err);
        }), signalAborted]);
        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await Promise.race([(0, _events.once)(tokenStreamParser, 'end'), signalAborted]);
        if (handler.loginAckReceived) {
          return handler.routingData;
        } else if (this.ntlmpacket) {
          const authentication = this.config.authentication;
          const payload = new _ntlmPayload.default({
            domain: authentication.options.domain,
            userName: authentication.options.userName,
            password: authentication.options.password,
            ntlmpacket: this.ntlmpacket
          });
          this.messageIo.sendMessage(_packet.TYPE.NTLMAUTH_PKT, payload.data);
          this.debug.payload(function () {
            return payload.toString('  ');
          });
          this.ntlmpacket = undefined;
        } else if (this.loginError) {
          throw this.loginError;
        } else {
          throw new _errors.ConnectionError('Login failed.', 'ELOGIN');
        }
      }
    } finally {
      this.loginError = undefined;
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * @private
   */
  async performSentLogin7WithFedAuth(signal) {
    signal.throwIfAborted();
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      const message = await Promise.race([this.messageIo.readMessage().catch(err => {
        throw this.wrapSocketError(err);
      }), signalAborted]);
      const handler = new _handler.Login7TokenHandler(this);
      const tokenStreamParser = this.createTokenStreamParser(message, handler);
      await Promise.race([(0, _events.once)(tokenStreamParser, 'end'), signalAborted]);
      if (handler.loginAckReceived) {
        return handler.routingData;
      }
      const fedAuthInfoToken = handler.fedAuthInfoToken;
      if (fedAuthInfoToken && fedAuthInfoToken.stsurl && fedAuthInfoToken.spn) {
        /** Federated authentication configation. */
        const authentication = this.config.authentication;
        /** Permission scope to pass to Entra ID when requesting an authentication token. */
        const tokenScope = new _url.URL('/.default', fedAuthInfoToken.spn).toString();

        /** Instance of the token credential to use to authenticate to the resource. */
        let credentials;
        switch (authentication.type) {
          case 'token-credential':
            credentials = authentication.options.credential;
            break;
          case 'azure-active-directory-password':
            credentials = new _identity.UsernamePasswordCredential(authentication.options.tenantId ?? 'common', authentication.options.clientId, authentication.options.userName, authentication.options.password);
            break;
          case 'azure-active-directory-msi-vm':
          case 'azure-active-directory-msi-app-service':
            const msiArgs = authentication.options.clientId ? [authentication.options.clientId, {}] : [{}];
            credentials = new _identity.ManagedIdentityCredential(...msiArgs);
            break;
          case 'azure-active-directory-default':
            const args = authentication.options.clientId ? {
              managedIdentityClientId: authentication.options.clientId
            } : {};
            credentials = new _identity.DefaultAzureCredential(args);
            break;
          case 'azure-active-directory-service-principal-secret':
            credentials = new _identity.ClientSecretCredential(authentication.options.tenantId, authentication.options.clientId, authentication.options.clientSecret);
            break;
        }

        /** Access token retrieved from Entra ID for the configured permission scope(s). */
        let tokenResponse;
        try {
          tokenResponse = await Promise.race([credentials.getToken(tokenScope), signalAborted]);
        } catch (err) {
          signal.throwIfAborted();
          throw new AggregateError([new _errors.ConnectionError('Security token could not be authenticated or authorized.', 'EFEDAUTH'), err]);
        }

        // Type guard the token value so that it is never null.
        if (tokenResponse === null) {
          throw new AggregateError([new _errors.ConnectionError('Security token could not be authenticated or authorized.', 'EFEDAUTH')]);
        }
        this.sendFedAuthTokenMessage(tokenResponse.token);
        // sent the fedAuth token message, the rest is similar to standard login 7
        this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
        return await this.performSentLogin7WithStandardLogin(signal);
      } else if (this.loginError) {
        throw this.loginError;
      } else {
        throw new _errors.ConnectionError('Login failed.', 'ELOGIN');
      }
    } finally {
      this.loginError = undefined;
      signal.removeEventListener('abort', onAbort);
    }
  }

  /**
   * @private
   */
  async performLoggedInSendingInitialSql(signal) {
    signal.throwIfAborted();
    const {
      promise: signalAborted,
      reject
    } = withResolvers();
    const onAbort = () => {
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, {
      once: true
    });
    try {
      this.sendInitialSql();
      const message = await Promise.race([this.messageIo.readMessage().catch(err => {
        throw this.wrapSocketError(err);
      }), signalAborted]);
      const tokenStreamParser = this.createTokenStreamParser(message, new _handler.InitialSqlTokenHandler(this));
      await Promise.race([(0, _events.once)(tokenStreamParser, 'end'), signalAborted]);
    } finally {
      signal.removeEventListener('abort', onAbort);
    }
  }
}
function isTransientError(error) {
  if (error instanceof AggregateError) {
    error = error.errors[0];
  }
  return error instanceof _errors.ConnectionError && !!error.isTransient;
}
var _default = exports.default = Connection;
module.exports = Connection;
Connection.prototype.STATE = {
  INITIALIZED: {
    name: 'Initialized',
    events: {}
  },
  CONNECTING: {
    name: 'Connecting',
    events: {}
  },
  SENT_PRELOGIN: {
    name: 'SentPrelogin',
    events: {}
  },
  REROUTING: {
    name: 'ReRouting',
    events: {}
  },
  TRANSIENT_FAILURE_RETRY: {
    name: 'TRANSIENT_FAILURE_RETRY',
    events: {}
  },
  SENT_TLSSSLNEGOTIATION: {
    name: 'SentTLSSSLNegotiation',
    events: {}
  },
  SENT_LOGIN7_WITH_STANDARD_LOGIN: {
    name: 'SentLogin7WithStandardLogin',
    events: {}
  },
  SENT_LOGIN7_WITH_NTLM: {
    name: 'SentLogin7WithNTLMLogin',
    events: {}
  },
  SENT_LOGIN7_WITH_FEDAUTH: {
    name: 'SentLogin7WithFedauth',
    events: {}
  },
  LOGGED_IN_SENDING_INITIAL_SQL: {
    name: 'LoggedInSendingInitialSql',
    events: {}
  },
  LOGGED_IN: {
    name: 'LoggedIn',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
        this.cleanupConnection();
      }
    }
  },
  SENT_CLIENT_REQUEST: {
    name: 'SentClientRequest',
    enter: function () {
      (async () => {
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          this.dispatchEvent('socketError', err);
          process.nextTick(() => {
            this.emit('error', this.wrapSocketError(err));
          });
          return;
        }
        // request timer is stopped on first data package
        this.clearRequestTimer();
        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.RequestTokenHandler(this, this.request));

        // If the request was canceled and we have a `cancelTimer`
        // defined, we send a attention message after the
        // request message was fully sent off.
        //
        // We already started consuming the current message
        // (but all the token handlers should be no-ops), and
        // need to ensure the next message is handled by the
        // `SENT_ATTENTION` state.
        if (this.request?.canceled && this.cancelTimer) {
          return this.transitionTo(this.STATE.SENT_ATTENTION);
        }
        const onResume = () => {
          tokenStreamParser.resume();
        };
        const onPause = () => {
          tokenStreamParser.pause();
          this.request?.once('resume', onResume);
        };
        this.request?.on('pause', onPause);
        if (this.request instanceof _request.default && this.request.paused) {
          onPause();
        }
        const onCancel = () => {
          tokenStreamParser.removeListener('end', onEndOfMessage);
          if (this.request instanceof _request.default && this.request.paused) {
            // resume the request if it was paused so we can read the remaining tokens
            this.request.resume();
          }
          this.request?.removeListener('pause', onPause);
          this.request?.removeListener('resume', onResume);

          // The `_cancelAfterRequestSent` callback will have sent a
          // attention message, so now we need to also switch to
          // the `SENT_ATTENTION` state to make sure the attention ack
          // message is processed correctly.
          this.transitionTo(this.STATE.SENT_ATTENTION);
        };
        const onEndOfMessage = () => {
          this.request?.removeListener('cancel', this._cancelAfterRequestSent);
          this.request?.removeListener('cancel', onCancel);
          this.request?.removeListener('pause', onPause);
          this.request?.removeListener('resume', onResume);
          this.transitionTo(this.STATE.LOGGED_IN);
          const sqlRequest = this.request;
          this.request = undefined;
          if (this.config.options.tdsVersion < '7_2' && sqlRequest.error && this.isSqlBatch) {
            this.inTransaction = false;
          }
          sqlRequest.callback(sqlRequest.error, sqlRequest.rowCount, sqlRequest.rows);
        };
        tokenStreamParser.once('end', onEndOfMessage);
        this.request?.once('cancel', onCancel);
      })();
    },
    exit: function (nextState) {
      this.clearRequestTimer();
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        this.cleanupConnection();
        sqlRequest.callback(err);
      }
    }
  },
  SENT_ATTENTION: {
    name: 'SentAttention',
    enter: function () {
      (async () => {
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          this.dispatchEvent('socketError', err);
          process.nextTick(() => {
            this.emit('error', this.wrapSocketError(err));
          });
          return;
        }
        const handler = new _handler.AttentionTokenHandler(this, this.request);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');
        // 3.2.5.7 Sent Attention State
        // Discard any data contained in the response, until we receive the attention response
        if (handler.attentionReceived) {
          this.clearCancelTimer();
          const sqlRequest = this.request;
          this.request = undefined;
          this.transitionTo(this.STATE.LOGGED_IN);
          if (sqlRequest.error && sqlRequest.error instanceof _errors.RequestError && sqlRequest.error.code === 'ETIMEOUT') {
            sqlRequest.callback(sqlRequest.error);
          } else {
            sqlRequest.callback(new _errors.RequestError('Canceled.', 'ECANCEL'));
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function (err) {
        const sqlRequest = this.request;
        this.request = undefined;
        this.transitionTo(this.STATE.FINAL);
        this.cleanupConnection();
        sqlRequest.callback(err);
      }
    }
  },
  FINAL: {
    name: 'Final',
    events: {}
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfY3J5cHRvIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfb3MiLCJ0bHMiLCJfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCIsIm5ldCIsIl9kbnMiLCJfY29uc3RhbnRzIiwiX3N0cmVhbSIsIl9pZGVudGl0eSIsIl9jb3JlQXV0aCIsIl9idWxrTG9hZCIsIl9kZWJ1ZyIsIl9ldmVudHMiLCJfaW5zdGFuY2VMb29rdXAiLCJfdHJhbnNpZW50RXJyb3JMb29rdXAiLCJfcGFja2V0IiwiX3ByZWxvZ2luUGF5bG9hZCIsIl9sb2dpbjdQYXlsb2FkIiwiX250bG1QYXlsb2FkIiwiX3JlcXVlc3QiLCJfcnBjcmVxdWVzdFBheWxvYWQiLCJfc3FsYmF0Y2hQYXlsb2FkIiwiX21lc3NhZ2VJbyIsIl90b2tlblN0cmVhbVBhcnNlciIsIl90cmFuc2FjdGlvbiIsIl9lcnJvcnMiLCJfY29ubmVjdG9yIiwiX2xpYnJhcnkiLCJfdGRzVmVyc2lvbnMiLCJfbWVzc2FnZSIsIl9udGxtIiwiX2RhdGFUeXBlIiwiX2J1bGtMb2FkUGF5bG9hZCIsIl9zcGVjaWFsU3RvcmVkUHJvY2VkdXJlIiwiX3BhY2thZ2UiLCJfdXJsIiwiX2hhbmRsZXIiLCJlIiwidCIsIldlYWtNYXAiLCJyIiwibiIsIl9fZXNNb2R1bGUiLCJvIiwiaSIsImYiLCJfX3Byb3RvX18iLCJkZWZhdWx0IiwiaGFzIiwiZ2V0Iiwic2V0IiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiT2JqZWN0IiwiZGVmaW5lUHJvcGVydHkiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IiLCJLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkiLCJERUZBVUxUX0NPTk5FQ1RfVElNRU9VVCIsIkRFRkFVTFRfQ0xJRU5UX1JFUVVFU1RfVElNRU9VVCIsIkRFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQiLCJERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwiLCJERUZBVUxUX1BBQ0tFVF9TSVpFIiwiREVGQVVMVF9URVhUU0laRSIsIkRFRkFVTFRfREFURUZJUlNUIiwiREVGQVVMVF9QT1JUIiwiREVGQVVMVF9URFNfVkVSU0lPTiIsIkRFRkFVTFRfTEFOR1VBR0UiLCJERUZBVUxUX0RBVEVGT1JNQVQiLCJ3aXRoUmVzb2x2ZXJzIiwicmVzb2x2ZSIsInJlamVjdCIsInByb21pc2UiLCJQcm9taXNlIiwicmVzIiwicmVqIiwiQ29ubmVjdGlvbiIsIkV2ZW50RW1pdHRlciIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiVHlwZUVycm9yIiwic2VydmVyIiwiZmVkQXV0aFJlcXVpcmVkIiwiYXV0aGVudGljYXRpb24iLCJ1bmRlZmluZWQiLCJ0eXBlIiwib3B0aW9ucyIsImRvbWFpbiIsInVzZXJOYW1lIiwicGFzc3dvcmQiLCJ0b1VwcGVyQ2FzZSIsImlzVG9rZW5DcmVkZW50aWFsIiwiY3JlZGVudGlhbCIsImNsaWVudElkIiwidGVuYW50SWQiLCJ0b2tlbiIsImNsaWVudFNlY3JldCIsImFib3J0VHJhbnNhY3Rpb25PbkVycm9yIiwiYXBwTmFtZSIsImNhbWVsQ2FzZUNvbHVtbnMiLCJjYW5jZWxUaW1lb3V0IiwiY29sdW1uRW5jcnlwdGlvbktleUNhY2hlVFRMIiwiY29sdW1uRW5jcnlwdGlvblNldHRpbmciLCJjb2x1bW5OYW1lUmVwbGFjZXIiLCJjb25uZWN0aW9uUmV0cnlJbnRlcnZhbCIsImNvbm5lY3RUaW1lb3V0IiwiY29ubmVjdG9yIiwiY29ubmVjdGlvbklzb2xhdGlvbkxldmVsIiwiSVNPTEFUSU9OX0xFVkVMIiwiUkVBRF9DT01NSVRURUQiLCJjcnlwdG9DcmVkZW50aWFsc0RldGFpbHMiLCJkYXRhYmFzZSIsImRhdGVmaXJzdCIsImRhdGVGb3JtYXQiLCJkZWJ1ZyIsImRhdGEiLCJwYWNrZXQiLCJwYXlsb2FkIiwiZW5hYmxlQW5zaU51bGwiLCJlbmFibGVBbnNpTnVsbERlZmF1bHQiLCJlbmFibGVBbnNpUGFkZGluZyIsImVuYWJsZUFuc2lXYXJuaW5ncyIsImVuYWJsZUFyaXRoQWJvcnQiLCJlbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCIsImVuYWJsZUN1cnNvckNsb3NlT25Db21taXQiLCJlbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyIsImVuYWJsZU51bWVyaWNSb3VuZGFib3J0IiwiZW5hYmxlUXVvdGVkSWRlbnRpZmllciIsImVuY3J5cHQiLCJmYWxsYmFja1RvRGVmYXVsdERiIiwiZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzIiwiaW5zdGFuY2VOYW1lIiwiaXNvbGF0aW9uTGV2ZWwiLCJsYW5ndWFnZSIsImxvY2FsQWRkcmVzcyIsIm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyIsIm11bHRpU3VibmV0RmFpbG92ZXIiLCJwYWNrZXRTaXplIiwicG9ydCIsInJlYWRPbmx5SW50ZW50IiwicmVxdWVzdFRpbWVvdXQiLCJyb3dDb2xsZWN0aW9uT25Eb25lIiwicm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24iLCJzZXJ2ZXJOYW1lIiwic2VydmVyU3VwcG9ydHNDb2x1bW5FbmNyeXB0aW9uIiwidGRzVmVyc2lvbiIsInRleHRzaXplIiwidHJ1c3RlZFNlcnZlck5hbWVBRSIsInRydXN0U2VydmVyQ2VydGlmaWNhdGUiLCJ1c2VDb2x1bW5OYW1lcyIsInVzZVVUQyIsIndvcmtzdGF0aW9uSWQiLCJsb3dlckNhc2VHdWlkcyIsIkVycm9yIiwiYXNzZXJ0VmFsaWRJc29sYXRpb25MZXZlbCIsIlJhbmdlRXJyb3IiLCJzZWN1cmVDb250ZXh0T3B0aW9ucyIsInNlY3VyZU9wdGlvbnMiLCJjcmVhdGUiLCJ2YWx1ZSIsImNvbnN0YW50cyIsIlNTTF9PUF9ET05UX0lOU0VSVF9FTVBUWV9GUkFHTUVOVFMiLCJjcmVhdGVEZWJ1ZyIsImluVHJhbnNhY3Rpb24iLCJ0cmFuc2FjdGlvbkRlc2NyaXB0b3JzIiwiQnVmZmVyIiwiZnJvbSIsInRyYW5zYWN0aW9uRGVwdGgiLCJpc1NxbEJhdGNoIiwiY2xvc2VkIiwibWVzc2FnZUJ1ZmZlciIsImFsbG9jIiwiY3VyVHJhbnNpZW50UmV0cnlDb3VudCIsInRyYW5zaWVudEVycm9yTG9va3VwIiwiVHJhbnNpZW50RXJyb3JMb29rdXAiLCJzdGF0ZSIsIlNUQVRFIiwiSU5JVElBTElaRUQiLCJfY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudCIsIm1lc3NhZ2VJbyIsInNlbmRNZXNzYWdlIiwiVFlQRSIsIkFUVEVOVElPTiIsImNyZWF0ZUNhbmNlbFRpbWVyIiwiX29uU29ja2V0Q2xvc2UiLCJzb2NrZXRDbG9zZSIsIl9vblNvY2tldEVuZCIsInNvY2tldEVuZCIsIl9vblNvY2tldEVycm9yIiwiZXJyb3IiLCJkaXNwYXRjaEV2ZW50IiwicHJvY2VzcyIsIm5leHRUaWNrIiwiZW1pdCIsIndyYXBTb2NrZXRFcnJvciIsImNvbm5lY3QiLCJjb25uZWN0TGlzdGVuZXIiLCJDb25uZWN0aW9uRXJyb3IiLCJuYW1lIiwib25Db25uZWN0IiwiZXJyIiwicmVtb3ZlTGlzdGVuZXIiLCJvbkVycm9yIiwib25jZSIsInRyYW5zaXRpb25UbyIsIkNPTk5FQ1RJTkciLCJpbml0aWFsaXNlQ29ubmVjdGlvbiIsInRoZW4iLCJGSU5BTCIsIm9uIiwiZXZlbnQiLCJsaXN0ZW5lciIsImFyZ3MiLCJjbG9zZSIsImNsZWFudXBDb25uZWN0aW9uIiwidGltZW91dENvbnRyb2xsZXIiLCJBYm9ydENvbnRyb2xsZXIiLCJjb25uZWN0VGltZXIiLCJzZXRUaW1lb3V0IiwiaG9zdFBvc3RmaXgiLCJyb3V0aW5nRGF0YSIsInJvdXRpbmdNZXNzYWdlIiwibWVzc2FnZSIsImxvZyIsImFib3J0Iiwic2lnbmFsIiwiaW5zdGFuY2VMb29rdXAiLCJ0aW1lb3V0IiwidGhyb3dJZkFib3J0ZWQiLCJjYXVzZSIsInNvY2tldCIsImNvbm5lY3RPblBvcnQiLCJjb250cm9sbGVyIiwib25DbG9zZSIsIm9uRW5kIiwiY29kZSIsIkFib3J0U2lnbmFsIiwiYW55Iiwic2V0S2VlcEFsaXZlIiwiTWVzc2FnZUlPIiwiY2xlYXJ0ZXh0Iiwic2VuZFByZUxvZ2luIiwiU0VOVF9QUkVMT0dJTiIsInByZWxvZ2luUmVzcG9uc2UiLCJyZWFkUHJlbG9naW5SZXNwb25zZSIsInBlcmZvcm1UbHNOZWdvdGlhdGlvbiIsInNlbmRMb2dpbjdQYWNrZXQiLCJTRU5UX0xPR0lON19XSVRIX0ZFREFVVEgiLCJwZXJmb3JtU2VudExvZ2luN1dpdGhGZWRBdXRoIiwiU0VOVF9MT0dJTjdfV0lUSF9OVExNIiwicGVyZm9ybVNlbnRMb2dpbjdXaXRoTlRMTUxvZ2luIiwiU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTiIsInBlcmZvcm1TZW50TG9naW43V2l0aFN0YW5kYXJkTG9naW4iLCJpc1RyYW5zaWVudEVycm9yIiwiVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlkiLCJwZXJmb3JtVHJhbnNpZW50RmFpbHVyZVJldHJ5IiwiUkVST1VUSU5HIiwicGVyZm9ybVJlUm91dGluZyIsIkxPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMIiwicGVyZm9ybUxvZ2dlZEluU2VuZGluZ0luaXRpYWxTcWwiLCJkZXN0cm95IiwiTE9HR0VEX0lOIiwiY2xlYXJUaW1lb3V0IiwiY2xlYXJSZXF1ZXN0VGltZXIiLCJjbG9zZUNvbm5lY3Rpb24iLCJyZXF1ZXN0IiwiUmVxdWVzdEVycm9yIiwiY2FsbGJhY2siLCJEZWJ1ZyIsImNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyIiwiaGFuZGxlciIsIlRva2VuU3RyZWFtUGFyc2VyIiwid3JhcFdpdGhUbHMiLCJzZWN1cmVDb250ZXh0IiwiY3JlYXRlU2VjdXJlQ29udGV4dCIsImlzSVAiLCJlbmNyeXB0T3B0aW9ucyIsImhvc3QiLCJBTFBOUHJvdG9jb2xzIiwic2VydmVybmFtZSIsImVuY3J5cHRzb2NrZXQiLCJvbkFib3J0IiwicmVhc29uIiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJjdXN0b21Db25uZWN0b3IiLCJjb25uZWN0T3B0cyIsImNvbm5lY3RJblBhcmFsbGVsIiwiY29ubmVjdEluU2VxdWVuY2UiLCJkbnMiLCJsb29rdXAiLCJlbmQiLCJjbGVhckNhbmNlbFRpbWVyIiwiY2FuY2VsVGltZXIiLCJjcmVhdGVSZXF1ZXN0VGltZXIiLCJyZXF1ZXN0VGltZXIiLCJjYW5jZWwiLCJuZXdTdGF0ZSIsImV4aXQiLCJlbnRlciIsImFwcGx5IiwiZ2V0RXZlbnRIYW5kbGVyIiwiZXZlbnROYW1lIiwiZXZlbnRzIiwiU0VOVF9UTFNTU0xORUdPVElBVElPTiIsIm1ham9yIiwibWlub3IiLCJidWlsZCIsImV4ZWMiLCJ2ZXJzaW9uIiwiUHJlbG9naW5QYXlsb2FkIiwiTnVtYmVyIiwic3ViYnVpbGQiLCJQUkVMT0dJTiIsInRvU3RyaW5nIiwiTG9naW43UGF5bG9hZCIsInZlcnNpb25zIiwiY2xpZW50UHJvZ1ZlciIsImNsaWVudFBpZCIsInBpZCIsImNvbm5lY3Rpb25JZCIsImNsaWVudFRpbWVab25lIiwiRGF0ZSIsImdldFRpbWV6b25lT2Zmc2V0IiwiY2xpZW50TGNpZCIsImZlZEF1dGgiLCJlY2hvIiwid29ya2Zsb3ciLCJmZWRBdXRoVG9rZW4iLCJzc3BpIiwiY3JlYXRlTlRMTVJlcXVlc3QiLCJob3N0bmFtZSIsIm9zIiwiaW5zdGFuY2UiLCJsaWJyYXJ5TmFtZSIsImluaXREYkZhdGFsIiwiTE9HSU43IiwidG9CdWZmZXIiLCJzZW5kRmVkQXV0aFRva2VuTWVzc2FnZSIsImFjY2Vzc1Rva2VuTGVuIiwiYnl0ZUxlbmd0aCIsIm9mZnNldCIsIndyaXRlVUludDMyTEUiLCJ3cml0ZSIsIkZFREFVVEhfVE9LRU4iLCJzZW5kSW5pdGlhbFNxbCIsIlNxbEJhdGNoUGF5bG9hZCIsImdldEluaXRpYWxTcWwiLCJjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yIiwiTWVzc2FnZSIsIlNRTF9CQVRDSCIsIm91dGdvaW5nTWVzc2FnZVN0cmVhbSIsIlJlYWRhYmxlIiwicGlwZSIsInB1c2giLCJnZXRJc29sYXRpb25MZXZlbFRleHQiLCJqb2luIiwiZXhlY1NxbEJhdGNoIiwibWFrZVJlcXVlc3QiLCJzcWxUZXh0T3JQcm9jZWR1cmUiLCJleGVjU3FsIiwidmFsaWRhdGVQYXJhbWV0ZXJzIiwiZGF0YWJhc2VDb2xsYXRpb24iLCJwYXJhbWV0ZXJzIiwiVFlQRVMiLCJOVmFyQ2hhciIsIm91dHB1dCIsImxlbmd0aCIsInByZWNpc2lvbiIsInNjYWxlIiwibWFrZVBhcmFtc1BhcmFtZXRlciIsIlJQQ19SRVFVRVNUIiwiUnBjUmVxdWVzdFBheWxvYWQiLCJQcm9jZWR1cmVzIiwiU3BfRXhlY3V0ZVNxbCIsIm5ld0J1bGtMb2FkIiwidGFibGUiLCJjYWxsYmFja09yT3B0aW9ucyIsIkJ1bGtMb2FkIiwiZXhlY0J1bGtMb2FkIiwiYnVsa0xvYWQiLCJyb3dzIiwiZXhlY3V0aW9uU3RhcnRlZCIsInN0cmVhbWluZ01vZGUiLCJmaXJzdFJvd1dyaXR0ZW4iLCJyb3dTdHJlYW0iLCJyb3dUb1BhY2tldFRyYW5zZm9ybSIsIm9uQ2FuY2VsIiwiQnVsa0xvYWRQYXlsb2FkIiwiUmVxdWVzdCIsImdldEJ1bGtJbnNlcnRTcWwiLCJCVUxLX0xPQUQiLCJwcmVwYXJlIiwiSW50IiwicHJlcGFyaW5nIiwiaGFuZGxlIiwiU3BfUHJlcGFyZSIsInVucHJlcGFyZSIsIlNwX1VucHJlcGFyZSIsImV4ZWN1dGUiLCJleGVjdXRlUGFyYW1ldGVycyIsImxlbiIsInBhcmFtZXRlciIsInZhbGlkYXRlIiwiU3BfRXhlY3V0ZSIsImNhbGxQcm9jZWR1cmUiLCJiZWdpblRyYW5zYWN0aW9uIiwidHJhbnNhY3Rpb24iLCJUcmFuc2FjdGlvbiIsImlzb2xhdGlvbkxldmVsVG9UU1FMIiwiVFJBTlNBQ1RJT05fTUFOQUdFUiIsImJlZ2luUGF5bG9hZCIsImNvbW1pdFRyYW5zYWN0aW9uIiwiY29tbWl0UGF5bG9hZCIsInJvbGxiYWNrVHJhbnNhY3Rpb24iLCJyb2xsYmFja1BheWxvYWQiLCJzYXZlVHJhbnNhY3Rpb24iLCJzYXZlUGF5bG9hZCIsImNiIiwidXNlU2F2ZXBvaW50IiwiY3J5cHRvIiwicmFuZG9tQnl0ZXMiLCJ0eERvbmUiLCJkb25lIiwidHhFcnIiLCJwYWNrZXRUeXBlIiwiY2FuY2VsZWQiLCJjb25uZWN0aW9uIiwicm93Q291bnQiLCJyc3QiLCJwYXlsb2FkU3RyZWFtIiwidW5waXBlIiwiaWdub3JlIiwicGF1c2VkIiwicmVzdW1lIiwicmVzZXRDb25uZWN0aW9uIiwicmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCIsIlNFTlRfQ0xJRU5UX1JFUVVFU1QiLCJyZXNldCIsIlJFQURfVU5DT01NSVRURUQiLCJSRVBFQVRBQkxFX1JFQUQiLCJTRVJJQUxJWkFCTEUiLCJTTkFQU0hPVCIsInByZWxvZ2luUGF5bG9hZCIsInNpZ25hbEFib3J0ZWQiLCJlbmNyeXB0aW9uU3RyaW5nIiwicmFjZSIsInN0YXJ0VGxzIiwiY2F0Y2giLCJyZWFkTWVzc2FnZSIsIml0ZXJhdG9yIiwiU3ltYm9sIiwiYXN5bmNJdGVyYXRvciIsIm5leHQiLCJjb25jYXQiLCJyZXR1cm4iLCJMb2dpbjdUb2tlbkhhbmRsZXIiLCJ0b2tlblN0cmVhbVBhcnNlciIsImxvZ2luQWNrUmVjZWl2ZWQiLCJsb2dpbkVycm9yIiwibnRsbXBhY2tldCIsIk5UTE1SZXNwb25zZVBheWxvYWQiLCJOVExNQVVUSF9QS1QiLCJmZWRBdXRoSW5mb1Rva2VuIiwic3RzdXJsIiwic3BuIiwidG9rZW5TY29wZSIsIlVSTCIsImNyZWRlbnRpYWxzIiwiVXNlcm5hbWVQYXNzd29yZENyZWRlbnRpYWwiLCJtc2lBcmdzIiwiTWFuYWdlZElkZW50aXR5Q3JlZGVudGlhbCIsIm1hbmFnZWRJZGVudGl0eUNsaWVudElkIiwiRGVmYXVsdEF6dXJlQ3JlZGVudGlhbCIsIkNsaWVudFNlY3JldENyZWRlbnRpYWwiLCJ0b2tlblJlc3BvbnNlIiwiZ2V0VG9rZW4iLCJBZ2dyZWdhdGVFcnJvciIsIkluaXRpYWxTcWxUb2tlbkhhbmRsZXIiLCJlcnJvcnMiLCJpc1RyYW5zaWVudCIsIl9kZWZhdWx0IiwiZXhwb3J0cyIsIm1vZHVsZSIsInByb3RvdHlwZSIsInNvY2tldEVycm9yIiwiUmVxdWVzdFRva2VuSGFuZGxlciIsIlNFTlRfQVRURU5USU9OIiwib25SZXN1bWUiLCJvblBhdXNlIiwicGF1c2UiLCJvbkVuZE9mTWVzc2FnZSIsInNxbFJlcXVlc3QiLCJuZXh0U3RhdGUiLCJBdHRlbnRpb25Ub2tlbkhhbmRsZXIiLCJhdHRlbnRpb25SZWNlaXZlZCJdLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25uZWN0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0bHMgZnJvbSAndGxzJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0IGRucyBmcm9tICdkbnMnO1xuXG5pbXBvcnQgY29uc3RhbnRzIGZyb20gJ2NvbnN0YW50cyc7XG5pbXBvcnQgeyB0eXBlIFNlY3VyZUNvbnRleHRPcHRpb25zIH0gZnJvbSAndGxzJztcblxuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdzdHJlYW0nO1xuXG5pbXBvcnQge1xuICBDbGllbnRTZWNyZXRDcmVkZW50aWFsLFxuICBEZWZhdWx0QXp1cmVDcmVkZW50aWFsLFxuICBNYW5hZ2VkSWRlbnRpdHlDcmVkZW50aWFsLFxuICBVc2VybmFtZVBhc3N3b3JkQ3JlZGVudGlhbFxufSBmcm9tICdAYXp1cmUvaWRlbnRpdHknO1xuaW1wb3J0IHsgdHlwZSBBY2Nlc3NUb2tlbiwgdHlwZSBUb2tlbkNyZWRlbnRpYWwsIGlzVG9rZW5DcmVkZW50aWFsIH0gZnJvbSAnQGF6dXJlL2NvcmUtYXV0aCc7XG5cbmltcG9ydCBCdWxrTG9hZCwgeyB0eXBlIE9wdGlvbnMgYXMgQnVsa0xvYWRPcHRpb25zLCB0eXBlIENhbGxiYWNrIGFzIEJ1bGtMb2FkQ2FsbGJhY2sgfSBmcm9tICcuL2J1bGstbG9hZCc7XG5pbXBvcnQgRGVidWcgZnJvbSAnLi9kZWJ1Zyc7XG5pbXBvcnQgeyBFdmVudEVtaXR0ZXIsIG9uY2UgfSBmcm9tICdldmVudHMnO1xuaW1wb3J0IHsgaW5zdGFuY2VMb29rdXAgfSBmcm9tICcuL2luc3RhbmNlLWxvb2t1cCc7XG5pbXBvcnQgeyBUcmFuc2llbnRFcnJvckxvb2t1cCB9IGZyb20gJy4vdHJhbnNpZW50LWVycm9yLWxvb2t1cCc7XG5pbXBvcnQgeyBUWVBFIH0gZnJvbSAnLi9wYWNrZXQnO1xuaW1wb3J0IFByZWxvZ2luUGF5bG9hZCBmcm9tICcuL3ByZWxvZ2luLXBheWxvYWQnO1xuaW1wb3J0IExvZ2luN1BheWxvYWQgZnJvbSAnLi9sb2dpbjctcGF5bG9hZCc7XG5pbXBvcnQgTlRMTVJlc3BvbnNlUGF5bG9hZCBmcm9tICcuL250bG0tcGF5bG9hZCc7XG5pbXBvcnQgUmVxdWVzdCBmcm9tICcuL3JlcXVlc3QnO1xuaW1wb3J0IFJwY1JlcXVlc3RQYXlsb2FkIGZyb20gJy4vcnBjcmVxdWVzdC1wYXlsb2FkJztcbmltcG9ydCBTcWxCYXRjaFBheWxvYWQgZnJvbSAnLi9zcWxiYXRjaC1wYXlsb2FkJztcbmltcG9ydCBNZXNzYWdlSU8gZnJvbSAnLi9tZXNzYWdlLWlvJztcbmltcG9ydCB7IFBhcnNlciBhcyBUb2tlblN0cmVhbVBhcnNlciB9IGZyb20gJy4vdG9rZW4vdG9rZW4tc3RyZWFtLXBhcnNlcic7XG5pbXBvcnQgeyBUcmFuc2FjdGlvbiwgSVNPTEFUSU9OX0xFVkVMLCBhc3NlcnRWYWxpZElzb2xhdGlvbkxldmVsIH0gZnJvbSAnLi90cmFuc2FjdGlvbic7XG5pbXBvcnQgeyBDb25uZWN0aW9uRXJyb3IsIFJlcXVlc3RFcnJvciB9IGZyb20gJy4vZXJyb3JzJztcbmltcG9ydCB7IGNvbm5lY3RJblBhcmFsbGVsLCBjb25uZWN0SW5TZXF1ZW5jZSB9IGZyb20gJy4vY29ubmVjdG9yJztcbmltcG9ydCB7IG5hbWUgYXMgbGlicmFyeU5hbWUgfSBmcm9tICcuL2xpYnJhcnknO1xuaW1wb3J0IHsgdmVyc2lvbnMgfSBmcm9tICcuL3Rkcy12ZXJzaW9ucyc7XG5pbXBvcnQgTWVzc2FnZSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHsgdHlwZSBNZXRhZGF0YSB9IGZyb20gJy4vbWV0YWRhdGEtcGFyc2VyJztcbmltcG9ydCB7IGNyZWF0ZU5UTE1SZXF1ZXN0IH0gZnJvbSAnLi9udGxtJztcbmltcG9ydCB7IENvbHVtbkVuY3J5cHRpb25BenVyZUtleVZhdWx0UHJvdmlkZXIgfSBmcm9tICcuL2Fsd2F5cy1lbmNyeXB0ZWQva2V5c3RvcmUtcHJvdmlkZXItYXp1cmUta2V5LXZhdWx0JztcblxuaW1wb3J0IHsgdHlwZSBQYXJhbWV0ZXIsIFRZUEVTIH0gZnJvbSAnLi9kYXRhLXR5cGUnO1xuaW1wb3J0IHsgQnVsa0xvYWRQYXlsb2FkIH0gZnJvbSAnLi9idWxrLWxvYWQtcGF5bG9hZCc7XG5pbXBvcnQgeyBDb2xsYXRpb24gfSBmcm9tICcuL2NvbGxhdGlvbic7XG5pbXBvcnQgUHJvY2VkdXJlcyBmcm9tICcuL3NwZWNpYWwtc3RvcmVkLXByb2NlZHVyZSc7XG5cbmltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IEF0dGVudGlvblRva2VuSGFuZGxlciwgSW5pdGlhbFNxbFRva2VuSGFuZGxlciwgTG9naW43VG9rZW5IYW5kbGVyLCBSZXF1ZXN0VG9rZW5IYW5kbGVyLCBUb2tlbkhhbmRsZXIgfSBmcm9tICcuL3Rva2VuL2hhbmRsZXInO1xuXG50eXBlIEJlZ2luVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc3RhcnQgdGhlIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqIEBwYXJhbSB0cmFuc2FjdGlvbkRlc2NyaXB0b3IgQSBCdWZmZXIgdGhhdCBkZXNjcmliZSB0aGUgdHJhbnNhY3Rpb25cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgdHJhbnNhY3Rpb25EZXNjcmlwdG9yPzogQnVmZmVyKSA9PiB2b2lkXG5cbnR5cGUgU2F2ZVRyYW5zYWN0aW9uQ2FsbGJhY2sgPVxuICAvKipcbiAgICogVGhlIGNhbGxiYWNrIGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IHRvIHNldCBhIHNhdmVwb2ludCB3aXRoaW4gdGhlXG4gICAqIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgQ29tbWl0VHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gY29tbWl0IHRoZSB0cmFuc2FjdGlvbiBoYXMgY29tcGxldGVkLFxuICAgKiBlaXRoZXIgc3VjY2Vzc2Z1bGx5IG9yIHdpdGggYW4gZXJyb3IuXG4gICAqIElmIGFuIGVycm9yIG9jY3VycmVkIHRoZW4gYGVycmAgd2lsbCBkZXNjcmliZSB0aGUgZXJyb3IuXG4gICAqXG4gICAqIEFzIG9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24sIGFub3RoZXIgcmVxdWVzdCBzaG91bGQgbm90XG4gICAqIGJlIGluaXRpYXRlZCB1bnRpbCB0aGlzIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG50eXBlIFJvbGxiYWNrVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uIGhhc1xuICAgKiBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBlcnIgd2lsbCBkZXNjcmliZSB0aGUgZXJyb3IuXG4gICAqXG4gICAqIEFzIG9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24sIGFub3RoZXIgcmVxdWVzdCBzaG91bGQgbm90XG4gICAqIGJlIGluaXRpYXRlZCB1bnRpbCB0aGlzIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG50eXBlIFJlc2V0Q2FsbGJhY2sgPVxuICAvKipcbiAgICogVGhlIGNhbGxiYWNrIGlzIGNhbGxlZCB3aGVuIHRoZSBjb25uZWN0aW9uIHJlc2V0IGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICpcbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlclxuICAgKiByZXF1ZXN0IHNob3VsZCBub3QgYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xudHlwZSBUcmFuc2FjdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkPiA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc3RhcnQgYSB0cmFuc2FjdGlvbiAob3IgY3JlYXRlIGEgc2F2ZXBvaW50LCBpblxuICAgKiB0aGUgY2FzZSBvZiBhIG5lc3RlZCB0cmFuc2FjdGlvbikgaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCwgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICogSWYgbm8gZXJyb3Igb2NjdXJyZWQsIHRoZSBjYWxsYmFjayBzaG91bGQgcGVyZm9ybSBpdHMgd29yayBhbmQgZXZlbnR1YWxseSBjYWxsXG4gICAqIGBkb25lYCB3aXRoIGFuIGVycm9yIG9yIG51bGwgKHRvIHRyaWdnZXIgYSB0cmFuc2FjdGlvbiByb2xsYmFjayBvciBhXG4gICAqIHRyYW5zYWN0aW9uIGNvbW1pdCkgYW5kIGFuIGFkZGl0aW9uYWwgY29tcGxldGlvbiBjYWxsYmFjayB0aGF0IHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3RcbiAgICogdG8gcm9sbGJhY2sgb3IgY29tbWl0IHRoZSBjdXJyZW50IHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogQWRkaXRpb25hbCBhcmd1bWVudHMgZ2l2ZW4gdG8gYGRvbmVgIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdG8gdGhpcyBjYWxsYmFjay5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoZSBjb21wbGV0aW9uIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKiBAcGFyYW0gdHhEb25lIElmIG5vIGVycm9yIG9jY3VycmVkLCBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB0byBjb21taXQgb3Igcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCB0eERvbmU/OiBUcmFuc2FjdGlvbkRvbmU8VD4pID0+IHZvaWQ7XG5cbnR5cGUgVHJhbnNhY3Rpb25Eb25lQ2FsbGJhY2sgPSAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xudHlwZSBDYWxsYmFja1BhcmFtZXRlcnM8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IGFueT4gPSBUIGV4dGVuZHMgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCAuLi5hcmdzOiBpbmZlciBQKSA9PiBhbnkgPyBQIDogbmV2ZXI7XG5cbnR5cGUgVHJhbnNhY3Rpb25Eb25lPFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkPiA9XG4gIC8qKlxuICAgKiBJZiBubyBlcnJvciBvY2N1cnJlZCwgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgdG8gY29tbWl0IG9yIHJvbGxiYWNrIHRoZSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnIgb2NjdXJyZWQsIGEgc3RyaW5nIHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIGRvbmU6IFQsIC4uLmFyZ3M6IENhbGxiYWNrUGFyYW1ldGVyczxUPikgPT4gdm9pZDtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkgPSAzMCAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ09OTkVDVF9USU1FT1VUID0gMTUgKiAxMDAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0NMSUVOVF9SRVFVRVNUX1RJTUVPVVQgPSAxNSAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQgPSA1ICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DT05ORUNUX1JFVFJZX0lOVEVSVkFMID0gNTAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX1BBQ0tFVF9TSVpFID0gNCAqIDEwMjQ7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfVEVYVFNJWkUgPSAyMTQ3NDgzNjQ3O1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0RBVEVGSVJTVCA9IDc7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfUE9SVCA9IDE0MzM7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfVERTX1ZFUlNJT04gPSAnN180Jztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9MQU5HVUFHRSA9ICd1c19lbmdsaXNoJztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9EQVRFRk9STUFUID0gJ21keSc7XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBJZiB5b3UgdXNlciB3YW50IHRvIGNvbm5lY3QgdG8gYW4gQXp1cmUgYXBwIHNlcnZpY2UgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2ZSB0b2tlbiBmcm9tIGF6dXJlIHdlYiBhcHAgc2VydmljZVxuICAgICAqL1xuICAgIGNsaWVudElkPzogc3RyaW5nO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB3YW50IHRvIGNvbm5lY3QgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlZCB0byB0aGVpciBjcmVhdGVkIGlkZW50aXR5LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBvcHRpb25hbCBmb3IgcmV0cmlldmUgYSB0b2tlblxuICAgICAqL1xuICAgIGNsaWVudElkPzogc3RyaW5nO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlEZWZhdWx0QXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB3YW50IHRvIGNvbm5lY3QgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlZCB0byB0aGVpciBjcmVhdGVkIGlkZW50aXR5LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBvcHRpb25hbCBmb3IgcmV0cmlldmluZyBhIHRva2VuXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbic7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBIHVzZXIgbmVlZCB0byBwcm92aWRlIGB0b2tlbmAgd2hpY2ggdGhleSByZXRyaWV2ZWQgZWxzZSB3aGVyZVxuICAgICAqIHRvIGZvcm1pbmcgdGhlIGNvbm5lY3Rpb24uXG4gICAgICovXG4gICAgdG9rZW46IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5UGFzc3dvcmRBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHVzZXJOYW1lYCBhc3NvY2lhdGUgdG8gdGhlaXIgYWNjb3VudC5cbiAgICAgKi9cbiAgICB1c2VyTmFtZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQSB1c2VyIG5lZWQgdG8gcHJvdmlkZSBgcGFzc3dvcmRgIGFzc29jaWF0ZSB0byB0aGVpciBhY2NvdW50LlxuICAgICAqL1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBBIGNsaWVudCBpZCB0byB1c2UuXG4gICAgICovXG4gICAgY2xpZW50SWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIE9wdGlvbmFsIHBhcmFtZXRlciBmb3Igc3BlY2lmaWMgQXp1cmUgdGVuYW50IElEXG4gICAgICovXG4gICAgdGVuYW50SWQ6IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBcHBsaWNhdGlvbiAoYGNsaWVudGApIElEIGZyb20geW91ciByZWdpc3RlcmVkIEF6dXJlIGFwcGxpY2F0aW9uXG4gICAgICovXG4gICAgY2xpZW50SWQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBUaGUgY3JlYXRlZCBgY2xpZW50IHNlY3JldGAgZm9yIHRoaXMgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIGNsaWVudFNlY3JldDogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIERpcmVjdG9yeSAoYHRlbmFudGApIElEIGZyb20geW91ciByZWdpc3RlcmVkIEF6dXJlIGFwcGxpY2F0aW9uXG4gICAgICovXG4gICAgdGVuYW50SWQ6IHN0cmluZztcbiAgfTtcbn1cblxuLyoqIFN0cnVjdHVyZSB0aGF0IGRlZmluZXMgdGhlIG9wdGlvbnMgdGhhdCBhcmUgbmVjZXNzYXJ5IHRvIGF1dGhlbnRpY2F0ZSB0aGUgVGVkaW91cy5KUyBpbnN0YW5jZSB3aXRoIGFuIGBAYXp1cmUvaWRlbnRpdHlgIHRva2VuIGNyZWRlbnRpYWwuICovXG5pbnRlcmZhY2UgVG9rZW5DcmVkZW50aWFsQXV0aGVudGljYXRpb24ge1xuICAvKiogVW5pcXVlIGRlc2lnbmF0b3IgZm9yIHRoZSB0eXBlIG9mIGF1dGhlbnRpY2F0aW9uIHRvIGJlIHVzZWQuICovXG4gIHR5cGU6ICd0b2tlbi1jcmVkZW50aWFsJztcbiAgLyoqIFNldCBvZiBjb25maWd1cmF0aW9ucyB0aGF0IGFyZSByZXF1aXJlZCBvciBhbGxvd2VkIHdpdGggdGhpcyBhdXRoZW50aWNhdGlvbiB0eXBlLiAqL1xuICBvcHRpb25zOiB7XG4gICAgLyoqIENyZWRlbnRpYWwgb2JqZWN0IHVzZWQgdG8gYXV0aGVudGljYXRlIHRvIHRoZSByZXNvdXJjZS4gKi9cbiAgICBjcmVkZW50aWFsOiBUb2tlbkNyZWRlbnRpYWw7XG4gIH07XG59XG5cbmludGVyZmFjZSBOdGxtQXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnbnRsbSc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgZnJvbSB5b3VyIHdpbmRvd3MgYWNjb3VudC5cbiAgICAgKi9cbiAgICB1c2VyTmFtZTogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIGZyb20geW91ciB3aW5kb3dzIGFjY291bnQuXG4gICAgICovXG4gICAgcGFzc3dvcmQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBPbmNlIHlvdSBzZXQgZG9tYWluIGZvciBudGxtIGF1dGhlbnRpY2F0aW9uIHR5cGUsIGRyaXZlciB3aWxsIGNvbm5lY3QgdG8gU1FMIFNlcnZlciB1c2luZyBkb21haW4gbG9naW4uXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG5lY2Vzc2FyeSBmb3IgZm9ybWluZyBhIGNvbm5lY3Rpb24gdXNpbmcgbnRsbSB0eXBlXG4gICAgICovXG4gICAgZG9tYWluOiBzdHJpbmc7XG4gIH07XG59XG5cbmludGVyZmFjZSBEZWZhdWx0QXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnZGVmYXVsdCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBVc2VyIG5hbWUgdG8gdXNlIGZvciBzcWwgc2VydmVyIGxvZ2luLlxuICAgICAqL1xuICAgIHVzZXJOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIC8qKlxuICAgICAqIFBhc3N3b3JkIHRvIHVzZSBmb3Igc3FsIHNlcnZlciBsb2dpbi5cbiAgICAgKi9cbiAgICBwYXNzd29yZD86IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEVycm9yV2l0aENvZGUgZXh0ZW5kcyBFcnJvciB7XG4gIGNvZGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCB0eXBlIENvbm5lY3Rpb25BdXRoZW50aWNhdGlvbiA9IERlZmF1bHRBdXRoZW50aWNhdGlvbiB8IE50bG1BdXRoZW50aWNhdGlvbiB8IFRva2VuQ3JlZGVudGlhbEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlQYXNzd29yZEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lBcHBTZXJ2aWNlQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeUFjY2Vzc1Rva2VuQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQgfCBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbjtcblxuaW50ZXJmYWNlIEludGVybmFsQ29ubmVjdGlvbkNvbmZpZyB7XG4gIHNlcnZlcjogc3RyaW5nO1xuICBhdXRoZW50aWNhdGlvbjogQ29ubmVjdGlvbkF1dGhlbnRpY2F0aW9uO1xuICBvcHRpb25zOiBJbnRlcm5hbENvbm5lY3Rpb25PcHRpb25zO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEludGVybmFsQ29ubmVjdGlvbk9wdGlvbnMge1xuICBhYm9ydFRyYW5zYWN0aW9uT25FcnJvcjogYm9vbGVhbjtcbiAgYXBwTmFtZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBjYW1lbENhc2VDb2x1bW5zOiBib29sZWFuO1xuICBjYW5jZWxUaW1lb3V0OiBudW1iZXI7XG4gIGNvbHVtbkVuY3J5cHRpb25LZXlDYWNoZVRUTDogbnVtYmVyO1xuICBjb2x1bW5FbmNyeXB0aW9uU2V0dGluZzogYm9vbGVhbjtcbiAgY29sdW1uTmFtZVJlcGxhY2VyOiB1bmRlZmluZWQgfCAoKGNvbE5hbWU6IHN0cmluZywgaW5kZXg6IG51bWJlciwgbWV0YWRhdGE6IE1ldGFkYXRhKSA9PiBzdHJpbmcpO1xuICBjb25uZWN0aW9uUmV0cnlJbnRlcnZhbDogbnVtYmVyO1xuICBjb25uZWN0b3I6IHVuZGVmaW5lZCB8ICgoKSA9PiBQcm9taXNlPG5ldC5Tb2NrZXQ+KTtcbiAgY29ubmVjdFRpbWVvdXQ6IG51bWJlcjtcbiAgY29ubmVjdGlvbklzb2xhdGlvbkxldmVsOiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMW2tleW9mIHR5cGVvZiBJU09MQVRJT05fTEVWRUxdO1xuICBjcnlwdG9DcmVkZW50aWFsc0RldGFpbHM6IFNlY3VyZUNvbnRleHRPcHRpb25zO1xuICBkYXRhYmFzZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBkYXRlZmlyc3Q6IG51bWJlcjtcbiAgZGF0ZUZvcm1hdDogc3RyaW5nO1xuICBkZWJ1Zzoge1xuICAgIGRhdGE6IGJvb2xlYW47XG4gICAgcGFja2V0OiBib29sZWFuO1xuICAgIHBheWxvYWQ6IGJvb2xlYW47XG4gICAgdG9rZW46IGJvb2xlYW47XG4gIH07XG4gIGVuYWJsZUFuc2lOdWxsOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQW5zaU51bGxEZWZhdWx0OiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQW5zaVBhZGRpbmc6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVBbnNpV2FybmluZ3M6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVBcml0aEFib3J0OiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0OiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnM6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVOdW1lcmljUm91bmRhYm9ydDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZVF1b3RlZElkZW50aWZpZXI6IG51bGwgfCBib29sZWFuO1xuICBlbmNyeXB0OiBzdHJpbmcgfCBib29sZWFuO1xuICBlbmNyeXB0aW9uS2V5U3RvcmVQcm92aWRlcnM6IEtleVN0b3JlUHJvdmlkZXJNYXAgfCB1bmRlZmluZWQ7XG4gIGZhbGxiYWNrVG9EZWZhdWx0RGI6IGJvb2xlYW47XG4gIGluc3RhbmNlTmFtZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBpc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXTtcbiAgbGFuZ3VhZ2U6IHN0cmluZztcbiAgbG9jYWxBZGRyZXNzOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9yczogbnVtYmVyO1xuICBtdWx0aVN1Ym5ldEZhaWxvdmVyOiBib29sZWFuO1xuICBwYWNrZXRTaXplOiBudW1iZXI7XG4gIHBvcnQ6IHVuZGVmaW5lZCB8IG51bWJlcjtcbiAgcmVhZE9ubHlJbnRlbnQ6IGJvb2xlYW47XG4gIHJlcXVlc3RUaW1lb3V0OiBudW1iZXI7XG4gIHJvd0NvbGxlY3Rpb25PbkRvbmU6IGJvb2xlYW47XG4gIHJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uOiBib29sZWFuO1xuICBzZXJ2ZXJOYW1lOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIHNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbjogYm9vbGVhbjtcbiAgdGRzVmVyc2lvbjogc3RyaW5nO1xuICB0ZXh0c2l6ZTogbnVtYmVyO1xuICB0cnVzdGVkU2VydmVyTmFtZUFFOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IGJvb2xlYW47XG4gIHVzZUNvbHVtbk5hbWVzOiBib29sZWFuO1xuICB1c2VVVEM6IGJvb2xlYW47XG4gIHdvcmtzdGF0aW9uSWQ6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgbG93ZXJDYXNlR3VpZHM6IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBLZXlTdG9yZVByb3ZpZGVyTWFwIHtcbiAgW2tleTogc3RyaW5nXTogQ29sdW1uRW5jcnlwdGlvbkF6dXJlS2V5VmF1bHRQcm92aWRlcjtcbn1cblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5pbnRlcmZhY2UgU3RhdGUge1xuICBuYW1lOiBzdHJpbmc7XG4gIGVudGVyPyh0aGlzOiBDb25uZWN0aW9uKTogdm9pZDtcbiAgZXhpdD8odGhpczogQ29ubmVjdGlvbiwgbmV3U3RhdGU6IFN0YXRlKTogdm9pZDtcbiAgZXZlbnRzOiB7XG4gICAgc29ja2V0RXJyb3I/KHRoaXM6IENvbm5lY3Rpb24sIGVycjogRXJyb3IpOiB2b2lkO1xuICAgIG1lc3NhZ2U/KHRoaXM6IENvbm5lY3Rpb24sIG1lc3NhZ2U6IE1lc3NhZ2UpOiB2b2lkO1xuICB9O1xufVxuXG50eXBlIEF1dGhlbnRpY2F0aW9uID0gRGVmYXVsdEF1dGhlbnRpY2F0aW9uIHxcbiAgTnRsbUF1dGhlbnRpY2F0aW9uIHxcbiAgVG9rZW5DcmVkZW50aWFsQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uO1xuXG50eXBlIEF1dGhlbnRpY2F0aW9uVHlwZSA9IEF1dGhlbnRpY2F0aW9uWyd0eXBlJ107XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogSG9zdG5hbWUgdG8gY29ubmVjdCB0by5cbiAgICovXG4gIHNlcnZlcjogc3RyaW5nO1xuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgb3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zO1xuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gcmVsYXRlZCBvcHRpb25zIGZvciBjb25uZWN0aW9uLlxuICAgKi9cbiAgYXV0aGVudGljYXRpb24/OiBBdXRoZW50aWNhdGlvbk9wdGlvbnM7XG59XG5cbmludGVyZmFjZSBEZWJ1Z09wdGlvbnMge1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkYXRhIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBkYXRhOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkZXRhaWxzXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgcGFja2V0OiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBwYXlsb2FkIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBwYXlsb2FkOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHRva2VuIHN0cmVhbSB0b2tlbnNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICB0b2tlbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEF1dGhlbnRpY2F0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUeXBlIG9mIHRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2QsIHZhbGlkIHR5cGVzIGFyZSBgZGVmYXVsdGAsIGBudGxtYCxcbiAgICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5gLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1gLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0YFxuICAgKiBvciBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgXG4gICAqL1xuICB0eXBlPzogQXV0aGVudGljYXRpb25UeXBlO1xuICAvKipcbiAgICogRGlmZmVyZW50IG9wdGlvbnMgZm9yIGF1dGhlbnRpY2F0aW9uIHR5cGVzOlxuICAgKlxuICAgKiAqIGBkZWZhdWx0YDogW1tEZWZhdWx0QXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYG50bG1gIDpbW050bG1BdXRoZW50aWNhdGlvbl1dXG4gICAqICogYHRva2VuLWNyZWRlbnRpYWxgOiBbW0NyZWRlbnRpYWxDaGFpbkF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkYCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlQYXNzd29yZEF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbmAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1gIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlYCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lBcHBTZXJ2aWNlQXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0YCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlTZXJ2aWNlUHJpbmNpcGFsU2VjcmV0Lm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICovXG4gIG9wdGlvbnM/OiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbk9wdGlvbnMge1xuICAvKipcbiAgICogQSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gcm9sbGJhY2sgYSB0cmFuc2FjdGlvbiBhdXRvbWF0aWNhbGx5IGlmIGFueSBlcnJvciBpcyBlbmNvdW50ZXJlZFxuICAgKiBkdXJpbmcgdGhlIGdpdmVuIHRyYW5zYWN0aW9uJ3MgZXhlY3V0aW9uLiBUaGlzIHNldHMgdGhlIHZhbHVlIGZvciBgU0VUIFhBQ1RfQUJPUlRgIGR1cmluZyB0aGVcbiAgICogaW5pdGlhbCBTUUwgcGhhc2Ugb2YgYSBjb25uZWN0aW9uIFtkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9zcWwvdC1zcWwvc3RhdGVtZW50cy9zZXQteGFjdC1hYm9ydC10cmFuc2FjdC1zcWwpLlxuICAgKi9cbiAgYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I/OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBcHBsaWNhdGlvbiBuYW1lIHVzZWQgZm9yIGlkZW50aWZ5aW5nIGEgc3BlY2lmaWMgYXBwbGljYXRpb24gaW4gcHJvZmlsaW5nLCBsb2dnaW5nIG9yIHRyYWNpbmcgdG9vbHMgb2YgU1FMU2VydmVyLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYFRlZGlvdXNgKVxuICAgKi9cbiAgYXBwTmFtZT86IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIHRoZSBjb2x1bW4gbmFtZXMgcmV0dXJuZWQgd2lsbCBoYXZlIHRoZSBmaXJzdCBsZXR0ZXIgY29udmVydGVkIHRvIGxvd2VyIGNhc2VcbiAgICogKGB0cnVlYCkgb3Igbm90LiBUaGlzIHZhbHVlIGlzIGlnbm9yZWQgaWYgeW91IHByb3ZpZGUgYSBbW2NvbHVtbk5hbWVSZXBsYWNlcl1dLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICBjYW1lbENhc2VDb2x1bW5zPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBbW1JlcXVlc3QuY2FuY2VsXV0gKGFib3J0KSBvZiBhIHJlcXVlc3QgaXMgY29uc2lkZXJlZCBmYWlsZWRcbiAgICpcbiAgICogKGRlZmF1bHQ6IGA1MDAwYCkuXG4gICAqL1xuICBjYW5jZWxUaW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBIGZ1bmN0aW9uIHdpdGggcGFyYW1ldGVycyBgKGNvbHVtbk5hbWUsIGluZGV4LCBjb2x1bW5NZXRhRGF0YSlgIGFuZCByZXR1cm5pbmcgYSBzdHJpbmcuIElmIHByb3ZpZGVkLFxuICAgKiB0aGlzIHdpbGwgYmUgY2FsbGVkIG9uY2UgcGVyIGNvbHVtbiBwZXIgcmVzdWx0LXNldC4gVGhlIHJldHVybmVkIHZhbHVlIHdpbGwgYmUgdXNlZCBpbnN0ZWFkIG9mIHRoZSBTUUwtcHJvdmlkZWRcbiAgICogY29sdW1uIG5hbWUgb24gcm93IGFuZCBtZXRhIGRhdGEgb2JqZWN0cy4gVGhpcyBhbGxvd3MgeW91IHRvIGR5bmFtaWNhbGx5IGNvbnZlcnQgYmV0d2VlbiBuYW1pbmcgY29udmVudGlvbnMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgbnVsbGApXG4gICAqL1xuICBjb2x1bW5OYW1lUmVwbGFjZXI/OiAoY29sTmFtZTogc3RyaW5nLCBpbmRleDogbnVtYmVyLCBtZXRhZGF0YTogTWV0YWRhdGEpID0+IHN0cmluZztcblxuICAvKipcbiAgICogTnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgcmV0cnlpbmcgdG8gZXN0YWJsaXNoIGNvbm5lY3Rpb24sIGluIGNhc2Ugb2YgdHJhbnNpZW50IGZhaWx1cmUuXG4gICAqXG4gICAqIChkZWZhdWx0OmA1MDBgKVxuICAgKi9cbiAgY29ubmVjdGlvblJldHJ5SW50ZXJ2YWw/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEN1c3RvbSBjb25uZWN0b3IgZmFjdG9yeSBtZXRob2QuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdW5kZWZpbmVkYClcbiAgICovXG4gIGNvbm5lY3Rvcj86ICgpID0+IFByb21pc2U8bmV0LlNvY2tldD47XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSB0aGUgYXR0ZW1wdCB0byBjb25uZWN0IGlzIGNvbnNpZGVyZWQgZmFpbGVkXG4gICAqXG4gICAqIChkZWZhdWx0OiBgMTUwMDBgKS5cbiAgICovXG4gIGNvbm5lY3RUaW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBpc29sYXRpb24gbGV2ZWwgZm9yIG5ldyBjb25uZWN0aW9ucy4gQWxsIG91dC1vZi10cmFuc2FjdGlvbiBxdWVyaWVzIGFyZSBleGVjdXRlZCB3aXRoIHRoaXMgc2V0dGluZy5cbiAgICpcbiAgICogVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogKiBgUkVBRF9VTkNPTU1JVFRFRGBcbiAgICogKiBgUkVBRF9DT01NSVRURURgXG4gICAqICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogKiBgU0VSSUFMSVpBQkxFYFxuICAgKiAqIGBTTkFQU0hPVGBcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBSRUFEX0NPTU1JVEVEYCkuXG4gICAqL1xuICBjb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWw/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFdoZW4gZW5jcnlwdGlvbiBpcyB1c2VkLCBhbiBvYmplY3QgbWF5IGJlIHN1cHBsaWVkIHRoYXQgd2lsbCBiZSB1c2VkXG4gICAqIGZvciB0aGUgZmlyc3QgYXJndW1lbnQgd2hlbiBjYWxsaW5nIFtgdGxzLmNyZWF0ZVNlY3VyZVBhaXJgXShodHRwOi8vbm9kZWpzLm9yZy9kb2NzL2xhdGVzdC9hcGkvdGxzLmh0bWwjdGxzX3Rsc19jcmVhdGVzZWN1cmVwYWlyX2NyZWRlbnRpYWxzX2lzc2VydmVyX3JlcXVlc3RjZXJ0X3JlamVjdHVuYXV0aG9yaXplZClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB7fWApXG4gICAqL1xuICBjcnlwdG9DcmVkZW50aWFsc0RldGFpbHM/OiBTZWN1cmVDb250ZXh0T3B0aW9ucztcblxuICAvKipcbiAgICogRGF0YWJhc2UgdG8gY29ubmVjdCB0byAoZGVmYXVsdDogZGVwZW5kZW50IG9uIHNlcnZlciBjb25maWd1cmF0aW9uKS5cbiAgICovXG4gIGRhdGFiYXNlPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBmaXJzdCBkYXkgb2YgdGhlIHdlZWsgdG8gYSBudW1iZXIgZnJvbSAxIHRocm91Z2ggNy5cbiAgICovXG4gIGRhdGVmaXJzdD86IG51bWJlcjtcblxuICAvKipcbiAgICogQSBzdHJpbmcgcmVwcmVzZW50aW5nIHBvc2l0aW9uIG9mIG1vbnRoLCBkYXkgYW5kIHllYXIgaW4gdGVtcG9yYWwgZGF0YXR5cGVzLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYG1keWApXG4gICAqL1xuICBkYXRlRm9ybWF0Pzogc3RyaW5nO1xuXG4gIGRlYnVnPzogRGVidWdPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xzIHRoZSB3YXkgbnVsbCB2YWx1ZXMgc2hvdWxkIGJlIHVzZWQgZHVyaW5nIGNvbXBhcmlzb24gb3BlcmF0aW9uLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQW5zaU51bGw/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBgU0VUIEFOU0lfTlVMTF9ERkxUX09OIE9OYCB3aWxsIGJlIHNldCBpbiB0aGUgaW5pdGlhbCBzcWwuIFRoaXMgbWVhbnMgbmV3IGNvbHVtbnMgd2lsbCBiZVxuICAgKiBudWxsYWJsZSBieSBkZWZhdWx0LiBTZWUgdGhlIFtULVNRTCBkb2N1bWVudGF0aW9uXShodHRwczovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L21zMTg3Mzc1LmFzcHgpXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApLlxuICAgKi9cbiAgZW5hYmxlQW5zaU51bGxEZWZhdWx0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9scyBpZiBwYWRkaW5nIHNob3VsZCBiZSBhcHBsaWVkIGZvciB2YWx1ZXMgc2hvcnRlciB0aGFuIHRoZSBzaXplIG9mIGRlZmluZWQgY29sdW1uLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQW5zaVBhZGRpbmc/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBTUUwgU2VydmVyIHdpbGwgZm9sbG93IElTTyBzdGFuZGFyZCBiZWhhdmlvciBkdXJpbmcgdmFyaW91cyBlcnJvciBjb25kaXRpb25zLiBGb3IgZGV0YWlscyxcbiAgICogc2VlIFtkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9zcWwvdC1zcWwvc3RhdGVtZW50cy9zZXQtYW5zaS13YXJuaW5ncy10cmFuc2FjdC1zcWwpXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBbnNpV2FybmluZ3M/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBFbmRzIGEgcXVlcnkgd2hlbiBhbiBvdmVyZmxvdyBvciBkaXZpZGUtYnktemVybyBlcnJvciBvY2N1cnMgZHVyaW5nIHF1ZXJ5IGV4ZWN1dGlvbi5cbiAgICogU2VlIFtkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9zcWwvdC1zcWwvc3RhdGVtZW50cy9zZXQtYXJpdGhhYm9ydC10cmFuc2FjdC1zcWw/dmlldz1zcWwtc2VydmVyLTIwMTcpXG4gICAqIGZvciBtb3JlIGRldGFpbHMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBcml0aEFib3J0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBkZXRlcm1pbmVzIGlmIGNvbmNhdGVuYXRpb24gd2l0aCBOVUxMIHNob3VsZCByZXN1bHQgaW4gTlVMTCBvciBlbXB0eSBzdHJpbmcgdmFsdWUsIG1vcmUgZGV0YWlscyBpblxuICAgKiBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9kb2NzLm1pY3Jvc29mdC5jb20vZW4tdXMvc3FsL3Qtc3FsL3N0YXRlbWVudHMvc2V0LWNvbmNhdC1udWxsLXlpZWxkcy1udWxsLXRyYW5zYWN0LXNxbClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9scyB3aGV0aGVyIGN1cnNvciBzaG91bGQgYmUgY2xvc2VkLCBpZiB0aGUgdHJhbnNhY3Rpb24gb3BlbmluZyBpdCBnZXRzIGNvbW1pdHRlZCBvciByb2xsZWRcbiAgICogYmFjay5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBudWxsYClcbiAgICovXG4gIGVuYWJsZUN1cnNvckNsb3NlT25Db21taXQ/OiBib29sZWFuIHwgbnVsbDtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBzZXRzIHRoZSBjb25uZWN0aW9uIHRvIGVpdGhlciBpbXBsaWNpdCBvciBhdXRvY29tbWl0IHRyYW5zYWN0aW9uIG1vZGUuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiBmYWxzZSwgZXJyb3IgaXMgbm90IGdlbmVyYXRlZCBkdXJpbmcgbG9zcyBvZiBwcmVjZXNzaW9uLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICovXG4gIGVuYWJsZU51bWVyaWNSb3VuZGFib3J0PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogSWYgdHJ1ZSwgY2hhcmFjdGVycyBlbmNsb3NlZCBpbiBzaW5nbGUgcXVvdGVzIGFyZSB0cmVhdGVkIGFzIGxpdGVyYWxzIGFuZCB0aG9zZSBlbmNsb3NlZCBkb3VibGUgcXVvdGVzIGFyZSB0cmVhdGVkIGFzIGlkZW50aWZpZXJzLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlUXVvdGVkSWRlbnRpZmllcj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgc3RyaW5nIHZhbHVlIHRoYXQgY2FuIGJlIG9ubHkgc2V0IHRvICdzdHJpY3QnLCB3aGljaCBpbmRpY2F0ZXMgdGhlIHVzYWdlIFREUyA4LjAgcHJvdG9jb2wuIE90aGVyd2lzZSxcbiAgICogYSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgb3Igbm90IHRoZSBjb25uZWN0aW9uIHdpbGwgYmUgZW5jcnlwdGVkLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5jcnlwdD86IHN0cmluZyB8IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEJ5IGRlZmF1bHQsIGlmIHRoZSBkYXRhYmFzZSByZXF1ZXN0ZWQgYnkgW1tkYXRhYmFzZV1dIGNhbm5vdCBiZSBhY2Nlc3NlZCxcbiAgICogdGhlIGNvbm5lY3Rpb24gd2lsbCBmYWlsIHdpdGggYW4gZXJyb3IuIEhvd2V2ZXIsIGlmIFtbZmFsbGJhY2tUb0RlZmF1bHREYl1dIGlzXG4gICAqIHNldCB0byBgdHJ1ZWAsIHRoZW4gdGhlIHVzZXIncyBkZWZhdWx0IGRhdGFiYXNlIHdpbGwgYmUgdXNlZCBpbnN0ZWFkXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZmFsbGJhY2tUb0RlZmF1bHREYj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBpbnN0YW5jZSBuYW1lIHRvIGNvbm5lY3QgdG8uXG4gICAqIFRoZSBTUUwgU2VydmVyIEJyb3dzZXIgc2VydmljZSBtdXN0IGJlIHJ1bm5pbmcgb24gdGhlIGRhdGFiYXNlIHNlcnZlcixcbiAgICogYW5kIFVEUCBwb3J0IDE0MzQgb24gdGhlIGRhdGFiYXNlIHNlcnZlciBtdXN0IGJlIHJlYWNoYWJsZS5cbiAgICpcbiAgICogKG5vIGRlZmF1bHQpXG4gICAqXG4gICAqIE11dHVhbGx5IGV4Y2x1c2l2ZSB3aXRoIFtbcG9ydF1dLlxuICAgKi9cbiAgaW5zdGFuY2VOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBUaGUgZGVmYXVsdCBpc29sYXRpb24gbGV2ZWwgdGhhdCB0cmFuc2FjdGlvbnMgd2lsbCBiZSBydW4gd2l0aC5cbiAgICpcbiAgICogVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogKiBgUkVBRF9VTkNPTU1JVFRFRGBcbiAgICogKiBgUkVBRF9DT01NSVRURURgXG4gICAqICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogKiBgU0VSSUFMSVpBQkxFYFxuICAgKiAqIGBTTkFQU0hPVGBcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBSRUFEX0NPTU1JVEVEYCkuXG4gICAqL1xuICBpc29sYXRpb25MZXZlbD86IG51bWJlcjtcblxuICAvKipcbiAgICogU3BlY2lmaWVzIHRoZSBsYW5ndWFnZSBlbnZpcm9ubWVudCBmb3IgdGhlIHNlc3Npb24uIFRoZSBzZXNzaW9uIGxhbmd1YWdlIGRldGVybWluZXMgdGhlIGRhdGV0aW1lIGZvcm1hdHMgYW5kIHN5c3RlbSBtZXNzYWdlcy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB1c19lbmdsaXNoYCkuXG4gICAqL1xuICBsYW5ndWFnZT86IHN0cmluZztcblxuICAvKipcbiAgICogQSBzdHJpbmcgaW5kaWNhdGluZyB3aGljaCBuZXR3b3JrIGludGVyZmFjZSAoaXAgYWRkcmVzcykgdG8gdXNlIHdoZW4gY29ubmVjdGluZyB0byBTUUwgU2VydmVyLlxuICAgKi9cbiAgbG9jYWxBZGRyZXNzPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byBwYXJzZSB1bmlxdWUgaWRlbnRpZmllciB0eXBlIHdpdGggbG93ZXJjYXNlIGNhc2UgY2hhcmFjdGVycy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApLlxuICAgKi9cbiAgbG93ZXJDYXNlR3VpZHM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgY29ubmVjdGlvbiByZXRyaWVzIGZvciB0cmFuc2llbnQgZXJyb3JzLuOAgVxuICAgKlxuICAgKiAoZGVmYXVsdDogYDNgKS5cbiAgICovXG4gIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycz86IG51bWJlcjtcblxuICAvKipcbiAgICogU2V0cyB0aGUgTXVsdGlTdWJuZXRGYWlsb3ZlciA9IFRydWUgcGFyYW1ldGVyLCB3aGljaCBjYW4gaGVscCBtaW5pbWl6ZSB0aGUgY2xpZW50IHJlY292ZXJ5IGxhdGVuY3kgd2hlbiBmYWlsb3ZlcnMgb2NjdXIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIG11bHRpU3VibmV0RmFpbG92ZXI/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgc2l6ZSBvZiBURFMgcGFja2V0cyAoc3ViamVjdCB0byBuZWdvdGlhdGlvbiB3aXRoIHRoZSBzZXJ2ZXIpLlxuICAgKiBTaG91bGQgYmUgYSBwb3dlciBvZiAyLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYDQwOTZgKS5cbiAgICovXG4gIHBhY2tldFNpemU/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFBvcnQgdG8gY29ubmVjdCB0byAoZGVmYXVsdDogYDE0MzNgKS5cbiAgICpcbiAgICogTXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggW1tpbnN0YW5jZU5hbWVdXVxuICAgKi9cbiAgcG9ydD86IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICAvKipcbiAgICogQSBib29sZWFuLCBkZXRlcm1pbmluZyB3aGV0aGVyIHRoZSBjb25uZWN0aW9uIHdpbGwgcmVxdWVzdCByZWFkIG9ubHkgYWNjZXNzIGZyb20gYSBTUUwgU2VydmVyIEF2YWlsYWJpbGl0eVxuICAgKiBHcm91cC4gRm9yIG1vcmUgaW5mb3JtYXRpb24sIHNlZSBbaGVyZV0oaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2hoNzEwMDU0LmFzcHggXCJNaWNyb3NvZnQ6IENvbmZpZ3VyZSBSZWFkLU9ubHkgUm91dGluZyBmb3IgYW4gQXZhaWxhYmlsaXR5IEdyb3VwIChTUUwgU2VydmVyKVwiKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICByZWFkT25seUludGVudD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSBhIHJlcXVlc3QgaXMgY29uc2lkZXJlZCBmYWlsZWQsIG9yIGAwYCBmb3Igbm8gdGltZW91dC5cbiAgICpcbiAgICogQXMgc29vbiBhcyBhIHJlc3BvbnNlIGlzIHJlY2VpdmVkLCB0aGUgdGltZW91dCBpcyBjbGVhcmVkLiBUaGlzIG1lYW5zIHRoYXQgcXVlcmllcyB0aGF0IGltbWVkaWF0ZWx5IHJldHVybiBhIHJlc3BvbnNlIGhhdmUgYWJpbGl0eSB0byBydW4gbG9uZ2VyIHRoYW4gdGhpcyB0aW1lb3V0LlxuICAgKlxuICAgKiAoZGVmYXVsdDogYDE1MDAwYCkuXG4gICAqL1xuICByZXF1ZXN0VGltZW91dD86IG51bWJlcjtcblxuICAvKipcbiAgICogQSBib29sZWFuLCB0aGF0IHdoZW4gdHJ1ZSB3aWxsIGV4cG9zZSByZWNlaXZlZCByb3dzIGluIFJlcXVlc3RzIGRvbmUgcmVsYXRlZCBldmVudHM6XG4gICAqICogW1tSZXF1ZXN0LkV2ZW50X2RvbmVJblByb2NdXVxuICAgKiAqIFtbUmVxdWVzdC5FdmVudF9kb25lUHJvY11dXG4gICAqICogW1tSZXF1ZXN0LkV2ZW50X2RvbmVdXVxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICpcbiAgICogQ2F1dGlvbjogSWYgbWFueSByb3cgYXJlIHJlY2VpdmVkLCBlbmFibGluZyB0aGlzIG9wdGlvbiBjb3VsZCByZXN1bHQgaW5cbiAgICogZXhjZXNzaXZlIG1lbW9yeSB1c2FnZS5cbiAgICovXG4gIHJvd0NvbGxlY3Rpb25PbkRvbmU/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIHRoYXQgd2hlbiB0cnVlIHdpbGwgZXhwb3NlIHJlY2VpdmVkIHJvd3MgaW4gUmVxdWVzdHMnIGNvbXBsZXRpb24gY2FsbGJhY2suU2VlIFtbUmVxdWVzdC5jb25zdHJ1Y3Rvcl1dLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYClcbiAgICpcbiAgICogQ2F1dGlvbjogSWYgbWFueSByb3cgYXJlIHJlY2VpdmVkLCBlbmFibGluZyB0aGlzIG9wdGlvbiBjb3VsZCByZXN1bHQgaW5cbiAgICogZXhjZXNzaXZlIG1lbW9yeSB1c2FnZS5cbiAgICovXG4gIHJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHZlcnNpb24gb2YgVERTIHRvIHVzZS4gSWYgc2VydmVyIGRvZXNuJ3Qgc3VwcG9ydCBzcGVjaWZpZWQgdmVyc2lvbiwgbmVnb3RpYXRlZCB2ZXJzaW9uIGlzIHVzZWQgaW5zdGVhZC5cbiAgICpcbiAgICogVGhlIHZlcnNpb25zIGFyZSBhdmFpbGFibGUgZnJvbSBgcmVxdWlyZSgndGVkaW91cycpLlREU19WRVJTSU9OYC5cbiAgICogKiBgN18xYFxuICAgKiAqIGA3XzJgXG4gICAqICogYDdfM19BYFxuICAgKiAqIGA3XzNfQmBcbiAgICogKiBgN180YFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDdfNGApXG4gICAqL1xuICB0ZHNWZXJzaW9uPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgdGhlIHNpemUgb2YgdmFyY2hhcihtYXgpLCBudmFyY2hhcihtYXgpLCB2YXJiaW5hcnkobWF4KSwgdGV4dCwgbnRleHQsIGFuZCBpbWFnZSBkYXRhIHJldHVybmVkIGJ5IGEgU0VMRUNUIHN0YXRlbWVudC5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGAyMTQ3NDgzNjQ3YClcbiAgICovXG4gIHRleHRzaXplPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBJZiBcInRydWVcIiwgdGhlIFNRTCBTZXJ2ZXIgU1NMIGNlcnRpZmljYXRlIGlzIGF1dG9tYXRpY2FsbHkgdHJ1c3RlZCB3aGVuIHRoZSBjb21tdW5pY2F0aW9uIGxheWVyIGlzIGVuY3J5cHRlZCB1c2luZyBTU0wuXG4gICAqXG4gICAqIElmIFwiZmFsc2VcIiwgdGhlIFNRTCBTZXJ2ZXIgdmFsaWRhdGVzIHRoZSBzZXJ2ZXIgU1NMIGNlcnRpZmljYXRlLiBJZiB0aGUgc2VydmVyIGNlcnRpZmljYXRlIHZhbGlkYXRpb24gZmFpbHMsXG4gICAqIHRoZSBkcml2ZXIgcmFpc2VzIGFuIGVycm9yIGFuZCB0ZXJtaW5hdGVzIHRoZSBjb25uZWN0aW9uLiBNYWtlIHN1cmUgdGhlIHZhbHVlIHBhc3NlZCB0byBzZXJ2ZXJOYW1lIGV4YWN0bHlcbiAgICogbWF0Y2hlcyB0aGUgQ29tbW9uIE5hbWUgKENOKSBvciBETlMgbmFtZSBpbiB0aGUgU3ViamVjdCBBbHRlcm5hdGUgTmFtZSBpbiB0aGUgc2VydmVyIGNlcnRpZmljYXRlIGZvciBhbiBTU0wgY29ubmVjdGlvbiB0byBzdWNjZWVkLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgdHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqXG4gICAqL1xuICBzZXJ2ZXJOYW1lPzogc3RyaW5nO1xuICAvKipcbiAgICogQSBib29sZWFuIGRldGVybWluaW5nIHdoZXRoZXIgdG8gcmV0dXJuIHJvd3MgYXMgYXJyYXlzIG9yIGtleS12YWx1ZSBjb2xsZWN0aW9ucy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApLlxuICAgKi9cbiAgdXNlQ29sdW1uTmFtZXM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byBwYXNzIHRpbWUgdmFsdWVzIGluIFVUQyBvciBsb2NhbCB0aW1lLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKS5cbiAgICovXG4gIHVzZVVUQz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSB3b3Jrc3RhdGlvbiBJRCAoV1NJRCkgb2YgdGhlIGNsaWVudCwgZGVmYXVsdCBvcy5ob3N0bmFtZSgpLlxuICAgKiBVc2VkIGZvciBpZGVudGlmeWluZyBhIHNwZWNpZmljIGNsaWVudCBpbiBwcm9maWxpbmcsIGxvZ2dpbmcgb3JcbiAgICogdHJhY2luZyBjbGllbnQgYWN0aXZpdHkgaW4gU1FMU2VydmVyLlxuICAgKlxuICAgKiBUaGUgdmFsdWUgaXMgcmVwb3J0ZWQgYnkgdGhlIFRTUUwgZnVuY3Rpb24gSE9TVF9OQU1FKCkuXG4gICAqL1xuICB3b3Jrc3RhdGlvbklkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xufVxuXG5pbnRlcmZhY2UgUm91dGluZ0RhdGEge1xuICBzZXJ2ZXI6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xuICBpbnN0YW5jZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiwgZXF1aXZhbGVudCB0byBgUHJvbWlzZS53aXRoUmVzb2x2ZXJzKClgLlxuICpcbiAqIEByZXR1cm5zIEFuIG9iamVjdCB3aXRoIHRoZSBwcm9wZXJ0aWVzIGBwcm9taXNlYCwgYHJlc29sdmVgLCBhbmQgYHJlamVjdGAuXG4gKi9cbmZ1bmN0aW9uIHdpdGhSZXNvbHZlcnM8VD4oKSB7XG4gIGxldCByZXNvbHZlOiAodmFsdWU6IFQgfCBQcm9taXNlTGlrZTxUPikgPT4gdm9pZDtcbiAgbGV0IHJlamVjdDogKHJlYXNvbj86IGFueSkgPT4gdm9pZDtcblxuICBjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2U8VD4oKHJlcywgcmVqKSA9PiB7XG4gICAgcmVzb2x2ZSA9IHJlcztcbiAgICByZWplY3QgPSByZWo7XG4gIH0pO1xuXG4gIHJldHVybiB7IHByb21pc2UsIHJlc29sdmU6IHJlc29sdmUhLCByZWplY3Q6IHJlamVjdCEgfTtcbn1cblxuLyoqXG4gKiBBIFtbQ29ubmVjdGlvbl1dIGluc3RhbmNlIHJlcHJlc2VudHMgYSBzaW5nbGUgY29ubmVjdGlvbiB0byBhIGRhdGFiYXNlIHNlcnZlci5cbiAqXG4gKiBgYGBqc1xuICogdmFyIENvbm5lY3Rpb24gPSByZXF1aXJlKCd0ZWRpb3VzJykuQ29ubmVjdGlvbjtcbiAqIHZhciBjb25maWcgPSB7XG4gKiAgXCJhdXRoZW50aWNhdGlvblwiOiB7XG4gKiAgICAuLi4sXG4gKiAgICBcIm9wdGlvbnNcIjogey4uLn1cbiAqICB9LFxuICogIFwib3B0aW9uc1wiOiB7Li4ufVxuICogfTtcbiAqIHZhciBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnKTtcbiAqIGBgYFxuICpcbiAqIE9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24uIE9uY2UgYSBbW1JlcXVlc3RdXVxuICogaGFzIGJlZW4gaW5pdGlhdGVkICh3aXRoIFtbQ29ubmVjdGlvbi5jYWxsUHJvY2VkdXJlXV0sIFtbQ29ubmVjdGlvbi5leGVjU3FsXV0sXG4gKiBvciBbW0Nvbm5lY3Rpb24uZXhlY1NxbEJhdGNoXV0pLCBhbm90aGVyIHNob3VsZCBub3QgYmUgaW5pdGlhdGVkIHVudGlsIHRoZVxuICogW1tSZXF1ZXN0XV0ncyBjb21wbGV0aW9uIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAqL1xuY2xhc3MgQ29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBmZWRBdXRoUmVxdWlyZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb25maWc6IEludGVybmFsQ29ubmVjdGlvbkNvbmZpZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHNlY3VyZUNvbnRleHRPcHRpb25zOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGluVHJhbnNhY3Rpb246IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSB0cmFuc2FjdGlvbkRlc2NyaXB0b3JzOiBCdWZmZXJbXTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHRyYW5zYWN0aW9uRGVwdGg6IG51bWJlcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGlzU3FsQmF0Y2g6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjdXJUcmFuc2llbnRSZXRyeUNvdW50OiBudW1iZXI7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSB0cmFuc2llbnRFcnJvckxvb2t1cDogVHJhbnNpZW50RXJyb3JMb29rdXA7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjbG9zZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBsb2dpbkVycm9yOiB1bmRlZmluZWQgfCBBZ2dyZWdhdGVFcnJvciB8IENvbm5lY3Rpb25FcnJvcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGRlYnVnOiBEZWJ1ZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG50bG1wYWNrZXQ6IHVuZGVmaW5lZCB8IGFueTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG50bG1wYWNrZXRCdWZmZXI6IHVuZGVmaW5lZCB8IEJ1ZmZlcjtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgU1RBVEU6IHtcbiAgICBJTklUSUFMSVpFRDogU3RhdGU7XG4gICAgQ09OTkVDVElORzogU3RhdGU7XG4gICAgU0VOVF9QUkVMT0dJTjogU3RhdGU7XG4gICAgUkVST1VUSU5HOiBTdGF0ZTtcbiAgICBUUkFOU0lFTlRfRkFJTFVSRV9SRVRSWTogU3RhdGU7XG4gICAgU0VOVF9UTFNTU0xORUdPVElBVElPTjogU3RhdGU7XG4gICAgU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTjogU3RhdGU7XG4gICAgU0VOVF9MT0dJTjdfV0lUSF9OVExNOiBTdGF0ZTtcbiAgICBTRU5UX0xPR0lON19XSVRIX0ZFREFVVEg6IFN0YXRlO1xuICAgIExPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMOiBTdGF0ZTtcbiAgICBMT0dHRURfSU46IFN0YXRlO1xuICAgIFNFTlRfQ0xJRU5UX1JFUVVFU1Q6IFN0YXRlO1xuICAgIFNFTlRfQVRURU5USU9OOiBTdGF0ZTtcbiAgICBGSU5BTDogU3RhdGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJvdXRpbmdEYXRhOiB1bmRlZmluZWQgfCBSb3V0aW5nRGF0YTtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgbWVzc2FnZUlvOiBNZXNzYWdlSU87XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBzdGF0ZTogU3RhdGU7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0OiB1bmRlZmluZWQgfCBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByZXF1ZXN0OiB1bmRlZmluZWQgfCBSZXF1ZXN0IHwgQnVsa0xvYWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBwcm9jUmV0dXJuU3RhdHVzVmFsdWU6IHVuZGVmaW5lZCB8IGFueTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHNvY2tldDogdW5kZWZpbmVkIHwgbmV0LlNvY2tldDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG1lc3NhZ2VCdWZmZXI6IEJ1ZmZlcjtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY2FuY2VsVGltZXI6IHVuZGVmaW5lZCB8IE5vZGVKUy5UaW1lb3V0O1xuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgcmVxdWVzdFRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQ6ICgpID0+IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGRhdGFiYXNlQ29sbGF0aW9uOiBDb2xsYXRpb24gfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIF9vblNvY2tldENsb3NlOiAoaGFkRXJyb3I6IGJvb2xlYW4pID0+IHZvaWQ7XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIF9vblNvY2tldEVycm9yOiAoZXJyOiBFcnJvcikgPT4gdm9pZDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgX29uU29ja2V0RW5kOiAoKSA9PiB2b2lkO1xuXG4gIC8qKlxuICAgKiBOb3RlOiBiZSBhd2FyZSBvZiB0aGUgZGlmZmVyZW50IG9wdGlvbnMgZmllbGQ6XG4gICAqIDEuIGNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zXG4gICAqIDIuIGNvbmZpZy5vcHRpb25zXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIGNvbnN0IHsgQ29ubmVjdGlvbiB9ID0gcmVxdWlyZSgndGVkaW91cycpO1xuICAgKlxuICAgKiBjb25zdCBjb25maWcgPSB7XG4gICAqICBcImF1dGhlbnRpY2F0aW9uXCI6IHtcbiAgICogICAgLi4uLFxuICAgKiAgICBcIm9wdGlvbnNcIjogey4uLn1cbiAgICogIH0sXG4gICAqICBcIm9wdGlvbnNcIjogey4uLn1cbiAgICogfTtcbiAgICpcbiAgICogY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGNvbmZpZyk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IENvbm5lY3Rpb25Db25maWd1cmF0aW9uKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIGlmICh0eXBlb2YgY29uZmlnICE9PSAnb2JqZWN0JyB8fCBjb25maWcgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZ1wiIGFyZ3VtZW50IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29uZmlnLnNlcnZlciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5zZXJ2ZXJcIiBwcm9wZXJ0eSBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmZlZEF1dGhSZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgbGV0IGF1dGhlbnRpY2F0aW9uOiBDb25uZWN0aW9uQXV0aGVudGljYXRpb247XG4gICAgaWYgKGNvbmZpZy5hdXRoZW50aWNhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5hdXRoZW50aWNhdGlvbiAhPT0gJ29iamVjdCcgfHwgY29uZmlnLmF1dGhlbnRpY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHR5cGUgPSBjb25maWcuYXV0aGVudGljYXRpb24udHlwZTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucyA9PT0gdW5kZWZpbmVkID8ge30gOiBjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucztcblxuICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24udHlwZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcgJiYgdHlwZSAhPT0gJ250bG0nICYmIHR5cGUgIT09ICd0b2tlbi1jcmVkZW50aWFsJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCcgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZScgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0JyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0Jykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJ0eXBlXCIgcHJvcGVydHkgbXVzdCBvbmUgb2YgXCJkZWZhdWx0XCIsIFwibnRsbVwiLCBcInRva2VuLWNyZWRlbnRpYWxcIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkXCIsIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5cIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHRcIiwgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bVwiIG9yIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VcIiBvciBcImF6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0XCIuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcgfHwgb3B0aW9ucyA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9uc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBvYmplY3QuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlID09PSAnbnRsbScpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmRvbWFpbiAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5kb21haW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudXNlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy51c2VyTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnBhc3N3b3JkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdudGxtJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1c2VyTmFtZTogb3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBvcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgZG9tYWluOiBvcHRpb25zLmRvbWFpbiAmJiBvcHRpb25zLmRvbWFpbi50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAndG9rZW4tY3JlZGVudGlhbCcpIHtcbiAgICAgICAgaWYgKCFpc1Rva2VuQ3JlZGVudGlhbChvcHRpb25zLmNyZWRlbnRpYWwpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY3JlZGVudGlhbFwiIHByb3BlcnR5IG11c3QgYmUgYW4gaW5zdGFuY2Ugb2YgdGhlIHRva2VuIGNyZWRlbnRpYWwgY2xhc3MuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAndG9rZW4tY3JlZGVudGlhbCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY3JlZGVudGlhbDogb3B0aW9ucy5jcmVkZW50aWFsXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnVzZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMudXNlck5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucGFzc3dvcmQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5wYXNzd29yZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy50ZW5hbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnRlbmFudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1c2VyTmFtZTogb3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBvcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgdGVuYW50SWQ6IG9wdGlvbnMudGVuYW50SWQsXG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9rZW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudG9rZW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB0b2tlbjogb3B0aW9ucy50b2tlblxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJykge1xuICAgICAgICBpZiAob3B0aW9ucy5jbGllbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnKSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudElkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3Rvcnktc2VydmljZS1wcmluY2lwYWwtc2VjcmV0Jykge1xuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMuY2xpZW50SWQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNsaWVudFNlY3JldCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRTZWNyZXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRlbmFudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWQsXG4gICAgICAgICAgICBjbGllbnRTZWNyZXQ6IG9wdGlvbnMuY2xpZW50U2VjcmV0LFxuICAgICAgICAgICAgdGVuYW50SWQ6IG9wdGlvbnMudGVuYW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAob3B0aW9ucy51c2VyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnVzZXJOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBhc3N3b3JkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgYXV0aGVudGljYXRpb24gPSB7XG4gICAgICAgICAgdHlwZTogJ2RlZmF1bHQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHVzZXJOYW1lOiBvcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IG9wdGlvbnMucGFzc3dvcmRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICB0eXBlOiAnZGVmYXVsdCcsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICB1c2VyTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHBhc3N3b3JkOiB1bmRlZmluZWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9XG5cbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIHNlcnZlcjogY29uZmlnLnNlcnZlcixcbiAgICAgIGF1dGhlbnRpY2F0aW9uOiBhdXRoZW50aWNhdGlvbixcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I6IGZhbHNlLFxuICAgICAgICBhcHBOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIGNhbWVsQ2FzZUNvbHVtbnM6IGZhbHNlLFxuICAgICAgICBjYW5jZWxUaW1lb3V0OiBERUZBVUxUX0NBTkNFTF9USU1FT1VULFxuICAgICAgICBjb2x1bW5FbmNyeXB0aW9uS2V5Q2FjaGVUVEw6IDIgKiA2MCAqIDYwICogMTAwMCwgIC8vIFVuaXRzOiBtaWxsaXNlY29uZHNcbiAgICAgICAgY29sdW1uRW5jcnlwdGlvblNldHRpbmc6IGZhbHNlLFxuICAgICAgICBjb2x1bW5OYW1lUmVwbGFjZXI6IHVuZGVmaW5lZCxcbiAgICAgICAgY29ubmVjdGlvblJldHJ5SW50ZXJ2YWw6IERFRkFVTFRfQ09OTkVDVF9SRVRSWV9JTlRFUlZBTCxcbiAgICAgICAgY29ubmVjdFRpbWVvdXQ6IERFRkFVTFRfQ09OTkVDVF9USU1FT1VULFxuICAgICAgICBjb25uZWN0b3I6IHVuZGVmaW5lZCxcbiAgICAgICAgY29ubmVjdGlvbklzb2xhdGlvbkxldmVsOiBJU09MQVRJT05fTEVWRUwuUkVBRF9DT01NSVRURUQsXG4gICAgICAgIGNyeXB0b0NyZWRlbnRpYWxzRGV0YWlsczoge30sXG4gICAgICAgIGRhdGFiYXNlOiB1bmRlZmluZWQsXG4gICAgICAgIGRhdGVmaXJzdDogREVGQVVMVF9EQVRFRklSU1QsXG4gICAgICAgIGRhdGVGb3JtYXQ6IERFRkFVTFRfREFURUZPUk1BVCxcbiAgICAgICAgZGVidWc6IHtcbiAgICAgICAgICBkYXRhOiBmYWxzZSxcbiAgICAgICAgICBwYWNrZXQ6IGZhbHNlLFxuICAgICAgICAgIHBheWxvYWQ6IGZhbHNlLFxuICAgICAgICAgIHRva2VuOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICBlbmFibGVBbnNpTnVsbDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQW5zaU51bGxEZWZhdWx0OiB0cnVlLFxuICAgICAgICBlbmFibGVBbnNpUGFkZGluZzogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQW5zaVdhcm5pbmdzOiB0cnVlLFxuICAgICAgICBlbmFibGVBcml0aEFib3J0OiB0cnVlLFxuICAgICAgICBlbmFibGVDb25jYXROdWxsWWllbGRzTnVsbDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDogbnVsbCxcbiAgICAgICAgZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnM6IGZhbHNlLFxuICAgICAgICBlbmFibGVOdW1lcmljUm91bmRhYm9ydDogZmFsc2UsXG4gICAgICAgIGVuYWJsZVF1b3RlZElkZW50aWZpZXI6IHRydWUsXG4gICAgICAgIGVuY3J5cHQ6IHRydWUsXG4gICAgICAgIGZhbGxiYWNrVG9EZWZhdWx0RGI6IGZhbHNlLFxuICAgICAgICBlbmNyeXB0aW9uS2V5U3RvcmVQcm92aWRlcnM6IHVuZGVmaW5lZCxcbiAgICAgICAgaW5zdGFuY2VOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIGlzb2xhdGlvbkxldmVsOiBJU09MQVRJT05fTEVWRUwuUkVBRF9DT01NSVRURUQsXG4gICAgICAgIGxhbmd1YWdlOiBERUZBVUxUX0xBTkdVQUdFLFxuICAgICAgICBsb2NhbEFkZHJlc3M6IHVuZGVmaW5lZCxcbiAgICAgICAgbWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzOiAzLFxuICAgICAgICBtdWx0aVN1Ym5ldEZhaWxvdmVyOiBmYWxzZSxcbiAgICAgICAgcGFja2V0U2l6ZTogREVGQVVMVF9QQUNLRVRfU0laRSxcbiAgICAgICAgcG9ydDogREVGQVVMVF9QT1JULFxuICAgICAgICByZWFkT25seUludGVudDogZmFsc2UsXG4gICAgICAgIHJlcXVlc3RUaW1lb3V0OiBERUZBVUxUX0NMSUVOVF9SRVFVRVNUX1RJTUVPVVQsXG4gICAgICAgIHJvd0NvbGxlY3Rpb25PbkRvbmU6IGZhbHNlLFxuICAgICAgICByb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbjogZmFsc2UsXG4gICAgICAgIHNlcnZlck5hbWU6IHVuZGVmaW5lZCxcbiAgICAgICAgc2VydmVyU3VwcG9ydHNDb2x1bW5FbmNyeXB0aW9uOiBmYWxzZSxcbiAgICAgICAgdGRzVmVyc2lvbjogREVGQVVMVF9URFNfVkVSU0lPTixcbiAgICAgICAgdGV4dHNpemU6IERFRkFVTFRfVEVYVFNJWkUsXG4gICAgICAgIHRydXN0ZWRTZXJ2ZXJOYW1lQUU6IHVuZGVmaW5lZCxcbiAgICAgICAgdHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZTogZmFsc2UsXG4gICAgICAgIHVzZUNvbHVtbk5hbWVzOiBmYWxzZSxcbiAgICAgICAgdXNlVVRDOiB0cnVlLFxuICAgICAgICB3b3Jrc3RhdGlvbklkOiB1bmRlZmluZWQsXG4gICAgICAgIGxvd2VyQ2FzZUd1aWRzOiBmYWxzZVxuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAoY29uZmlnLm9wdGlvbnMpIHtcbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5wb3J0ICYmIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1BvcnQgYW5kIGluc3RhbmNlTmFtZSBhcmUgbXV0dWFsbHkgZXhjbHVzaXZlLCBidXQgJyArIGNvbmZpZy5vcHRpb25zLnBvcnQgKyAnIGFuZCAnICsgY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lICsgJyBwcm92aWRlZCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPSBjb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmFwcE5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmFwcE5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuYXBwTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmFwcE5hbWUgPSBjb25maWcub3B0aW9ucy5hcHBOYW1lO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1uc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jYW1lbENhc2VDb2x1bW5zID0gY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQgPSBjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29sdW1uTmFtZVJlcGxhY2VyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY29sdW1uTmFtZVJlcGxhY2VyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBmdW5jdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY29sdW1uTmFtZVJlcGxhY2VyID0gY29uZmlnLm9wdGlvbnMuY29sdW1uTmFtZVJlcGxhY2VyO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXNzZXJ0VmFsaWRJc29sYXRpb25MZXZlbChjb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwsICdjb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwnKTtcblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0ID0gY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0b3IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNvbm5lY3RvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNvbm5lY3RvclwiIHByb3BlcnR5IG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yID0gY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgIT09ICdvYmplY3QnIHx8IGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyA9PT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlsc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyA9IGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRhdGFiYXNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRhYmFzZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kYXRhYmFzZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGFiYXNlID0gY29uZmlnLm9wdGlvbnMuZGF0YWJhc2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCAhPT0gJ251bWJlcicgJiYgY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IG51bGwgJiYgKGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA8IDEgfHwgY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ID4gNykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0XCIgcHJvcGVydHkgbXVzdCBiZSA+PSAxIGFuZCA8PSA3Jyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA9IGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09ICdzdHJpbmcnICYmIGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZyBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ID0gY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnKSB7XG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGEgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YSA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcucGFja2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZCA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW4gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW4gIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW5cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuID0gY29uZmlnLm9wdGlvbnMuZGVidWcudG9rZW47XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVdhcm5pbmdzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPSBjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXQgPSBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9uc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPSBjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXIgPSBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyO1xuICAgICAgfVxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuY3J5cHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuY3J5cHQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmNyeXB0ICE9PSAnc3RyaWN0Jykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiZW5jcnlwdFwiIHByb3BlcnR5IG11c3QgYmUgc2V0IHRvIFwic3RyaWN0XCIsIG9yIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuY3J5cHQgPSBjb25maWcub3B0aW9ucy5lbmNyeXB0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYlwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiID0gY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSA9IGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZTtcbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhc3NlcnRWYWxpZElzb2xhdGlvbkxldmVsKGNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsLCAnY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwnKTtcblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsID0gY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2UgIT09ICdzdHJpbmcnICYmIGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2VcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlID0gY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2U7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmxvY2FsQWRkcmVzcyAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3NcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3MgPSBjb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3M7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLm11bHRpU3VibmV0RmFpbG92ZXIgPSBjb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZSAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5wYWNrZXRTaXplXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZSA9IGNvbmZpZy5vcHRpb25zLnBhY2tldFNpemU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5wb3J0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5wb3J0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnBvcnRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnBvcnQgPD0gMCB8fCBjb25maWcub3B0aW9ucy5wb3J0ID49IDY1NTM2KSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnBvcnRcIiBwcm9wZXJ0eSBtdXN0IGJlID4gMCBhbmQgPCA2NTUzNicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ID0gY29uZmlnLm9wdGlvbnMucG9ydDtcbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgPSB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5yZWFkT25seUludGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50ID0gY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dCA9IGNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5tYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMgPCAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzXCIgcHJvcGVydHkgbXVzdCBiZSBlcXVhbCBvciBncmVhdGVyIHRoYW4gMC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzID0gY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCA8PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWxcIiBwcm9wZXJ0eSBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25Eb25lID0gY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb25cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24gPSBjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPSBjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudGV4dHNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSAnbnVtYmVyJyAmJiBjb25maWcub3B0aW9ucy50ZXh0c2l6ZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRleHRzaXplXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlciBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnRleHRzaXplID4gMjE0NzQ4MzY0Nykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRleHRzaXplXCIgY2FuXFwndCBiZSBncmVhdGVyIHRoYW4gMjE0NzQ4MzY0Ny4nKTtcbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcub3B0aW9ucy50ZXh0c2l6ZSA8IC0xKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudGV4dHNpemVcIiBjYW5cXCd0IGJlIHNtYWxsZXIgdGhhbiAtMS4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudGV4dHNpemUgPSBjb25maWcub3B0aW9ucy50ZXh0c2l6ZSB8IDA7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGUgPSBjb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5zZXJ2ZXJOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnNlcnZlck5hbWUgPSBjb25maWcub3B0aW9ucy5zZXJ2ZXJOYW1lO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcyA9IGNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudXNlVVRDICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy51c2VVVEMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnVzZVVUQ1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy51c2VVVEMgPSBjb25maWcub3B0aW9ucy51c2VVVEM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkID0gY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHMgPSBjb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkcztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zID0gdGhpcy5jb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHM7XG4gICAgaWYgKHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMuc2VjdXJlT3B0aW9ucyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBJZiB0aGUgY2FsbGVyIGhhcyBub3Qgc3BlY2lmaWVkIHRoZWlyIG93biBgc2VjdXJlT3B0aW9uc2AsXG4gICAgICAvLyB3ZSBzZXQgYFNTTF9PUF9ET05UX0lOU0VSVF9FTVBUWV9GUkFHTUVOVFNgIGhlcmUuXG4gICAgICAvLyBPbGRlciBTUUwgU2VydmVyIGluc3RhbmNlcyBydW5uaW5nIG9uIG9sZGVyIFdpbmRvd3MgdmVyc2lvbnMgaGF2ZVxuICAgICAgLy8gdHJvdWJsZSB3aXRoIHRoZSBCRUFTVCB3b3JrYXJvdW5kIGluIE9wZW5TU0wuXG4gICAgICAvLyBBcyBCRUFTVCBpcyBhIGJyb3dzZXIgc3BlY2lmaWMgZXhwbG9pdCwgd2UgY2FuIGp1c3QgZGlzYWJsZSB0aGlzIG9wdGlvbiBoZXJlLlxuICAgICAgdGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucyA9IE9iamVjdC5jcmVhdGUodGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucywge1xuICAgICAgICBzZWN1cmVPcHRpb25zOiB7XG4gICAgICAgICAgdmFsdWU6IGNvbnN0YW50cy5TU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuZGVidWcgPSB0aGlzLmNyZWF0ZURlYnVnKCk7XG4gICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgdGhpcy50cmFuc2FjdGlvbkRlc2NyaXB0b3JzID0gW0J1ZmZlci5mcm9tKFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwXSldO1xuXG4gICAgLy8gJ2JlZ2luVHJhbnNhY3Rpb24nLCAnY29tbWl0VHJhbnNhY3Rpb24nIGFuZCAncm9sbGJhY2tUcmFuc2FjdGlvbidcbiAgICAvLyBldmVudHMgYXJlIHV0aWxpemVkIHRvIG1haW50YWluIGluVHJhbnNhY3Rpb24gcHJvcGVydHkgc3RhdGUgd2hpY2ggaW5cbiAgICAvLyB0dXJuIGlzIHVzZWQgaW4gbWFuYWdpbmcgdHJhbnNhY3Rpb25zLiBUaGVzZSBldmVudHMgYXJlIG9ubHkgZmlyZWQgZm9yXG4gICAgLy8gVERTIHZlcnNpb24gNy4yIGFuZCBiZXlvbmQuIFRoZSBwcm9wZXJ0aWVzIGJlbG93IGFyZSB1c2VkIHRvIGVtdWxhdGVcbiAgICAvLyBlcXVpdmFsZW50IGJlaGF2aW9yIGZvciBURFMgdmVyc2lvbnMgYmVmb3JlIDcuMi5cbiAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGggPSAwO1xuICAgIHRoaXMuaXNTcWxCYXRjaCA9IGZhbHNlO1xuICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgdGhpcy5tZXNzYWdlQnVmZmVyID0gQnVmZmVyLmFsbG9jKDApO1xuXG4gICAgdGhpcy5jdXJUcmFuc2llbnRSZXRyeUNvdW50ID0gMDtcbiAgICB0aGlzLnRyYW5zaWVudEVycm9yTG9va3VwID0gbmV3IFRyYW5zaWVudEVycm9yTG9va3VwKCk7XG5cbiAgICB0aGlzLnN0YXRlID0gdGhpcy5TVEFURS5JTklUSUFMSVpFRDtcblxuICAgIHRoaXMuX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQgPSAoKSA9PiB7XG4gICAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLkFUVEVOVElPTik7XG4gICAgICB0aGlzLmNyZWF0ZUNhbmNlbFRpbWVyKCk7XG4gICAgfTtcblxuICAgIHRoaXMuX29uU29ja2V0Q2xvc2UgPSAoKSA9PiB7XG4gICAgICB0aGlzLnNvY2tldENsb3NlKCk7XG4gICAgfTtcblxuICAgIHRoaXMuX29uU29ja2V0RW5kID0gKCkgPT4ge1xuICAgICAgdGhpcy5zb2NrZXRFbmQoKTtcbiAgICB9O1xuXG4gICAgdGhpcy5fb25Tb2NrZXRFcnJvciA9IChlcnJvcikgPT4ge1xuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzb2NrZXRFcnJvcicsIGVycm9yKTtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgdGhpcy53cmFwU29ja2V0RXJyb3IoZXJyb3IpKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cblxuICBjb25uZWN0KGNvbm5lY3RMaXN0ZW5lcj86IChlcnI/OiBFcnJvcikgPT4gdm9pZCkge1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLklOSVRJQUxJWkVEKSB7XG4gICAgICB0aHJvdyBuZXcgQ29ubmVjdGlvbkVycm9yKCdgLmNvbm5lY3RgIGNhbiBub3QgYmUgY2FsbGVkIG9uIGEgQ29ubmVjdGlvbiBpbiBgJyArIHRoaXMuc3RhdGUubmFtZSArICdgIHN0YXRlLicpO1xuICAgIH1cblxuICAgIGlmIChjb25uZWN0TGlzdGVuZXIpIHtcbiAgICAgIGNvbnN0IG9uQ29ubmVjdCA9IChlcnI/OiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICBjb25uZWN0TGlzdGVuZXIoZXJyKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0Jywgb25Db25uZWN0KTtcbiAgICAgICAgY29ubmVjdExpc3RlbmVyKGVycik7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLm9uY2UoJ2Nvbm5lY3QnLCBvbkNvbm5lY3QpO1xuICAgICAgdGhpcy5vbmNlKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIH1cblxuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuQ09OTkVDVElORyk7XG4gICAgdGhpcy5pbml0aWFsaXNlQ29ubmVjdGlvbigpLnRoZW4oKCkgPT4ge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcpO1xuICAgICAgfSk7XG4gICAgfSwgKGVycikgPT4ge1xuICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCBlcnIpO1xuICAgICAgfSk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGNoYXJzZXQgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBvbihldmVudDogJ2NoYXJzZXRDaGFuZ2UnLCBsaXN0ZW5lcjogKGNoYXJzZXQ6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGF0dGVtcHQgdG8gY29ubmVjdCBhbmQgdmFsaWRhdGUgaGFzIGNvbXBsZXRlZC5cbiAgICovXG4gIG9uKFxuICAgIGV2ZW50OiAnY29ubmVjdCcsXG4gICAgLyoqXG4gICAgICogQHBhcmFtIGVyciBJZiBzdWNjZXNzZnVsbHkgY29ubmVjdGVkLCB3aWxsIGJlIGZhbHNleS4gSWYgdGhlcmUgd2FzIGFcbiAgICAgKiAgIHByb2JsZW0gKHdpdGggZWl0aGVyIGNvbm5lY3Rpbmcgb3IgdmFsaWRhdGlvbiksIHdpbGwgYmUgYW4gW1tFcnJvcl1dIG9iamVjdC5cbiAgICAgKi9cbiAgICBsaXN0ZW5lcjogKGVycjogRXJyb3IgfCB1bmRlZmluZWQpID0+IHZvaWRcbiAgKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyByZXBvcnRlZCB0aGF0IHRoZSBhY3RpdmUgZGF0YWJhc2UgaGFzIGNoYW5nZWQuXG4gICAqIFRoaXMgbWF5IGJlIGFzIGEgcmVzdWx0IG9mIGEgc3VjY2Vzc2Z1bCBsb2dpbiwgb3IgYSBgdXNlYCBzdGF0ZW1lbnQuXG4gICAqL1xuICBvbihldmVudDogJ2RhdGFiYXNlQ2hhbmdlJywgbGlzdGVuZXI6IChkYXRhYmFzZU5hbWU6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogQSBkZWJ1ZyBtZXNzYWdlIGlzIGF2YWlsYWJsZS4gSXQgbWF5IGJlIGxvZ2dlZCBvciBpZ25vcmVkLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdkZWJ1ZycsIGxpc3RlbmVyOiAobWVzc2FnZVRleHQ6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogSW50ZXJuYWwgZXJyb3Igb2NjdXJzLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdlcnJvcicsIGxpc3RlbmVyOiAoZXJyOiBFcnJvcikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgaXNzdWVkIGFuIGVycm9yIG1lc3NhZ2UuXG4gICAqL1xuICBvbihldmVudDogJ2Vycm9yTWVzc2FnZScsIGxpc3RlbmVyOiAobWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuRXJyb3JNZXNzYWdlVG9rZW4pID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIGhhcyBlbmRlZC5cbiAgICpcbiAgICogVGhpcyBtYXkgYmUgYXMgYSByZXN1bHQgb2YgdGhlIGNsaWVudCBjYWxsaW5nIFtbY2xvc2VdXSwgdGhlIHNlcnZlclxuICAgKiBjbG9zaW5nIHRoZSBjb25uZWN0aW9uLCBvciBhIG5ldHdvcmsgZXJyb3IuXG4gICAqL1xuICBvbihldmVudDogJ2VuZCcsIGxpc3RlbmVyOiAoKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyBpc3N1ZWQgYW4gaW5mb3JtYXRpb24gbWVzc2FnZS5cbiAgICovXG4gIG9uKGV2ZW50OiAnaW5mb01lc3NhZ2UnLCBsaXN0ZW5lcjogKG1lc3NhZ2U6IGltcG9ydCgnLi90b2tlbi90b2tlbicpLkluZm9NZXNzYWdlVG9rZW4pID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGxhbmd1YWdlIGhhcyBjaGFuZ2VkLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdsYW5ndWFnZUNoYW5nZScsIGxpc3RlbmVyOiAobGFuZ3VhZ2VOYW1lOiBzdHJpbmcpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBjb25uZWN0aW9uIHdhcyByZXNldC5cbiAgICovXG4gIG9uKGV2ZW50OiAncmVzZXRDb25uZWN0aW9uJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIEEgc2VjdXJlIGNvbm5lY3Rpb24gaGFzIGJlZW4gZXN0YWJsaXNoZWQuXG4gICAqL1xuICBvbihldmVudDogJ3NlY3VyZScsIGxpc3RlbmVyOiAoY2xlYXJ0ZXh0OiBpbXBvcnQoJ3RscycpLlRMU1NvY2tldCkgPT4gdm9pZCk6IHRoaXNcblxuICBvbihldmVudDogc3RyaW5nIHwgc3ltYm9sLCBsaXN0ZW5lcjogKC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkKSB7XG4gICAgcmV0dXJuIHN1cGVyLm9uKGV2ZW50LCBsaXN0ZW5lcik7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdjaGFyc2V0Q2hhbmdlJywgY2hhcnNldDogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdjb25uZWN0JywgZXJyb3I/OiBFcnJvcik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZGF0YWJhc2VDaGFuZ2UnLCBkYXRhYmFzZU5hbWU6IHN0cmluZyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZGF0YWJhc2VNaXJyb3JpbmdQYXJ0bmVyJywgcGFydG5lckluc3RhbmNlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdkZWJ1ZycsIG1lc3NhZ2VUZXh0OiBzdHJpbmcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2Vycm9yJywgZXJyb3I6IEVycm9yKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdlcnJvck1lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5FcnJvck1lc3NhZ2VUb2tlbik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZW5kJyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnaW5mb01lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5JbmZvTWVzc2FnZVRva2VuKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdsYW5ndWFnZUNoYW5nZScsIGxhbmd1YWdlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdzZWN1cmUnLCBjbGVhcnRleHQ6IGltcG9ydCgndGxzJykuVExTU29ja2V0KTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXJvdXRpbmcnKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXNldENvbm5lY3Rpb24nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXRyeScpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ3JvbGxiYWNrVHJhbnNhY3Rpb24nKTogYm9vbGVhblxuXG4gIGVtaXQoZXZlbnQ6IHN0cmluZyB8IHN5bWJvbCwgLi4uYXJnczogYW55W10pIHtcbiAgICByZXR1cm4gc3VwZXIuZW1pdChldmVudCwgLi4uYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBkYXRhYmFzZS5cbiAgICpcbiAgICogVGhlIFtbRXZlbnRfZW5kXV0gd2lsbCBiZSBlbWl0dGVkIG9uY2UgdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gY2xvc2VkLlxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgdGhpcy5jbGVhbnVwQ29ubmVjdGlvbigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBpbml0aWFsaXNlQ29ubmVjdGlvbigpIHtcbiAgICBjb25zdCB0aW1lb3V0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcblxuICAgIGNvbnN0IGNvbm5lY3RUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgY29uc3QgaG9zdFBvc3RmaXggPSB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgPyBgOiR7dGhpcy5jb25maWcub3B0aW9ucy5wb3J0fWAgOiBgXFxcXCR7dGhpcy5jb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWV9YDtcbiAgICAgIC8vIElmIHdlIGhhdmUgcm91dGluZyBkYXRhIHN0b3JlZCwgdGhpcyBjb25uZWN0aW9uIGhhcyBiZWVuIHJlZGlyZWN0ZWRcbiAgICAgIGNvbnN0IHNlcnZlciA9IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnNlcnZlciA6IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICAgIGNvbnN0IHBvcnQgPSB0aGlzLnJvdXRpbmdEYXRhID8gYDoke3RoaXMucm91dGluZ0RhdGEucG9ydH1gIDogaG9zdFBvc3RmaXg7XG4gICAgICAvLyBHcmFiIHRoZSB0YXJnZXQgaG9zdCBmcm9tIHRoZSBjb25uZWN0aW9uIGNvbmZpZ3VyYXRpb24sIGFuZCBmcm9tIGEgcmVkaXJlY3QgbWVzc2FnZVxuICAgICAgLy8gb3RoZXJ3aXNlLCBsZWF2ZSB0aGUgbWVzc2FnZSBlbXB0eS5cbiAgICAgIGNvbnN0IHJvdXRpbmdNZXNzYWdlID0gdGhpcy5yb3V0aW5nRGF0YSA/IGAgKHJlZGlyZWN0ZWQgZnJvbSAke3RoaXMuY29uZmlnLnNlcnZlcn0ke2hvc3RQb3N0Zml4fSlgIDogJyc7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYEZhaWxlZCB0byBjb25uZWN0IHRvICR7c2VydmVyfSR7cG9ydH0ke3JvdXRpbmdNZXNzYWdlfSBpbiAke3RoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXR9bXNgO1xuICAgICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG5cbiAgICAgIHRpbWVvdXRDb250cm9sbGVyLmFib3J0KG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VUSU1FT1VUJykpO1xuICAgIH0sIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGxldCBzaWduYWwgPSB0aW1lb3V0Q29udHJvbGxlci5zaWduYWw7XG5cbiAgICAgIGxldCBwb3J0ID0gdGhpcy5jb25maWcub3B0aW9ucy5wb3J0O1xuXG4gICAgICBpZiAoIXBvcnQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBwb3J0ID0gYXdhaXQgaW5zdGFuY2VMb29rdXAoe1xuICAgICAgICAgICAgc2VydmVyOiB0aGlzLmNvbmZpZy5zZXJ2ZXIsXG4gICAgICAgICAgICBpbnN0YW5jZU5hbWU6IHRoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lISxcbiAgICAgICAgICAgIHRpbWVvdXQ6IHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQsXG4gICAgICAgICAgICBzaWduYWw6IHNpZ25hbFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHNpZ25hbC50aHJvd0lmQWJvcnRlZCgpO1xuXG4gICAgICAgICAgdGhyb3cgbmV3IENvbm5lY3Rpb25FcnJvcihlcnIubWVzc2FnZSwgJ0VJTlNUTE9PS1VQJywgeyBjYXVzZTogZXJyIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxldCBzb2NrZXQ7XG4gICAgICB0cnkge1xuICAgICAgICBzb2NrZXQgPSBhd2FpdCB0aGlzLmNvbm5lY3RPblBvcnQocG9ydCwgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyLCBzaWduYWwsIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yKTtcbiAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgIHNpZ25hbC50aHJvd0lmQWJvcnRlZCgpO1xuXG4gICAgICAgIHRocm93IHRoaXMud3JhcFNvY2tldEVycm9yKGVycik7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgIGNvbnRyb2xsZXIuYWJvcnQodGhpcy53cmFwU29ja2V0RXJyb3IoZXJyKSk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG9uQ2xvc2UgPSAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZWJ1Zy5sb2coJ2Nvbm5lY3Rpb24gdG8gJyArIHRoaXMuY29uZmlnLnNlcnZlciArICc6JyArIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCArICcgY2xvc2VkJyk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG9uRW5kID0gKCkgPT4ge1xuICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdzb2NrZXQgZW5kZWQnKTtcblxuICAgICAgICAgIGNvbnN0IGVycm9yOiBFcnJvcldpdGhDb2RlID0gbmV3IEVycm9yKCdzb2NrZXQgaGFuZyB1cCcpO1xuICAgICAgICAgIGVycm9yLmNvZGUgPSAnRUNPTk5SRVNFVCc7XG4gICAgICAgICAgY29udHJvbGxlci5hYm9ydCh0aGlzLndyYXBTb2NrZXRFcnJvcihlcnJvcikpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHNvY2tldC5vbmNlKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICBzb2NrZXQub25jZSgnY2xvc2UnLCBvbkNsb3NlKTtcbiAgICAgICAgc29ja2V0Lm9uY2UoJ2VuZCcsIG9uRW5kKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIHNpZ25hbCA9IEFib3J0U2lnbmFsLmFueShbc2lnbmFsLCBjb250cm9sbGVyLnNpZ25hbF0pO1xuXG4gICAgICAgICAgc29ja2V0LnNldEtlZXBBbGl2ZSh0cnVlLCBLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkpO1xuXG4gICAgICAgICAgdGhpcy5tZXNzYWdlSW8gPSBuZXcgTWVzc2FnZUlPKHNvY2tldCwgdGhpcy5jb25maWcub3B0aW9ucy5wYWNrZXRTaXplLCB0aGlzLmRlYnVnKTtcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VJby5vbignc2VjdXJlJywgKGNsZWFydGV4dCkgPT4geyB0aGlzLmVtaXQoJ3NlY3VyZScsIGNsZWFydGV4dCk7IH0pO1xuXG4gICAgICAgICAgdGhpcy5zb2NrZXQgPSBzb2NrZXQ7XG5cbiAgICAgICAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdjb25uZWN0ZWQgdG8gJyArIHRoaXMuY29uZmlnLnNlcnZlciArICc6JyArIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCk7XG5cbiAgICAgICAgICB0aGlzLnNlbmRQcmVMb2dpbigpO1xuXG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX1BSRUxPR0lOKTtcbiAgICAgICAgICBjb25zdCBwcmVsb2dpblJlc3BvbnNlID0gYXdhaXQgdGhpcy5yZWFkUHJlbG9naW5SZXNwb25zZShzaWduYWwpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGVyZm9ybVRsc05lZ290aWF0aW9uKHByZWxvZ2luUmVzcG9uc2UsIHNpZ25hbCk7XG5cbiAgICAgICAgICB0aGlzLnNlbmRMb2dpbjdQYWNrZXQoKTtcblxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB7IGF1dGhlbnRpY2F0aW9uIH0gPSB0aGlzLmNvbmZpZztcbiAgICAgICAgICAgIHN3aXRjaCAoYXV0aGVudGljYXRpb24udHlwZSkge1xuICAgICAgICAgICAgICBjYXNlICd0b2tlbi1jcmVkZW50aWFsJzpcbiAgICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCc6XG4gICAgICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJzpcbiAgICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnOlxuICAgICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCc6XG4gICAgICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX0ZFREFVVEgpO1xuICAgICAgICAgICAgICAgIHRoaXMucm91dGluZ0RhdGEgPSBhd2FpdCB0aGlzLnBlcmZvcm1TZW50TG9naW43V2l0aEZlZEF1dGgoc2lnbmFsKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgY2FzZSAnbnRsbSc6XG4gICAgICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX05UTE0pO1xuICAgICAgICAgICAgICAgIHRoaXMucm91dGluZ0RhdGEgPSBhd2FpdCB0aGlzLnBlcmZvcm1TZW50TG9naW43V2l0aE5UTE1Mb2dpbihzaWduYWwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTik7XG4gICAgICAgICAgICAgICAgdGhpcy5yb3V0aW5nRGF0YSA9IGF3YWl0IHRoaXMucGVyZm9ybVNlbnRMb2dpbjdXaXRoU3RhbmRhcmRMb2dpbihzaWduYWwpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICBpZiAoaXNUcmFuc2llbnRFcnJvcihlcnIpKSB7XG4gICAgICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdJbml0aWF0aW5nIHJldHJ5IG9uIHRyYW5zaWVudCBlcnJvcicpO1xuICAgICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucGVyZm9ybVRyYW5zaWVudEZhaWx1cmVSZXRyeSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gSWYgcm91dGluZyBkYXRhIGlzIHByZXNlbnQsIHdlIG5lZWQgdG8gcmUtcm91dGUgdGhlIGNvbm5lY3Rpb25cbiAgICAgICAgICBpZiAodGhpcy5yb3V0aW5nRGF0YSkge1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5SRVJPVVRJTkcpO1xuICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucGVyZm9ybVJlUm91dGluZygpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUwpO1xuICAgICAgICAgIGF3YWl0IHRoaXMucGVyZm9ybUxvZ2dlZEluU2VuZGluZ0luaXRpYWxTcWwoc2lnbmFsKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBzb2NrZXQucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgICAgc29ja2V0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uQ2xvc2UpO1xuICAgICAgICAgIHNvY2tldC5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25FbmQpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgc29ja2V0LmRlc3Ryb3koKTtcblxuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG5cbiAgICAgIHNvY2tldC5vbignZXJyb3InLCB0aGlzLl9vblNvY2tldEVycm9yKTtcbiAgICAgIHNvY2tldC5vbignY2xvc2UnLCB0aGlzLl9vblNvY2tldENsb3NlKTtcbiAgICAgIHNvY2tldC5vbignZW5kJywgdGhpcy5fb25Tb2NrZXRFbmQpO1xuXG4gICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGNsZWFyVGltZW91dChjb25uZWN0VGltZXIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYW51cENvbm5lY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmNsb3NlZCkge1xuICAgICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oKTtcblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZW1pdCgnZW5kJyk7XG4gICAgICB9KTtcblxuICAgICAgY29uc3QgcmVxdWVzdCA9IHRoaXMucmVxdWVzdDtcbiAgICAgIGlmIChyZXF1ZXN0KSB7XG4gICAgICAgIGNvbnN0IGVyciA9IG5ldyBSZXF1ZXN0RXJyb3IoJ0Nvbm5lY3Rpb24gY2xvc2VkIGJlZm9yZSByZXF1ZXN0IGNvbXBsZXRlZC4nLCAnRUNMT1NFJyk7XG4gICAgICAgIHJlcXVlc3QuY2FsbGJhY2soZXJyKTtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmNsb3NlZCA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVEZWJ1ZygpIHtcbiAgICBjb25zdCBkZWJ1ZyA9IG5ldyBEZWJ1Zyh0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnKTtcbiAgICBkZWJ1Zy5vbignZGVidWcnLCAobWVzc2FnZSkgPT4ge1xuICAgICAgdGhpcy5lbWl0KCdkZWJ1ZycsIG1lc3NhZ2UpO1xuICAgIH0pO1xuICAgIHJldHVybiBkZWJ1ZztcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZTogTWVzc2FnZSwgaGFuZGxlcjogVG9rZW5IYW5kbGVyKSB7XG4gICAgcmV0dXJuIG5ldyBUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCB0aGlzLmRlYnVnLCBoYW5kbGVyLCB0aGlzLmNvbmZpZy5vcHRpb25zKTtcbiAgfVxuXG4gIGFzeW5jIHdyYXBXaXRoVGxzKHNvY2tldDogbmV0LlNvY2tldCwgc2lnbmFsOiBBYm9ydFNpZ25hbCk6IFByb21pc2U8dGxzLlRMU1NvY2tldD4ge1xuICAgIHNpZ25hbC50aHJvd0lmQWJvcnRlZCgpO1xuXG4gICAgY29uc3Qgc2VjdXJlQ29udGV4dCA9IHRscy5jcmVhdGVTZWN1cmVDb250ZXh0KHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMpO1xuICAgIC8vIElmIGNvbm5lY3QgdG8gYW4gaXAgYWRkcmVzcyBkaXJlY3RseSxcbiAgICAvLyBuZWVkIHRvIHNldCB0aGUgc2VydmVybmFtZSB0byBhbiBlbXB0eSBzdHJpbmdcbiAgICAvLyBpZiB0aGUgdXNlciBoYXMgbm90IGdpdmVuIGEgc2VydmVybmFtZSBleHBsaWNpdGx5XG4gICAgY29uc3Qgc2VydmVyTmFtZSA9ICFuZXQuaXNJUCh0aGlzLmNvbmZpZy5zZXJ2ZXIpID8gdGhpcy5jb25maWcuc2VydmVyIDogJyc7XG4gICAgY29uc3QgZW5jcnlwdE9wdGlvbnMgPSB7XG4gICAgICBob3N0OiB0aGlzLmNvbmZpZy5zZXJ2ZXIsXG4gICAgICBzb2NrZXQ6IHNvY2tldCxcbiAgICAgIEFMUE5Qcm90b2NvbHM6IFsndGRzLzguMCddLFxuICAgICAgc2VjdXJlQ29udGV4dDogc2VjdXJlQ29udGV4dCxcbiAgICAgIHNlcnZlcm5hbWU6IHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA/IHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA6IHNlcnZlck5hbWUsXG4gICAgfTtcblxuICAgIGNvbnN0IHsgcHJvbWlzZSwgcmVzb2x2ZSwgcmVqZWN0IH0gPSB3aXRoUmVzb2x2ZXJzPHRscy5UTFNTb2NrZXQ+KCk7XG4gICAgY29uc3QgZW5jcnlwdHNvY2tldCA9IHRscy5jb25uZWN0KGVuY3J5cHRPcHRpb25zKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4geyByZWplY3Qoc2lnbmFsLnJlYXNvbik7IH07XG4gICAgICBzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0LCB7IG9uY2U6IHRydWUgfSk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IG9uRXJyb3IgPSByZWplY3Q7XG4gICAgICAgIGNvbnN0IG9uQ29ubmVjdCA9ICgpID0+IHsgcmVzb2x2ZShlbmNyeXB0c29ja2V0KTsgfTtcblxuICAgICAgICBlbmNyeXB0c29ja2V0Lm9uY2UoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIGVuY3J5cHRzb2NrZXQub25jZSgnc2VjdXJlQ29ubmVjdCcsIG9uQ29ubmVjdCk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gYXdhaXQgcHJvbWlzZTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICBlbmNyeXB0c29ja2V0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICAgIGVuY3J5cHRzb2NrZXQucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3QnLCBvbkNvbm5lY3QpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgZW5jcnlwdHNvY2tldC5kZXN0cm95KCk7XG5cbiAgICAgIHRocm93IGVycjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBjb25uZWN0T25Qb3J0KHBvcnQ6IG51bWJlciwgbXVsdGlTdWJuZXRGYWlsb3ZlcjogYm9vbGVhbiwgc2lnbmFsOiBBYm9ydFNpZ25hbCwgY3VzdG9tQ29ubmVjdG9yPzogKCkgPT4gUHJvbWlzZTxuZXQuU29ja2V0Pikge1xuICAgIGNvbnN0IGNvbm5lY3RPcHRzID0ge1xuICAgICAgaG9zdDogdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEuc2VydmVyIDogdGhpcy5jb25maWcuc2VydmVyLFxuICAgICAgcG9ydDogdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEucG9ydCA6IHBvcnQsXG4gICAgICBsb2NhbEFkZHJlc3M6IHRoaXMuY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzXG4gICAgfTtcblxuICAgIGNvbnN0IGNvbm5lY3QgPSBjdXN0b21Db25uZWN0b3IgfHwgKG11bHRpU3VibmV0RmFpbG92ZXIgPyBjb25uZWN0SW5QYXJhbGxlbCA6IGNvbm5lY3RJblNlcXVlbmNlKTtcblxuICAgIGxldCBzb2NrZXQgPSBhd2FpdCBjb25uZWN0KGNvbm5lY3RPcHRzLCBkbnMubG9va3VwLCBzaWduYWwpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5jcnlwdCA9PT0gJ3N0cmljdCcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFdyYXAgdGhlIHNvY2tldCB3aXRoIFRMUyBmb3IgVERTIDguMFxuICAgICAgICBzb2NrZXQgPSBhd2FpdCB0aGlzLndyYXBXaXRoVGxzKHNvY2tldCwgc2lnbmFsKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBzb2NrZXQuZW5kKCk7XG5cbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzb2NrZXQ7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNsb3NlQ29ubmVjdGlvbigpIHtcbiAgICBpZiAodGhpcy5zb2NrZXQpIHtcbiAgICAgIHRoaXMuc29ja2V0LmRlc3Ryb3koKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZUNhbmNlbFRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJDYW5jZWxUaW1lcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQ7XG4gICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVSZXF1ZXN0VGltZXIoKSB7XG4gICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpOyAvLyByZWxlYXNlIG9sZCB0aW1lciwganVzdCB0byBiZSBzYWZlXG4gICAgY29uc3QgcmVxdWVzdCA9IHRoaXMucmVxdWVzdCBhcyBSZXF1ZXN0O1xuICAgIGNvbnN0IHRpbWVvdXQgPSAocmVxdWVzdC50aW1lb3V0ICE9PSB1bmRlZmluZWQpID8gcmVxdWVzdC50aW1lb3V0IDogdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0VGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjYW5jZWxUaW1lb3V0KCkge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBgRmFpbGVkIHRvIGNhbmNlbCByZXF1ZXN0IGluICR7dGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0fW1zYDtcbiAgICB0aGlzLmRlYnVnLmxvZyhtZXNzYWdlKTtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3NvY2tldEVycm9yJywgbmV3IENvbm5lY3Rpb25FcnJvcihtZXNzYWdlLCAnRVRJTUVPVVQnKSk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHJlcXVlc3RUaW1lb3V0KCkge1xuICAgIHRoaXMucmVxdWVzdFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgY29uc3QgdGltZW91dCA9IChyZXF1ZXN0LnRpbWVvdXQgIT09IHVuZGVmaW5lZCkgPyByZXF1ZXN0LnRpbWVvdXQgOiB0aGlzLmNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0O1xuICAgIGNvbnN0IG1lc3NhZ2UgPSAnVGltZW91dDogUmVxdWVzdCBmYWlsZWQgdG8gY29tcGxldGUgaW4gJyArIHRpbWVvdXQgKyAnbXMnO1xuICAgIHJlcXVlc3QuZXJyb3IgPSBuZXcgUmVxdWVzdEVycm9yKG1lc3NhZ2UsICdFVElNRU9VVCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhckNhbmNlbFRpbWVyKCkge1xuICAgIGlmICh0aGlzLmNhbmNlbFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jYW5jZWxUaW1lcik7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYXJSZXF1ZXN0VGltZXIoKSB7XG4gICAgaWYgKHRoaXMucmVxdWVzdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXF1ZXN0VGltZXIpO1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB0cmFuc2l0aW9uVG8obmV3U3RhdGU6IFN0YXRlKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IG5ld1N0YXRlKSB7XG4gICAgICB0aGlzLmRlYnVnLmxvZygnU3RhdGUgaXMgYWxyZWFkeSAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdGUgJiYgdGhpcy5zdGF0ZS5leGl0KSB7XG4gICAgICB0aGlzLnN0YXRlLmV4aXQuY2FsbCh0aGlzLCBuZXdTdGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWJ1Zy5sb2coJ1N0YXRlIGNoYW5nZTogJyArICh0aGlzLnN0YXRlID8gdGhpcy5zdGF0ZS5uYW1lIDogJ3VuZGVmaW5lZCcpICsgJyAtPiAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuZW50ZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUuZW50ZXIuYXBwbHkodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRFdmVudEhhbmRsZXI8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBUKTogTm9uTnVsbGFibGU8U3RhdGVbJ2V2ZW50cyddW1RdPiB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV07XG5cbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZXZlbnQgJyR7ZXZlbnROYW1lfScgaW4gc3RhdGUgJyR7dGhpcy5zdGF0ZS5uYW1lfSdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlciE7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRpc3BhdGNoRXZlbnQ8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBULCAuLi5hcmdzOiBQYXJhbWV0ZXJzPE5vbk51bGxhYmxlPFN0YXRlWydldmVudHMnXVtUXT4+KSB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV0gYXMgKCh0aGlzOiBDb25uZWN0aW9uLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoYE5vIGV2ZW50ICcke2V2ZW50TmFtZX0nIGluIHN0YXRlICcke3RoaXMuc3RhdGUubmFtZX0nYCkpO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgd3JhcFNvY2tldEVycm9yKGVycm9yOiBFcnJvcik6IENvbm5lY3Rpb25FcnJvciB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuQ09OTkVDVElORyB8fCB0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLlNFTlRfVExTU1NMTkVHT1RJQVRJT04pIHtcbiAgICAgIGNvbnN0IGhvc3RQb3N0Zml4ID0gdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ID8gYDoke3RoaXMuY29uZmlnLm9wdGlvbnMucG9ydH1gIDogYFxcXFwke3RoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lfWA7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHJvdXRpbmcgZGF0YSBzdG9yZWQsIHRoaXMgY29ubmVjdGlvbiBoYXMgYmVlbiByZWRpcmVjdGVkXG4gICAgICBjb25zdCBzZXJ2ZXIgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5zZXJ2ZXIgOiB0aGlzLmNvbmZpZy5zZXJ2ZXI7XG4gICAgICBjb25zdCBwb3J0ID0gdGhpcy5yb3V0aW5nRGF0YSA/IGA6JHt0aGlzLnJvdXRpbmdEYXRhLnBvcnR9YCA6IGhvc3RQb3N0Zml4O1xuICAgICAgLy8gR3JhYiB0aGUgdGFyZ2V0IGhvc3QgZnJvbSB0aGUgY29ubmVjdGlvbiBjb25maWd1cmF0aW9uLCBhbmQgZnJvbSBhIHJlZGlyZWN0IG1lc3NhZ2VcbiAgICAgIC8vIG90aGVyd2lzZSwgbGVhdmUgdGhlIG1lc3NhZ2UgZW1wdHkuXG4gICAgICBjb25zdCByb3V0aW5nTWVzc2FnZSA9IHRoaXMucm91dGluZ0RhdGEgPyBgIChyZWRpcmVjdGVkIGZyb20gJHt0aGlzLmNvbmZpZy5zZXJ2ZXJ9JHtob3N0UG9zdGZpeH0pYCA6ICcnO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBGYWlsZWQgdG8gY29ubmVjdCB0byAke3NlcnZlcn0ke3BvcnR9JHtyb3V0aW5nTWVzc2FnZX0gLSAke2Vycm9yLm1lc3NhZ2V9YDtcblxuICAgICAgcmV0dXJuIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VTT0NLRVQnLCB7IGNhdXNlOiBlcnJvciB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBDb25uZWN0aW9uIGxvc3QgLSAke2Vycm9yLm1lc3NhZ2V9YDtcbiAgICAgIHJldHVybiBuZXcgQ29ubmVjdGlvbkVycm9yKG1lc3NhZ2UsICdFU09DS0VUJywgeyBjYXVzZTogZXJyb3IgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzb2NrZXRFbmQoKSB7XG4gICAgdGhpcy5kZWJ1Zy5sb2coJ3NvY2tldCBlbmRlZCcpO1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLkZJTkFMKSB7XG4gICAgICBjb25zdCBlcnJvcjogRXJyb3JXaXRoQ29kZSA9IG5ldyBFcnJvcignc29ja2V0IGhhbmcgdXAnKTtcbiAgICAgIGVycm9yLmNvZGUgPSAnRUNPTk5SRVNFVCc7XG5cbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc29ja2V0RXJyb3InLCBlcnJvcik7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIHRoaXMud3JhcFNvY2tldEVycm9yKGVycm9yKSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNvY2tldENsb3NlKCkge1xuICAgIHRoaXMuZGVidWcubG9nKCdjb25uZWN0aW9uIHRvICcgKyB0aGlzLmNvbmZpZy5zZXJ2ZXIgKyAnOicgKyB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgKyAnIGNsb3NlZCcpO1xuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgIHRoaXMuY2xlYW51cENvbm5lY3Rpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc2VuZFByZUxvZ2luKCkge1xuICAgIGNvbnN0IFssIG1ham9yLCBtaW5vciwgYnVpbGRdID0gL14oXFxkKylcXC4oXFxkKylcXC4oXFxkKykvLmV4ZWModmVyc2lvbikgPz8gWycwLjAuMCcsICcwJywgJzAnLCAnMCddO1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgUHJlbG9naW5QYXlsb2FkKHtcbiAgICAgIC8vIElmIGVuY3J5cHQgc2V0dGluZyBpcyBzZXQgdG8gJ3N0cmljdCcsIHRoZW4gd2Ugc2hvdWxkIGhhdmUgYWxyZWFkeSBkb25lIHRoZSBlbmNyeXB0aW9uIGJlZm9yZSBjYWxsaW5nXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uLiBUaGVyZWZvcmUsIHRoZSBlbmNyeXB0IHdpbGwgYmUgc2V0IHRvIGZhbHNlIGhlcmUuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHdpbGwgc2V0IGVuY3J5cHQgaGVyZSBiYXNlZCBvbiB0aGUgZW5jcnlwdCBCb29sZWFuIHZhbHVlIGZyb20gdGhlIGNvbmZpZ3VyYXRpb24uXG4gICAgICBlbmNyeXB0OiB0eXBlb2YgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0ID09PSAnYm9vbGVhbicgJiYgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0LFxuICAgICAgdmVyc2lvbjogeyBtYWpvcjogTnVtYmVyKG1ham9yKSwgbWlub3I6IE51bWJlcihtaW5vciksIGJ1aWxkOiBOdW1iZXIoYnVpbGQpLCBzdWJidWlsZDogMCB9XG4gICAgfSk7XG5cbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLlBSRUxPR0lOLCBwYXlsb2FkLmRhdGEpO1xuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kTG9naW43UGFja2V0KCkge1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgTG9naW43UGF5bG9hZCh7XG4gICAgICB0ZHNWZXJzaW9uOiB2ZXJzaW9uc1t0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb25dLFxuICAgICAgcGFja2V0U2l6ZTogdGhpcy5jb25maWcub3B0aW9ucy5wYWNrZXRTaXplLFxuICAgICAgY2xpZW50UHJvZ1ZlcjogMCxcbiAgICAgIGNsaWVudFBpZDogcHJvY2Vzcy5waWQsXG4gICAgICBjb25uZWN0aW9uSWQ6IDAsXG4gICAgICBjbGllbnRUaW1lWm9uZTogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpLFxuICAgICAgY2xpZW50TGNpZDogMHgwMDAwMDQwOVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBhdXRoZW50aWNhdGlvbiB9ID0gdGhpcy5jb25maWc7XG4gICAgc3dpdGNoIChhdXRoZW50aWNhdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgcGF5bG9hZC5mZWRBdXRoID0ge1xuICAgICAgICAgIHR5cGU6ICdBREFMJyxcbiAgICAgICAgICBlY2hvOiB0aGlzLmZlZEF1dGhSZXF1aXJlZCxcbiAgICAgICAgICB3b3JrZmxvdzogJ2RlZmF1bHQnXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbic6XG4gICAgICAgIHBheWxvYWQuZmVkQXV0aCA9IHtcbiAgICAgICAgICB0eXBlOiAnU0VDVVJJVFlUT0tFTicsXG4gICAgICAgICAgZWNobzogdGhpcy5mZWRBdXRoUmVxdWlyZWQsXG4gICAgICAgICAgZmVkQXV0aFRva2VuOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnRva2VuXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0b2tlbi1jcmVkZW50aWFsJzpcbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJzpcbiAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdCc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgIHBheWxvYWQuZmVkQXV0aCA9IHtcbiAgICAgICAgICB0eXBlOiAnQURBTCcsXG4gICAgICAgICAgZWNobzogdGhpcy5mZWRBdXRoUmVxdWlyZWQsXG4gICAgICAgICAgd29ya2Zsb3c6ICdpbnRlZ3JhdGVkJ1xuICAgICAgICB9O1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbnRsbSc6XG4gICAgICAgIHBheWxvYWQuc3NwaSA9IGNyZWF0ZU5UTE1SZXF1ZXN0KHsgZG9tYWluOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmRvbWFpbiB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHBheWxvYWQudXNlck5hbWUgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lO1xuICAgICAgICBwYXlsb2FkLnBhc3N3b3JkID0gYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZDtcbiAgICB9XG5cbiAgICBwYXlsb2FkLmhvc3RuYW1lID0gdGhpcy5jb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkIHx8IG9zLmhvc3RuYW1lKCk7XG4gICAgcGF5bG9hZC5zZXJ2ZXJOYW1lID0gdGhpcy5yb3V0aW5nRGF0YSA/XG4gICAgICBgJHt0aGlzLnJvdXRpbmdEYXRhLnNlcnZlcn0ke3RoaXMucm91dGluZ0RhdGEuaW5zdGFuY2UgPyAnXFxcXCcgKyB0aGlzLnJvdXRpbmdEYXRhLmluc3RhbmNlIDogJyd9YCA6XG4gICAgICB0aGlzLmNvbmZpZy5zZXJ2ZXI7XG4gICAgcGF5bG9hZC5hcHBOYW1lID0gdGhpcy5jb25maWcub3B0aW9ucy5hcHBOYW1lIHx8ICdUZWRpb3VzJztcbiAgICBwYXlsb2FkLmxpYnJhcnlOYW1lID0gbGlicmFyeU5hbWU7XG4gICAgcGF5bG9hZC5sYW5ndWFnZSA9IHRoaXMuY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2U7XG4gICAgcGF5bG9hZC5kYXRhYmFzZSA9IHRoaXMuY29uZmlnLm9wdGlvbnMuZGF0YWJhc2U7XG4gICAgcGF5bG9hZC5jbGllbnRJZCA9IEJ1ZmZlci5mcm9tKFsxLCAyLCAzLCA0LCA1LCA2XSk7XG5cbiAgICBwYXlsb2FkLnJlYWRPbmx5SW50ZW50ID0gdGhpcy5jb25maWcub3B0aW9ucy5yZWFkT25seUludGVudDtcbiAgICBwYXlsb2FkLmluaXREYkZhdGFsID0gIXRoaXMuY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYjtcblxuICAgIHRoaXMucm91dGluZ0RhdGEgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5MT0dJTjcsIHBheWxvYWQudG9CdWZmZXIoKSk7XG5cbiAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcGF5bG9hZC50b1N0cmluZygnICAnKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc2VuZEZlZEF1dGhUb2tlbk1lc3NhZ2UodG9rZW46IHN0cmluZykge1xuICAgIGNvbnN0IGFjY2Vzc1Rva2VuTGVuID0gQnVmZmVyLmJ5dGVMZW5ndGgodG9rZW4sICd1Y3MyJyk7XG4gICAgY29uc3QgZGF0YSA9IEJ1ZmZlci5hbGxvYyg4ICsgYWNjZXNzVG9rZW5MZW4pO1xuICAgIGxldCBvZmZzZXQgPSAwO1xuICAgIG9mZnNldCA9IGRhdGEud3JpdGVVSW50MzJMRShhY2Nlc3NUb2tlbkxlbiArIDQsIG9mZnNldCk7XG4gICAgb2Zmc2V0ID0gZGF0YS53cml0ZVVJbnQzMkxFKGFjY2Vzc1Rva2VuTGVuLCBvZmZzZXQpO1xuICAgIGRhdGEud3JpdGUodG9rZW4sIG9mZnNldCwgJ3VjczInKTtcbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLkZFREFVVEhfVE9LRU4sIGRhdGEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kSW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBwYXlsb2FkID0gbmV3IFNxbEJhdGNoUGF5bG9hZCh0aGlzLmdldEluaXRpYWxTcWwoKSwgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMpO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKHsgdHlwZTogVFlQRS5TUUxfQkFUQ0ggfSk7XG4gICAgdGhpcy5tZXNzYWdlSW8ub3V0Z29pbmdNZXNzYWdlU3RyZWFtLndyaXRlKG1lc3NhZ2UpO1xuICAgIFJlYWRhYmxlLmZyb20ocGF5bG9hZCkucGlwZShtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0SW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gW107XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9udWxscyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfbnVsbHMgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV93YXJuaW5ncyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpV2FybmluZ3MgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3dhcm5pbmdzIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGNvbmNhdF9udWxsX3lpZWxkc19udWxsIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY29uY2F0X251bGxfeWllbGRzX251bGwgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmaXJzdCAke3RoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0fWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmb3JtYXQgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXR9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy5wdXNoKGBzZXQgbGFuZ3VhZ2UgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlfWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgcXVvdGVkX2lkZW50aWZpZXIgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHF1b3RlZF9pZGVudGlmaWVyIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0ZXh0c2l6ZSAke3RoaXMuY29uZmlnLm9wdGlvbnMudGV4dHNpemV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0cmFuc2FjdGlvbiBpc29sYXRpb24gbGV2ZWwgJHt0aGlzLmdldElzb2xhdGlvbkxldmVsVGV4dCh0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCl9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHhhY3RfYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCB4YWN0X2Fib3J0IG9mZicpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgdGhlIFNRTCBiYXRjaCByZXByZXNlbnRlZCBieSBbW1JlcXVlc3RdXS5cbiAgICogVGhlcmUgaXMgbm8gcGFyYW0gc3VwcG9ydCwgYW5kIHVubGlrZSBbW1JlcXVlc3QuZXhlY1NxbF1dLFxuICAgKiBpdCBpcyBub3QgbGlrZWx5IHRoYXQgU1FMIFNlcnZlciB3aWxsIHJldXNlIHRoZSBleGVjdXRpb24gcGxhbiBpdCBnZW5lcmF0ZXMgZm9yIHRoZSBTUUwuXG4gICAqXG4gICAqIEluIGFsbW9zdCBhbGwgY2FzZXMsIFtbUmVxdWVzdC5leGVjU3FsXV0gd2lsbCBiZSBhIGJldHRlciBjaG9pY2UuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGV4ZWNTcWxCYXRjaChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlNRTF9CQVRDSCwgbmV3IFNxbEJhdGNoUGF5bG9hZChyZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSEsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zKSk7XG4gIH1cblxuICAvKipcbiAgICogIEV4ZWN1dGUgdGhlIFNRTCByZXByZXNlbnRlZCBieSBbW1JlcXVlc3RdXS5cbiAgICpcbiAgICogQXMgYHNwX2V4ZWN1dGVzcWxgIGlzIHVzZWQgdG8gZXhlY3V0ZSB0aGUgU1FMLCBpZiB0aGUgc2FtZSBTUUwgaXMgZXhlY3V0ZWQgbXVsdGlwbGVzIHRpbWVzXG4gICAqIHVzaW5nIHRoaXMgZnVuY3Rpb24sIHRoZSBTUUwgU2VydmVyIHF1ZXJ5IG9wdGltaXplciBpcyBsaWtlbHkgdG8gcmV1c2UgdGhlIGV4ZWN1dGlvbiBwbGFuIGl0IGdlbmVyYXRlc1xuICAgKiBmb3IgdGhlIGZpcnN0IGV4ZWN1dGlvbi4gVGhpcyBtYXkgYWxzbyByZXN1bHQgaW4gU1FMIHNlcnZlciB0cmVhdGluZyB0aGUgcmVxdWVzdCBsaWtlIGEgc3RvcmVkIHByb2NlZHVyZVxuICAgKiB3aGljaCBjYW4gcmVzdWx0IGluIHRoZSBbW0V2ZW50X2RvbmVJblByb2NdXSBvciBbW0V2ZW50X2RvbmVQcm9jXV0gZXZlbnRzIGJlaW5nIGVtaXR0ZWQgaW5zdGVhZCBvZiB0aGVcbiAgICogW1tFdmVudF9kb25lXV0gZXZlbnQgeW91IG1pZ2h0IGV4cGVjdC4gVXNpbmcgW1tleGVjU3FsQmF0Y2hdXSB3aWxsIHByZXZlbnQgdGhpcyBmcm9tIG9jY3VycmluZyBidXQgbWF5IGhhdmUgYSBuZWdhdGl2ZSBwZXJmb3JtYW5jZSBpbXBhY3QuXG4gICAqXG4gICAqIEJld2FyZSBvZiB0aGUgd2F5IHRoYXQgc2NvcGluZyBydWxlcyBhcHBseSwgYW5kIGhvdyB0aGV5IG1heSBbYWZmZWN0IGxvY2FsIHRlbXAgdGFibGVzXShodHRwOi8vd2VibG9ncy5zcWx0ZWFtLmNvbS9tbGFkZW5wL2FyY2hpdmUvMjAwNi8xMS8wMy8xNzE5Ny5hc3B4KVxuICAgKiBJZiB5b3UncmUgcnVubmluZyBpbiB0byBzY29waW5nIGlzc3VlcywgdGhlbiBbW2V4ZWNTcWxCYXRjaF1dIG1heSBiZSBhIGJldHRlciBjaG9pY2UuXG4gICAqIFNlZSBhbHNvIFtpc3N1ZSAjMjRdKGh0dHBzOi8vZ2l0aHViLmNvbS9wZWtpbS90ZWRpb3VzL2lzc3Vlcy8yNClcbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgZXhlY1NxbChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3QudmFsaWRhdGVQYXJhbWV0ZXJzKHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWcubG9nKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdzdGF0ZW1lbnQnLFxuICAgICAgdmFsdWU6IHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICBpZiAocmVxdWVzdC5wYXJhbWV0ZXJzLmxlbmd0aCkge1xuICAgICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgICAgdHlwZTogVFlQRVMuTlZhckNoYXIsXG4gICAgICAgIG5hbWU6ICdwYXJhbXMnLFxuICAgICAgICB2YWx1ZTogcmVxdWVzdC5tYWtlUGFyYW1zUGFyYW1ldGVyKHJlcXVlc3QucGFyYW1ldGVycyksXG4gICAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgICAgfSk7XG5cbiAgICAgIHBhcmFtZXRlcnMucHVzaCguLi5yZXF1ZXN0LnBhcmFtZXRlcnMpO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKFByb2NlZHVyZXMuU3BfRXhlY3V0ZVNxbCwgcGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgbmV3IEJ1bGtMb2FkIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0gdGFibGUgVGhlIG5hbWUgb2YgdGhlIHRhYmxlIHRvIGJ1bGstaW5zZXJ0IGludG8uXG4gICAqIEBwYXJhbSBvcHRpb25zIEEgc2V0IG9mIGJ1bGsgbG9hZCBvcHRpb25zLlxuICAgKi9cbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgY2FsbGJhY2s6IEJ1bGtMb2FkQ2FsbGJhY2spOiBCdWxrTG9hZFxuICBuZXdCdWxrTG9hZCh0YWJsZTogc3RyaW5nLCBvcHRpb25zOiBCdWxrTG9hZE9wdGlvbnMsIGNhbGxiYWNrOiBCdWxrTG9hZENhbGxiYWNrKTogQnVsa0xvYWRcbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgY2FsbGJhY2tPck9wdGlvbnM6IEJ1bGtMb2FkT3B0aW9ucyB8IEJ1bGtMb2FkQ2FsbGJhY2ssIGNhbGxiYWNrPzogQnVsa0xvYWRDYWxsYmFjaykge1xuICAgIGxldCBvcHRpb25zOiBCdWxrTG9hZE9wdGlvbnM7XG5cbiAgICBpZiAoY2FsbGJhY2sgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY2FsbGJhY2sgPSBjYWxsYmFja09yT3B0aW9ucyBhcyBCdWxrTG9hZENhbGxiYWNrO1xuICAgICAgb3B0aW9ucyA9IHt9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gY2FsbGJhY2tPck9wdGlvbnMgYXMgQnVsa0xvYWRPcHRpb25zO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wib3B0aW9uc1wiIGFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgfVxuICAgIHJldHVybiBuZXcgQnVsa0xvYWQodGFibGUsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24sIHRoaXMuY29uZmlnLm9wdGlvbnMsIG9wdGlvbnMsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGEgW1tCdWxrTG9hZF1dLlxuICAgKlxuICAgKiBgYGBqc1xuICAgKiAvLyBXZSB3YW50IHRvIHBlcmZvcm0gYSBidWxrIGxvYWQgaW50byBhIHRhYmxlIHdpdGggdGhlIGZvbGxvd2luZyBmb3JtYXQ6XG4gICAqIC8vIENSRUFURSBUQUJMRSBlbXBsb3llZXMgKGZpcnN0X25hbWUgbnZhcmNoYXIoMjU1KSwgbGFzdF9uYW1lIG52YXJjaGFyKDI1NSksIGRheV9vZl9iaXJ0aCBkYXRlKTtcbiAgICpcbiAgICogY29uc3QgYnVsa0xvYWQgPSBjb25uZWN0aW9uLm5ld0J1bGtMb2FkKCdlbXBsb3llZXMnLCAoZXJyLCByb3dDb3VudCkgPT4ge1xuICAgKiAgIC8vIC4uLlxuICAgKiB9KTtcbiAgICpcbiAgICogLy8gRmlyc3QsIHdlIG5lZWQgdG8gc3BlY2lmeSB0aGUgY29sdW1ucyB0aGF0IHdlIHdhbnQgdG8gd3JpdGUgdG8sXG4gICAqIC8vIGFuZCB0aGVpciBkZWZpbml0aW9ucy4gVGhlc2UgZGVmaW5pdGlvbnMgbXVzdCBtYXRjaCB0aGUgYWN0dWFsIHRhYmxlLFxuICAgKiAvLyBvdGhlcndpc2UgdGhlIGJ1bGsgbG9hZCB3aWxsIGZhaWwuXG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignZmlyc3RfbmFtZScsIFRZUEVTLk5WYXJjaGFyLCB7IG51bGxhYmxlOiBmYWxzZSB9KTtcbiAgICogYnVsa0xvYWQuYWRkQ29sdW1uKCdsYXN0X25hbWUnLCBUWVBFUy5OVmFyY2hhciwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignZGF0ZV9vZl9iaXJ0aCcsIFRZUEVTLkRhdGUsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICAgKlxuICAgKiAvLyBFeGVjdXRlIGEgYnVsayBsb2FkIHdpdGggYSBwcmVkZWZpbmVkIGxpc3Qgb2Ygcm93cy5cbiAgICogLy9cbiAgICogLy8gTm90ZSB0aGF0IHRoZXNlIHJvd3MgYXJlIGhlbGQgaW4gbWVtb3J5IHVudGlsIHRoZVxuICAgKiAvLyBidWxrIGxvYWQgd2FzIHBlcmZvcm1lZCwgc28gaWYgeW91IG5lZWQgdG8gd3JpdGUgYSBsYXJnZVxuICAgKiAvLyBudW1iZXIgb2Ygcm93cyAoZS5nLiBieSByZWFkaW5nIGZyb20gYSBDU1YgZmlsZSksXG4gICAqIC8vIHBhc3NpbmcgYW4gYEFzeW5jSXRlcmFibGVgIGlzIGFkdmlzYWJsZSB0byBrZWVwIG1lbW9yeSB1c2FnZSBsb3cuXG4gICAqIGNvbm5lY3Rpb24uZXhlY0J1bGtMb2FkKGJ1bGtMb2FkLCBbXG4gICAqICAgeyAnZmlyc3RfbmFtZSc6ICdTdGV2ZScsICdsYXN0X25hbWUnOiAnSm9icycsICdkYXlfb2ZfYmlydGgnOiBuZXcgRGF0ZSgnMDItMjQtMTk1NScpIH0sXG4gICAqICAgeyAnZmlyc3RfbmFtZSc6ICdCaWxsJywgJ2xhc3RfbmFtZSc6ICdHYXRlcycsICdkYXlfb2ZfYmlydGgnOiBuZXcgRGF0ZSgnMTAtMjgtMTk1NScpIH1cbiAgICogXSk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gYnVsa0xvYWQgQSBwcmV2aW91c2x5IGNyZWF0ZWQgW1tCdWxrTG9hZF1dLlxuICAgKiBAcGFyYW0gcm93cyBBIFtbSXRlcmFibGVdXSBvciBbW0FzeW5jSXRlcmFibGVdXSB0aGF0IGNvbnRhaW5zIHRoZSByb3dzIHRoYXQgc2hvdWxkIGJlIGJ1bGsgbG9hZGVkLlxuICAgKi9cbiAgZXhlY0J1bGtMb2FkKGJ1bGtMb2FkOiBCdWxrTG9hZCwgcm93czogQXN5bmNJdGVyYWJsZTx1bmtub3duW10gfCB7IFtjb2x1bW5OYW1lOiBzdHJpbmddOiB1bmtub3duIH0+IHwgSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9Pik6IHZvaWRcblxuICBleGVjQnVsa0xvYWQoYnVsa0xvYWQ6IEJ1bGtMb2FkLCByb3dzPzogQXN5bmNJdGVyYWJsZTx1bmtub3duW10gfCB7IFtjb2x1bW5OYW1lOiBzdHJpbmddOiB1bmtub3duIH0+IHwgSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9Pikge1xuICAgIGJ1bGtMb2FkLmV4ZWN1dGlvblN0YXJ0ZWQgPSB0cnVlO1xuXG4gICAgaWYgKHJvd3MpIHtcbiAgICAgIGlmIChidWxrTG9hZC5zdHJlYW1pbmdNb2RlKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvbm5lY3Rpb24uZXhlY0J1bGtMb2FkIGNhbid0IGJlIGNhbGxlZCB3aXRoIGEgQnVsa0xvYWQgdGhhdCB3YXMgcHV0IGluIHN0cmVhbWluZyBtb2RlLlwiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGJ1bGtMb2FkLmZpcnN0Um93V3JpdHRlbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZCBjYW4ndCBiZSBjYWxsZWQgd2l0aCBhIEJ1bGtMb2FkIHRoYXQgYWxyZWFkeSBoYXMgcm93cyB3cml0dGVuIHRvIGl0LlwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgcm93U3RyZWFtID0gUmVhZGFibGUuZnJvbShyb3dzKTtcblxuICAgICAgLy8gRGVzdHJveSB0aGUgcGFja2V0IHRyYW5zZm9ybSBpZiBhbiBlcnJvciBoYXBwZW5zIGluIHRoZSByb3cgc3RyZWFtLFxuICAgICAgLy8gZS5nLiBpZiBhbiBlcnJvciBpcyB0aHJvd24gZnJvbSB3aXRoaW4gYSBnZW5lcmF0b3Igb3Igc3RyZWFtLlxuICAgICAgcm93U3RyZWFtLm9uKCdlcnJvcicsIChlcnIpID0+IHtcbiAgICAgICAgYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0uZGVzdHJveShlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIERlc3Ryb3kgdGhlIHJvdyBzdHJlYW0gaWYgYW4gZXJyb3IgaGFwcGVucyBpbiB0aGUgcGFja2V0IHRyYW5zZm9ybSxcbiAgICAgIC8vIGUuZy4gaWYgdGhlIGJ1bGsgbG9hZCBpcyBjYW5jZWxsZWQuXG4gICAgICBidWxrTG9hZC5yb3dUb1BhY2tldFRyYW5zZm9ybS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIHJvd1N0cmVhbS5kZXN0cm95KGVycik7XG4gICAgICB9KTtcblxuICAgICAgcm93U3RyZWFtLnBpcGUoYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0pO1xuICAgIH0gZWxzZSBpZiAoIWJ1bGtMb2FkLnN0cmVhbWluZ01vZGUpIHtcbiAgICAgIC8vIElmIHRoZSBidWxrbG9hZCB3YXMgbm90IHB1dCBpbnRvIHN0cmVhbWluZyBtb2RlIGJ5IHRoZSB1c2VyLFxuICAgICAgLy8gd2UgZW5kIHRoZSByb3dUb1BhY2tldFRyYW5zZm9ybSBoZXJlIGZvciB0aGVtLlxuICAgICAgLy9cbiAgICAgIC8vIElmIGl0IHdhcyBwdXQgaW50byBzdHJlYW1pbmcgbW9kZSwgaXQncyB0aGUgdXNlcidzIHJlc3BvbnNpYmlsaXR5XG4gICAgICAvLyB0byBlbmQgdGhlIHN0cmVhbS5cbiAgICAgIGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtLmVuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IG9uQ2FuY2VsID0gKCkgPT4ge1xuICAgICAgcmVxdWVzdC5jYW5jZWwoKTtcbiAgICB9O1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IG5ldyBCdWxrTG9hZFBheWxvYWQoYnVsa0xvYWQpO1xuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGJ1bGtMb2FkLmdldEJ1bGtJbnNlcnRTcWwoKSwgKGVycm9yOiAoRXJyb3IgJiB7IGNvZGU/OiBzdHJpbmcgfSkgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICBidWxrTG9hZC5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdVTktOT1dOJykge1xuICAgICAgICAgIGVycm9yLm1lc3NhZ2UgKz0gJyBUaGlzIGlzIGxpa2VseSBiZWNhdXNlIHRoZSBzY2hlbWEgb2YgdGhlIEJ1bGtMb2FkIGRvZXMgbm90IG1hdGNoIHRoZSBzY2hlbWEgb2YgdGhlIHRhYmxlIHlvdSBhcmUgYXR0ZW1wdGluZyB0byBpbnNlcnQgaW50by4nO1xuICAgICAgICB9XG4gICAgICAgIGJ1bGtMb2FkLmVycm9yID0gZXJyb3I7XG4gICAgICAgIGJ1bGtMb2FkLmNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB0aGlzLm1ha2VSZXF1ZXN0KGJ1bGtMb2FkLCBUWVBFLkJVTEtfTE9BRCwgcGF5bG9hZCk7XG4gICAgfSk7XG5cbiAgICBidWxrTG9hZC5vbmNlKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG5cbiAgICB0aGlzLmV4ZWNTcWxCYXRjaChyZXF1ZXN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQcmVwYXJlIHRoZSBTUUwgcmVwcmVzZW50ZWQgYnkgdGhlIHJlcXVlc3QuXG4gICAqXG4gICAqIFRoZSByZXF1ZXN0IGNhbiB0aGVuIGJlIHVzZWQgaW4gc3Vic2VxdWVudCBjYWxscyB0b1xuICAgKiBbW2V4ZWN1dGVdXSBhbmQgW1t1bnByZXBhcmVdXVxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqICAgUGFyYW1ldGVycyBvbmx5IHJlcXVpcmUgYSBuYW1lIGFuZCB0eXBlLiBQYXJhbWV0ZXIgdmFsdWVzIGFyZSBpZ25vcmVkLlxuICAgKi9cbiAgcHJlcGFyZShyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgY29uc3QgcGFyYW1ldGVyczogUGFyYW1ldGVyW10gPSBbXTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5JbnQsXG4gICAgICBuYW1lOiAnaGFuZGxlJyxcbiAgICAgIHZhbHVlOiB1bmRlZmluZWQsXG4gICAgICBvdXRwdXQ6IHRydWUsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgbmFtZTogJ3BhcmFtcycsXG4gICAgICB2YWx1ZTogcmVxdWVzdC5wYXJhbWV0ZXJzLmxlbmd0aCA/IHJlcXVlc3QubWFrZVBhcmFtc1BhcmFtZXRlcihyZXF1ZXN0LnBhcmFtZXRlcnMpIDogbnVsbCxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgbmFtZTogJ3N0bXQnLFxuICAgICAgdmFsdWU6IHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICByZXF1ZXN0LnByZXBhcmluZyA9IHRydWU7XG5cbiAgICAvLyBUT0RPOiBXZSBuZWVkIHRvIGNsZWFuIHVwIHRoaXMgZXZlbnQgaGFuZGxlciwgb3RoZXJ3aXNlIHRoaXMgbGVha3MgbWVtb3J5XG4gICAgcmVxdWVzdC5vbigncmV0dXJuVmFsdWUnLCAobmFtZTogc3RyaW5nLCB2YWx1ZTogYW55KSA9PiB7XG4gICAgICBpZiAobmFtZSA9PT0gJ2hhbmRsZScpIHtcbiAgICAgICAgcmVxdWVzdC5oYW5kbGUgPSB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcXVlc3QuZXJyb3IgPSBuZXcgUmVxdWVzdEVycm9yKGBUZWRpb3VzID4gVW5leHBlY3RlZCBvdXRwdXQgcGFyYW1ldGVyICR7bmFtZX0gZnJvbSBzcF9wcmVwYXJlYCk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZChQcm9jZWR1cmVzLlNwX1ByZXBhcmUsIHBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogUmVsZWFzZSB0aGUgU1FMIFNlcnZlciByZXNvdXJjZXMgYXNzb2NpYXRlZCB3aXRoIGEgcHJldmlvdXNseSBwcmVwYXJlZCByZXF1ZXN0LlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqICAgUGFyYW1ldGVycyBvbmx5IHJlcXVpcmUgYSBuYW1lIGFuZCB0eXBlLlxuICAgKiAgIFBhcmFtZXRlciB2YWx1ZXMgYXJlIGlnbm9yZWQuXG4gICAqL1xuICB1bnByZXBhcmUocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBwYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuSW50LFxuICAgICAgbmFtZTogJ2hhbmRsZScsXG4gICAgICAvLyBUT0RPOiBBYm9ydCBpZiBgcmVxdWVzdC5oYW5kbGVgIGlzIG5vdCBzZXRcbiAgICAgIHZhbHVlOiByZXF1ZXN0LmhhbmRsZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlJQQ19SRVFVRVNULCBuZXcgUnBjUmVxdWVzdFBheWxvYWQoUHJvY2VkdXJlcy5TcF9VbnByZXBhcmUsIHBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBwcmV2aW91c2x5IHByZXBhcmVkIFNRTCwgdXNpbmcgdGhlIHN1cHBsaWVkIHBhcmFtZXRlcnMuXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgcHJldmlvdXNseSBwcmVwYXJlZCBbW1JlcXVlc3RdXS5cbiAgICogQHBhcmFtIHBhcmFtZXRlcnMgIEFuIG9iamVjdCB3aG9zZSBuYW1lcyBjb3JyZXNwb25kIHRvIHRoZSBuYW1lcyBvZlxuICAgKiAgIHBhcmFtZXRlcnMgdGhhdCB3ZXJlIGFkZGVkIHRvIHRoZSBbW1JlcXVlc3RdXSBiZWZvcmUgaXQgd2FzIHByZXBhcmVkLlxuICAgKiAgIFRoZSBvYmplY3QncyB2YWx1ZXMgYXJlIHBhc3NlZCBhcyB0aGUgcGFyYW1ldGVycycgdmFsdWVzIHdoZW4gdGhlXG4gICAqICAgcmVxdWVzdCBpcyBleGVjdXRlZC5cbiAgICovXG4gIGV4ZWN1dGUocmVxdWVzdDogUmVxdWVzdCwgcGFyYW1ldGVycz86IHsgW2tleTogc3RyaW5nXTogdW5rbm93biB9KSB7XG4gICAgY29uc3QgZXhlY3V0ZVBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBleGVjdXRlUGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLkludCxcbiAgICAgIG5hbWU6ICcnLFxuICAgICAgLy8gVE9ETzogQWJvcnQgaWYgYHJlcXVlc3QuaGFuZGxlYCBpcyBub3Qgc2V0XG4gICAgICB2YWx1ZTogcmVxdWVzdC5oYW5kbGUsXG4gICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gcmVxdWVzdC5wYXJhbWV0ZXJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtZXRlciA9IHJlcXVlc3QucGFyYW1ldGVyc1tpXTtcblxuICAgICAgICBleGVjdXRlUGFyYW1ldGVycy5wdXNoKHtcbiAgICAgICAgICAuLi5wYXJhbWV0ZXIsXG4gICAgICAgICAgdmFsdWU6IHBhcmFtZXRlci50eXBlLnZhbGlkYXRlKHBhcmFtZXRlcnMgPyBwYXJhbWV0ZXJzW3BhcmFtZXRlci5uYW1lXSA6IG51bGwsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWcubG9nKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlJQQ19SRVFVRVNULCBuZXcgUnBjUmVxdWVzdFBheWxvYWQoUHJvY2VkdXJlcy5TcF9FeGVjdXRlLCBleGVjdXRlUGFyYW1ldGVycywgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMsIHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIGEgc3RvcmVkIHByb2NlZHVyZSByZXByZXNlbnRlZCBieSBbW1JlcXVlc3RdXS5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKi9cbiAgY2FsbFByb2NlZHVyZShyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3QudmFsaWRhdGVQYXJhbWV0ZXJzKHRoaXMuZGF0YWJhc2VDb2xsYXRpb24pO1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIHJlcXVlc3QuZXJyb3IgPSBlcnJvcjtcblxuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuZGVidWcubG9nKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycm9yKTtcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlJQQ19SRVFVRVNULCBuZXcgUnBjUmVxdWVzdFBheWxvYWQocmVxdWVzdC5zcWxUZXh0T3JQcm9jZWR1cmUhLCByZXF1ZXN0LnBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogU3RhcnQgYSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBuYW1lIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIG5hbWUgdG8gYXNzb2NpYXRlIHdpdGggdGhlIHRyYW5zYWN0aW9uLlxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gYW4gZW1wdHkgc3RyaW5nLiBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGBcbiAgICogICBpcyBwcmVzZW50LlxuICAgKiBAcGFyYW0gaXNvbGF0aW9uTGV2ZWwgVGhlIGlzb2xhdGlvbiBsZXZlbCB0aGF0IHRoZSB0cmFuc2FjdGlvbiBpcyB0byBiZSBydW4gd2l0aC5cbiAgICpcbiAgICogICBUaGUgaXNvbGF0aW9uIGxldmVscyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5JU09MQVRJT05fTEVWRUxgLlxuICAgKiAgICogYFJFQURfVU5DT01NSVRURURgXG4gICAqICAgKiBgUkVBRF9DT01NSVRURURgXG4gICAqICAgKiBgUkVQRUFUQUJMRV9SRUFEYFxuICAgKiAgICogYFNFUklBTElaQUJMRWBcbiAgICogICAqIGBTTkFQU0hPVGBcbiAgICpcbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIHRoZSBDb25uZWN0aW9uJ3MgaXNvbGF0aW9uIGxldmVsLlxuICAgKi9cbiAgYmVnaW5UcmFuc2FjdGlvbihjYWxsYmFjazogQmVnaW5UcmFuc2FjdGlvbkNhbGxiYWNrLCBuYW1lID0gJycsIGlzb2xhdGlvbkxldmVsID0gdGhpcy5jb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCkge1xuICAgIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwoaXNvbGF0aW9uTGV2ZWwsICdpc29sYXRpb25MZXZlbCcpO1xuXG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSwgaXNvbGF0aW9uTGV2ZWwpO1xuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1NFVCBUUkFOU0FDVElPTiBJU09MQVRJT04gTEVWRUwgJyArICh0cmFuc2FjdGlvbi5pc29sYXRpb25MZXZlbFRvVFNRTCgpKSArICc7QkVHSU4gVFJBTiAnICsgdHJhbnNhY3Rpb24ubmFtZSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGgrKztcbiAgICAgICAgaWYgKHRoaXMudHJhbnNhY3Rpb25EZXB0aCA9PT0gMSkge1xuICAgICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCAoZXJyKSA9PiB7XG4gICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5iZWdpblBheWxvYWQodGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21taXQgYSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogVGhlcmUgc2hvdWxkIGJlIGFuIGFjdGl2ZSB0cmFuc2FjdGlvbiAtIHRoYXQgaXMsIFtbYmVnaW5UcmFuc2FjdGlvbl1dXG4gICAqIHNob3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy4gUmVxdWlyZWQgd2hlbiBgaXNvbGF0aW9uTGV2ZWxgaXMgcHJlc2VudC5cbiAgICovXG4gIGNvbW1pdFRyYW5zYWN0aW9uKGNhbGxiYWNrOiBDb21taXRUcmFuc2FjdGlvbkNhbGxiYWNrLCBuYW1lID0gJycpIHtcbiAgICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbihuYW1lKTtcbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWNTcWxCYXRjaChuZXcgUmVxdWVzdCgnQ09NTUlUIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoLS07XG4gICAgICAgIGlmICh0aGlzLnRyYW5zYWN0aW9uRGVwdGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh1bmRlZmluZWQsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlRSQU5TQUNUSU9OX01BTkFHRVIsIHRyYW5zYWN0aW9uLmNvbW1pdFBheWxvYWQodGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSb2xsYmFjayBhIHRyYW5zYWN0aW9uLlxuICAgKlxuICAgKiBUaGVyZSBzaG91bGQgYmUgYW4gYWN0aXZlIHRyYW5zYWN0aW9uIC0gdGhhdCBpcywgW1tiZWdpblRyYW5zYWN0aW9uXV1cbiAgICogc2hvdWxkIGhhdmUgYmVlbiBwcmV2aW91c2x5IGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqIEBwYXJhbSBuYW1lIEEgc3RyaW5nIHJlcHJlc2VudGluZyBhIG5hbWUgdG8gYXNzb2NpYXRlIHdpdGggdGhlIHRyYW5zYWN0aW9uLlxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gYW4gZW1wdHkgc3RyaW5nLlxuICAgKiAgIFJlcXVpcmVkIHdoZW4gYGlzb2xhdGlvbkxldmVsYCBpcyBwcmVzZW50LlxuICAgKi9cbiAgcm9sbGJhY2tUcmFuc2FjdGlvbihjYWxsYmFjazogUm9sbGJhY2tUcmFuc2FjdGlvbkNhbGxiYWNrLCBuYW1lID0gJycpIHtcbiAgICBjb25zdCB0cmFuc2FjdGlvbiA9IG5ldyBUcmFuc2FjdGlvbihuYW1lKTtcbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWNTcWxCYXRjaChuZXcgUmVxdWVzdCgnUk9MTEJBQ0sgVFJBTiAnICsgdHJhbnNhY3Rpb24ubmFtZSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGgtLTtcbiAgICAgICAgaWYgKHRoaXMudHJhbnNhY3Rpb25EZXB0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh1bmRlZmluZWQsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlRSQU5TQUNUSU9OX01BTkFHRVIsIHRyYW5zYWN0aW9uLnJvbGxiYWNrUGF5bG9hZCh0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBhIHNhdmVwb2ludCB3aXRoaW4gYSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogVGhlcmUgc2hvdWxkIGJlIGFuIGFjdGl2ZSB0cmFuc2FjdGlvbiAtIHRoYXQgaXMsIFtbYmVnaW5UcmFuc2FjdGlvbl1dXG4gICAqIHNob3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cXFxuICAgKiAgIE9wdGlvbmFsLCBhbmQgZGVmYXVsdHMgdG8gYW4gZW1wdHkgc3RyaW5nLlxuICAgKiAgIFJlcXVpcmVkIHdoZW4gYGlzb2xhdGlvbkxldmVsYCBpcyBwcmVzZW50LlxuICAgKi9cbiAgc2F2ZVRyYW5zYWN0aW9uKGNhbGxiYWNrOiBTYXZlVHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSk7XG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1NBVkUgVFJBTiAnICsgdHJhbnNhY3Rpb24ubmFtZSwgKGVycikgPT4ge1xuICAgICAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGgrKztcbiAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVuZGVmaW5lZCwgY2FsbGJhY2spO1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuVFJBTlNBQ1RJT05fTUFOQUdFUiwgdHJhbnNhY3Rpb24uc2F2ZVBheWxvYWQodGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gdGhlIGdpdmVuIGNhbGxiYWNrIGFmdGVyIHN0YXJ0aW5nIGEgdHJhbnNhY3Rpb24sIGFuZCBjb21taXQgb3JcbiAgICogcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uIGFmdGVyd2FyZHMuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBoZWxwZXIgdGhhdCBlbXBsb3lzIFtbYmVnaW5UcmFuc2FjdGlvbl1dLCBbW2NvbW1pdFRyYW5zYWN0aW9uXV0sXG4gICAqIFtbcm9sbGJhY2tUcmFuc2FjdGlvbl1dLCBhbmQgW1tzYXZlVHJhbnNhY3Rpb25dXSB0byBncmVhdGx5IHNpbXBsaWZ5IHRoZVxuICAgKiB1c2Ugb2YgZGF0YWJhc2UgdHJhbnNhY3Rpb25zIGFuZCBhdXRvbWF0aWNhbGx5IGhhbmRsZSB0cmFuc2FjdGlvbiBuZXN0aW5nLlxuICAgKlxuICAgKiBAcGFyYW0gY2JcbiAgICogQHBhcmFtIGlzb2xhdGlvbkxldmVsXG4gICAqICAgVGhlIGlzb2xhdGlvbiBsZXZlbCB0aGF0IHRoZSB0cmFuc2FjdGlvbiBpcyB0byBiZSBydW4gd2l0aC5cbiAgICpcbiAgICogICBUaGUgaXNvbGF0aW9uIGxldmVscyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5JU09MQVRJT05fTEVWRUxgLlxuICAgKiAgICogYFJFQURfVU5DT01NSVRURURgXG4gICAqICAgKiBgUkVBRF9DT01NSVRURURgXG4gICAqICAgKiBgUkVQRUFUQUJMRV9SRUFEYFxuICAgKiAgICogYFNFUklBTElaQUJMRWBcbiAgICogICAqIGBTTkFQU0hPVGBcbiAgICpcbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIHRoZSBDb25uZWN0aW9uJ3MgaXNvbGF0aW9uIGxldmVsLlxuICAgKi9cbiAgdHJhbnNhY3Rpb24oY2I6IChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgdHhEb25lPzogPFQgZXh0ZW5kcyBUcmFuc2FjdGlvbkRvbmVDYWxsYmFjaz4oZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIGRvbmU6IFQsIC4uLmFyZ3M6IENhbGxiYWNrUGFyYW1ldGVyczxUPikgPT4gdm9pZCkgPT4gdm9pZCwgaXNvbGF0aW9uTGV2ZWw/OiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMW2tleW9mIHR5cGVvZiBJU09MQVRJT05fTEVWRUxdKSB7XG4gICAgaWYgKHR5cGVvZiBjYiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYGNiYCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG5cbiAgICBjb25zdCB1c2VTYXZlcG9pbnQgPSB0aGlzLmluVHJhbnNhY3Rpb247XG4gICAgY29uc3QgbmFtZSA9ICdfdGVkaW91c18nICsgKGNyeXB0by5yYW5kb21CeXRlcygxMCkudG9TdHJpbmcoJ2hleCcpKTtcbiAgICBjb25zdCB0eERvbmU6IDxUIGV4dGVuZHMgVHJhbnNhY3Rpb25Eb25lQ2FsbGJhY2s+KGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCBkb25lOiBULCAuLi5hcmdzOiBDYWxsYmFja1BhcmFtZXRlcnM8VD4pID0+IHZvaWQgPSAoZXJyLCBkb25lLCAuLi5hcmdzKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIGlmICh0aGlzLmluVHJhbnNhY3Rpb24gJiYgdGhpcy5zdGF0ZSA9PT0gdGhpcy5TVEFURS5MT0dHRURfSU4pIHtcbiAgICAgICAgICB0aGlzLnJvbGxiYWNrVHJhbnNhY3Rpb24oKHR4RXJyKSA9PiB7XG4gICAgICAgICAgICBkb25lKHR4RXJyIHx8IGVyciwgLi4uYXJncyk7XG4gICAgICAgICAgfSwgbmFtZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZG9uZShlcnIsIC4uLmFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHVzZVNhdmVwb2ludCkge1xuICAgICAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgICAgICB0aGlzLnRyYW5zYWN0aW9uRGVwdGgtLTtcbiAgICAgICAgfVxuICAgICAgICBkb25lKG51bGwsIC4uLmFyZ3MpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jb21taXRUcmFuc2FjdGlvbigodHhFcnIpID0+IHtcbiAgICAgICAgICBkb25lKHR4RXJyLCAuLi5hcmdzKTtcbiAgICAgICAgfSwgbmFtZSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGlmICh1c2VTYXZlcG9pbnQpIHtcbiAgICAgIHJldHVybiB0aGlzLnNhdmVUcmFuc2FjdGlvbigoZXJyKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICByZXR1cm4gY2IoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc29sYXRpb25MZXZlbCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmV4ZWNTcWxCYXRjaChuZXcgUmVxdWVzdCgnU0VUIHRyYW5zYWN0aW9uIGlzb2xhdGlvbiBsZXZlbCAnICsgdGhpcy5nZXRJc29sYXRpb25MZXZlbFRleHQoaXNvbGF0aW9uTGV2ZWwpLCAoZXJyKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gY2IoZXJyLCB0eERvbmUpO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gY2IobnVsbCwgdHhEb25lKTtcbiAgICAgICAgfVxuICAgICAgfSwgbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmJlZ2luVHJhbnNhY3Rpb24oKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNiKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2IobnVsbCwgdHhEb25lKTtcbiAgICAgIH0sIG5hbWUsIGlzb2xhdGlvbkxldmVsKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIG1ha2VSZXF1ZXN0KHJlcXVlc3Q6IFJlcXVlc3QgfCBCdWxrTG9hZCwgcGFja2V0VHlwZTogbnVtYmVyLCBwYXlsb2FkOiAoSXRlcmFibGU8QnVmZmVyPiB8IEFzeW5jSXRlcmFibGU8QnVmZmVyPikgJiB7IHRvU3RyaW5nOiAoaW5kZW50Pzogc3RyaW5nKSA9PiBzdHJpbmcgfSkge1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLkxPR0dFRF9JTikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9ICdSZXF1ZXN0cyBjYW4gb25seSBiZSBtYWRlIGluIHRoZSAnICsgdGhpcy5TVEFURS5MT0dHRURfSU4ubmFtZSArICcgc3RhdGUsIG5vdCB0aGUgJyArIHRoaXMuc3RhdGUubmFtZSArICcgc3RhdGUnO1xuICAgICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgICByZXF1ZXN0LmNhbGxiYWNrKG5ldyBSZXF1ZXN0RXJyb3IobWVzc2FnZSwgJ0VJTlZBTElEU1RBVEUnKSk7XG4gICAgfSBlbHNlIGlmIChyZXF1ZXN0LmNhbmNlbGVkKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKCdDYW5jZWxlZC4nLCAnRUNBTkNFTCcpKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocGFja2V0VHlwZSA9PT0gVFlQRS5TUUxfQkFUQ0gpIHtcbiAgICAgICAgdGhpcy5pc1NxbEJhdGNoID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuaXNTcWxCYXRjaCA9IGZhbHNlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgICAgcmVxdWVzdC5jb25uZWN0aW9uISA9IHRoaXM7XG4gICAgICByZXF1ZXN0LnJvd0NvdW50ISA9IDA7XG4gICAgICByZXF1ZXN0LnJvd3MhID0gW107XG4gICAgICByZXF1ZXN0LnJzdCEgPSBbXTtcblxuICAgICAgY29uc3Qgb25DYW5jZWwgPSAoKSA9PiB7XG4gICAgICAgIHBheWxvYWRTdHJlYW0udW5waXBlKG1lc3NhZ2UpO1xuICAgICAgICBwYXlsb2FkU3RyZWFtLmRlc3Ryb3kobmV3IFJlcXVlc3RFcnJvcignQ2FuY2VsZWQuJywgJ0VDQU5DRUwnKSk7XG5cbiAgICAgICAgLy8gc2V0IHRoZSBpZ25vcmUgYml0IGFuZCBlbmQgdGhlIG1lc3NhZ2UuXG4gICAgICAgIG1lc3NhZ2UuaWdub3JlID0gdHJ1ZTtcbiAgICAgICAgbWVzc2FnZS5lbmQoKTtcblxuICAgICAgICBpZiAocmVxdWVzdCBpbnN0YW5jZW9mIFJlcXVlc3QgJiYgcmVxdWVzdC5wYXVzZWQpIHtcbiAgICAgICAgICAvLyByZXN1bWUgdGhlIHJlcXVlc3QgaWYgaXQgd2FzIHBhdXNlZCBzbyB3ZSBjYW4gcmVhZCB0aGUgcmVtYWluaW5nIHRva2Vuc1xuICAgICAgICAgIHJlcXVlc3QucmVzdW1lKCk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHJlcXVlc3Qub25jZSgnY2FuY2VsJywgb25DYW5jZWwpO1xuXG4gICAgICB0aGlzLmNyZWF0ZVJlcXVlc3RUaW1lcigpO1xuXG4gICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2UoeyB0eXBlOiBwYWNrZXRUeXBlLCByZXNldENvbm5lY3Rpb246IHRoaXMucmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCB9KTtcbiAgICAgIHRoaXMubWVzc2FnZUlvLm91dGdvaW5nTWVzc2FnZVN0cmVhbS53cml0ZShtZXNzYWdlKTtcbiAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9DTElFTlRfUkVRVUVTVCk7XG5cbiAgICAgIG1lc3NhZ2Uub25jZSgnZmluaXNoJywgKCkgPT4ge1xuICAgICAgICByZXF1ZXN0LnJlbW92ZUxpc3RlbmVyKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgICAgIHJlcXVlc3Qub25jZSgnY2FuY2VsJywgdGhpcy5fY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudCk7XG5cbiAgICAgICAgdGhpcy5yZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0ID0gZmFsc2U7XG4gICAgICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gcGF5bG9hZCEudG9TdHJpbmcoJyAgJyk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHBheWxvYWRTdHJlYW0gPSBSZWFkYWJsZS5mcm9tKHBheWxvYWQpO1xuICAgICAgcGF5bG9hZFN0cmVhbS5vbmNlKCdlcnJvcicsIChlcnJvcikgPT4ge1xuICAgICAgICBwYXlsb2FkU3RyZWFtLnVucGlwZShtZXNzYWdlKTtcblxuICAgICAgICAvLyBPbmx5IHNldCBhIHJlcXVlc3QgZXJyb3IgaWYgbm8gZXJyb3Igd2FzIHNldCB5ZXQuXG4gICAgICAgIHJlcXVlc3QuZXJyb3IgPz89IGVycm9yO1xuXG4gICAgICAgIG1lc3NhZ2UuaWdub3JlID0gdHJ1ZTtcbiAgICAgICAgbWVzc2FnZS5lbmQoKTtcbiAgICAgIH0pO1xuICAgICAgcGF5bG9hZFN0cmVhbS5waXBlKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYW5jZWwgY3VycmVudGx5IGV4ZWN1dGVkIHJlcXVlc3QuXG4gICAqL1xuICBjYW5jZWwoKSB7XG4gICAgaWYgKCF0aGlzLnJlcXVlc3QpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5yZXF1ZXN0LmNhbmNlbGVkKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdGhpcy5yZXF1ZXN0LmNhbmNlbCgpO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IHRoZSBjb25uZWN0aW9uIHRvIGl0cyBpbml0aWFsIHN0YXRlLlxuICAgKiBDYW4gYmUgdXNlZnVsIGZvciBjb25uZWN0aW9uIHBvb2wgaW1wbGVtZW50YXRpb25zLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICovXG4gIHJlc2V0KGNhbGxiYWNrOiBSZXNldENhbGxiYWNrKSB7XG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHRoaXMuZ2V0SW5pdGlhbFNxbCgpLCAoZXJyKSA9PiB7XG4gICAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicpIHtcbiAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuICAgIHRoaXMucmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCA9IHRydWU7XG4gICAgdGhpcy5leGVjU3FsQmF0Y2gocmVxdWVzdCk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSB7XG4gICAgcmV0dXJuIHRoaXMudHJhbnNhY3Rpb25EZXNjcmlwdG9yc1t0aGlzLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnMubGVuZ3RoIC0gMV07XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGdldElzb2xhdGlvbkxldmVsVGV4dChpc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXSkge1xuICAgIHN3aXRjaCAoaXNvbGF0aW9uTGV2ZWwpIHtcbiAgICAgIGNhc2UgSVNPTEFUSU9OX0xFVkVMLlJFQURfVU5DT01NSVRURUQ6XG4gICAgICAgIHJldHVybiAncmVhZCB1bmNvbW1pdHRlZCc7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5SRVBFQVRBQkxFX1JFQUQ6XG4gICAgICAgIHJldHVybiAncmVwZWF0YWJsZSByZWFkJztcbiAgICAgIGNhc2UgSVNPTEFUSU9OX0xFVkVMLlNFUklBTElaQUJMRTpcbiAgICAgICAgcmV0dXJuICdzZXJpYWxpemFibGUnO1xuICAgICAgY2FzZSBJU09MQVRJT05fTEVWRUwuU05BUFNIT1Q6XG4gICAgICAgIHJldHVybiAnc25hcHNob3QnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdyZWFkIGNvbW1pdHRlZCc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBwZXJmb3JtVGxzTmVnb3RpYXRpb24ocHJlbG9naW5QYXlsb2FkOiBQcmVsb2dpblBheWxvYWQsIHNpZ25hbDogQWJvcnRTaWduYWwpIHtcbiAgICBzaWduYWwudGhyb3dJZkFib3J0ZWQoKTtcblxuICAgIGNvbnN0IHsgcHJvbWlzZTogc2lnbmFsQWJvcnRlZCwgcmVqZWN0IH0gPSB3aXRoUmVzb2x2ZXJzPG5ldmVyPigpO1xuXG4gICAgY29uc3Qgb25BYm9ydCA9ICgpID0+IHsgcmVqZWN0KHNpZ25hbC5yZWFzb24pOyB9O1xuICAgIHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQWJvcnQsIHsgb25jZTogdHJ1ZSB9KTtcblxuICAgIHRyeSB7XG4gICAgICBpZiAocHJlbG9naW5QYXlsb2FkLmZlZEF1dGhSZXF1aXJlZCA9PT0gMSkge1xuICAgICAgICB0aGlzLmZlZEF1dGhSZXF1aXJlZCA9IHRydWU7XG4gICAgICB9XG4gICAgICBpZiAoJ3N0cmljdCcgIT09IHRoaXMuY29uZmlnLm9wdGlvbnMuZW5jcnlwdCAmJiAocHJlbG9naW5QYXlsb2FkLmVuY3J5cHRpb25TdHJpbmcgPT09ICdPTicgfHwgcHJlbG9naW5QYXlsb2FkLmVuY3J5cHRpb25TdHJpbmcgPT09ICdSRVEnKSkge1xuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLm9wdGlvbnMuZW5jcnlwdCkge1xuICAgICAgICAgIHRocm93IG5ldyBDb25uZWN0aW9uRXJyb3IoXCJTZXJ2ZXIgcmVxdWlyZXMgZW5jcnlwdGlvbiwgc2V0ICdlbmNyeXB0JyBjb25maWcgb3B0aW9uIHRvIHRydWUuXCIsICdFRU5DUllQVCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX1RMU1NTTE5FR09USUFUSU9OKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VJby5zdGFydFRscyh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zLCB0aGlzLmNvbmZpZy5vcHRpb25zLnNlcnZlck5hbWUgPyB0aGlzLmNvbmZpZy5vcHRpb25zLnNlcnZlck5hbWUgOiB0aGlzLnJvdXRpbmdEYXRhPy5zZXJ2ZXIgPz8gdGhpcy5jb25maWcuc2VydmVyLCB0aGlzLmNvbmZpZy5vcHRpb25zLnRydXN0U2VydmVyQ2VydGlmaWNhdGUpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIHRocm93IHRoaXMud3JhcFNvY2tldEVycm9yKGVycik7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc2lnbmFsQWJvcnRlZFxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVhZFByZWxvZ2luUmVzcG9uc2Uoc2lnbmFsOiBBYm9ydFNpZ25hbCk6IFByb21pc2U8UHJlbG9naW5QYXlsb2FkPiB7XG4gICAgc2lnbmFsLnRocm93SWZBYm9ydGVkKCk7XG5cbiAgICBsZXQgbWVzc2FnZUJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcblxuICAgIGNvbnN0IHsgcHJvbWlzZTogc2lnbmFsQWJvcnRlZCwgcmVqZWN0IH0gPSB3aXRoUmVzb2x2ZXJzPG5ldmVyPigpO1xuXG4gICAgY29uc3Qgb25BYm9ydCA9ICgpID0+IHsgcmVqZWN0KHNpZ25hbC5yZWFzb24pOyB9O1xuICAgIHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQWJvcnQsIHsgb25jZTogdHJ1ZSB9KTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgdGhyb3cgdGhpcy53cmFwU29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfSksXG4gICAgICAgIHNpZ25hbEFib3J0ZWRcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCBpdGVyYXRvciA9IG1lc3NhZ2VbU3ltYm9sLmFzeW5jSXRlcmF0b3JdKCk7XG4gICAgICB0cnkge1xuICAgICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICAgIGNvbnN0IHsgZG9uZSwgdmFsdWUgfSA9IGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgICAgICAgICBpdGVyYXRvci5uZXh0KCksXG4gICAgICAgICAgICBzaWduYWxBYm9ydGVkXG4gICAgICAgICAgXSk7XG5cbiAgICAgICAgICBpZiAoZG9uZSkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbWVzc2FnZUJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoW21lc3NhZ2VCdWZmZXIsIHZhbHVlXSk7XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5yZXR1cm4pIHtcbiAgICAgICAgICBhd2FpdCBpdGVyYXRvci5yZXR1cm4oKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICBzaWduYWwucmVtb3ZlRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0KTtcbiAgICB9XG5cbiAgICBjb25zdCBwcmVsb2dpblBheWxvYWQgPSBuZXcgUHJlbG9naW5QYXlsb2FkKG1lc3NhZ2VCdWZmZXIpO1xuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwcmVsb2dpblBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHByZWxvZ2luUGF5bG9hZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgcGVyZm9ybVJlUm91dGluZygpIHtcbiAgICB0aGlzLnNvY2tldCEucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgdGhpcy5fb25Tb2NrZXRFcnJvcik7XG4gICAgdGhpcy5zb2NrZXQhLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIHRoaXMuX29uU29ja2V0Q2xvc2UpO1xuICAgIHRoaXMuc29ja2V0IS5yZW1vdmVMaXN0ZW5lcignZW5kJywgdGhpcy5fb25Tb2NrZXRFbmQpO1xuICAgIHRoaXMuc29ja2V0IS5kZXN0cm95KCk7XG5cbiAgICB0aGlzLmRlYnVnLmxvZygnY29ubmVjdGlvbiB0byAnICsgdGhpcy5jb25maWcuc2VydmVyICsgJzonICsgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ICsgJyBjbG9zZWQnKTtcblxuICAgIHRoaXMuZW1pdCgncmVyb3V0aW5nJyk7XG4gICAgdGhpcy5kZWJ1Zy5sb2coJ1Jlcm91dGluZyB0byAnICsgdGhpcy5yb3V0aW5nRGF0YSEuc2VydmVyICsgJzonICsgdGhpcy5yb3V0aW5nRGF0YSEucG9ydCk7XG5cbiAgICAvLyBBdHRlbXB0IGNvbm5lY3RpbmcgdG8gdGhlIHJlcm91dGluZyB0YXJnZXRcbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkNPTk5FQ1RJTkcpO1xuICAgIGF3YWl0IHRoaXMuaW5pdGlhbGlzZUNvbm5lY3Rpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgcGVyZm9ybVRyYW5zaWVudEZhaWx1cmVSZXRyeSgpIHtcbiAgICB0aGlzLmN1clRyYW5zaWVudFJldHJ5Q291bnQrKztcblxuICAgIHRoaXMuc29ja2V0IS5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9vblNvY2tldEVycm9yKTtcbiAgICB0aGlzLnNvY2tldCEucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgdGhpcy5fb25Tb2NrZXRDbG9zZSk7XG4gICAgdGhpcy5zb2NrZXQhLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCB0aGlzLl9vblNvY2tldEVuZCk7XG4gICAgdGhpcy5zb2NrZXQhLmRlc3Ryb3koKTtcblxuICAgIHRoaXMuZGVidWcubG9nKCdjb25uZWN0aW9uIHRvICcgKyB0aGlzLmNvbmZpZy5zZXJ2ZXIgKyAnOicgKyB0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnQgKyAnIGNsb3NlZCcpO1xuXG4gICAgY29uc3Qgc2VydmVyID0gdGhpcy5yb3V0aW5nRGF0YSA/IHRoaXMucm91dGluZ0RhdGEuc2VydmVyIDogdGhpcy5jb25maWcuc2VydmVyO1xuICAgIGNvbnN0IHBvcnQgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5wb3J0IDogdGhpcy5jb25maWcub3B0aW9ucy5wb3J0O1xuICAgIHRoaXMuZGVidWcubG9nKCdSZXRyeSBhZnRlciB0cmFuc2llbnQgZmFpbHVyZSBjb25uZWN0aW5nIHRvICcgKyBzZXJ2ZXIgKyAnOicgKyBwb3J0KTtcblxuICAgIGNvbnN0IHsgcHJvbWlzZSwgcmVzb2x2ZSB9ID0gd2l0aFJlc29sdmVyczx2b2lkPigpO1xuICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCk7XG4gICAgYXdhaXQgcHJvbWlzZTtcblxuICAgIHRoaXMuZW1pdCgncmV0cnknKTtcbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkNPTk5FQ1RJTkcpO1xuICAgIGF3YWl0IHRoaXMuaW5pdGlhbGlzZUNvbm5lY3Rpb24oKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgYXN5bmMgcGVyZm9ybVNlbnRMb2dpbjdXaXRoU3RhbmRhcmRMb2dpbihzaWduYWw6IEFib3J0U2lnbmFsKTogUHJvbWlzZTxSb3V0aW5nRGF0YSB8IHVuZGVmaW5lZD4ge1xuICAgIHNpZ25hbC50aHJvd0lmQWJvcnRlZCgpO1xuXG4gICAgY29uc3QgeyBwcm9taXNlOiBzaWduYWxBYm9ydGVkLCByZWplY3QgfSA9IHdpdGhSZXNvbHZlcnM8bmV2ZXI+KCk7XG5cbiAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4geyByZWplY3Qoc2lnbmFsLnJlYXNvbik7IH07XG4gICAgc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCwgeyBvbmNlOiB0cnVlIH0pO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgICB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICB0aHJvdyB0aGlzLndyYXBTb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9KSxcbiAgICAgICAgc2lnbmFsQWJvcnRlZFxuICAgICAgXSk7XG5cbiAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgTG9naW43VG9rZW5IYW5kbGVyKHRoaXMpO1xuICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIGhhbmRsZXIpO1xuICAgICAgYXdhaXQgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpO1xuXG4gICAgICBpZiAoaGFuZGxlci5sb2dpbkFja1JlY2VpdmVkKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLnJvdXRpbmdEYXRhO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmxvZ2luRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5sb2dpbkVycm9yO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5sb2dpbkVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBwZXJmb3JtU2VudExvZ2luN1dpdGhOVExNTG9naW4oc2lnbmFsOiBBYm9ydFNpZ25hbCk6IFByb21pc2U8Um91dGluZ0RhdGEgfCB1bmRlZmluZWQ+IHtcbiAgICBzaWduYWwudGhyb3dJZkFib3J0ZWQoKTtcblxuICAgIGNvbnN0IHsgcHJvbWlzZTogc2lnbmFsQWJvcnRlZCwgcmVqZWN0IH0gPSB3aXRoUmVzb2x2ZXJzPG5ldmVyPigpO1xuXG4gICAgY29uc3Qgb25BYm9ydCA9ICgpID0+IHsgcmVqZWN0KHNpZ25hbC5yZWFzb24pOyB9O1xuICAgIHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQWJvcnQsIHsgb25jZTogdHJ1ZSB9KTtcblxuICAgIHRyeSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIHRocm93IHRoaXMud3JhcFNvY2tldEVycm9yKGVycik7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc2lnbmFsQWJvcnRlZFxuICAgICAgICBdKTtcblxuICAgICAgICBjb25zdCBoYW5kbGVyID0gbmV3IExvZ2luN1Rva2VuSGFuZGxlcih0aGlzKTtcbiAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIGhhbmRsZXIpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgICAgIG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKSxcbiAgICAgICAgICBzaWduYWxBYm9ydGVkXG4gICAgICAgIF0pO1xuXG4gICAgICAgIGlmIChoYW5kbGVyLmxvZ2luQWNrUmVjZWl2ZWQpIHtcbiAgICAgICAgICByZXR1cm4gaGFuZGxlci5yb3V0aW5nRGF0YTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm50bG1wYWNrZXQpIHtcbiAgICAgICAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IHRoaXMuY29uZmlnLmF1dGhlbnRpY2F0aW9uIGFzIE50bG1BdXRoZW50aWNhdGlvbjtcblxuICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgTlRMTVJlc3BvbnNlUGF5bG9hZCh7XG4gICAgICAgICAgICBkb21haW46IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuZG9tYWluLFxuICAgICAgICAgICAgdXNlck5hbWU6IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgIG50bG1wYWNrZXQ6IHRoaXMubnRsbXBhY2tldFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5OVExNQVVUSF9QS1QsIHBheWxvYWQuZGF0YSk7XG4gICAgICAgICAgdGhpcy5kZWJ1Zy5wYXlsb2FkKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIHBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB0aGlzLm50bG1wYWNrZXQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5sb2dpbkVycm9yKSB7XG4gICAgICAgICAgdGhyb3cgdGhpcy5sb2dpbkVycm9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBDb25uZWN0aW9uRXJyb3IoJ0xvZ2luIGZhaWxlZC4nLCAnRUxPR0lOJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5sb2dpbkVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBwZXJmb3JtU2VudExvZ2luN1dpdGhGZWRBdXRoKHNpZ25hbDogQWJvcnRTaWduYWwpOiBQcm9taXNlPFJvdXRpbmdEYXRhIHwgdW5kZWZpbmVkPiB7XG4gICAgc2lnbmFsLnRocm93SWZBYm9ydGVkKCk7XG5cbiAgICBjb25zdCB7IHByb21pc2U6IHNpZ25hbEFib3J0ZWQsIHJlamVjdCB9ID0gd2l0aFJlc29sdmVyczxuZXZlcj4oKTtcblxuICAgIGNvbnN0IG9uQWJvcnQgPSAoKSA9PiB7IHJlamVjdChzaWduYWwucmVhc29uKTsgfTtcbiAgICBzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0LCB7IG9uY2U6IHRydWUgfSk7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgICAgIHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgIHRocm93IHRoaXMud3JhcFNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH0pLFxuICAgICAgICBzaWduYWxBYm9ydGVkXG4gICAgICBdKTtcblxuICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBMb2dpbjdUb2tlbkhhbmRsZXIodGhpcyk7XG4gICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgaGFuZGxlcik7XG4gICAgICBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgICBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyksXG4gICAgICAgIHNpZ25hbEFib3J0ZWRcbiAgICAgIF0pO1xuXG4gICAgICBpZiAoaGFuZGxlci5sb2dpbkFja1JlY2VpdmVkKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLnJvdXRpbmdEYXRhO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBmZWRBdXRoSW5mb1Rva2VuID0gaGFuZGxlci5mZWRBdXRoSW5mb1Rva2VuO1xuXG4gICAgICBpZiAoZmVkQXV0aEluZm9Ub2tlbiAmJiBmZWRBdXRoSW5mb1Rva2VuLnN0c3VybCAmJiBmZWRBdXRoSW5mb1Rva2VuLnNwbikge1xuICAgICAgICAvKiogRmVkZXJhdGVkIGF1dGhlbnRpY2F0aW9uIGNvbmZpZ2F0aW9uLiAqL1xuICAgICAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IHRoaXMuY29uZmlnLmF1dGhlbnRpY2F0aW9uIGFzIFRva2VuQ3JlZGVudGlhbEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlQYXNzd29yZEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lBcHBTZXJ2aWNlQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQgfCBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbjtcbiAgICAgICAgLyoqIFBlcm1pc3Npb24gc2NvcGUgdG8gcGFzcyB0byBFbnRyYSBJRCB3aGVuIHJlcXVlc3RpbmcgYW4gYXV0aGVudGljYXRpb24gdG9rZW4uICovXG4gICAgICAgIGNvbnN0IHRva2VuU2NvcGUgPSBuZXcgVVJMKCcvLmRlZmF1bHQnLCBmZWRBdXRoSW5mb1Rva2VuLnNwbikudG9TdHJpbmcoKTtcblxuICAgICAgICAvKiogSW5zdGFuY2Ugb2YgdGhlIHRva2VuIGNyZWRlbnRpYWwgdG8gdXNlIHRvIGF1dGhlbnRpY2F0ZSB0byB0aGUgcmVzb3VyY2UuICovXG4gICAgICAgIGxldCBjcmVkZW50aWFsczogVG9rZW5DcmVkZW50aWFsO1xuXG4gICAgICAgIHN3aXRjaCAoYXV0aGVudGljYXRpb24udHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3Rva2VuLWNyZWRlbnRpYWwnOlxuICAgICAgICAgICAgY3JlZGVudGlhbHMgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNyZWRlbnRpYWw7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgICAgIGNyZWRlbnRpYWxzID0gbmV3IFVzZXJuYW1lUGFzc3dvcmRDcmVkZW50aWFsKFxuICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnRlbmFudElkID8/ICdjb21tb24nLFxuICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkLFxuICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nOlxuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJzpcbiAgICAgICAgICAgIGNvbnN0IG1zaUFyZ3MgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkID8gW2F1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWQsIHt9XSA6IFt7fV07XG4gICAgICAgICAgICBjcmVkZW50aWFscyA9IG5ldyBNYW5hZ2VkSWRlbnRpdHlDcmVkZW50aWFsKC4uLm1zaUFyZ3MpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JzpcbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkID8geyBtYW5hZ2VkSWRlbnRpdHlDbGllbnRJZDogYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCB9IDoge307XG4gICAgICAgICAgICBjcmVkZW50aWFscyA9IG5ldyBEZWZhdWx0QXp1cmVDcmVkZW50aWFsKGFyZ3MpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnOlxuICAgICAgICAgICAgY3JlZGVudGlhbHMgPSBuZXcgQ2xpZW50U2VjcmV0Q3JlZGVudGlhbChcbiAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy50ZW5hbnRJZCxcbiAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCxcbiAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRTZWNyZXRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKiBBY2Nlc3MgdG9rZW4gcmV0cmlldmVkIGZyb20gRW50cmEgSUQgZm9yIHRoZSBjb25maWd1cmVkIHBlcm1pc3Npb24gc2NvcGUocykuICovXG4gICAgICAgIGxldCB0b2tlblJlc3BvbnNlOiBBY2Nlc3NUb2tlbiB8IG51bGw7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0b2tlblJlc3BvbnNlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgICAgIGNyZWRlbnRpYWxzLmdldFRva2VuKHRva2VuU2NvcGUpLFxuICAgICAgICAgICAgc2lnbmFsQWJvcnRlZFxuICAgICAgICAgIF0pO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzaWduYWwudGhyb3dJZkFib3J0ZWQoKTtcblxuICAgICAgICAgIHRocm93IG5ldyBBZ2dyZWdhdGVFcnJvcihcbiAgICAgICAgICAgIFtuZXcgQ29ubmVjdGlvbkVycm9yKCdTZWN1cml0eSB0b2tlbiBjb3VsZCBub3QgYmUgYXV0aGVudGljYXRlZCBvciBhdXRob3JpemVkLicsICdFRkVEQVVUSCcpLCBlcnJdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFR5cGUgZ3VhcmQgdGhlIHRva2VuIHZhbHVlIHNvIHRoYXQgaXQgaXMgbmV2ZXIgbnVsbC5cbiAgICAgICAgaWYgKHRva2VuUmVzcG9uc2UgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgQWdncmVnYXRlRXJyb3IoXG4gICAgICAgICAgICBbbmV3IENvbm5lY3Rpb25FcnJvcignU2VjdXJpdHkgdG9rZW4gY291bGQgbm90IGJlIGF1dGhlbnRpY2F0ZWQgb3IgYXV0aG9yaXplZC4nLCAnRUZFREFVVEgnKV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZW5kRmVkQXV0aFRva2VuTWVzc2FnZSh0b2tlblJlc3BvbnNlLnRva2VuKTtcbiAgICAgICAgLy8gc2VudCB0aGUgZmVkQXV0aCB0b2tlbiBtZXNzYWdlLCB0aGUgcmVzdCBpcyBzaW1pbGFyIHRvIHN0YW5kYXJkIGxvZ2luIDdcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX1NUQU5EQVJEX0xPR0lOKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucGVyZm9ybVNlbnRMb2dpbjdXaXRoU3RhbmRhcmRMb2dpbihzaWduYWwpO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLmxvZ2luRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgdGhpcy5sb2dpbkVycm9yO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKTtcbiAgICAgIH1cbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5sb2dpbkVycm9yID0gdW5kZWZpbmVkO1xuICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBhc3luYyBwZXJmb3JtTG9nZ2VkSW5TZW5kaW5nSW5pdGlhbFNxbChzaWduYWw6IEFib3J0U2lnbmFsKSB7XG4gICAgc2lnbmFsLnRocm93SWZBYm9ydGVkKCk7XG5cbiAgICBjb25zdCB7IHByb21pc2U6IHNpZ25hbEFib3J0ZWQsIHJlamVjdCB9ID0gd2l0aFJlc29sdmVyczxuZXZlcj4oKTtcblxuICAgIGNvbnN0IG9uQWJvcnQgPSAoKSA9PiB7IHJlamVjdChzaWduYWwucmVhc29uKTsgfTtcbiAgICBzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0LCB7IG9uY2U6IHRydWUgfSk7XG5cbiAgICB0cnkge1xuICAgICAgdGhpcy5zZW5kSW5pdGlhbFNxbCgpO1xuXG4gICAgICBjb25zdCBtZXNzYWdlID0gYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgdGhyb3cgdGhpcy53cmFwU29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfSksXG4gICAgICAgIHNpZ25hbEFib3J0ZWRcbiAgICAgIF0pO1xuXG4gICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgbmV3IEluaXRpYWxTcWxUb2tlbkhhbmRsZXIodGhpcykpO1xuICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpLFxuICAgICAgICBzaWduYWxBYm9ydGVkXG4gICAgICBdKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGlzVHJhbnNpZW50RXJyb3IoZXJyb3I6IEFnZ3JlZ2F0ZUVycm9yIHwgQ29ubmVjdGlvbkVycm9yKTogYm9vbGVhbiB7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEFnZ3JlZ2F0ZUVycm9yKSB7XG4gICAgZXJyb3IgPSBlcnJvci5lcnJvcnNbMF07XG4gIH1cbiAgcmV0dXJuIChlcnJvciBpbnN0YW5jZW9mIENvbm5lY3Rpb25FcnJvcikgJiYgISFlcnJvci5pc1RyYW5zaWVudDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgQ29ubmVjdGlvbjtcbm1vZHVsZS5leHBvcnRzID0gQ29ubmVjdGlvbjtcblxuQ29ubmVjdGlvbi5wcm90b3R5cGUuU1RBVEUgPSB7XG4gIElOSVRJQUxJWkVEOiB7XG4gICAgbmFtZTogJ0luaXRpYWxpemVkJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIENPTk5FQ1RJTkc6IHtcbiAgICBuYW1lOiAnQ29ubmVjdGluZycsXG4gICAgZXZlbnRzOiB7fVxuICB9LFxuICBTRU5UX1BSRUxPR0lOOiB7XG4gICAgbmFtZTogJ1NlbnRQcmVsb2dpbicsXG4gICAgZXZlbnRzOiB7fVxuICB9LFxuICBSRVJPVVRJTkc6IHtcbiAgICBuYW1lOiAnUmVSb3V0aW5nJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIFRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZOiB7XG4gICAgbmFtZTogJ1RSQU5TSUVOVF9GQUlMVVJFX1JFVFJZJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIFNFTlRfVExTU1NMTkVHT1RJQVRJT046IHtcbiAgICBuYW1lOiAnU2VudFRMU1NTTE5lZ290aWF0aW9uJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIFNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU46IHtcbiAgICBuYW1lOiAnU2VudExvZ2luN1dpdGhTdGFuZGFyZExvZ2luJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIFNFTlRfTE9HSU43X1dJVEhfTlRMTToge1xuICAgIG5hbWU6ICdTZW50TG9naW43V2l0aE5UTE1Mb2dpbicsXG4gICAgZXZlbnRzOiB7fVxuICB9LFxuICBTRU5UX0xPR0lON19XSVRIX0ZFREFVVEg6IHtcbiAgICBuYW1lOiAnU2VudExvZ2luN1dpdGhGZWRhdXRoJyxcbiAgICBldmVudHM6IHt9XG4gIH0sXG4gIExPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMOiB7XG4gICAgbmFtZTogJ0xvZ2dlZEluU2VuZGluZ0luaXRpYWxTcWwnLFxuICAgIGV2ZW50czoge31cbiAgfSxcbiAgTE9HR0VEX0lOOiB7XG4gICAgbmFtZTogJ0xvZ2dlZEluJyxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgIHRoaXMuY2xlYW51cENvbm5lY3Rpb24oKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfQ0xJRU5UX1JFUVVFU1Q6IHtcbiAgICBuYW1lOiAnU2VudENsaWVudFJlcXVlc3QnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc29ja2V0RXJyb3InLCBlcnIpO1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIHRoaXMud3JhcFNvY2tldEVycm9yKGVycikpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyByZXF1ZXN0IHRpbWVyIGlzIHN0b3BwZWQgb24gZmlyc3QgZGF0YSBwYWNrYWdlXG4gICAgICAgIHRoaXMuY2xlYXJSZXF1ZXN0VGltZXIoKTtcblxuICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgbmV3IFJlcXVlc3RUb2tlbkhhbmRsZXIodGhpcywgdGhpcy5yZXF1ZXN0ISkpO1xuXG4gICAgICAgIC8vIElmIHRoZSByZXF1ZXN0IHdhcyBjYW5jZWxlZCBhbmQgd2UgaGF2ZSBhIGBjYW5jZWxUaW1lcmBcbiAgICAgICAgLy8gZGVmaW5lZCwgd2Ugc2VuZCBhIGF0dGVudGlvbiBtZXNzYWdlIGFmdGVyIHRoZVxuICAgICAgICAvLyByZXF1ZXN0IG1lc3NhZ2Ugd2FzIGZ1bGx5IHNlbnQgb2ZmLlxuICAgICAgICAvL1xuICAgICAgICAvLyBXZSBhbHJlYWR5IHN0YXJ0ZWQgY29uc3VtaW5nIHRoZSBjdXJyZW50IG1lc3NhZ2VcbiAgICAgICAgLy8gKGJ1dCBhbGwgdGhlIHRva2VuIGhhbmRsZXJzIHNob3VsZCBiZSBuby1vcHMpLCBhbmRcbiAgICAgICAgLy8gbmVlZCB0byBlbnN1cmUgdGhlIG5leHQgbWVzc2FnZSBpcyBoYW5kbGVkIGJ5IHRoZVxuICAgICAgICAvLyBgU0VOVF9BVFRFTlRJT05gIHN0YXRlLlxuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Py5jYW5jZWxlZCAmJiB0aGlzLmNhbmNlbFRpbWVyKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9BVFRFTlRJT04pO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3Qgb25SZXN1bWUgPSAoKSA9PiB7XG4gICAgICAgICAgdG9rZW5TdHJlYW1QYXJzZXIucmVzdW1lKCk7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IG9uUGF1c2UgPSAoKSA9PiB7XG4gICAgICAgICAgdG9rZW5TdHJlYW1QYXJzZXIucGF1c2UoKTtcblxuICAgICAgICAgIHRoaXMucmVxdWVzdD8ub25jZSgncmVzdW1lJywgb25SZXN1bWUpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMucmVxdWVzdD8ub24oJ3BhdXNlJywgb25QYXVzZSk7XG5cbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdCBpbnN0YW5jZW9mIFJlcXVlc3QgJiYgdGhpcy5yZXF1ZXN0LnBhdXNlZCkge1xuICAgICAgICAgIG9uUGF1c2UoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9uQ2FuY2VsID0gKCkgPT4ge1xuICAgICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbkVuZE9mTWVzc2FnZSk7XG5cbiAgICAgICAgICBpZiAodGhpcy5yZXF1ZXN0IGluc3RhbmNlb2YgUmVxdWVzdCAmJiB0aGlzLnJlcXVlc3QucGF1c2VkKSB7XG4gICAgICAgICAgICAvLyByZXN1bWUgdGhlIHJlcXVlc3QgaWYgaXQgd2FzIHBhdXNlZCBzbyB3ZSBjYW4gcmVhZCB0aGUgcmVtYWluaW5nIHRva2Vuc1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnJlc3VtZSgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3BhdXNlJywgb25QYXVzZSk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcigncmVzdW1lJywgb25SZXN1bWUpO1xuXG4gICAgICAgICAgLy8gVGhlIGBfY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudGAgY2FsbGJhY2sgd2lsbCBoYXZlIHNlbnQgYVxuICAgICAgICAgIC8vIGF0dGVudGlvbiBtZXNzYWdlLCBzbyBub3cgd2UgbmVlZCB0byBhbHNvIHN3aXRjaCB0b1xuICAgICAgICAgIC8vIHRoZSBgU0VOVF9BVFRFTlRJT05gIHN0YXRlIHRvIG1ha2Ugc3VyZSB0aGUgYXR0ZW50aW9uIGFja1xuICAgICAgICAgIC8vIG1lc3NhZ2UgaXMgcHJvY2Vzc2VkIGNvcnJlY3RseS5cbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfQVRURU5USU9OKTtcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBvbkVuZE9mTWVzc2FnZSA9ICgpID0+IHtcbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdjYW5jZWwnLCB0aGlzLl9jYW5jZWxBZnRlclJlcXVlc3RTZW50KTtcbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcigncGF1c2UnLCBvblBhdXNlKTtcbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdyZXN1bWUnLCBvblJlc3VtZSk7XG5cbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG4gICAgICAgICAgY29uc3Qgc3FsUmVxdWVzdCA9IHRoaXMucmVxdWVzdCBhcyBSZXF1ZXN0O1xuICAgICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uIDwgJzdfMicgJiYgc3FsUmVxdWVzdC5lcnJvciAmJiB0aGlzLmlzU3FsQmF0Y2gpIHtcbiAgICAgICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzcWxSZXF1ZXN0LmNhbGxiYWNrKHNxbFJlcXVlc3QuZXJyb3IsIHNxbFJlcXVlc3Qucm93Q291bnQsIHNxbFJlcXVlc3Qucm93cyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdG9rZW5TdHJlYW1QYXJzZXIub25jZSgnZW5kJywgb25FbmRPZk1lc3NhZ2UpO1xuICAgICAgICB0aGlzLnJlcXVlc3Q/Lm9uY2UoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcbiAgICAgIH0pKCk7XG5cbiAgICB9LFxuICAgIGV4aXQ6IGZ1bmN0aW9uKG5leHRTdGF0ZSkge1xuICAgICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICB0aGlzLmNsZWFudXBDb25uZWN0aW9uKCk7XG5cbiAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhlcnIpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9BVFRFTlRJT046IHtcbiAgICBuYW1lOiAnU2VudEF0dGVudGlvbicsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzb2NrZXRFcnJvcicsIGVycik7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Vycm9yJywgdGhpcy53cmFwU29ja2V0RXJyb3IoZXJyKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBBdHRlbnRpb25Ub2tlbkhhbmRsZXIodGhpcywgdGhpcy5yZXF1ZXN0ISk7XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcblxuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG4gICAgICAgIC8vIDMuMi41LjcgU2VudCBBdHRlbnRpb24gU3RhdGVcbiAgICAgICAgLy8gRGlzY2FyZCBhbnkgZGF0YSBjb250YWluZWQgaW4gdGhlIHJlc3BvbnNlLCB1bnRpbCB3ZSByZWNlaXZlIHRoZSBhdHRlbnRpb24gcmVzcG9uc2VcbiAgICAgICAgaWYgKGhhbmRsZXIuYXR0ZW50aW9uUmVjZWl2ZWQpIHtcbiAgICAgICAgICB0aGlzLmNsZWFyQ2FuY2VsVGltZXIoKTtcblxuICAgICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG5cbiAgICAgICAgICBpZiAoc3FsUmVxdWVzdC5lcnJvciAmJiBzcWxSZXF1ZXN0LmVycm9yIGluc3RhbmNlb2YgUmVxdWVzdEVycm9yICYmIHNxbFJlcXVlc3QuZXJyb3IuY29kZSA9PT0gJ0VUSU1FT1VUJykge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhzcWxSZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKCdDYW5jZWxlZC4nLCAnRUNBTkNFTCcpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSxcbiAgICBldmVudHM6IHtcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgY29uc3Qgc3FsUmVxdWVzdCA9IHRoaXMucmVxdWVzdCE7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcblxuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgdGhpcy5jbGVhbnVwQ29ubmVjdGlvbigpO1xuXG4gICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIEZJTkFMOiB7XG4gICAgbmFtZTogJ0ZpbmFsJyxcbiAgICBldmVudHM6IHt9XG4gIH1cbn07XG4iXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLElBQUFBLE9BQUEsR0FBQUMsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFDLEdBQUEsR0FBQUYsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFFLEdBQUEsR0FBQUMsdUJBQUEsQ0FBQUgsT0FBQTtBQUNBLElBQUFJLEdBQUEsR0FBQUQsdUJBQUEsQ0FBQUgsT0FBQTtBQUNBLElBQUFLLElBQUEsR0FBQU4sc0JBQUEsQ0FBQUMsT0FBQTtBQUVBLElBQUFNLFVBQUEsR0FBQVAsc0JBQUEsQ0FBQUMsT0FBQTtBQUdBLElBQUFPLE9BQUEsR0FBQVAsT0FBQTtBQUVBLElBQUFRLFNBQUEsR0FBQVIsT0FBQTtBQU1BLElBQUFTLFNBQUEsR0FBQVQsT0FBQTtBQUVBLElBQUFVLFNBQUEsR0FBQVgsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFXLE1BQUEsR0FBQVosc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFZLE9BQUEsR0FBQVosT0FBQTtBQUNBLElBQUFhLGVBQUEsR0FBQWIsT0FBQTtBQUNBLElBQUFjLHFCQUFBLEdBQUFkLE9BQUE7QUFDQSxJQUFBZSxPQUFBLEdBQUFmLE9BQUE7QUFDQSxJQUFBZ0IsZ0JBQUEsR0FBQWpCLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBaUIsY0FBQSxHQUFBbEIsc0JBQUEsQ0FBQUMsT0FBQTtBQUNBLElBQUFrQixZQUFBLEdBQUFuQixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQW1CLFFBQUEsR0FBQXBCLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBb0Isa0JBQUEsR0FBQXJCLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBcUIsZ0JBQUEsR0FBQXRCLHNCQUFBLENBQUFDLE9BQUE7QUFDQSxJQUFBc0IsVUFBQSxH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