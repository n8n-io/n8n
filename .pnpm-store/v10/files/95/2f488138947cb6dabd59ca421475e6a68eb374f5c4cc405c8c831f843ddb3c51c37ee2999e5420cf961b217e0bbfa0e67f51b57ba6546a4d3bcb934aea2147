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
var _nodeAbortController = require("node-abort-controller");
var _dataType = require("./data-type");
var _bulkLoadPayload = require("./bulk-load-payload");
var _specialStoredProcedure = _interopRequireDefault(require("./special-stored-procedure"));
var _esAggregateError = _interopRequireDefault(require("es-aggregate-error"));
var _package = require("../package.json");
var _url = require("url");
var _handler = require("./token/handler");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
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

/**
 * @private
 */

/**
 * @private
 */
const CLEANUP_TYPE = {
  NORMAL: 0,
  REDIRECT: 1,
  RETRY: 2
};
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
  _cancelAfterRequestSent;

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
      if (type !== 'default' && type !== 'ntlm' && type !== 'azure-active-directory-password' && type !== 'azure-active-directory-access-token' && type !== 'azure-active-directory-msi-vm' && type !== 'azure-active-directory-msi-app-service' && type !== 'azure-active-directory-service-principal-secret' && type !== 'azure-active-directory-default') {
        throw new TypeError('The "type" property must one of "default", "ntlm", "azure-active-directory-password", "azure-active-directory-access-token", "azure-active-directory-default", "azure-active-directory-msi-vm" or "azure-active-directory-msi-app-service" or "azure-active-directory-service-principal-secret".');
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
  }

  /**
   * @private
   */
  initialiseConnection() {
    const signal = this.createConnectTimer();
    if (this.config.options.port) {
      return this.connectOnPort(this.config.options.port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
    } else {
      return (0, _instanceLookup.instanceLookup)({
        server: this.config.server,
        instanceName: this.config.options.instanceName,
        timeout: this.config.options.connectTimeout,
        signal: signal
      }).then(port => {
        process.nextTick(() => {
          this.connectOnPort(port, this.config.options.multiSubnetFailover, signal, this.config.options.connector);
        });
      }, err => {
        this.clearConnectTimer();
        if (signal.aborted) {
          // Ignore the AbortError for now, this is still handled by the connectTimer firing
          return;
        }
        process.nextTick(() => {
          this.emit('connect', new _errors.ConnectionError(err.message, 'EINSTLOOKUP'));
        });
      });
    }
  }

  /**
   * @private
   */
  cleanupConnection(cleanupType) {
    if (!this.closed) {
      this.clearConnectTimer();
      this.clearRequestTimer();
      this.clearRetryTimer();
      this.closeConnection();
      if (cleanupType === CLEANUP_TYPE.REDIRECT) {
        this.emit('rerouting');
      } else if (cleanupType !== CLEANUP_TYPE.RETRY) {
        process.nextTick(() => {
          this.emit('end');
        });
      }
      const request = this.request;
      if (request) {
        const err = new _errors.RequestError('Connection closed before request completed.', 'ECLOSE');
        request.callback(err);
        this.request = undefined;
      }
      this.closed = true;
      this.loginError = undefined;
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
  socketHandlingForSendPreLogin(socket) {
    socket.on('error', error => {
      this.socketError(error);
    });
    socket.on('close', () => {
      this.socketClose();
    });
    socket.on('end', () => {
      this.socketEnd();
    });
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
  }
  wrapWithTls(socket, signal) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
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
      const encryptsocket = tls.connect(encryptOptions);
      const onAbort = () => {
        encryptsocket.removeListener('error', onError);
        encryptsocket.removeListener('connect', onConnect);
        encryptsocket.destroy();
        reject(signal.reason);
      };
      const onError = err => {
        signal.removeEventListener('abort', onAbort);
        encryptsocket.removeListener('error', onError);
        encryptsocket.removeListener('connect', onConnect);
        encryptsocket.destroy();
        reject(err);
      };
      const onConnect = () => {
        signal.removeEventListener('abort', onAbort);
        encryptsocket.removeListener('error', onError);
        encryptsocket.removeListener('connect', onConnect);
        resolve(encryptsocket);
      };
      signal.addEventListener('abort', onAbort, {
        once: true
      });
      encryptsocket.on('error', onError);
      encryptsocket.on('secureConnect', onConnect);
    });
  }
  connectOnPort(port, multiSubnetFailover, signal, customConnector) {
    const connectOpts = {
      host: this.routingData ? this.routingData.server : this.config.server,
      port: this.routingData ? this.routingData.port : port,
      localAddress: this.config.options.localAddress
    };
    const connect = customConnector || (multiSubnetFailover ? _connector.connectInParallel : _connector.connectInSequence);
    (async () => {
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
      this.socketHandlingForSendPreLogin(socket);
    })().catch(err => {
      this.clearConnectTimer();
      if (signal.aborted) {
        return;
      }
      process.nextTick(() => {
        this.socketError(err);
      });
    });
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
  createConnectTimer() {
    const controller = new _nodeAbortController.AbortController();
    this.connectTimer = setTimeout(() => {
      controller.abort();
      this.connectTimeout();
    }, this.config.options.connectTimeout);
    return controller.signal;
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
  createRetryTimer() {
    this.clearRetryTimer();
    this.retryTimer = setTimeout(() => {
      this.retryTimeout();
    }, this.config.options.connectionRetryInterval);
  }

  /**
   * @private
   */
  connectTimeout() {
    const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
    // If we have routing data stored, this connection has been redirected
    const server = this.routingData ? this.routingData.server : this.config.server;
    const port = this.routingData ? `:${this.routingData.port}` : hostPostfix;
    // Grab the target host from the connection configuration, and from a redirect message
    // otherwise, leave the message empty.
    const routingMessage = this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : '';
    const message = `Failed to connect to ${server}${port}${routingMessage} in ${this.config.options.connectTimeout}ms`;
    this.debug.log(message);
    this.emit('connect', new _errors.ConnectionError(message, 'ETIMEOUT'));
    this.connectTimer = undefined;
    this.dispatchEvent('connectTimeout');
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
  retryTimeout() {
    this.retryTimer = undefined;
    this.emit('retry');
    this.transitionTo(this.STATE.CONNECTING);
  }

  /**
   * @private
   */
  clearConnectTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = undefined;
    }
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
  clearRetryTimer() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
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
  socketError(error) {
    if (this.state === this.STATE.CONNECTING || this.state === this.STATE.SENT_TLSSSLNEGOTIATION) {
      const hostPostfix = this.config.options.port ? `:${this.config.options.port}` : `\\${this.config.options.instanceName}`;
      // If we have routing data stored, this connection has been redirected
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? `:${this.routingData.port}` : hostPostfix;
      // Grab the target host from the connection configuration, and from a redirect message
      // otherwise, leave the message empty.
      const routingMessage = this.routingData ? ` (redirected from ${this.config.server}${hostPostfix})` : '';
      const message = `Failed to connect to ${server}${port}${routingMessage} - ${error.message}`;
      this.debug.log(message);
      this.emit('connect', new _errors.ConnectionError(message, 'ESOCKET'));
    } else {
      const message = `Connection lost - ${error.message}`;
      this.debug.log(message);
      this.emit('error', new _errors.ConnectionError(message, 'ESOCKET'));
    }
    this.dispatchEvent('socketError', error);
  }

  /**
   * @private
   */
  socketEnd() {
    this.debug.log('socket ended');
    if (this.state !== this.STATE.FINAL) {
      const error = new Error('socket hang up');
      error.code = 'ECONNRESET';
      this.socketError(error);
    }
  }

  /**
   * @private
   */
  socketClose() {
    this.debug.log('connection to ' + this.config.server + ':' + this.config.options.port + ' closed');
    if (this.state === this.STATE.REROUTING) {
      this.debug.log('Rerouting to ' + this.routingData.server + ':' + this.routingData.port);
      this.dispatchEvent('reconnect');
    } else if (this.state === this.STATE.TRANSIENT_FAILURE_RETRY) {
      const server = this.routingData ? this.routingData.server : this.config.server;
      const port = this.routingData ? this.routingData.port : this.config.options.port;
      this.debug.log('Retry after transient failure connecting to ' + server + ':' + port);
      this.dispatchEvent('retry');
    } else {
      this.transitionTo(this.STATE.FINAL);
    }
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
    payload.serverName = this.routingData ? this.routingData.server : this.config.server;
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
    // sent the fedAuth token message, the rest is similar to standard login 7
    this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
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
   * @private
   */
  processedInitialSql() {
    this.clearConnectTimer();
    this.emit('connect');
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
}
function isTransientError(error) {
  if (error instanceof _esAggregateError.default) {
    error = error.errors[0];
  }
  return error instanceof _errors.ConnectionError && !!error.isTransient;
}
var _default = Connection;
exports.default = _default;
module.exports = Connection;
Connection.prototype.STATE = {
  INITIALIZED: {
    name: 'Initialized',
    events: {}
  },
  CONNECTING: {
    name: 'Connecting',
    enter: function () {
      this.initialiseConnection();
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_PRELOGIN: {
    name: 'SentPrelogin',
    enter: function () {
      (async () => {
        let messageBuffer = Buffer.alloc(0);
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }
        for await (const data of message) {
          messageBuffer = Buffer.concat([messageBuffer, data]);
        }
        const preloginPayload = new _preloginPayload.default(messageBuffer);
        this.debug.payload(function () {
          return preloginPayload.toString('  ');
        });
        if (preloginPayload.fedAuthRequired === 1) {
          this.fedAuthRequired = true;
        }
        if ('strict' !== this.config.options.encrypt && (preloginPayload.encryptionString === 'ON' || preloginPayload.encryptionString === 'REQ')) {
          if (!this.config.options.encrypt) {
            this.emit('connect', new _errors.ConnectionError("Server requires encryption, set 'encrypt' config option to true.", 'EENCRYPT'));
            return this.close();
          }
          try {
            var _this$routingData;
            this.transitionTo(this.STATE.SENT_TLSSSLNEGOTIATION);
            await this.messageIo.startTls(this.secureContextOptions, this.config.options.serverName ? this.config.options.serverName : ((_this$routingData = this.routingData) === null || _this$routingData === void 0 ? void 0 : _this$routingData.server) ?? this.config.server, this.config.options.trustServerCertificate);
          } catch (err) {
            return this.socketError(err);
          }
        }
        this.sendLogin7Packet();
        const {
          authentication
        } = this.config;
        switch (authentication.type) {
          case 'azure-active-directory-password':
          case 'azure-active-directory-msi-vm':
          case 'azure-active-directory-msi-app-service':
          case 'azure-active-directory-service-principal-secret':
          case 'azure-active-directory-default':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_FEDAUTH);
            break;
          case 'ntlm':
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_NTLM);
            break;
          default:
            this.transitionTo(this.STATE.SENT_LOGIN7_WITH_STANDARD_LOGIN);
            break;
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  REROUTING: {
    name: 'ReRouting',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.REDIRECT);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      reconnect: function () {
        this.transitionTo(this.STATE.CONNECTING);
      }
    }
  },
  TRANSIENT_FAILURE_RETRY: {
    name: 'TRANSIENT_FAILURE_RETRY',
    enter: function () {
      this.curTransientRetryCount++;
      this.cleanupConnection(CLEANUP_TYPE.RETRY);
    },
    events: {
      message: function () {},
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      retry: function () {
        this.createRetryTimer();
      }
    }
  },
  SENT_TLSSSLNEGOTIATION: {
    name: 'SentTLSSSLNegotiation',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_STANDARD_LOGIN: {
    name: 'SentLogin7WithStandardLogin',
    enter: function () {
      (async () => {
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }
        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');
        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_NTLM: {
    name: 'SentLogin7WithNTLMLogin',
    enter: function () {
      (async () => {
        while (true) {
          let message;
          try {
            message = await this.messageIo.readMessage();
          } catch (err) {
            return this.socketError(err);
          }
          const handler = new _handler.Login7TokenHandler(this);
          const tokenStreamParser = this.createTokenStreamParser(message, handler);
          await (0, _events.once)(tokenStreamParser, 'end');
          if (handler.loginAckReceived) {
            if (handler.routingData) {
              this.routingData = handler.routingData;
              return this.transitionTo(this.STATE.REROUTING);
            } else {
              return this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
            }
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
            if (isTransientError(this.loginError)) {
              this.debug.log('Initiating retry on transient error');
              return this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
            } else {
              this.emit('connect', this.loginError);
              return this.transitionTo(this.STATE.FINAL);
            }
          } else {
            this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
            return this.transitionTo(this.STATE.FINAL);
          }
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_LOGIN7_WITH_FEDAUTH: {
    name: 'SentLogin7Withfedauth',
    enter: function () {
      (async () => {
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }
        const handler = new _handler.Login7TokenHandler(this);
        const tokenStreamParser = this.createTokenStreamParser(message, handler);
        await (0, _events.once)(tokenStreamParser, 'end');
        if (handler.loginAckReceived) {
          if (handler.routingData) {
            this.routingData = handler.routingData;
            this.transitionTo(this.STATE.REROUTING);
          } else {
            this.transitionTo(this.STATE.LOGGED_IN_SENDING_INITIAL_SQL);
          }
          return;
        }
        const fedAuthInfoToken = handler.fedAuthInfoToken;
        if (fedAuthInfoToken && fedAuthInfoToken.stsurl && fedAuthInfoToken.spn) {
          const authentication = this.config.authentication;
          const tokenScope = new _url.URL('/.default', fedAuthInfoToken.spn).toString();
          let credentials;
          switch (authentication.type) {
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
          let tokenResponse;
          try {
            tokenResponse = await credentials.getToken(tokenScope);
          } catch (err) {
            this.loginError = new _esAggregateError.default([new _errors.ConnectionError('Security token could not be authenticated or authorized.', 'EFEDAUTH'), err]);
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
            return;
          }
          const token = tokenResponse.token;
          this.sendFedAuthTokenMessage(token);
        } else if (this.loginError) {
          if (isTransientError(this.loginError)) {
            this.debug.log('Initiating retry on transient error');
            this.transitionTo(this.STATE.TRANSIENT_FAILURE_RETRY);
          } else {
            this.emit('connect', this.loginError);
            this.transitionTo(this.STATE.FINAL);
          }
        } else {
          this.emit('connect', new _errors.ConnectionError('Login failed.', 'ELOGIN'));
          this.transitionTo(this.STATE.FINAL);
        }
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN_SENDING_INITIAL_SQL: {
    name: 'LoggedInSendingInitialSql',
    enter: function () {
      (async () => {
        this.sendInitialSql();
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
        }
        const tokenStreamParser = this.createTokenStreamParser(message, new _handler.InitialSqlTokenHandler(this));
        await (0, _events.once)(tokenStreamParser, 'end');
        this.transitionTo(this.STATE.LOGGED_IN);
        this.processedInitialSql();
      })().catch(err => {
        process.nextTick(() => {
          throw err;
        });
      });
    },
    events: {
      socketError: function socketError() {
        this.transitionTo(this.STATE.FINAL);
      },
      connectTimeout: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  LOGGED_IN: {
    name: 'LoggedIn',
    events: {
      socketError: function () {
        this.transitionTo(this.STATE.FINAL);
      }
    }
  },
  SENT_CLIENT_REQUEST: {
    name: 'SentClientRequest',
    enter: function () {
      (async (_this$request, _this$request3, _this$request10) => {
        let message;
        try {
          message = await this.messageIo.readMessage();
        } catch (err) {
          return this.socketError(err);
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
        if ((_this$request = this.request) !== null && _this$request !== void 0 && _this$request.canceled && this.cancelTimer) {
          return this.transitionTo(this.STATE.SENT_ATTENTION);
        }
        const onResume = () => {
          tokenStreamParser.resume();
        };
        const onPause = () => {
          var _this$request2;
          tokenStreamParser.pause();
          (_this$request2 = this.request) === null || _this$request2 === void 0 ? void 0 : _this$request2.once('resume', onResume);
        };
        (_this$request3 = this.request) === null || _this$request3 === void 0 ? void 0 : _this$request3.on('pause', onPause);
        if (this.request instanceof _request.default && this.request.paused) {
          onPause();
        }
        const onCancel = () => {
          var _this$request4, _this$request5;
          tokenStreamParser.removeListener('end', onEndOfMessage);
          if (this.request instanceof _request.default && this.request.paused) {
            // resume the request if it was paused so we can read the remaining tokens
            this.request.resume();
          }
          (_this$request4 = this.request) === null || _this$request4 === void 0 ? void 0 : _this$request4.removeListener('pause', onPause);
          (_this$request5 = this.request) === null || _this$request5 === void 0 ? void 0 : _this$request5.removeListener('resume', onResume);

          // The `_cancelAfterRequestSent` callback will have sent a
          // attention message, so now we need to also switch to
          // the `SENT_ATTENTION` state to make sure the attention ack
          // message is processed correctly.
          this.transitionTo(this.STATE.SENT_ATTENTION);
        };
        const onEndOfMessage = () => {
          var _this$request6, _this$request7, _this$request8, _this$request9;
          (_this$request6 = this.request) === null || _this$request6 === void 0 ? void 0 : _this$request6.removeListener('cancel', this._cancelAfterRequestSent);
          (_this$request7 = this.request) === null || _this$request7 === void 0 ? void 0 : _this$request7.removeListener('cancel', onCancel);
          (_this$request8 = this.request) === null || _this$request8 === void 0 ? void 0 : _this$request8.removeListener('pause', onPause);
          (_this$request9 = this.request) === null || _this$request9 === void 0 ? void 0 : _this$request9.removeListener('resume', onResume);
          this.transitionTo(this.STATE.LOGGED_IN);
          const sqlRequest = this.request;
          this.request = undefined;
          if (this.config.options.tdsVersion < '7_2' && sqlRequest.error && this.isSqlBatch) {
            this.inTransaction = false;
          }
          sqlRequest.callback(sqlRequest.error, sqlRequest.rowCount, sqlRequest.rows);
        };
        tokenStreamParser.once('end', onEndOfMessage);
        (_this$request10 = this.request) === null || _this$request10 === void 0 ? void 0 : _this$request10.once('cancel', onCancel);
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
          return this.socketError(err);
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
        sqlRequest.callback(err);
      }
    }
  },
  FINAL: {
    name: 'Final',
    enter: function () {
      this.cleanupConnection(CLEANUP_TYPE.NORMAL);
    },
    events: {
      connectTimeout: function () {
        // Do nothing, as the timer should be cleaned up.
      },
      message: function () {
        // Do nothing
      },
      socketError: function () {
        // Do nothing
      }
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJfY3J5cHRvIiwiX2ludGVyb3BSZXF1aXJlRGVmYXVsdCIsInJlcXVpcmUiLCJfb3MiLCJ0bHMiLCJfaW50ZXJvcFJlcXVpcmVXaWxkY2FyZCIsIm5ldCIsIl9kbnMiLCJfY29uc3RhbnRzIiwiX3N0cmVhbSIsIl9pZGVudGl0eSIsIl9idWxrTG9hZCIsIl9kZWJ1ZyIsIl9ldmVudHMiLCJfaW5zdGFuY2VMb29rdXAiLCJfdHJhbnNpZW50RXJyb3JMb29rdXAiLCJfcGFja2V0IiwiX3ByZWxvZ2luUGF5bG9hZCIsIl9sb2dpbjdQYXlsb2FkIiwiX250bG1QYXlsb2FkIiwiX3JlcXVlc3QiLCJfcnBjcmVxdWVzdFBheWxvYWQiLCJfc3FsYmF0Y2hQYXlsb2FkIiwiX21lc3NhZ2VJbyIsIl90b2tlblN0cmVhbVBhcnNlciIsIl90cmFuc2FjdGlvbiIsIl9lcnJvcnMiLCJfY29ubmVjdG9yIiwiX2xpYnJhcnkiLCJfdGRzVmVyc2lvbnMiLCJfbWVzc2FnZSIsIl9udGxtIiwiX25vZGVBYm9ydENvbnRyb2xsZXIiLCJfZGF0YVR5cGUiLCJfYnVsa0xvYWRQYXlsb2FkIiwiX3NwZWNpYWxTdG9yZWRQcm9jZWR1cmUiLCJfZXNBZ2dyZWdhdGVFcnJvciIsIl9wYWNrYWdlIiwiX3VybCIsIl9oYW5kbGVyIiwiX2dldFJlcXVpcmVXaWxkY2FyZENhY2hlIiwibm9kZUludGVyb3AiLCJXZWFrTWFwIiwiY2FjaGVCYWJlbEludGVyb3AiLCJjYWNoZU5vZGVJbnRlcm9wIiwib2JqIiwiX19lc01vZHVsZSIsImRlZmF1bHQiLCJjYWNoZSIsImhhcyIsImdldCIsIm5ld09iaiIsImhhc1Byb3BlcnR5RGVzY3JpcHRvciIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIiwia2V5IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiZGVzYyIsInNldCIsIktFRVBfQUxJVkVfSU5JVElBTF9ERUxBWSIsIkRFRkFVTFRfQ09OTkVDVF9USU1FT1VUIiwiREVGQVVMVF9DTElFTlRfUkVRVUVTVF9USU1FT1VUIiwiREVGQVVMVF9DQU5DRUxfVElNRU9VVCIsIkRFRkFVTFRfQ09OTkVDVF9SRVRSWV9JTlRFUlZBTCIsIkRFRkFVTFRfUEFDS0VUX1NJWkUiLCJERUZBVUxUX1RFWFRTSVpFIiwiREVGQVVMVF9EQVRFRklSU1QiLCJERUZBVUxUX1BPUlQiLCJERUZBVUxUX1REU19WRVJTSU9OIiwiREVGQVVMVF9MQU5HVUFHRSIsIkRFRkFVTFRfREFURUZPUk1BVCIsIkNMRUFOVVBfVFlQRSIsIk5PUk1BTCIsIlJFRElSRUNUIiwiUkVUUlkiLCJDb25uZWN0aW9uIiwiRXZlbnRFbWl0dGVyIiwiX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQiLCJjb25zdHJ1Y3RvciIsImNvbmZpZyIsIlR5cGVFcnJvciIsInNlcnZlciIsImZlZEF1dGhSZXF1aXJlZCIsImF1dGhlbnRpY2F0aW9uIiwidW5kZWZpbmVkIiwidHlwZSIsIm9wdGlvbnMiLCJkb21haW4iLCJ1c2VyTmFtZSIsInBhc3N3b3JkIiwidG9VcHBlckNhc2UiLCJjbGllbnRJZCIsInRlbmFudElkIiwidG9rZW4iLCJjbGllbnRTZWNyZXQiLCJhYm9ydFRyYW5zYWN0aW9uT25FcnJvciIsImFwcE5hbWUiLCJjYW1lbENhc2VDb2x1bW5zIiwiY2FuY2VsVGltZW91dCIsImNvbHVtbkVuY3J5cHRpb25LZXlDYWNoZVRUTCIsImNvbHVtbkVuY3J5cHRpb25TZXR0aW5nIiwiY29sdW1uTmFtZVJlcGxhY2VyIiwiY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwiLCJjb25uZWN0VGltZW91dCIsImNvbm5lY3RvciIsImNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCIsIklTT0xBVElPTl9MRVZFTCIsIlJFQURfQ09NTUlUVEVEIiwiY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzIiwiZGF0YWJhc2UiLCJkYXRlZmlyc3QiLCJkYXRlRm9ybWF0IiwiZGVidWciLCJkYXRhIiwicGFja2V0IiwicGF5bG9hZCIsImVuYWJsZUFuc2lOdWxsIiwiZW5hYmxlQW5zaU51bGxEZWZhdWx0IiwiZW5hYmxlQW5zaVBhZGRpbmciLCJlbmFibGVBbnNpV2FybmluZ3MiLCJlbmFibGVBcml0aEFib3J0IiwiZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwiLCJlbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0IiwiZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMiLCJlbmFibGVOdW1lcmljUm91bmRhYm9ydCIsImVuYWJsZVF1b3RlZElkZW50aWZpZXIiLCJlbmNyeXB0IiwiZmFsbGJhY2tUb0RlZmF1bHREYiIsImVuY3J5cHRpb25LZXlTdG9yZVByb3ZpZGVycyIsImluc3RhbmNlTmFtZSIsImlzb2xhdGlvbkxldmVsIiwibGFuZ3VhZ2UiLCJsb2NhbEFkZHJlc3MiLCJtYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnMiLCJtdWx0aVN1Ym5ldEZhaWxvdmVyIiwicGFja2V0U2l6ZSIsInBvcnQiLCJyZWFkT25seUludGVudCIsInJlcXVlc3RUaW1lb3V0Iiwicm93Q29sbGVjdGlvbk9uRG9uZSIsInJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uIiwic2VydmVyTmFtZSIsInNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbiIsInRkc1ZlcnNpb24iLCJ0ZXh0c2l6ZSIsInRydXN0ZWRTZXJ2ZXJOYW1lQUUiLCJ0cnVzdFNlcnZlckNlcnRpZmljYXRlIiwidXNlQ29sdW1uTmFtZXMiLCJ1c2VVVEMiLCJ3b3Jrc3RhdGlvbklkIiwibG93ZXJDYXNlR3VpZHMiLCJFcnJvciIsImFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwiLCJSYW5nZUVycm9yIiwic2VjdXJlQ29udGV4dE9wdGlvbnMiLCJzZWN1cmVPcHRpb25zIiwiY3JlYXRlIiwidmFsdWUiLCJjb25zdGFudHMiLCJTU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTIiwiY3JlYXRlRGVidWciLCJpblRyYW5zYWN0aW9uIiwidHJhbnNhY3Rpb25EZXNjcmlwdG9ycyIsIkJ1ZmZlciIsImZyb20iLCJ0cmFuc2FjdGlvbkRlcHRoIiwiaXNTcWxCYXRjaCIsImNsb3NlZCIsIm1lc3NhZ2VCdWZmZXIiLCJhbGxvYyIsImN1clRyYW5zaWVudFJldHJ5Q291bnQiLCJ0cmFuc2llbnRFcnJvckxvb2t1cCIsIlRyYW5zaWVudEVycm9yTG9va3VwIiwic3RhdGUiLCJTVEFURSIsIklOSVRJQUxJWkVEIiwibWVzc2FnZUlvIiwic2VuZE1lc3NhZ2UiLCJUWVBFIiwiQVRURU5USU9OIiwiY3JlYXRlQ2FuY2VsVGltZXIiLCJjb25uZWN0IiwiY29ubmVjdExpc3RlbmVyIiwiQ29ubmVjdGlvbkVycm9yIiwibmFtZSIsIm9uQ29ubmVjdCIsImVyciIsInJlbW92ZUxpc3RlbmVyIiwib25FcnJvciIsIm9uY2UiLCJ0cmFuc2l0aW9uVG8iLCJDT05ORUNUSU5HIiwib24iLCJldmVudCIsImxpc3RlbmVyIiwiZW1pdCIsImFyZ3MiLCJjbG9zZSIsIkZJTkFMIiwiaW5pdGlhbGlzZUNvbm5lY3Rpb24iLCJzaWduYWwiLCJjcmVhdGVDb25uZWN0VGltZXIiLCJjb25uZWN0T25Qb3J0IiwiaW5zdGFuY2VMb29rdXAiLCJ0aW1lb3V0IiwidGhlbiIsInByb2Nlc3MiLCJuZXh0VGljayIsImNsZWFyQ29ubmVjdFRpbWVyIiwiYWJvcnRlZCIsIm1lc3NhZ2UiLCJjbGVhbnVwQ29ubmVjdGlvbiIsImNsZWFudXBUeXBlIiwiY2xlYXJSZXF1ZXN0VGltZXIiLCJjbGVhclJldHJ5VGltZXIiLCJjbG9zZUNvbm5lY3Rpb24iLCJyZXF1ZXN0IiwiUmVxdWVzdEVycm9yIiwiY2FsbGJhY2siLCJsb2dpbkVycm9yIiwiRGVidWciLCJjcmVhdGVUb2tlblN0cmVhbVBhcnNlciIsImhhbmRsZXIiLCJUb2tlblN0cmVhbVBhcnNlciIsInNvY2tldEhhbmRsaW5nRm9yU2VuZFByZUxvZ2luIiwic29ja2V0IiwiZXJyb3IiLCJzb2NrZXRFcnJvciIsInNvY2tldENsb3NlIiwic29ja2V0RW5kIiwic2V0S2VlcEFsaXZlIiwiTWVzc2FnZUlPIiwiY2xlYXJ0ZXh0IiwibG9nIiwic2VuZFByZUxvZ2luIiwiU0VOVF9QUkVMT0dJTiIsIndyYXBXaXRoVGxzIiwidGhyb3dJZkFib3J0ZWQiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInNlY3VyZUNvbnRleHQiLCJjcmVhdGVTZWN1cmVDb250ZXh0IiwiaXNJUCIsImVuY3J5cHRPcHRpb25zIiwiaG9zdCIsIkFMUE5Qcm90b2NvbHMiLCJzZXJ2ZXJuYW1lIiwiZW5jcnlwdHNvY2tldCIsIm9uQWJvcnQiLCJkZXN0cm95IiwicmVhc29uIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImFkZEV2ZW50TGlzdGVuZXIiLCJjdXN0b21Db25uZWN0b3IiLCJjb25uZWN0T3B0cyIsInJvdXRpbmdEYXRhIiwiY29ubmVjdEluUGFyYWxsZWwiLCJjb25uZWN0SW5TZXF1ZW5jZSIsImRucyIsImxvb2t1cCIsImVuZCIsImNhdGNoIiwiY29udHJvbGxlciIsIkFib3J0Q29udHJvbGxlciIsImNvbm5lY3RUaW1lciIsInNldFRpbWVvdXQiLCJhYm9ydCIsImNsZWFyQ2FuY2VsVGltZXIiLCJjYW5jZWxUaW1lciIsImNyZWF0ZVJlcXVlc3RUaW1lciIsInJlcXVlc3RUaW1lciIsImNyZWF0ZVJldHJ5VGltZXIiLCJyZXRyeVRpbWVyIiwicmV0cnlUaW1lb3V0IiwiaG9zdFBvc3RmaXgiLCJyb3V0aW5nTWVzc2FnZSIsImRpc3BhdGNoRXZlbnQiLCJjYW5jZWwiLCJjbGVhclRpbWVvdXQiLCJuZXdTdGF0ZSIsImV4aXQiLCJlbnRlciIsImFwcGx5IiwiZ2V0RXZlbnRIYW5kbGVyIiwiZXZlbnROYW1lIiwiZXZlbnRzIiwiU0VOVF9UTFNTU0xORUdPVElBVElPTiIsImNvZGUiLCJSRVJPVVRJTkciLCJUUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSIsIm1ham9yIiwibWlub3IiLCJidWlsZCIsImV4ZWMiLCJ2ZXJzaW9uIiwiUHJlbG9naW5QYXlsb2FkIiwiTnVtYmVyIiwic3ViYnVpbGQiLCJQUkVMT0dJTiIsInRvU3RyaW5nIiwic2VuZExvZ2luN1BhY2tldCIsIkxvZ2luN1BheWxvYWQiLCJ2ZXJzaW9ucyIsImNsaWVudFByb2dWZXIiLCJjbGllbnRQaWQiLCJwaWQiLCJjb25uZWN0aW9uSWQiLCJjbGllbnRUaW1lWm9uZSIsIkRhdGUiLCJnZXRUaW1lem9uZU9mZnNldCIsImNsaWVudExjaWQiLCJmZWRBdXRoIiwiZWNobyIsIndvcmtmbG93IiwiZmVkQXV0aFRva2VuIiwic3NwaSIsImNyZWF0ZU5UTE1SZXF1ZXN0IiwiaG9zdG5hbWUiLCJvcyIsImxpYnJhcnlOYW1lIiwiaW5pdERiRmF0YWwiLCJMT0dJTjciLCJ0b0J1ZmZlciIsInNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlIiwiYWNjZXNzVG9rZW5MZW4iLCJieXRlTGVuZ3RoIiwib2Zmc2V0Iiwid3JpdGVVSW50MzJMRSIsIndyaXRlIiwiRkVEQVVUSF9UT0tFTiIsIlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4iLCJzZW5kSW5pdGlhbFNxbCIsIlNxbEJhdGNoUGF5bG9hZCIsImdldEluaXRpYWxTcWwiLCJjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yIiwiTWVzc2FnZSIsIlNRTF9CQVRDSCIsIm91dGdvaW5nTWVzc2FnZVN0cmVhbSIsIlJlYWRhYmxlIiwicGlwZSIsInB1c2giLCJnZXRJc29sYXRpb25MZXZlbFRleHQiLCJqb2luIiwicHJvY2Vzc2VkSW5pdGlhbFNxbCIsImV4ZWNTcWxCYXRjaCIsIm1ha2VSZXF1ZXN0Iiwic3FsVGV4dE9yUHJvY2VkdXJlIiwiZXhlY1NxbCIsInZhbGlkYXRlUGFyYW1ldGVycyIsImRhdGFiYXNlQ29sbGF0aW9uIiwicGFyYW1ldGVycyIsIlRZUEVTIiwiTlZhckNoYXIiLCJvdXRwdXQiLCJsZW5ndGgiLCJwcmVjaXNpb24iLCJzY2FsZSIsIm1ha2VQYXJhbXNQYXJhbWV0ZXIiLCJSUENfUkVRVUVTVCIsIlJwY1JlcXVlc3RQYXlsb2FkIiwiUHJvY2VkdXJlcyIsIlNwX0V4ZWN1dGVTcWwiLCJuZXdCdWxrTG9hZCIsInRhYmxlIiwiY2FsbGJhY2tPck9wdGlvbnMiLCJCdWxrTG9hZCIsImV4ZWNCdWxrTG9hZCIsImJ1bGtMb2FkIiwicm93cyIsImV4ZWN1dGlvblN0YXJ0ZWQiLCJzdHJlYW1pbmdNb2RlIiwiZmlyc3RSb3dXcml0dGVuIiwicm93U3RyZWFtIiwicm93VG9QYWNrZXRUcmFuc2Zvcm0iLCJvbkNhbmNlbCIsIkJ1bGtMb2FkUGF5bG9hZCIsIlJlcXVlc3QiLCJnZXRCdWxrSW5zZXJ0U3FsIiwiQlVMS19MT0FEIiwicHJlcGFyZSIsIkludCIsInByZXBhcmluZyIsImhhbmRsZSIsIlNwX1ByZXBhcmUiLCJ1bnByZXBhcmUiLCJTcF9VbnByZXBhcmUiLCJleGVjdXRlIiwiZXhlY3V0ZVBhcmFtZXRlcnMiLCJpIiwibGVuIiwicGFyYW1ldGVyIiwidmFsaWRhdGUiLCJTcF9FeGVjdXRlIiwiY2FsbFByb2NlZHVyZSIsImJlZ2luVHJhbnNhY3Rpb24iLCJ0cmFuc2FjdGlvbiIsIlRyYW5zYWN0aW9uIiwiaXNvbGF0aW9uTGV2ZWxUb1RTUUwiLCJUUkFOU0FDVElPTl9NQU5BR0VSIiwiYmVnaW5QYXlsb2FkIiwiY29tbWl0VHJhbnNhY3Rpb24iLCJjb21taXRQYXlsb2FkIiwicm9sbGJhY2tUcmFuc2FjdGlvbiIsInJvbGxiYWNrUGF5bG9hZCIsInNhdmVUcmFuc2FjdGlvbiIsInNhdmVQYXlsb2FkIiwiY2IiLCJ1c2VTYXZlcG9pbnQiLCJjcnlwdG8iLCJyYW5kb21CeXRlcyIsInR4RG9uZSIsImRvbmUiLCJMT0dHRURfSU4iLCJ0eEVyciIsInBhY2tldFR5cGUiLCJjYW5jZWxlZCIsImNvbm5lY3Rpb24iLCJyb3dDb3VudCIsInJzdCIsInBheWxvYWRTdHJlYW0iLCJ1bnBpcGUiLCJpZ25vcmUiLCJwYXVzZWQiLCJyZXN1bWUiLCJyZXNldENvbm5lY3Rpb24iLCJyZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0IiwiU0VOVF9DTElFTlRfUkVRVUVTVCIsInJlc2V0IiwiUkVBRF9VTkNPTU1JVFRFRCIsIlJFUEVBVEFCTEVfUkVBRCIsIlNFUklBTElaQUJMRSIsIlNOQVBTSE9UIiwiaXNUcmFuc2llbnRFcnJvciIsIkFnZ3JlZ2F0ZUVycm9yIiwiZXJyb3JzIiwiaXNUcmFuc2llbnQiLCJfZGVmYXVsdCIsImV4cG9ydHMiLCJtb2R1bGUiLCJyZWFkTWVzc2FnZSIsImNvbmNhdCIsInByZWxvZ2luUGF5bG9hZCIsImVuY3J5cHRpb25TdHJpbmciLCJfdGhpcyRyb3V0aW5nRGF0YSIsInN0YXJ0VGxzIiwiU0VOVF9MT0dJTjdfV0lUSF9GRURBVVRIIiwiU0VOVF9MT0dJTjdfV0lUSF9OVExNIiwicmVjb25uZWN0IiwicmV0cnkiLCJMb2dpbjdUb2tlbkhhbmRsZXIiLCJ0b2tlblN0cmVhbVBhcnNlciIsImxvZ2luQWNrUmVjZWl2ZWQiLCJMT0dHRURfSU5fU0VORElOR19JTklUSUFMX1NRTCIsIm50bG1wYWNrZXQiLCJOVExNUmVzcG9uc2VQYXlsb2FkIiwiTlRMTUFVVEhfUEtUIiwiZmVkQXV0aEluZm9Ub2tlbiIsInN0c3VybCIsInNwbiIsInRva2VuU2NvcGUiLCJVUkwiLCJjcmVkZW50aWFscyIsIlVzZXJuYW1lUGFzc3dvcmRDcmVkZW50aWFsIiwibXNpQXJncyIsIk1hbmFnZWRJZGVudGl0eUNyZWRlbnRpYWwiLCJtYW5hZ2VkSWRlbnRpdHlDbGllbnRJZCIsIkRlZmF1bHRBenVyZUNyZWRlbnRpYWwiLCJDbGllbnRTZWNyZXRDcmVkZW50aWFsIiwidG9rZW5SZXNwb25zZSIsImdldFRva2VuIiwiSW5pdGlhbFNxbFRva2VuSGFuZGxlciIsIl90aGlzJHJlcXVlc3QiLCJfdGhpcyRyZXF1ZXN0MyIsIl90aGlzJHJlcXVlc3QxMCIsIlJlcXVlc3RUb2tlbkhhbmRsZXIiLCJTRU5UX0FUVEVOVElPTiIsIm9uUmVzdW1lIiwib25QYXVzZSIsIl90aGlzJHJlcXVlc3QyIiwicGF1c2UiLCJfdGhpcyRyZXF1ZXN0NCIsIl90aGlzJHJlcXVlc3Q1Iiwib25FbmRPZk1lc3NhZ2UiLCJfdGhpcyRyZXF1ZXN0NiIsIl90aGlzJHJlcXVlc3Q3IiwiX3RoaXMkcmVxdWVzdDgiLCJfdGhpcyRyZXF1ZXN0OSIsInNxbFJlcXVlc3QiLCJuZXh0U3RhdGUiLCJBdHRlbnRpb25Ub2tlbkhhbmRsZXIiLCJhdHRlbnRpb25SZWNlaXZlZCJdLCJzb3VyY2VzIjpbIi4uL3NyYy9jb25uZWN0aW9uLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgKiBhcyB0bHMgZnJvbSAndGxzJztcbmltcG9ydCAqIGFzIG5ldCBmcm9tICduZXQnO1xuaW1wb3J0IGRucyBmcm9tICdkbnMnO1xuXG5pbXBvcnQgY29uc3RhbnRzIGZyb20gJ2NvbnN0YW50cyc7XG5pbXBvcnQgeyB0eXBlIFNlY3VyZUNvbnRleHRPcHRpb25zIH0gZnJvbSAndGxzJztcblxuaW1wb3J0IHsgUmVhZGFibGUgfSBmcm9tICdzdHJlYW0nO1xuXG5pbXBvcnQge1xuICBEZWZhdWx0QXp1cmVDcmVkZW50aWFsLFxuICBDbGllbnRTZWNyZXRDcmVkZW50aWFsLFxuICBNYW5hZ2VkSWRlbnRpdHlDcmVkZW50aWFsLFxuICBVc2VybmFtZVBhc3N3b3JkQ3JlZGVudGlhbCxcbn0gZnJvbSAnQGF6dXJlL2lkZW50aXR5JztcblxuaW1wb3J0IEJ1bGtMb2FkLCB7IHR5cGUgT3B0aW9ucyBhcyBCdWxrTG9hZE9wdGlvbnMsIHR5cGUgQ2FsbGJhY2sgYXMgQnVsa0xvYWRDYWxsYmFjayB9IGZyb20gJy4vYnVsay1sb2FkJztcbmltcG9ydCBEZWJ1ZyBmcm9tICcuL2RlYnVnJztcbmltcG9ydCB7IEV2ZW50RW1pdHRlciwgb25jZSB9IGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQgeyBpbnN0YW5jZUxvb2t1cCB9IGZyb20gJy4vaW5zdGFuY2UtbG9va3VwJztcbmltcG9ydCB7IFRyYW5zaWVudEVycm9yTG9va3VwIH0gZnJvbSAnLi90cmFuc2llbnQtZXJyb3ItbG9va3VwJztcbmltcG9ydCB7IFRZUEUgfSBmcm9tICcuL3BhY2tldCc7XG5pbXBvcnQgUHJlbG9naW5QYXlsb2FkIGZyb20gJy4vcHJlbG9naW4tcGF5bG9hZCc7XG5pbXBvcnQgTG9naW43UGF5bG9hZCBmcm9tICcuL2xvZ2luNy1wYXlsb2FkJztcbmltcG9ydCBOVExNUmVzcG9uc2VQYXlsb2FkIGZyb20gJy4vbnRsbS1wYXlsb2FkJztcbmltcG9ydCBSZXF1ZXN0IGZyb20gJy4vcmVxdWVzdCc7XG5pbXBvcnQgUnBjUmVxdWVzdFBheWxvYWQgZnJvbSAnLi9ycGNyZXF1ZXN0LXBheWxvYWQnO1xuaW1wb3J0IFNxbEJhdGNoUGF5bG9hZCBmcm9tICcuL3NxbGJhdGNoLXBheWxvYWQnO1xuaW1wb3J0IE1lc3NhZ2VJTyBmcm9tICcuL21lc3NhZ2UtaW8nO1xuaW1wb3J0IHsgUGFyc2VyIGFzIFRva2VuU3RyZWFtUGFyc2VyIH0gZnJvbSAnLi90b2tlbi90b2tlbi1zdHJlYW0tcGFyc2VyJztcbmltcG9ydCB7IFRyYW5zYWN0aW9uLCBJU09MQVRJT05fTEVWRUwsIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwgfSBmcm9tICcuL3RyYW5zYWN0aW9uJztcbmltcG9ydCB7IENvbm5lY3Rpb25FcnJvciwgUmVxdWVzdEVycm9yIH0gZnJvbSAnLi9lcnJvcnMnO1xuaW1wb3J0IHsgY29ubmVjdEluUGFyYWxsZWwsIGNvbm5lY3RJblNlcXVlbmNlIH0gZnJvbSAnLi9jb25uZWN0b3InO1xuaW1wb3J0IHsgbmFtZSBhcyBsaWJyYXJ5TmFtZSB9IGZyb20gJy4vbGlicmFyeSc7XG5pbXBvcnQgeyB2ZXJzaW9ucyB9IGZyb20gJy4vdGRzLXZlcnNpb25zJztcbmltcG9ydCBNZXNzYWdlIGZyb20gJy4vbWVzc2FnZSc7XG5pbXBvcnQgeyB0eXBlIE1ldGFkYXRhIH0gZnJvbSAnLi9tZXRhZGF0YS1wYXJzZXInO1xuaW1wb3J0IHsgY3JlYXRlTlRMTVJlcXVlc3QgfSBmcm9tICcuL250bG0nO1xuaW1wb3J0IHsgQ29sdW1uRW5jcnlwdGlvbkF6dXJlS2V5VmF1bHRQcm92aWRlciB9IGZyb20gJy4vYWx3YXlzLWVuY3J5cHRlZC9rZXlzdG9yZS1wcm92aWRlci1henVyZS1rZXktdmF1bHQnO1xuXG5pbXBvcnQgeyBBYm9ydENvbnRyb2xsZXIsIEFib3J0U2lnbmFsIH0gZnJvbSAnbm9kZS1hYm9ydC1jb250cm9sbGVyJztcbmltcG9ydCB7IHR5cGUgUGFyYW1ldGVyLCBUWVBFUyB9IGZyb20gJy4vZGF0YS10eXBlJztcbmltcG9ydCB7IEJ1bGtMb2FkUGF5bG9hZCB9IGZyb20gJy4vYnVsay1sb2FkLXBheWxvYWQnO1xuaW1wb3J0IHsgQ29sbGF0aW9uIH0gZnJvbSAnLi9jb2xsYXRpb24nO1xuaW1wb3J0IFByb2NlZHVyZXMgZnJvbSAnLi9zcGVjaWFsLXN0b3JlZC1wcm9jZWR1cmUnO1xuXG5pbXBvcnQgQWdncmVnYXRlRXJyb3IgZnJvbSAnZXMtYWdncmVnYXRlLWVycm9yJztcbmltcG9ydCB7IHZlcnNpb24gfSBmcm9tICcuLi9wYWNrYWdlLmpzb24nO1xuaW1wb3J0IHsgVVJMIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IEF0dGVudGlvblRva2VuSGFuZGxlciwgSW5pdGlhbFNxbFRva2VuSGFuZGxlciwgTG9naW43VG9rZW5IYW5kbGVyLCBSZXF1ZXN0VG9rZW5IYW5kbGVyLCBUb2tlbkhhbmRsZXIgfSBmcm9tICcuL3Rva2VuL2hhbmRsZXInO1xuXG50eXBlIEJlZ2luVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc3RhcnQgdGhlIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqIEBwYXJhbSB0cmFuc2FjdGlvbkRlc2NyaXB0b3IgQSBCdWZmZXIgdGhhdCBkZXNjcmliZSB0aGUgdHJhbnNhY3Rpb25cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgdHJhbnNhY3Rpb25EZXNjcmlwdG9yPzogQnVmZmVyKSA9PiB2b2lkXG5cbnR5cGUgU2F2ZVRyYW5zYWN0aW9uQ2FsbGJhY2sgPVxuICAvKipcbiAgICogVGhlIGNhbGxiYWNrIGlzIGNhbGxlZCB3aGVuIHRoZSByZXF1ZXN0IHRvIHNldCBhIHNhdmVwb2ludCB3aXRoaW4gdGhlXG4gICAqIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gZXJyIElmIGFuIGVycm9yIG9jY3VycmVkLCBhbiBbW0Vycm9yXV0gb2JqZWN0IHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQpID0+IHZvaWQ7XG5cbnR5cGUgQ29tbWl0VHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gY29tbWl0IHRoZSB0cmFuc2FjdGlvbiBoYXMgY29tcGxldGVkLFxuICAgKiBlaXRoZXIgc3VjY2Vzc2Z1bGx5IG9yIHdpdGggYW4gZXJyb3IuXG4gICAqIElmIGFuIGVycm9yIG9jY3VycmVkIHRoZW4gYGVycmAgd2lsbCBkZXNjcmliZSB0aGUgZXJyb3IuXG4gICAqXG4gICAqIEFzIG9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24sIGFub3RoZXIgcmVxdWVzdCBzaG91bGQgbm90XG4gICAqIGJlIGluaXRpYXRlZCB1bnRpbCB0aGlzIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG50eXBlIFJvbGxiYWNrVHJhbnNhY3Rpb25DYWxsYmFjayA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uIGhhc1xuICAgKiBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBlcnIgd2lsbCBkZXNjcmliZSB0aGUgZXJyb3IuXG4gICAqXG4gICAqIEFzIG9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24sIGFub3RoZXIgcmVxdWVzdCBzaG91bGQgbm90XG4gICAqIGJlIGluaXRpYXRlZCB1bnRpbCB0aGlzIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkKSA9PiB2b2lkO1xuXG50eXBlIFJlc2V0Q2FsbGJhY2sgPVxuICAvKipcbiAgICogVGhlIGNhbGxiYWNrIGlzIGNhbGxlZCB3aGVuIHRoZSBjb25uZWN0aW9uIHJlc2V0IGhhcyBjb21wbGV0ZWQsXG4gICAqIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICpcbiAgICogSWYgYW4gZXJyb3Igb2NjdXJyZWQgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlclxuICAgKiByZXF1ZXN0IHNob3VsZCBub3QgYmUgaW5pdGlhdGVkIHVudGlsIHRoaXMgY2FsbGJhY2sgaXMgY2FsbGVkXG4gICAqXG4gICAqIEBwYXJhbSBlcnIgSWYgYW4gZXJyb3Igb2NjdXJyZWQsIGFuIFtbRXJyb3JdXSBvYmplY3Qgd2l0aCBkZXRhaWxzIG9mIHRoZSBlcnJvci5cbiAgICovXG4gIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4gdm9pZDtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnVzZWQtdmFyc1xudHlwZSBUcmFuc2FjdGlvbkNhbGxiYWNrPFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkPiA9XG4gIC8qKlxuICAgKiBUaGUgY2FsbGJhY2sgaXMgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3QgdG8gc3RhcnQgYSB0cmFuc2FjdGlvbiAob3IgY3JlYXRlIGEgc2F2ZXBvaW50LCBpblxuICAgKiB0aGUgY2FzZSBvZiBhIG5lc3RlZCB0cmFuc2FjdGlvbikgaGFzIGNvbXBsZXRlZCwgZWl0aGVyIHN1Y2Nlc3NmdWxseSBvciB3aXRoIGFuIGVycm9yLlxuICAgKiBJZiBhbiBlcnJvciBvY2N1cnJlZCwgdGhlbiBgZXJyYCB3aWxsIGRlc2NyaWJlIHRoZSBlcnJvci5cbiAgICogSWYgbm8gZXJyb3Igb2NjdXJyZWQsIHRoZSBjYWxsYmFjayBzaG91bGQgcGVyZm9ybSBpdHMgd29yayBhbmQgZXZlbnR1YWxseSBjYWxsXG4gICAqIGBkb25lYCB3aXRoIGFuIGVycm9yIG9yIG51bGwgKHRvIHRyaWdnZXIgYSB0cmFuc2FjdGlvbiByb2xsYmFjayBvciBhXG4gICAqIHRyYW5zYWN0aW9uIGNvbW1pdCkgYW5kIGFuIGFkZGl0aW9uYWwgY29tcGxldGlvbiBjYWxsYmFjayB0aGF0IHdpbGwgYmUgY2FsbGVkIHdoZW4gdGhlIHJlcXVlc3RcbiAgICogdG8gcm9sbGJhY2sgb3IgY29tbWl0IHRoZSBjdXJyZW50IHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQsIGVpdGhlciBzdWNjZXNzZnVsbHkgb3Igd2l0aCBhbiBlcnJvci5cbiAgICogQWRkaXRpb25hbCBhcmd1bWVudHMgZ2l2ZW4gdG8gYGRvbmVgIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdG8gdGhpcyBjYWxsYmFjay5cbiAgICpcbiAgICogQXMgb25seSBvbmUgcmVxdWVzdCBhdCBhIHRpbWUgbWF5IGJlIGV4ZWN1dGVkIG9uIGEgY29ubmVjdGlvbiwgYW5vdGhlciByZXF1ZXN0IHNob3VsZCBub3RcbiAgICogYmUgaW5pdGlhdGVkIHVudGlsIHRoZSBjb21wbGV0aW9uIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnJvciBvY2N1cnJlZCwgYW4gW1tFcnJvcl1dIG9iamVjdCB3aXRoIGRldGFpbHMgb2YgdGhlIGVycm9yLlxuICAgKiBAcGFyYW0gdHhEb25lIElmIG5vIGVycm9yIG9jY3VycmVkLCBhIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB0byBjb21taXQgb3Igcm9sbGJhY2sgdGhlIHRyYW5zYWN0aW9uLlxuICAgKi9cbiAgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCB0eERvbmU/OiBUcmFuc2FjdGlvbkRvbmU8VD4pID0+IHZvaWQ7XG5cbnR5cGUgVHJhbnNhY3Rpb25Eb25lQ2FsbGJhY2sgPSAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkO1xudHlwZSBDYWxsYmFja1BhcmFtZXRlcnM8VCBleHRlbmRzIChlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgLi4uYXJnczogYW55W10pID0+IGFueT4gPSBUIGV4dGVuZHMgKGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCAuLi5hcmdzOiBpbmZlciBQKSA9PiBhbnkgPyBQIDogbmV2ZXI7XG5cbnR5cGUgVHJhbnNhY3Rpb25Eb25lPFQgZXh0ZW5kcyAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIC4uLmFyZ3M6IGFueVtdKSA9PiB2b2lkPiA9XG4gIC8qKlxuICAgKiBJZiBubyBlcnJvciBvY2N1cnJlZCwgYSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgdG8gY29tbWl0IG9yIHJvbGxiYWNrIHRoZSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGVyciBJZiBhbiBlcnIgb2NjdXJyZWQsIGEgc3RyaW5nIHdpdGggZGV0YWlscyBvZiB0aGUgZXJyb3IuXG4gICAqL1xuICAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIGRvbmU6IFQsIC4uLmFyZ3M6IENhbGxiYWNrUGFyYW1ldGVyczxUPikgPT4gdm9pZDtcblxuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBLRUVQX0FMSVZFX0lOSVRJQUxfREVMQVkgPSAzMCAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ09OTkVDVF9USU1FT1VUID0gMTUgKiAxMDAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0NMSUVOVF9SRVFVRVNUX1RJTUVPVVQgPSAxNSAqIDEwMDA7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfQ0FOQ0VMX1RJTUVPVVQgPSA1ICogMTAwMDtcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9DT05ORUNUX1JFVFJZX0lOVEVSVkFMID0gNTAwO1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX1BBQ0tFVF9TSVpFID0gNCAqIDEwMjQ7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfVEVYVFNJWkUgPSAyMTQ3NDgzNjQ3O1xuLyoqXG4gKiBAcHJpdmF0ZVxuICovXG5jb25zdCBERUZBVUxUX0RBVEVGSVJTVCA9IDc7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfUE9SVCA9IDE0MzM7XG4vKipcbiAqIEBwcml2YXRlXG4gKi9cbmNvbnN0IERFRkFVTFRfVERTX1ZFUlNJT04gPSAnN180Jztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9MQU5HVUFHRSA9ICd1c19lbmdsaXNoJztcbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgREVGQVVMVF9EQVRFRk9STUFUID0gJ21keSc7XG5cbmludGVyZmFjZSBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBJZiB5b3UgdXNlciB3YW50IHRvIGNvbm5lY3QgdG8gYW4gQXp1cmUgYXBwIHNlcnZpY2UgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlIHRvIHRoZWlyIGNyZWF0ZWQgaWRlbnRpdHkuXG4gICAgICpcbiAgICAgKiBUaGlzIGlzIG9wdGlvbmFsIGZvciByZXRyaWV2ZSB0b2tlbiBmcm9tIGF6dXJlIHdlYiBhcHAgc2VydmljZVxuICAgICAqL1xuICAgIGNsaWVudElkPzogc3RyaW5nO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lWbUF1dGhlbnRpY2F0aW9uIHtcbiAgdHlwZTogJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLXZtJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB3YW50IHRvIGNvbm5lY3QgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlZCB0byB0aGVpciBjcmVhdGVkIGlkZW50aXR5LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBvcHRpb25hbCBmb3IgcmV0cmlldmUgYSB0b2tlblxuICAgICAqL1xuICAgIGNsaWVudElkPzogc3RyaW5nO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgQXp1cmVBY3RpdmVEaXJlY3RvcnlEZWZhdWx0QXV0aGVudGljYXRpb24ge1xuICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIElmIHlvdSB3YW50IHRvIGNvbm5lY3QgdXNpbmcgYSBzcGVjaWZpYyBjbGllbnQgYWNjb3VudFxuICAgICAqIHRoZXkgbmVlZCB0byBwcm92aWRlIGBjbGllbnRJZGAgYXNzb2NpYXRlZCB0byB0aGVpciBjcmVhdGVkIGlkZW50aXR5LlxuICAgICAqXG4gICAgICogVGhpcyBpcyBvcHRpb25hbCBmb3IgcmV0cmlldmluZyBhIHRva2VuXG4gICAgICovXG4gICAgY2xpZW50SWQ/OiBzdHJpbmc7XG4gIH07XG59XG5cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbic7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBIHVzZXIgbmVlZCB0byBwcm92aWRlIGB0b2tlbmAgd2hpY2ggdGhleSByZXRyaWV2ZWQgZWxzZSB3aGVyZVxuICAgICAqIHRvIGZvcm1pbmcgdGhlIGNvbm5lY3Rpb24uXG4gICAgICovXG4gICAgdG9rZW46IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5UGFzc3dvcmRBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIEEgdXNlciBuZWVkIHRvIHByb3ZpZGUgYHVzZXJOYW1lYCBhc3NvY2lhdGUgdG8gdGhlaXIgYWNjb3VudC5cbiAgICAgKi9cbiAgICB1c2VyTmFtZTogc3RyaW5nO1xuXG4gICAgLyoqXG4gICAgICogQSB1c2VyIG5lZWQgdG8gcHJvdmlkZSBgcGFzc3dvcmRgIGFzc29jaWF0ZSB0byB0aGVpciBhY2NvdW50LlxuICAgICAqL1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG5cbiAgICAvKipcbiAgICAgKiBBIGNsaWVudCBpZCB0byB1c2UuXG4gICAgICovXG4gICAgY2xpZW50SWQ6IHN0cmluZztcblxuICAgIC8qKlxuICAgICAqIE9wdGlvbmFsIHBhcmFtZXRlciBmb3Igc3BlY2lmaWMgQXp1cmUgdGVuYW50IElEXG4gICAgICovXG4gICAgdGVuYW50SWQ6IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB7XG4gIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc7XG4gIG9wdGlvbnM6IHtcbiAgICAvKipcbiAgICAgKiBBcHBsaWNhdGlvbiAoYGNsaWVudGApIElEIGZyb20geW91ciByZWdpc3RlcmVkIEF6dXJlIGFwcGxpY2F0aW9uXG4gICAgICovXG4gICAgY2xpZW50SWQ6IHN0cmluZztcbiAgICAvKipcbiAgICAgKiBUaGUgY3JlYXRlZCBgY2xpZW50IHNlY3JldGAgZm9yIHRoaXMgcmVnaXN0ZXJlZCBBenVyZSBhcHBsaWNhdGlvblxuICAgICAqL1xuICAgIGNsaWVudFNlY3JldDogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIERpcmVjdG9yeSAoYHRlbmFudGApIElEIGZyb20geW91ciByZWdpc3RlcmVkIEF6dXJlIGFwcGxpY2F0aW9uXG4gICAgICovXG4gICAgdGVuYW50SWQ6IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIE50bG1BdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdudGxtJztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIFVzZXIgbmFtZSBmcm9tIHlvdXIgd2luZG93cyBhY2NvdW50LlxuICAgICAqL1xuICAgIHVzZXJOYW1lOiBzdHJpbmc7XG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgZnJvbSB5b3VyIHdpbmRvd3MgYWNjb3VudC5cbiAgICAgKi9cbiAgICBwYXNzd29yZDogc3RyaW5nO1xuICAgIC8qKlxuICAgICAqIE9uY2UgeW91IHNldCBkb21haW4gZm9yIG50bG0gYXV0aGVudGljYXRpb24gdHlwZSwgZHJpdmVyIHdpbGwgY29ubmVjdCB0byBTUUwgU2VydmVyIHVzaW5nIGRvbWFpbiBsb2dpbi5cbiAgICAgKlxuICAgICAqIFRoaXMgaXMgbmVjZXNzYXJ5IGZvciBmb3JtaW5nIGEgY29ubmVjdGlvbiB1c2luZyBudGxtIHR5cGVcbiAgICAgKi9cbiAgICBkb21haW46IHN0cmluZztcbiAgfTtcbn1cblxuaW50ZXJmYWNlIERlZmF1bHRBdXRoZW50aWNhdGlvbiB7XG4gIHR5cGU6ICdkZWZhdWx0JztcbiAgb3B0aW9uczoge1xuICAgIC8qKlxuICAgICAqIFVzZXIgbmFtZSB0byB1c2UgZm9yIHNxbCBzZXJ2ZXIgbG9naW4uXG4gICAgICovXG4gICAgdXNlck5hbWU/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgLyoqXG4gICAgICogUGFzc3dvcmQgdG8gdXNlIGZvciBzcWwgc2VydmVyIGxvZ2luLlxuICAgICAqL1xuICAgIHBhc3N3b3JkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgRXJyb3JXaXRoQ29kZSBleHRlbmRzIEVycm9yIHtcbiAgY29kZT86IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEludGVybmFsQ29ubmVjdGlvbkNvbmZpZyB7XG4gIHNlcnZlcjogc3RyaW5nO1xuICBhdXRoZW50aWNhdGlvbjogRGVmYXVsdEF1dGhlbnRpY2F0aW9uIHwgTnRsbUF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlQYXNzd29yZEF1dGhlbnRpY2F0aW9uIHwgQXp1cmVBY3RpdmVEaXJlY3RvcnlNc2lBcHBTZXJ2aWNlQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeUFjY2Vzc1Rva2VuQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQgfCBBenVyZUFjdGl2ZURpcmVjdG9yeURlZmF1bHRBdXRoZW50aWNhdGlvbjtcbiAgb3B0aW9uczogSW50ZXJuYWxDb25uZWN0aW9uT3B0aW9ucztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnRlcm5hbENvbm5lY3Rpb25PcHRpb25zIHtcbiAgYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I6IGJvb2xlYW47XG4gIGFwcE5hbWU6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgY2FtZWxDYXNlQ29sdW1uczogYm9vbGVhbjtcbiAgY2FuY2VsVGltZW91dDogbnVtYmVyO1xuICBjb2x1bW5FbmNyeXB0aW9uS2V5Q2FjaGVUVEw6IG51bWJlcjtcbiAgY29sdW1uRW5jcnlwdGlvblNldHRpbmc6IGJvb2xlYW47XG4gIGNvbHVtbk5hbWVSZXBsYWNlcjogdW5kZWZpbmVkIHwgKChjb2xOYW1lOiBzdHJpbmcsIGluZGV4OiBudW1iZXIsIG1ldGFkYXRhOiBNZXRhZGF0YSkgPT4gc3RyaW5nKTtcbiAgY29ubmVjdGlvblJldHJ5SW50ZXJ2YWw6IG51bWJlcjtcbiAgY29ubmVjdG9yOiB1bmRlZmluZWQgfCAoKCkgPT4gUHJvbWlzZTxuZXQuU29ja2V0Pik7XG4gIGNvbm5lY3RUaW1lb3V0OiBudW1iZXI7XG4gIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXTtcbiAgY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgZGF0YWJhc2U6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgZGF0ZWZpcnN0OiBudW1iZXI7XG4gIGRhdGVGb3JtYXQ6IHN0cmluZztcbiAgZGVidWc6IHtcbiAgICBkYXRhOiBib29sZWFuO1xuICAgIHBhY2tldDogYm9vbGVhbjtcbiAgICBwYXlsb2FkOiBib29sZWFuO1xuICAgIHRva2VuOiBib29sZWFuO1xuICB9O1xuICBlbmFibGVBbnNpTnVsbDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUFuc2lQYWRkaW5nOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQW5zaVdhcm5pbmdzOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQXJpdGhBYm9ydDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDogbnVsbCB8IGJvb2xlYW47XG4gIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IG51bGwgfCBib29sZWFuO1xuICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiBudWxsIHwgYm9vbGVhbjtcbiAgZW5jcnlwdDogc3RyaW5nIHwgYm9vbGVhbjtcbiAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiBLZXlTdG9yZVByb3ZpZGVyTWFwIHwgdW5kZWZpbmVkO1xuICBmYWxsYmFja1RvRGVmYXVsdERiOiBib29sZWFuO1xuICBpbnN0YW5jZU5hbWU6IHVuZGVmaW5lZCB8IHN0cmluZztcbiAgaXNvbGF0aW9uTGV2ZWw6IHR5cGVvZiBJU09MQVRJT05fTEVWRUxba2V5b2YgdHlwZW9mIElTT0xBVElPTl9MRVZFTF07XG4gIGxhbmd1YWdlOiBzdHJpbmc7XG4gIGxvY2FsQWRkcmVzczogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBtYXhSZXRyaWVzT25UcmFuc2llbnRFcnJvcnM6IG51bWJlcjtcbiAgbXVsdGlTdWJuZXRGYWlsb3ZlcjogYm9vbGVhbjtcbiAgcGFja2V0U2l6ZTogbnVtYmVyO1xuICBwb3J0OiB1bmRlZmluZWQgfCBudW1iZXI7XG4gIHJlYWRPbmx5SW50ZW50OiBib29sZWFuO1xuICByZXF1ZXN0VGltZW91dDogbnVtYmVyO1xuICByb3dDb2xsZWN0aW9uT25Eb25lOiBib29sZWFuO1xuICByb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbjogYm9vbGVhbjtcbiAgc2VydmVyTmFtZTogdW5kZWZpbmVkIHwgc3RyaW5nO1xuICBzZXJ2ZXJTdXBwb3J0c0NvbHVtbkVuY3J5cHRpb246IGJvb2xlYW47XG4gIHRkc1ZlcnNpb246IHN0cmluZztcbiAgdGV4dHNpemU6IG51bWJlcjtcbiAgdHJ1c3RlZFNlcnZlck5hbWVBRTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB0cnVzdFNlcnZlckNlcnRpZmljYXRlOiBib29sZWFuO1xuICB1c2VDb2x1bW5OYW1lczogYm9vbGVhbjtcbiAgdXNlVVRDOiBib29sZWFuO1xuICB3b3Jrc3RhdGlvbklkOiB1bmRlZmluZWQgfCBzdHJpbmc7XG4gIGxvd2VyQ2FzZUd1aWRzOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgS2V5U3RvcmVQcm92aWRlck1hcCB7XG4gIFtrZXk6IHN0cmluZ106IENvbHVtbkVuY3J5cHRpb25BenVyZUtleVZhdWx0UHJvdmlkZXI7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuaW50ZXJmYWNlIFN0YXRlIHtcbiAgbmFtZTogc3RyaW5nO1xuICBlbnRlcj8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIGV4aXQ/KHRoaXM6IENvbm5lY3Rpb24sIG5ld1N0YXRlOiBTdGF0ZSk6IHZvaWQ7XG4gIGV2ZW50czoge1xuICAgIHNvY2tldEVycm9yPyh0aGlzOiBDb25uZWN0aW9uLCBlcnI6IEVycm9yKTogdm9pZDtcbiAgICBjb25uZWN0VGltZW91dD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gICAgbWVzc2FnZT8odGhpczogQ29ubmVjdGlvbiwgbWVzc2FnZTogTWVzc2FnZSk6IHZvaWQ7XG4gICAgcmV0cnk/KHRoaXM6IENvbm5lY3Rpb24pOiB2b2lkO1xuICAgIHJlY29ubmVjdD8odGhpczogQ29ubmVjdGlvbik6IHZvaWQ7XG4gIH07XG59XG5cbnR5cGUgQXV0aGVudGljYXRpb24gPSBEZWZhdWx0QXV0aGVudGljYXRpb24gfFxuICBOdGxtQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24gfFxuICBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5QWNjZXNzVG9rZW5BdXRoZW50aWNhdGlvbiB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB8XG4gIEF6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uO1xuXG50eXBlIEF1dGhlbnRpY2F0aW9uVHlwZSA9IEF1dGhlbnRpY2F0aW9uWyd0eXBlJ107XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29ubmVjdGlvbkNvbmZpZ3VyYXRpb24ge1xuICAvKipcbiAgICogSG9zdG5hbWUgdG8gY29ubmVjdCB0by5cbiAgICovXG4gIHNlcnZlcjogc3RyaW5nO1xuICAvKipcbiAgICogQ29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBmb3JtaW5nIHRoZSBjb25uZWN0aW9uLlxuICAgKi9cbiAgb3B0aW9ucz86IENvbm5lY3Rpb25PcHRpb25zO1xuICAvKipcbiAgICogQXV0aGVudGljYXRpb24gcmVsYXRlZCBvcHRpb25zIGZvciBjb25uZWN0aW9uLlxuICAgKi9cbiAgYXV0aGVudGljYXRpb24/OiBBdXRoZW50aWNhdGlvbk9wdGlvbnM7XG59XG5cbmludGVyZmFjZSBEZWJ1Z09wdGlvbnMge1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkYXRhIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBkYXRhOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBkZXRhaWxzXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgcGFja2V0OiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHBhY2tldCBwYXlsb2FkIGRldGFpbHNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBwYXlsb2FkOiBib29sZWFuO1xuICAvKipcbiAgICogQSBib29sZWFuLCBjb250cm9sbGluZyB3aGV0aGVyIFtbZGVidWddXSBldmVudHMgd2lsbCBiZSBlbWl0dGVkIHdpdGggdGV4dCBkZXNjcmliaW5nIHRva2VuIHN0cmVhbSB0b2tlbnNcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICB0b2tlbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIEF1dGhlbnRpY2F0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBUeXBlIG9mIHRoZSBhdXRoZW50aWNhdGlvbiBtZXRob2QsIHZhbGlkIHR5cGVzIGFyZSBgZGVmYXVsdGAsIGBudGxtYCxcbiAgICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW5gLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1gLCBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgLFxuICAgKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0YFxuICAgKiBvciBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgXG4gICAqL1xuICB0eXBlPzogQXV0aGVudGljYXRpb25UeXBlO1xuICAvKipcbiAgICogRGlmZmVyZW50IG9wdGlvbnMgZm9yIGF1dGhlbnRpY2F0aW9uIHR5cGVzOlxuICAgKlxuICAgKiAqIGBkZWZhdWx0YDogW1tEZWZhdWx0QXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYG50bG1gIDpbW050bG1BdXRoZW50aWNhdGlvbl1dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24ub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuYCA6IFtbQXp1cmVBY3RpdmVEaXJlY3RvcnlBY2Nlc3NUb2tlbkF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKiAqIGBhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bWAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5TXNpVm1BdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2VgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbi5vcHRpb25zXV1cbiAgICogKiBgYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXRgIDogW1tBenVyZUFjdGl2ZURpcmVjdG9yeVNlcnZpY2VQcmluY2lwYWxTZWNyZXQub3B0aW9uc11dXG4gICAqICogYGF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktZGVmYXVsdGAgOiBbW0F6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uLm9wdGlvbnNdXVxuICAgKi9cbiAgb3B0aW9ucz86IGFueTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25uZWN0aW9uT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byByb2xsYmFjayBhIHRyYW5zYWN0aW9uIGF1dG9tYXRpY2FsbHkgaWYgYW55IGVycm9yIGlzIGVuY291bnRlcmVkXG4gICAqIGR1cmluZyB0aGUgZ2l2ZW4gdHJhbnNhY3Rpb24ncyBleGVjdXRpb24uIFRoaXMgc2V0cyB0aGUgdmFsdWUgZm9yIGBTRVQgWEFDVF9BQk9SVGAgZHVyaW5nIHRoZVxuICAgKiBpbml0aWFsIFNRTCBwaGFzZSBvZiBhIGNvbm5lY3Rpb24gW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC14YWN0LWFib3J0LXRyYW5zYWN0LXNxbCkuXG4gICAqL1xuICBhYm9ydFRyYW5zYWN0aW9uT25FcnJvcj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEFwcGxpY2F0aW9uIG5hbWUgdXNlZCBmb3IgaWRlbnRpZnlpbmcgYSBzcGVjaWZpYyBhcHBsaWNhdGlvbiBpbiBwcm9maWxpbmcsIGxvZ2dpbmcgb3IgdHJhY2luZyB0b29scyBvZiBTUUxTZXJ2ZXIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgVGVkaW91c2ApXG4gICAqL1xuICBhcHBOYW1lPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xsaW5nIHdoZXRoZXIgdGhlIGNvbHVtbiBuYW1lcyByZXR1cm5lZCB3aWxsIGhhdmUgdGhlIGZpcnN0IGxldHRlciBjb252ZXJ0ZWQgdG8gbG93ZXIgY2FzZVxuICAgKiAoYHRydWVgKSBvciBub3QuIFRoaXMgdmFsdWUgaXMgaWdub3JlZCBpZiB5b3UgcHJvdmlkZSBhIFtbY29sdW1uTmFtZVJlcGxhY2VyXV0uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIGNhbWVsQ2FzZUNvbHVtbnM/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBiZWZvcmUgdGhlIFtbUmVxdWVzdC5jYW5jZWxdXSAoYWJvcnQpIG9mIGEgcmVxdWVzdCBpcyBjb25zaWRlcmVkIGZhaWxlZFxuICAgKlxuICAgKiAoZGVmYXVsdDogYDUwMDBgKS5cbiAgICovXG4gIGNhbmNlbFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIEEgZnVuY3Rpb24gd2l0aCBwYXJhbWV0ZXJzIGAoY29sdW1uTmFtZSwgaW5kZXgsIGNvbHVtbk1ldGFEYXRhKWAgYW5kIHJldHVybmluZyBhIHN0cmluZy4gSWYgcHJvdmlkZWQsXG4gICAqIHRoaXMgd2lsbCBiZSBjYWxsZWQgb25jZSBwZXIgY29sdW1uIHBlciByZXN1bHQtc2V0LiBUaGUgcmV0dXJuZWQgdmFsdWUgd2lsbCBiZSB1c2VkIGluc3RlYWQgb2YgdGhlIFNRTC1wcm92aWRlZFxuICAgKiBjb2x1bW4gbmFtZSBvbiByb3cgYW5kIG1ldGEgZGF0YSBvYmplY3RzLiBUaGlzIGFsbG93cyB5b3UgdG8gZHluYW1pY2FsbHkgY29udmVydCBiZXR3ZWVuIG5hbWluZyBjb252ZW50aW9ucy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBudWxsYClcbiAgICovXG4gIGNvbHVtbk5hbWVSZXBsYWNlcj86IChjb2xOYW1lOiBzdHJpbmcsIGluZGV4OiBudW1iZXIsIG1ldGFkYXRhOiBNZXRhZGF0YSkgPT4gc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBOdW1iZXIgb2YgbWlsbGlzZWNvbmRzIGJlZm9yZSByZXRyeWluZyB0byBlc3RhYmxpc2ggY29ubmVjdGlvbiwgaW4gY2FzZSBvZiB0cmFuc2llbnQgZmFpbHVyZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6YDUwMGApXG4gICAqL1xuICBjb25uZWN0aW9uUmV0cnlJbnRlcnZhbD86IG51bWJlcjtcblxuICAvKipcbiAgICogQ3VzdG9tIGNvbm5lY3RvciBmYWN0b3J5IG1ldGhvZC5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB1bmRlZmluZWRgKVxuICAgKi9cbiAgY29ubmVjdG9yPzogKCkgPT4gUHJvbWlzZTxuZXQuU29ja2V0PjtcblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmVmb3JlIHRoZSBhdHRlbXB0IHRvIGNvbm5lY3QgaXMgY29uc2lkZXJlZCBmYWlsZWRcbiAgICpcbiAgICogKGRlZmF1bHQ6IGAxNTAwMGApLlxuICAgKi9cbiAgY29ubmVjdFRpbWVvdXQ/OiBudW1iZXI7XG5cbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGlzb2xhdGlvbiBsZXZlbCBmb3IgbmV3IGNvbm5lY3Rpb25zLiBBbGwgb3V0LW9mLXRyYW5zYWN0aW9uIHF1ZXJpZXMgYXJlIGV4ZWN1dGVkIHdpdGggdGhpcyBzZXR0aW5nLlxuICAgKlxuICAgKiBUaGUgaXNvbGF0aW9uIGxldmVscyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5JU09MQVRJT05fTEVWRUxgLlxuICAgKiAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAqIGBSRUFEX0NPTU1JVFRFRGBcbiAgICogKiBgUkVQRUFUQUJMRV9SRUFEYFxuICAgKiAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICogYFNOQVBTSE9UYFxuICAgKlxuICAgKiAoZGVmYXVsdDogYFJFQURfQ09NTUlURURgKS5cbiAgICovXG4gIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbD86IG51bWJlcjtcblxuICAvKipcbiAgICogV2hlbiBlbmNyeXB0aW9uIGlzIHVzZWQsIGFuIG9iamVjdCBtYXkgYmUgc3VwcGxpZWQgdGhhdCB3aWxsIGJlIHVzZWRcbiAgICogZm9yIHRoZSBmaXJzdCBhcmd1bWVudCB3aGVuIGNhbGxpbmcgW2B0bHMuY3JlYXRlU2VjdXJlUGFpcmBdKGh0dHA6Ly9ub2RlanMub3JnL2RvY3MvbGF0ZXN0L2FwaS90bHMuaHRtbCN0bHNfdGxzX2NyZWF0ZXNlY3VyZXBhaXJfY3JlZGVudGlhbHNfaXNzZXJ2ZXJfcmVxdWVzdGNlcnRfcmVqZWN0dW5hdXRob3JpemVkKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHt9YClcbiAgICovXG4gIGNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscz86IFNlY3VyZUNvbnRleHRPcHRpb25zO1xuXG4gIC8qKlxuICAgKiBEYXRhYmFzZSB0byBjb25uZWN0IHRvIChkZWZhdWx0OiBkZXBlbmRlbnQgb24gc2VydmVyIGNvbmZpZ3VyYXRpb24pLlxuICAgKi9cbiAgZGF0YWJhc2U/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGZpcnN0IGRheSBvZiB0aGUgd2VlayB0byBhIG51bWJlciBmcm9tIDEgdGhyb3VnaCA3LlxuICAgKi9cbiAgZGF0ZWZpcnN0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgcG9zaXRpb24gb2YgbW9udGgsIGRheSBhbmQgeWVhciBpbiB0ZW1wb3JhbCBkYXRhdHlwZXMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgbWR5YClcbiAgICovXG4gIGRhdGVGb3JtYXQ/OiBzdHJpbmc7XG5cbiAgZGVidWc/OiBEZWJ1Z09wdGlvbnM7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgY29udHJvbHMgdGhlIHdheSBudWxsIHZhbHVlcyBzaG91bGQgYmUgdXNlZCBkdXJpbmcgY29tcGFyaXNvbiBvcGVyYXRpb24uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBbnNpTnVsbD86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIGBTRVQgQU5TSV9OVUxMX0RGTFRfT04gT05gIHdpbGwgYmUgc2V0IGluIHRoZSBpbml0aWFsIHNxbC4gVGhpcyBtZWFucyBuZXcgY29sdW1ucyB3aWxsIGJlXG4gICAqIG51bGxhYmxlIGJ5IGRlZmF1bHQuIFNlZSB0aGUgW1QtU1FMIGRvY3VtZW50YXRpb25dKGh0dHBzOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvbXMxODczNzUuYXNweClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYCkuXG4gICAqL1xuICBlbmFibGVBbnNpTnVsbERlZmF1bHQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xzIGlmIHBhZGRpbmcgc2hvdWxkIGJlIGFwcGxpZWQgZm9yIHZhbHVlcyBzaG9ydGVyIHRoYW4gdGhlIHNpemUgb2YgZGVmaW5lZCBjb2x1bW4uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVBbnNpUGFkZGluZz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIHRydWUsIFNRTCBTZXJ2ZXIgd2lsbCBmb2xsb3cgSVNPIHN0YW5kYXJkIGJlaGF2aW9yIGR1cmluZyB2YXJpb3VzIGVycm9yIGNvbmRpdGlvbnMuIEZvciBkZXRhaWxzLFxuICAgKiBzZWUgW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC1hbnNpLXdhcm5pbmdzLXRyYW5zYWN0LXNxbClcbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFuc2lXYXJuaW5ncz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEVuZHMgYSBxdWVyeSB3aGVuIGFuIG92ZXJmbG93IG9yIGRpdmlkZS1ieS16ZXJvIGVycm9yIG9jY3VycyBkdXJpbmcgcXVlcnkgZXhlY3V0aW9uLlxuICAgKiBTZWUgW2RvY3VtZW50YXRpb25dKGh0dHBzOi8vZG9jcy5taWNyb3NvZnQuY29tL2VuLXVzL3NxbC90LXNxbC9zdGF0ZW1lbnRzL3NldC1hcml0aGFib3J0LXRyYW5zYWN0LXNxbD92aWV3PXNxbC1zZXJ2ZXItMjAxNylcbiAgICogZm9yIG1vcmUgZGV0YWlscy5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGB0cnVlYClcbiAgICovXG4gIGVuYWJsZUFyaXRoQWJvcnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGRldGVybWluZXMgaWYgY29uY2F0ZW5hdGlvbiB3aXRoIE5VTEwgc2hvdWxkIHJlc3VsdCBpbiBOVUxMIG9yIGVtcHR5IHN0cmluZyB2YWx1ZSwgbW9yZSBkZXRhaWxzIGluXG4gICAqIFtkb2N1bWVudGF0aW9uXShodHRwczovL2RvY3MubWljcm9zb2Z0LmNvbS9lbi11cy9zcWwvdC1zcWwvc3RhdGVtZW50cy9zZXQtY29uY2F0LW51bGwteWllbGRzLW51bGwtdHJhbnNhY3Qtc3FsKVxuICAgKlxuICAgKiAoZGVmYXVsdDogYHRydWVgKVxuICAgKi9cbiAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGNvbnRyb2xzIHdoZXRoZXIgY3Vyc29yIHNob3VsZCBiZSBjbG9zZWQsIGlmIHRoZSB0cmFuc2FjdGlvbiBvcGVuaW5nIGl0IGdldHMgY29tbWl0dGVkIG9yIHJvbGxlZFxuICAgKiBiYWNrLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYG51bGxgKVxuICAgKi9cbiAgZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdD86IGJvb2xlYW4gfCBudWxsO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIHNldHMgdGhlIGNvbm5lY3Rpb24gdG8gZWl0aGVyIGltcGxpY2l0IG9yIGF1dG9jb21taXQgdHJhbnNhY3Rpb24gbW9kZS5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBlbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIElmIGZhbHNlLCBlcnJvciBpcyBub3QgZ2VuZXJhdGVkIGR1cmluZyBsb3NzIG9mIHByZWNlc3Npb24uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKi9cbiAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBJZiB0cnVlLCBjaGFyYWN0ZXJzIGVuY2xvc2VkIGluIHNpbmdsZSBxdW90ZXMgYXJlIHRyZWF0ZWQgYXMgbGl0ZXJhbHMgYW5kIHRob3NlIGVuY2xvc2VkIGRvdWJsZSBxdW90ZXMgYXJlIHRyZWF0ZWQgYXMgaWRlbnRpZmllcnMuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmFibGVRdW90ZWRJZGVudGlmaWVyPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogQSBzdHJpbmcgdmFsdWUgdGhhdCBjYW4gYmUgb25seSBzZXQgdG8gJ3N0cmljdCcsIHdoaWNoIGluZGljYXRlcyB0aGUgdXNhZ2UgVERTIDguMCBwcm90b2NvbC4gT3RoZXJ3aXNlLFxuICAgKiBhIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciBvciBub3QgdGhlIGNvbm5lY3Rpb24gd2lsbCBiZSBlbmNyeXB0ZWQuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICBlbmNyeXB0Pzogc3RyaW5nIHwgYm9vbGVhbjtcblxuICAvKipcbiAgICogQnkgZGVmYXVsdCwgaWYgdGhlIGRhdGFiYXNlIHJlcXVlc3RlZCBieSBbW2RhdGFiYXNlXV0gY2Fubm90IGJlIGFjY2Vzc2VkLFxuICAgKiB0aGUgY29ubmVjdGlvbiB3aWxsIGZhaWwgd2l0aCBhbiBlcnJvci4gSG93ZXZlciwgaWYgW1tmYWxsYmFja1RvRGVmYXVsdERiXV0gaXNcbiAgICogc2V0IHRvIGB0cnVlYCwgdGhlbiB0aGUgdXNlcidzIGRlZmF1bHQgZGF0YWJhc2Ugd2lsbCBiZSB1c2VkIGluc3RlYWRcbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApXG4gICAqL1xuICBmYWxsYmFja1RvRGVmYXVsdERiPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIGluc3RhbmNlIG5hbWUgdG8gY29ubmVjdCB0by5cbiAgICogVGhlIFNRTCBTZXJ2ZXIgQnJvd3NlciBzZXJ2aWNlIG11c3QgYmUgcnVubmluZyBvbiB0aGUgZGF0YWJhc2Ugc2VydmVyLFxuICAgKiBhbmQgVURQIHBvcnQgMTQzNCBvbiB0aGUgZGF0YWJhc2Ugc2VydmVyIG11c3QgYmUgcmVhY2hhYmxlLlxuICAgKlxuICAgKiAobm8gZGVmYXVsdClcbiAgICpcbiAgICogTXV0dWFsbHkgZXhjbHVzaXZlIHdpdGggW1twb3J0XV0uXG4gICAqL1xuICBpbnN0YW5jZU5hbWU/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIFRoZSBkZWZhdWx0IGlzb2xhdGlvbiBsZXZlbCB0aGF0IHRyYW5zYWN0aW9ucyB3aWxsIGJlIHJ1biB3aXRoLlxuICAgKlxuICAgKiBUaGUgaXNvbGF0aW9uIGxldmVscyBhcmUgYXZhaWxhYmxlIGZyb20gYHJlcXVpcmUoJ3RlZGlvdXMnKS5JU09MQVRJT05fTEVWRUxgLlxuICAgKiAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAqIGBSRUFEX0NPTU1JVFRFRGBcbiAgICogKiBgUkVQRUFUQUJMRV9SRUFEYFxuICAgKiAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICogYFNOQVBTSE9UYFxuICAgKlxuICAgKiAoZGVmYXVsdDogYFJFQURfQ09NTUlURURgKS5cbiAgICovXG4gIGlzb2xhdGlvbkxldmVsPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBTcGVjaWZpZXMgdGhlIGxhbmd1YWdlIGVudmlyb25tZW50IGZvciB0aGUgc2Vzc2lvbi4gVGhlIHNlc3Npb24gbGFuZ3VhZ2UgZGV0ZXJtaW5lcyB0aGUgZGF0ZXRpbWUgZm9ybWF0cyBhbmQgc3lzdGVtIG1lc3NhZ2VzLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYHVzX2VuZ2xpc2hgKS5cbiAgICovXG4gIGxhbmd1YWdlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBBIHN0cmluZyBpbmRpY2F0aW5nIHdoaWNoIG5ldHdvcmsgaW50ZXJmYWNlIChpcCBhZGRyZXNzKSB0byB1c2Ugd2hlbiBjb25uZWN0aW5nIHRvIFNRTCBTZXJ2ZXIuXG4gICAqL1xuICBsb2NhbEFkZHJlc3M/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHBhcnNlIHVuaXF1ZSBpZGVudGlmaWVyIHR5cGUgd2l0aCBsb3dlcmNhc2UgY2FzZSBjaGFyYWN0ZXJzLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICBsb3dlckNhc2VHdWlkcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBtYXhpbXVtIG51bWJlciBvZiBjb25uZWN0aW9uIHJldHJpZXMgZm9yIHRyYW5zaWVudCBlcnJvcnMu44CBXG4gICAqXG4gICAqIChkZWZhdWx0OiBgM2ApLlxuICAgKi9cbiAgbWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzPzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBNdWx0aVN1Ym5ldEZhaWxvdmVyID0gVHJ1ZSBwYXJhbWV0ZXIsIHdoaWNoIGNhbiBoZWxwIG1pbmltaXplIHRoZSBjbGllbnQgcmVjb3ZlcnkgbGF0ZW5jeSB3aGVuIGZhaWxvdmVycyBvY2N1ci5cbiAgICpcbiAgICogKGRlZmF1bHQ6IGBmYWxzZWApLlxuICAgKi9cbiAgbXVsdGlTdWJuZXRGYWlsb3Zlcj86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIFRoZSBzaXplIG9mIFREUyBwYWNrZXRzIChzdWJqZWN0IHRvIG5lZ290aWF0aW9uIHdpdGggdGhlIHNlcnZlcikuXG4gICAqIFNob3VsZCBiZSBhIHBvd2VyIG9mIDIuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgNDA5NmApLlxuICAgKi9cbiAgcGFja2V0U2l6ZT86IG51bWJlcjtcblxuICAvKipcbiAgICogUG9ydCB0byBjb25uZWN0IHRvIChkZWZhdWx0OiBgMTQzM2ApLlxuICAgKlxuICAgKiBNdXR1YWxseSBleGNsdXNpdmUgd2l0aCBbW2luc3RhbmNlTmFtZV1dXG4gICAqL1xuICBwb3J0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIGRldGVybWluaW5nIHdoZXRoZXIgdGhlIGNvbm5lY3Rpb24gd2lsbCByZXF1ZXN0IHJlYWQgb25seSBhY2Nlc3MgZnJvbSBhIFNRTCBTZXJ2ZXIgQXZhaWxhYmlsaXR5XG4gICAqIEdyb3VwLiBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgc2VlIFtoZXJlXShodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaGg3MTAwNTQuYXNweCBcIk1pY3Jvc29mdDogQ29uZmlndXJlIFJlYWQtT25seSBSb3V0aW5nIGZvciBhbiBBdmFpbGFiaWxpdHkgR3JvdXAgKFNRTCBTZXJ2ZXIpXCIpXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKS5cbiAgICovXG4gIHJlYWRPbmx5SW50ZW50PzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIG51bWJlciBvZiBtaWxsaXNlY29uZHMgYmVmb3JlIGEgcmVxdWVzdCBpcyBjb25zaWRlcmVkIGZhaWxlZCwgb3IgYDBgIGZvciBubyB0aW1lb3V0LlxuICAgKlxuICAgKiBBcyBzb29uIGFzIGEgcmVzcG9uc2UgaXMgcmVjZWl2ZWQsIHRoZSB0aW1lb3V0IGlzIGNsZWFyZWQuIFRoaXMgbWVhbnMgdGhhdCBxdWVyaWVzIHRoYXQgaW1tZWRpYXRlbHkgcmV0dXJuIGEgcmVzcG9uc2UgaGF2ZSBhYmlsaXR5IHRvIHJ1biBsb25nZXIgdGhhbiB0aGlzIHRpbWVvdXQuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgMTUwMDBgKS5cbiAgICovXG4gIHJlcXVlc3RUaW1lb3V0PzogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiBBIGJvb2xlYW4sIHRoYXQgd2hlbiB0cnVlIHdpbGwgZXhwb3NlIHJlY2VpdmVkIHJvd3MgaW4gUmVxdWVzdHMgZG9uZSByZWxhdGVkIGV2ZW50czpcbiAgICogKiBbW1JlcXVlc3QuRXZlbnRfZG9uZUluUHJvY11dXG4gICAqICogW1tSZXF1ZXN0LkV2ZW50X2RvbmVQcm9jXV1cbiAgICogKiBbW1JlcXVlc3QuRXZlbnRfZG9uZV1dXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKlxuICAgKiBDYXV0aW9uOiBJZiBtYW55IHJvdyBhcmUgcmVjZWl2ZWQsIGVuYWJsaW5nIHRoaXMgb3B0aW9uIGNvdWxkIHJlc3VsdCBpblxuICAgKiBleGNlc3NpdmUgbWVtb3J5IHVzYWdlLlxuICAgKi9cbiAgcm93Q29sbGVjdGlvbk9uRG9uZT86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiwgdGhhdCB3aGVuIHRydWUgd2lsbCBleHBvc2UgcmVjZWl2ZWQgcm93cyBpbiBSZXF1ZXN0cycgY29tcGxldGlvbiBjYWxsYmFjay5TZWUgW1tSZXF1ZXN0LmNvbnN0cnVjdG9yXV0uXG4gICAqXG4gICAqIChkZWZhdWx0OiBgZmFsc2VgKVxuICAgKlxuICAgKiBDYXV0aW9uOiBJZiBtYW55IHJvdyBhcmUgcmVjZWl2ZWQsIGVuYWJsaW5nIHRoaXMgb3B0aW9uIGNvdWxkIHJlc3VsdCBpblxuICAgKiBleGNlc3NpdmUgbWVtb3J5IHVzYWdlLlxuICAgKi9cbiAgcm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24/OiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBUaGUgdmVyc2lvbiBvZiBURFMgdG8gdXNlLiBJZiBzZXJ2ZXIgZG9lc24ndCBzdXBwb3J0IHNwZWNpZmllZCB2ZXJzaW9uLCBuZWdvdGlhdGVkIHZlcnNpb24gaXMgdXNlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBUaGUgdmVyc2lvbnMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuVERTX1ZFUlNJT05gLlxuICAgKiAqIGA3XzFgXG4gICAqICogYDdfMmBcbiAgICogKiBgN18zX0FgXG4gICAqICogYDdfM19CYFxuICAgKiAqIGA3XzRgXG4gICAqXG4gICAqIChkZWZhdWx0OiBgN180YClcbiAgICovXG4gIHRkc1ZlcnNpb24/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFNwZWNpZmllcyB0aGUgc2l6ZSBvZiB2YXJjaGFyKG1heCksIG52YXJjaGFyKG1heCksIHZhcmJpbmFyeShtYXgpLCB0ZXh0LCBudGV4dCwgYW5kIGltYWdlIGRhdGEgcmV0dXJuZWQgYnkgYSBTRUxFQ1Qgc3RhdGVtZW50LlxuICAgKlxuICAgKiAoZGVmYXVsdDogYDIxNDc0ODM2NDdgKVxuICAgKi9cbiAgdGV4dHNpemU/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIElmIFwidHJ1ZVwiLCB0aGUgU1FMIFNlcnZlciBTU0wgY2VydGlmaWNhdGUgaXMgYXV0b21hdGljYWxseSB0cnVzdGVkIHdoZW4gdGhlIGNvbW11bmljYXRpb24gbGF5ZXIgaXMgZW5jcnlwdGVkIHVzaW5nIFNTTC5cbiAgICpcbiAgICogSWYgXCJmYWxzZVwiLCB0aGUgU1FMIFNlcnZlciB2YWxpZGF0ZXMgdGhlIHNlcnZlciBTU0wgY2VydGlmaWNhdGUuIElmIHRoZSBzZXJ2ZXIgY2VydGlmaWNhdGUgdmFsaWRhdGlvbiBmYWlscyxcbiAgICogdGhlIGRyaXZlciByYWlzZXMgYW4gZXJyb3IgYW5kIHRlcm1pbmF0ZXMgdGhlIGNvbm5lY3Rpb24uIE1ha2Ugc3VyZSB0aGUgdmFsdWUgcGFzc2VkIHRvIHNlcnZlck5hbWUgZXhhY3RseVxuICAgKiBtYXRjaGVzIHRoZSBDb21tb24gTmFtZSAoQ04pIG9yIEROUyBuYW1lIGluIHRoZSBTdWJqZWN0IEFsdGVybmF0ZSBOYW1lIGluIHRoZSBzZXJ2ZXIgY2VydGlmaWNhdGUgZm9yIGFuIFNTTCBjb25uZWN0aW9uIHRvIHN1Y2NlZWQuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApXG4gICAqL1xuICB0cnVzdFNlcnZlckNlcnRpZmljYXRlPzogYm9vbGVhbjtcblxuICAvKipcbiAgICpcbiAgICovXG4gIHNlcnZlck5hbWU/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBBIGJvb2xlYW4gZGV0ZXJtaW5pbmcgd2hldGhlciB0byByZXR1cm4gcm93cyBhcyBhcnJheXMgb3Iga2V5LXZhbHVlIGNvbGxlY3Rpb25zLlxuICAgKlxuICAgKiAoZGVmYXVsdDogYGZhbHNlYCkuXG4gICAqL1xuICB1c2VDb2x1bW5OYW1lcz86IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIEEgYm9vbGVhbiBkZXRlcm1pbmluZyB3aGV0aGVyIHRvIHBhc3MgdGltZSB2YWx1ZXMgaW4gVVRDIG9yIGxvY2FsIHRpbWUuXG4gICAqXG4gICAqIChkZWZhdWx0OiBgdHJ1ZWApLlxuICAgKi9cbiAgdXNlVVRDPzogYm9vbGVhbjtcblxuICAvKipcbiAgICogVGhlIHdvcmtzdGF0aW9uIElEIChXU0lEKSBvZiB0aGUgY2xpZW50LCBkZWZhdWx0IG9zLmhvc3RuYW1lKCkuXG4gICAqIFVzZWQgZm9yIGlkZW50aWZ5aW5nIGEgc3BlY2lmaWMgY2xpZW50IGluIHByb2ZpbGluZywgbG9nZ2luZyBvclxuICAgKiB0cmFjaW5nIGNsaWVudCBhY3Rpdml0eSBpbiBTUUxTZXJ2ZXIuXG4gICAqXG4gICAqIFRoZSB2YWx1ZSBpcyByZXBvcnRlZCBieSB0aGUgVFNRTCBmdW5jdGlvbiBIT1NUX05BTUUoKS5cbiAgICovXG4gIHdvcmtzdGF0aW9uSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8qKlxuICogQHByaXZhdGVcbiAqL1xuY29uc3QgQ0xFQU5VUF9UWVBFID0ge1xuICBOT1JNQUw6IDAsXG4gIFJFRElSRUNUOiAxLFxuICBSRVRSWTogMlxufTtcblxuaW50ZXJmYWNlIFJvdXRpbmdEYXRhIHtcbiAgc2VydmVyOiBzdHJpbmc7XG4gIHBvcnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBBIFtbQ29ubmVjdGlvbl1dIGluc3RhbmNlIHJlcHJlc2VudHMgYSBzaW5nbGUgY29ubmVjdGlvbiB0byBhIGRhdGFiYXNlIHNlcnZlci5cbiAqXG4gKiBgYGBqc1xuICogdmFyIENvbm5lY3Rpb24gPSByZXF1aXJlKCd0ZWRpb3VzJykuQ29ubmVjdGlvbjtcbiAqIHZhciBjb25maWcgPSB7XG4gKiAgXCJhdXRoZW50aWNhdGlvblwiOiB7XG4gKiAgICAuLi4sXG4gKiAgICBcIm9wdGlvbnNcIjogey4uLn1cbiAqICB9LFxuICogIFwib3B0aW9uc1wiOiB7Li4ufVxuICogfTtcbiAqIHZhciBjb25uZWN0aW9uID0gbmV3IENvbm5lY3Rpb24oY29uZmlnKTtcbiAqIGBgYFxuICpcbiAqIE9ubHkgb25lIHJlcXVlc3QgYXQgYSB0aW1lIG1heSBiZSBleGVjdXRlZCBvbiBhIGNvbm5lY3Rpb24uIE9uY2UgYSBbW1JlcXVlc3RdXVxuICogaGFzIGJlZW4gaW5pdGlhdGVkICh3aXRoIFtbQ29ubmVjdGlvbi5jYWxsUHJvY2VkdXJlXV0sIFtbQ29ubmVjdGlvbi5leGVjU3FsXV0sXG4gKiBvciBbW0Nvbm5lY3Rpb24uZXhlY1NxbEJhdGNoXV0pLCBhbm90aGVyIHNob3VsZCBub3QgYmUgaW5pdGlhdGVkIHVudGlsIHRoZVxuICogW1tSZXF1ZXN0XV0ncyBjb21wbGV0aW9uIGNhbGxiYWNrIGlzIGNhbGxlZC5cbiAqL1xuY2xhc3MgQ29ubmVjdGlvbiBleHRlbmRzIEV2ZW50RW1pdHRlciB7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBmZWRBdXRoUmVxdWlyZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjb25maWc6IEludGVybmFsQ29ubmVjdGlvbkNvbmZpZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHNlY3VyZUNvbnRleHRPcHRpb25zOiBTZWN1cmVDb250ZXh0T3B0aW9ucztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGluVHJhbnNhY3Rpb246IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSB0cmFuc2FjdGlvbkRlc2NyaXB0b3JzOiBCdWZmZXJbXTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHRyYW5zYWN0aW9uRGVwdGg6IG51bWJlcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGlzU3FsQmF0Y2g6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjdXJUcmFuc2llbnRSZXRyeUNvdW50OiBudW1iZXI7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSB0cmFuc2llbnRFcnJvckxvb2t1cDogVHJhbnNpZW50RXJyb3JMb29rdXA7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBjbG9zZWQ6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBsb2dpbkVycm9yOiB1bmRlZmluZWQgfCBBZ2dyZWdhdGVFcnJvciB8IENvbm5lY3Rpb25FcnJvcjtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGRlYnVnOiBEZWJ1ZztcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG50bG1wYWNrZXQ6IHVuZGVmaW5lZCB8IGFueTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG50bG1wYWNrZXRCdWZmZXI6IHVuZGVmaW5lZCB8IEJ1ZmZlcjtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgU1RBVEU6IHtcbiAgICBJTklUSUFMSVpFRDogU3RhdGU7XG4gICAgQ09OTkVDVElORzogU3RhdGU7XG4gICAgU0VOVF9QUkVMT0dJTjogU3RhdGU7XG4gICAgUkVST1VUSU5HOiBTdGF0ZTtcbiAgICBUUkFOU0lFTlRfRkFJTFVSRV9SRVRSWTogU3RhdGU7XG4gICAgU0VOVF9UTFNTU0xORUdPVElBVElPTjogU3RhdGU7XG4gICAgU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTjogU3RhdGU7XG4gICAgU0VOVF9MT0dJTjdfV0lUSF9OVExNOiBTdGF0ZTtcbiAgICBTRU5UX0xPR0lON19XSVRIX0ZFREFVVEg6IFN0YXRlO1xuICAgIExPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMOiBTdGF0ZTtcbiAgICBMT0dHRURfSU46IFN0YXRlO1xuICAgIFNFTlRfQ0xJRU5UX1JFUVVFU1Q6IFN0YXRlO1xuICAgIFNFTlRfQVRURU5USU9OOiBTdGF0ZTtcbiAgICBGSU5BTDogU3RhdGU7XG4gIH07XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJvdXRpbmdEYXRhOiB1bmRlZmluZWQgfCBSb3V0aW5nRGF0YTtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgbWVzc2FnZUlvOiBNZXNzYWdlSU87XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBzdGF0ZTogU3RhdGU7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByZXNldENvbm5lY3Rpb25Pbk5leHRSZXF1ZXN0OiB1bmRlZmluZWQgfCBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByZXF1ZXN0OiB1bmRlZmluZWQgfCBSZXF1ZXN0IHwgQnVsa0xvYWQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBwcm9jUmV0dXJuU3RhdHVzVmFsdWU6IHVuZGVmaW5lZCB8IGFueTtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHNvY2tldDogdW5kZWZpbmVkIHwgbmV0LlNvY2tldDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIG1lc3NhZ2VCdWZmZXI6IEJ1ZmZlcjtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRlY2xhcmUgY29ubmVjdFRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIGNhbmNlbFRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBkZWNsYXJlIHJlcXVlc3RUaW1lcjogdW5kZWZpbmVkIHwgTm9kZUpTLlRpbWVvdXQ7XG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSByZXRyeVRpbWVyOiB1bmRlZmluZWQgfCBOb2RlSlMuVGltZW91dDtcblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIF9jYW5jZWxBZnRlclJlcXVlc3RTZW50OiAoKSA9PiB2b2lkO1xuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZGVjbGFyZSBkYXRhYmFzZUNvbGxhdGlvbjogQ29sbGF0aW9uIHwgdW5kZWZpbmVkO1xuXG4gIC8qKlxuICAgKiBOb3RlOiBiZSBhd2FyZSBvZiB0aGUgZGlmZmVyZW50IG9wdGlvbnMgZmllbGQ6XG4gICAqIDEuIGNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zXG4gICAqIDIuIGNvbmZpZy5vcHRpb25zXG4gICAqXG4gICAqIGBgYGpzXG4gICAqIGNvbnN0IHsgQ29ubmVjdGlvbiB9ID0gcmVxdWlyZSgndGVkaW91cycpO1xuICAgKlxuICAgKiBjb25zdCBjb25maWcgPSB7XG4gICAqICBcImF1dGhlbnRpY2F0aW9uXCI6IHtcbiAgICogICAgLi4uLFxuICAgKiAgICBcIm9wdGlvbnNcIjogey4uLn1cbiAgICogIH0sXG4gICAqICBcIm9wdGlvbnNcIjogey4uLn1cbiAgICogfTtcbiAgICpcbiAgICogY29uc3QgY29ubmVjdGlvbiA9IG5ldyBDb25uZWN0aW9uKGNvbmZpZyk7XG4gICAqIGBgYFxuICAgKlxuICAgKiBAcGFyYW0gY29uZmlnXG4gICAqL1xuICBjb25zdHJ1Y3Rvcihjb25maWc6IENvbm5lY3Rpb25Db25maWd1cmF0aW9uKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIGlmICh0eXBlb2YgY29uZmlnICE9PSAnb2JqZWN0JyB8fCBjb25maWcgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZ1wiIGFyZ3VtZW50IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LicpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgY29uZmlnLnNlcnZlciAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5zZXJ2ZXJcIiBwcm9wZXJ0eSBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICB9XG5cbiAgICB0aGlzLmZlZEF1dGhSZXF1aXJlZCA9IGZhbHNlO1xuXG4gICAgbGV0IGF1dGhlbnRpY2F0aW9uOiBJbnRlcm5hbENvbm5lY3Rpb25Db25maWdbJ2F1dGhlbnRpY2F0aW9uJ107XG4gICAgaWYgKGNvbmZpZy5hdXRoZW50aWNhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAodHlwZW9mIGNvbmZpZy5hdXRoZW50aWNhdGlvbiAhPT0gJ29iamVjdCcgfHwgY29uZmlnLmF1dGhlbnRpY2F0aW9uID09PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvblwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBPYmplY3QuJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHR5cGUgPSBjb25maWcuYXV0aGVudGljYXRpb24udHlwZTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucyA9PT0gdW5kZWZpbmVkID8ge30gOiBjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucztcblxuICAgICAgaWYgKHR5cGVvZiB0eXBlICE9PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24udHlwZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlICE9PSAnZGVmYXVsdCcgJiYgdHlwZSAhPT0gJ250bG0nICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1hY2Nlc3MtdG9rZW4nICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bScgJiYgdHlwZSAhPT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJyAmJiB0eXBlICE9PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnICYmIHR5cGUgIT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcInR5cGVcIiBwcm9wZXJ0eSBtdXN0IG9uZSBvZiBcImRlZmF1bHRcIiwgXCJudGxtXCIsIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZFwiLCBcImF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktYWNjZXNzLXRva2VuXCIsIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0XCIsIFwiYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm1cIiBvciBcImF6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlXCIgb3IgXCJhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldFwiLicpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnIHx8IG9wdGlvbnMgPT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgb2JqZWN0LicpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZSA9PT0gJ250bG0nKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5kb21haW4gIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuZG9tYWluXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnVzZXJOYW1lICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMudXNlck5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMucGFzc3dvcmQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5wYXNzd29yZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5wYXNzd29yZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnbnRsbScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdXNlck5hbWU6IG9wdGlvbnMudXNlck5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogb3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgIGRvbWFpbjogb3B0aW9ucy5kb21haW4gJiYgb3B0aW9ucy5kb21haW4udG9VcHBlckNhc2UoKVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktcGFzc3dvcmQnKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jbGllbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy51c2VyTmFtZSAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnVzZXJOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChvcHRpb25zLnBhc3N3b3JkICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9wdGlvbnMudGVuYW50SWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy50ZW5hbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy50ZW5hbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCcsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdXNlck5hbWU6IG9wdGlvbnMudXNlck5hbWUsXG4gICAgICAgICAgICBwYXNzd29yZDogb3B0aW9ucy5wYXNzd29yZCxcbiAgICAgICAgICAgIHRlbmFudElkOiBvcHRpb25zLnRlbmFudElkLFxuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbicpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VuICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnRva2VuXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbicsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgdG9rZW46IG9wdGlvbnMudG9rZW5cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bScpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50SWQgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy5jbGllbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0Jykge1xuICAgICAgICBpZiAob3B0aW9ucy5jbGllbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBjbGllbnRJZDogb3B0aW9ucy5jbGllbnRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJykge1xuICAgICAgICBpZiAob3B0aW9ucy5jbGllbnRJZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZScsXG4gICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgY2xpZW50SWQ6IG9wdGlvbnMuY2xpZW50SWRcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCcpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLmNsaWVudElkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy5jbGllbnRTZWNyZXQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLmF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50U2VjcmV0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucy50ZW5hbnRJZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy50ZW5hbnRJZFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgICB0eXBlOiAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNsaWVudElkOiBvcHRpb25zLmNsaWVudElkLFxuICAgICAgICAgICAgY2xpZW50U2VjcmV0OiBvcHRpb25zLmNsaWVudFNlY3JldCxcbiAgICAgICAgICAgIHRlbmFudElkOiBvcHRpb25zLnRlbmFudElkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKG9wdGlvbnMudXNlck5hbWUgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucy51c2VyTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcuYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5wYXNzd29yZCAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBvcHRpb25zLnBhc3N3b3JkICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5hdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF1dGhlbnRpY2F0aW9uID0ge1xuICAgICAgICAgIHR5cGU6ICdkZWZhdWx0JyxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICB1c2VyTmFtZTogb3B0aW9ucy51c2VyTmFtZSxcbiAgICAgICAgICAgIHBhc3N3b3JkOiBvcHRpb25zLnBhc3N3b3JkXG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhdXRoZW50aWNhdGlvbiA9IHtcbiAgICAgICAgdHlwZTogJ2RlZmF1bHQnLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgdXNlck5hbWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICBwYXNzd29yZDogdW5kZWZpbmVkXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgdGhpcy5jb25maWcgPSB7XG4gICAgICBzZXJ2ZXI6IGNvbmZpZy5zZXJ2ZXIsXG4gICAgICBhdXRoZW50aWNhdGlvbjogYXV0aGVudGljYXRpb24sXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGFib3J0VHJhbnNhY3Rpb25PbkVycm9yOiBmYWxzZSxcbiAgICAgICAgYXBwTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICBjYW1lbENhc2VDb2x1bW5zOiBmYWxzZSxcbiAgICAgICAgY2FuY2VsVGltZW91dDogREVGQVVMVF9DQU5DRUxfVElNRU9VVCxcbiAgICAgICAgY29sdW1uRW5jcnlwdGlvbktleUNhY2hlVFRMOiAyICogNjAgKiA2MCAqIDEwMDAsICAvLyBVbml0czogbWlsbGlzZWNvbmRzXG4gICAgICAgIGNvbHVtbkVuY3J5cHRpb25TZXR0aW5nOiBmYWxzZSxcbiAgICAgICAgY29sdW1uTmFtZVJlcGxhY2VyOiB1bmRlZmluZWQsXG4gICAgICAgIGNvbm5lY3Rpb25SZXRyeUludGVydmFsOiBERUZBVUxUX0NPTk5FQ1RfUkVUUllfSU5URVJWQUwsXG4gICAgICAgIGNvbm5lY3RUaW1lb3V0OiBERUZBVUxUX0NPTk5FQ1RfVElNRU9VVCxcbiAgICAgICAgY29ubmVjdG9yOiB1bmRlZmluZWQsXG4gICAgICAgIGNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBjcnlwdG9DcmVkZW50aWFsc0RldGFpbHM6IHt9LFxuICAgICAgICBkYXRhYmFzZTogdW5kZWZpbmVkLFxuICAgICAgICBkYXRlZmlyc3Q6IERFRkFVTFRfREFURUZJUlNULFxuICAgICAgICBkYXRlRm9ybWF0OiBERUZBVUxUX0RBVEVGT1JNQVQsXG4gICAgICAgIGRlYnVnOiB7XG4gICAgICAgICAgZGF0YTogZmFsc2UsXG4gICAgICAgICAgcGFja2V0OiBmYWxzZSxcbiAgICAgICAgICBwYXlsb2FkOiBmYWxzZSxcbiAgICAgICAgICB0b2tlbjogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgZW5hYmxlQW5zaU51bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lOdWxsRGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQW5zaVBhZGRpbmc6IHRydWUsXG4gICAgICAgIGVuYWJsZUFuc2lXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQXJpdGhBYm9ydDogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw6IHRydWUsXG4gICAgICAgIGVuYWJsZUN1cnNvckNsb3NlT25Db21taXQ6IG51bGwsXG4gICAgICAgIGVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zOiBmYWxzZSxcbiAgICAgICAgZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ6IGZhbHNlLFxuICAgICAgICBlbmFibGVRdW90ZWRJZGVudGlmaWVyOiB0cnVlLFxuICAgICAgICBlbmNyeXB0OiB0cnVlLFxuICAgICAgICBmYWxsYmFja1RvRGVmYXVsdERiOiBmYWxzZSxcbiAgICAgICAgZW5jcnlwdGlvbktleVN0b3JlUHJvdmlkZXJzOiB1bmRlZmluZWQsXG4gICAgICAgIGluc3RhbmNlTmFtZTogdW5kZWZpbmVkLFxuICAgICAgICBpc29sYXRpb25MZXZlbDogSVNPTEFUSU9OX0xFVkVMLlJFQURfQ09NTUlUVEVELFxuICAgICAgICBsYW5ndWFnZTogREVGQVVMVF9MQU5HVUFHRSxcbiAgICAgICAgbG9jYWxBZGRyZXNzOiB1bmRlZmluZWQsXG4gICAgICAgIG1heFJldHJpZXNPblRyYW5zaWVudEVycm9yczogMyxcbiAgICAgICAgbXVsdGlTdWJuZXRGYWlsb3ZlcjogZmFsc2UsXG4gICAgICAgIHBhY2tldFNpemU6IERFRkFVTFRfUEFDS0VUX1NJWkUsXG4gICAgICAgIHBvcnQ6IERFRkFVTFRfUE9SVCxcbiAgICAgICAgcmVhZE9ubHlJbnRlbnQ6IGZhbHNlLFxuICAgICAgICByZXF1ZXN0VGltZW91dDogREVGQVVMVF9DTElFTlRfUkVRVUVTVF9USU1FT1VULFxuICAgICAgICByb3dDb2xsZWN0aW9uT25Eb25lOiBmYWxzZSxcbiAgICAgICAgcm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb246IGZhbHNlLFxuICAgICAgICBzZXJ2ZXJOYW1lOiB1bmRlZmluZWQsXG4gICAgICAgIHNlcnZlclN1cHBvcnRzQ29sdW1uRW5jcnlwdGlvbjogZmFsc2UsXG4gICAgICAgIHRkc1ZlcnNpb246IERFRkFVTFRfVERTX1ZFUlNJT04sXG4gICAgICAgIHRleHRzaXplOiBERUZBVUxUX1RFWFRTSVpFLFxuICAgICAgICB0cnVzdGVkU2VydmVyTmFtZUFFOiB1bmRlZmluZWQsXG4gICAgICAgIHRydXN0U2VydmVyQ2VydGlmaWNhdGU6IGZhbHNlLFxuICAgICAgICB1c2VDb2x1bW5OYW1lczogZmFsc2UsXG4gICAgICAgIHVzZVVUQzogdHJ1ZSxcbiAgICAgICAgd29ya3N0YXRpb25JZDogdW5kZWZpbmVkLFxuICAgICAgICBsb3dlckNhc2VHdWlkczogZmFsc2VcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGNvbmZpZy5vcHRpb25zKSB7XG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCAmJiBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdQb3J0IGFuZCBpbnN0YW5jZU5hbWUgYXJlIG11dHVhbGx5IGV4Y2x1c2l2ZSwgYnV0ICcgKyBjb25maWcub3B0aW9ucy5wb3J0ICsgJyBhbmQgJyArIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSArICcgcHJvdmlkZWQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hYm9ydFRyYW5zYWN0aW9uT25FcnJvciAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3JcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmFib3J0VHJhbnNhY3Rpb25PbkVycm9yID0gY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3I7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5hcHBOYW1lICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmFwcE5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5hcHBOYW1lID0gY29uZmlnLm9wdGlvbnMuYXBwTmFtZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY2FtZWxDYXNlQ29sdW1ucyA9IGNvbmZpZy5vcHRpb25zLmNhbWVsQ2FzZUNvbHVtbnM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jYW5jZWxUaW1lb3V0ID0gY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcikge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlciA9IGNvbmZpZy5vcHRpb25zLmNvbHVtbk5hbWVSZXBsYWNlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGFzc2VydFZhbGlkSXNvbGF0aW9uTGV2ZWwoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsLCAnY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWwgPSBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uSXNvbGF0aW9uTGV2ZWw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXQgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgbnVtYmVyLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jb25uZWN0VGltZW91dCA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jb25uZWN0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0b3JcIiBwcm9wZXJ0eSBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RvciA9IGNvbmZpZy5vcHRpb25zLmNvbm5lY3RvcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNyeXB0b0NyZWRlbnRpYWxzRGV0YWlscyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzICE9PSAnb2JqZWN0JyB8fCBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgPT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgT2JqZWN0LicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHMgPSBjb25maWcub3B0aW9ucy5jcnlwdG9DcmVkZW50aWFsc0RldGFpbHM7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRhYmFzZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZGF0YWJhc2UgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0YWJhc2VcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRhYmFzZSA9IGNvbmZpZy5vcHRpb25zLmRhdGFiYXNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09ICdudW1iZXInICYmIGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0ICE9PSBudWxsICYmIChjb25maWcub3B0aW9ucy5kYXRlZmlyc3QgPCAxIHx8IGNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdCA+IDcpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRhdGVmaXJzdFwiIHByb3BlcnR5IG11c3QgYmUgPj0gMSBhbmQgPD0gNycpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3QgPSBjb25maWcub3B0aW9ucy5kYXRlZmlyc3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSAnc3RyaW5nJyAmJiBjb25maWcub3B0aW9ucy5kYXRlRm9ybWF0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZUZvcm1hdCA9IGNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcuZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGFcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLmRhdGEgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5kYXRhO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnLnBhY2tldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQgIT09ICdib29sZWFuJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZGVidWcucGFja2V0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYWNrZXQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZGVidWcucGF5bG9hZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmRlYnVnLnBheWxvYWQgPSBjb25maWcub3B0aW9ucy5kZWJ1Zy5wYXlsb2FkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5kZWJ1Zy50b2tlbiA9IGNvbmZpZy5vcHRpb25zLmRlYnVnLnRva2VuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGwgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGwgPSBjb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lOdWxsRGVmYXVsdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4gb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmcgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZ1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaVBhZGRpbmc7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVBbnNpV2FybmluZ3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5nc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgIT09ICdib29sZWFuJyAmJiBjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0ICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgPSBjb25maWcub3B0aW9ucy5lbmFibGVBcml0aEFib3J0O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVDb25jYXROdWxsWWllbGRzTnVsbFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGw7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZUN1cnNvckNsb3NlT25Db21taXRcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyAhPT0gJ2Jvb2xlYW4nICYmIGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zICE9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9IGNvbmZpZy5vcHRpb25zLmVuYWJsZUltcGxpY2l0VHJhbnNhY3Rpb25zO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5lbmFibGVOdW1lcmljUm91bmRhYm9ydFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuIG9yIG51bGwuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyICE9PSAnYm9vbGVhbicgJiYgY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmVuYWJsZVF1b3RlZElkZW50aWZpZXJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbiBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVRdW90ZWRJZGVudGlmaWVyID0gY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllcjtcbiAgICAgIH1cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5lbmNyeXB0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5lbmNyeXB0ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuZW5jcnlwdCAhPT0gJ3N0cmljdCcpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImVuY3J5cHRcIiBwcm9wZXJ0eSBtdXN0IGJlIHNldCB0byBcInN0cmljdFwiLCBvciBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0ID0gY29uZmlnLm9wdGlvbnMuZW5jcnlwdDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGIgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGJcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuZmFsbGJhY2tUb0RlZmF1bHREYiA9IGNvbmZpZy5vcHRpb25zLmZhbGxiYWNrVG9EZWZhdWx0RGI7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUgPSBjb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWU7XG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgYXNzZXJ0VmFsaWRJc29sYXRpb25MZXZlbChjb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCwgJ2NvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsJyk7XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5pc29sYXRpb25MZXZlbCA9IGNvbmZpZy5vcHRpb25zLmlzb2xhdGlvbkxldmVsO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubGFuZ3VhZ2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlICE9PSAnc3RyaW5nJyAmJiBjb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmxhbmd1YWdlXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZyBvciBudWxsLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZSA9IGNvbmZpZy5vcHRpb25zLmxhbmd1YWdlO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3MgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzID0gY29uZmlnLm9wdGlvbnMubG9jYWxBZGRyZXNzO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlciAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlclwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyID0gY29uZmlnLm9wdGlvbnMubXVsdGlTdWJuZXRGYWlsb3ZlcjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgIT09ICdudW1iZXInKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMucGFja2V0U2l6ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUgPSBjb25maWcub3B0aW9ucy5wYWNrZXRTaXplO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucG9ydCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucG9ydCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5wb3J0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy5wb3J0IDw9IDAgfHwgY29uZmlnLm9wdGlvbnMucG9ydCA+PSA2NTUzNikge1xuICAgICAgICAgIHRocm93IG5ldyBSYW5nZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5wb3J0XCIgcHJvcGVydHkgbXVzdCBiZSA+IDAgYW5kIDwgNjU1MzYnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA9IGNvbmZpZy5vcHRpb25zLnBvcnQ7XG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lID0gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucmVhZE9ubHlJbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50ICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5yZWFkT25seUludGVudFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5yZWFkT25seUludGVudCA9IGNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50O1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0ICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJlcXVlc3RUaW1lb3V0XCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIG51bWJlci4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucmVxdWVzdFRpbWVvdXQgPSBjb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9yc1wiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMubWF4UmV0cmllc09uVHJhbnNpZW50RXJyb3JzIDwgMCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9yc1wiIHByb3BlcnR5IG11c3QgYmUgZXF1YWwgb3IgZ3JlYXRlciB0aGFuIDAuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycyA9IGNvbmZpZy5vcHRpb25zLm1heFJldHJpZXNPblRyYW5zaWVudEVycm9ycztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbCAhPT0gJ251bWJlcicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbFwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIuJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgPD0gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25SZXRyeUludGVydmFsXCIgcHJvcGVydHkgbXVzdCBiZSBncmVhdGVyIHRoYW4gMC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwgPSBjb25maWcub3B0aW9ucy5jb25uZWN0aW9uUmV0cnlJbnRlcnZhbDtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmUgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmVcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uRG9uZSA9IGNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PbkRvbmU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5yb3dDb2xsZWN0aW9uT25SZXF1ZXN0Q29tcGxldGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb24gIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnJvd0NvbGxlY3Rpb25PblJlcXVlc3RDb21wbGV0aW9uID0gY29uZmlnLm9wdGlvbnMucm93Q29sbGVjdGlvbk9uUmVxdWVzdENvbXBsZXRpb247XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy50ZHNWZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb25cIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy50ZHNWZXJzaW9uID0gY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy50ZXh0c2l6ZSAhPT0gJ251bWJlcicgJiYgY29uZmlnLm9wdGlvbnMudGV4dHNpemUgIT09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZXh0c2l6ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBudW1iZXIgb3IgbnVsbC4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChjb25maWcub3B0aW9ucy50ZXh0c2l6ZSA+IDIxNDc0ODM2NDcpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy50ZXh0c2l6ZVwiIGNhblxcJ3QgYmUgZ3JlYXRlciB0aGFuIDIxNDc0ODM2NDcuJyk7XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLm9wdGlvbnMudGV4dHNpemUgPCAtMSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLnRleHRzaXplXCIgY2FuXFwndCBiZSBzbWFsbGVyIHRoYW4gLTEuJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLnRleHRzaXplID0gY29uZmlnLm9wdGlvbnMudGV4dHNpemUgfCAwO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBib29sZWFuLicpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy50cnVzdFNlcnZlckNlcnRpZmljYXRlID0gY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnNlcnZlck5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vcHRpb25zLnNlcnZlck5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZVwiIHByb3BlcnR5IG11c3QgYmUgb2YgdHlwZSBzdHJpbmcuJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jb25maWcub3B0aW9ucy5zZXJ2ZXJOYW1lID0gY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZTtcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnVzZUNvbHVtbk5hbWVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcyAhPT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVGhlIFwiY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXNcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudXNlQ29sdW1uTmFtZXMgPSBjb25maWcub3B0aW9ucy51c2VDb2x1bW5OYW1lcztcbiAgICAgIH1cblxuICAgICAgaWYgKGNvbmZpZy5vcHRpb25zLnVzZVVUQyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMudXNlVVRDICE9PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy51c2VVVENcIiBwcm9wZXJ0eSBtdXN0IGJlIG9mIHR5cGUgYm9vbGVhbi4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMudXNlVVRDID0gY29uZmlnLm9wdGlvbnMudXNlVVRDO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdUaGUgXCJjb25maWcub3B0aW9ucy53b3Jrc3RhdGlvbklkXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIHN0cmluZy4nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCA9IGNvbmZpZy5vcHRpb25zLndvcmtzdGF0aW9uSWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChjb25maWcub3B0aW9ucy5sb3dlckNhc2VHdWlkcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHMgIT09ICdib29sZWFuJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1RoZSBcImNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzXCIgcHJvcGVydHkgbXVzdCBiZSBvZiB0eXBlIGJvb2xlYW4uJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNvbmZpZy5vcHRpb25zLmxvd2VyQ2FzZUd1aWRzID0gY29uZmlnLm9wdGlvbnMubG93ZXJDYXNlR3VpZHM7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zZWN1cmVDb250ZXh0T3B0aW9ucyA9IHRoaXMuY29uZmlnLm9wdGlvbnMuY3J5cHRvQ3JlZGVudGlhbHNEZXRhaWxzO1xuICAgIGlmICh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zLnNlY3VyZU9wdGlvbnMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gSWYgdGhlIGNhbGxlciBoYXMgbm90IHNwZWNpZmllZCB0aGVpciBvd24gYHNlY3VyZU9wdGlvbnNgLFxuICAgICAgLy8gd2Ugc2V0IGBTU0xfT1BfRE9OVF9JTlNFUlRfRU1QVFlfRlJBR01FTlRTYCBoZXJlLlxuICAgICAgLy8gT2xkZXIgU1FMIFNlcnZlciBpbnN0YW5jZXMgcnVubmluZyBvbiBvbGRlciBXaW5kb3dzIHZlcnNpb25zIGhhdmVcbiAgICAgIC8vIHRyb3VibGUgd2l0aCB0aGUgQkVBU1Qgd29ya2Fyb3VuZCBpbiBPcGVuU1NMLlxuICAgICAgLy8gQXMgQkVBU1QgaXMgYSBicm93c2VyIHNwZWNpZmljIGV4cGxvaXQsIHdlIGNhbiBqdXN0IGRpc2FibGUgdGhpcyBvcHRpb24gaGVyZS5cbiAgICAgIHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMgPSBPYmplY3QuY3JlYXRlKHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMsIHtcbiAgICAgICAgc2VjdXJlT3B0aW9uczoge1xuICAgICAgICAgIHZhbHVlOiBjb25zdGFudHMuU1NMX09QX0RPTlRfSU5TRVJUX0VNUFRZX0ZSQUdNRU5UU1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmRlYnVnID0gdGhpcy5jcmVhdGVEZWJ1ZygpO1xuICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgIHRoaXMudHJhbnNhY3Rpb25EZXNjcmlwdG9ycyA9IFtCdWZmZXIuZnJvbShbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF0pXTtcblxuICAgIC8vICdiZWdpblRyYW5zYWN0aW9uJywgJ2NvbW1pdFRyYW5zYWN0aW9uJyBhbmQgJ3JvbGxiYWNrVHJhbnNhY3Rpb24nXG4gICAgLy8gZXZlbnRzIGFyZSB1dGlsaXplZCB0byBtYWludGFpbiBpblRyYW5zYWN0aW9uIHByb3BlcnR5IHN0YXRlIHdoaWNoIGluXG4gICAgLy8gdHVybiBpcyB1c2VkIGluIG1hbmFnaW5nIHRyYW5zYWN0aW9ucy4gVGhlc2UgZXZlbnRzIGFyZSBvbmx5IGZpcmVkIGZvclxuICAgIC8vIFREUyB2ZXJzaW9uIDcuMiBhbmQgYmV5b25kLiBUaGUgcHJvcGVydGllcyBiZWxvdyBhcmUgdXNlZCB0byBlbXVsYXRlXG4gICAgLy8gZXF1aXZhbGVudCBiZWhhdmlvciBmb3IgVERTIHZlcnNpb25zIGJlZm9yZSA3LjIuXG4gICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoID0gMDtcbiAgICB0aGlzLmlzU3FsQmF0Y2ggPSBmYWxzZTtcbiAgICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICAgIHRoaXMubWVzc2FnZUJ1ZmZlciA9IEJ1ZmZlci5hbGxvYygwKTtcblxuICAgIHRoaXMuY3VyVHJhbnNpZW50UmV0cnlDb3VudCA9IDA7XG4gICAgdGhpcy50cmFuc2llbnRFcnJvckxvb2t1cCA9IG5ldyBUcmFuc2llbnRFcnJvckxvb2t1cCgpO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHRoaXMuU1RBVEUuSU5JVElBTElaRUQ7XG5cbiAgICB0aGlzLl9jYW5jZWxBZnRlclJlcXVlc3RTZW50ID0gKCkgPT4ge1xuICAgICAgdGhpcy5tZXNzYWdlSW8uc2VuZE1lc3NhZ2UoVFlQRS5BVFRFTlRJT04pO1xuICAgICAgdGhpcy5jcmVhdGVDYW5jZWxUaW1lcigpO1xuICAgIH07XG4gIH1cblxuICBjb25uZWN0KGNvbm5lY3RMaXN0ZW5lcj86IChlcnI/OiBFcnJvcikgPT4gdm9pZCkge1xuICAgIGlmICh0aGlzLnN0YXRlICE9PSB0aGlzLlNUQVRFLklOSVRJQUxJWkVEKSB7XG4gICAgICB0aHJvdyBuZXcgQ29ubmVjdGlvbkVycm9yKCdgLmNvbm5lY3RgIGNhbiBub3QgYmUgY2FsbGVkIG9uIGEgQ29ubmVjdGlvbiBpbiBgJyArIHRoaXMuc3RhdGUubmFtZSArICdgIHN0YXRlLicpO1xuICAgIH1cblxuICAgIGlmIChjb25uZWN0TGlzdGVuZXIpIHtcbiAgICAgIGNvbnN0IG9uQ29ubmVjdCA9IChlcnI/OiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICBjb25uZWN0TGlzdGVuZXIoZXJyKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IG9uRXJyb3IgPSAoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0Jywgb25Db25uZWN0KTtcbiAgICAgICAgY29ubmVjdExpc3RlbmVyKGVycik7XG4gICAgICB9O1xuXG4gICAgICB0aGlzLm9uY2UoJ2Nvbm5lY3QnLCBvbkNvbm5lY3QpO1xuICAgICAgdGhpcy5vbmNlKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgIH1cblxuICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuQ09OTkVDVElORyk7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgcmVwb3J0ZWQgdGhhdCB0aGUgY2hhcnNldCBoYXMgY2hhbmdlZC5cbiAgICovXG4gIG9uKGV2ZW50OiAnY2hhcnNldENoYW5nZScsIGxpc3RlbmVyOiAoY2hhcnNldDogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgYXR0ZW1wdCB0byBjb25uZWN0IGFuZCB2YWxpZGF0ZSBoYXMgY29tcGxldGVkLlxuICAgKi9cbiAgb24oXG4gICAgZXZlbnQ6ICdjb25uZWN0JyxcbiAgICAvKipcbiAgICAgKiBAcGFyYW0gZXJyIElmIHN1Y2Nlc3NmdWxseSBjb25uZWN0ZWQsIHdpbGwgYmUgZmFsc2V5LiBJZiB0aGVyZSB3YXMgYVxuICAgICAqICAgcHJvYmxlbSAod2l0aCBlaXRoZXIgY29ubmVjdGluZyBvciB2YWxpZGF0aW9uKSwgd2lsbCBiZSBhbiBbW0Vycm9yXV0gb2JqZWN0LlxuICAgICAqL1xuICAgIGxpc3RlbmVyOiAoZXJyOiBFcnJvciB8IHVuZGVmaW5lZCkgPT4gdm9pZFxuICApOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIHJlcG9ydGVkIHRoYXQgdGhlIGFjdGl2ZSBkYXRhYmFzZSBoYXMgY2hhbmdlZC5cbiAgICogVGhpcyBtYXkgYmUgYXMgYSByZXN1bHQgb2YgYSBzdWNjZXNzZnVsIGxvZ2luLCBvciBhIGB1c2VgIHN0YXRlbWVudC5cbiAgICovXG4gIG9uKGV2ZW50OiAnZGF0YWJhc2VDaGFuZ2UnLCBsaXN0ZW5lcjogKGRhdGFiYXNlTmFtZTogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBBIGRlYnVnIG1lc3NhZ2UgaXMgYXZhaWxhYmxlLiBJdCBtYXkgYmUgbG9nZ2VkIG9yIGlnbm9yZWQuXG4gICAqL1xuICBvbihldmVudDogJ2RlYnVnJywgbGlzdGVuZXI6IChtZXNzYWdlVGV4dDogc3RyaW5nKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBJbnRlcm5hbCBlcnJvciBvY2N1cnMuXG4gICAqL1xuICBvbihldmVudDogJ2Vycm9yJywgbGlzdGVuZXI6IChlcnI6IEVycm9yKSA9PiB2b2lkKTogdGhpc1xuXG4gIC8qKlxuICAgKiBUaGUgc2VydmVyIGhhcyBpc3N1ZWQgYW4gZXJyb3IgbWVzc2FnZS5cbiAgICovXG4gIG9uKGV2ZW50OiAnZXJyb3JNZXNzYWdlJywgbGlzdGVuZXI6IChtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5FcnJvck1lc3NhZ2VUb2tlbikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gaGFzIGVuZGVkLlxuICAgKlxuICAgKiBUaGlzIG1heSBiZSBhcyBhIHJlc3VsdCBvZiB0aGUgY2xpZW50IGNhbGxpbmcgW1tjbG9zZV1dLCB0aGUgc2VydmVyXG4gICAqIGNsb3NpbmcgdGhlIGNvbm5lY3Rpb24sIG9yIGEgbmV0d29yayBlcnJvci5cbiAgICovXG4gIG9uKGV2ZW50OiAnZW5kJywgbGlzdGVuZXI6ICgpID0+IHZvaWQpOiB0aGlzXG5cbiAgLyoqXG4gICAqIFRoZSBzZXJ2ZXIgaGFzIGlzc3VlZCBhbiBpbmZvcm1hdGlvbiBtZXNzYWdlLlxuICAgKi9cbiAgb24oZXZlbnQ6ICdpbmZvTWVzc2FnZScsIGxpc3RlbmVyOiAobWVzc2FnZTogaW1wb3J0KCcuL3Rva2VuL3Rva2VuJykuSW5mb01lc3NhZ2VUb2tlbikgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIHNlcnZlciBoYXMgcmVwb3J0ZWQgdGhhdCB0aGUgbGFuZ3VhZ2UgaGFzIGNoYW5nZWQuXG4gICAqL1xuICBvbihldmVudDogJ2xhbmd1YWdlQ2hhbmdlJywgbGlzdGVuZXI6IChsYW5ndWFnZU5hbWU6IHN0cmluZykgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogVGhlIGNvbm5lY3Rpb24gd2FzIHJlc2V0LlxuICAgKi9cbiAgb24oZXZlbnQ6ICdyZXNldENvbm5lY3Rpb24nLCBsaXN0ZW5lcjogKCkgPT4gdm9pZCk6IHRoaXNcblxuICAvKipcbiAgICogQSBzZWN1cmUgY29ubmVjdGlvbiBoYXMgYmVlbiBlc3RhYmxpc2hlZC5cbiAgICovXG4gIG9uKGV2ZW50OiAnc2VjdXJlJywgbGlzdGVuZXI6IChjbGVhcnRleHQ6IGltcG9ydCgndGxzJykuVExTU29ja2V0KSA9PiB2b2lkKTogdGhpc1xuXG4gIG9uKGV2ZW50OiBzdHJpbmcgfCBzeW1ib2wsIGxpc3RlbmVyOiAoLi4uYXJnczogYW55W10pID0+IHZvaWQpIHtcbiAgICByZXR1cm4gc3VwZXIub24oZXZlbnQsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2NoYXJzZXRDaGFuZ2UnLCBjaGFyc2V0OiBzdHJpbmcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2Nvbm5lY3QnLCBlcnJvcj86IEVycm9yKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdkYXRhYmFzZUNoYW5nZScsIGRhdGFiYXNlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdkZWJ1ZycsIG1lc3NhZ2VUZXh0OiBzdHJpbmcpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ2Vycm9yJywgZXJyb3I6IEVycm9yKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdlcnJvck1lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5FcnJvck1lc3NhZ2VUb2tlbik6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnZW5kJyk6IGJvb2xlYW5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBlbWl0KGV2ZW50OiAnaW5mb01lc3NhZ2UnLCBtZXNzYWdlOiBpbXBvcnQoJy4vdG9rZW4vdG9rZW4nKS5JbmZvTWVzc2FnZVRva2VuKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdsYW5ndWFnZUNoYW5nZScsIGxhbmd1YWdlTmFtZTogc3RyaW5nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdzZWN1cmUnLCBjbGVhcnRleHQ6IGltcG9ydCgndGxzJykuVExTU29ja2V0KTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXJvdXRpbmcnKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXNldENvbm5lY3Rpb24nKTogYm9vbGVhblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGVtaXQoZXZlbnQ6ICdyZXRyeScpOiBib29sZWFuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZW1pdChldmVudDogJ3JvbGxiYWNrVHJhbnNhY3Rpb24nKTogYm9vbGVhblxuXG4gIGVtaXQoZXZlbnQ6IHN0cmluZyB8IHN5bWJvbCwgLi4uYXJnczogYW55W10pIHtcbiAgICByZXR1cm4gc3VwZXIuZW1pdChldmVudCwgLi4uYXJncyk7XG4gIH1cblxuICAvKipcbiAgICogQ2xvc2VzIHRoZSBjb25uZWN0aW9uIHRvIHRoZSBkYXRhYmFzZS5cbiAgICpcbiAgICogVGhlIFtbRXZlbnRfZW5kXV0gd2lsbCBiZSBlbWl0dGVkIG9uY2UgdGhlIGNvbm5lY3Rpb24gaGFzIGJlZW4gY2xvc2VkLlxuICAgKi9cbiAgY2xvc2UoKSB7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGluaXRpYWxpc2VDb25uZWN0aW9uKCkge1xuICAgIGNvbnN0IHNpZ25hbCA9IHRoaXMuY3JlYXRlQ29ubmVjdFRpbWVyKCk7XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5wb3J0KSB7XG4gICAgICByZXR1cm4gdGhpcy5jb25uZWN0T25Qb3J0KHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCwgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyLCBzaWduYWwsIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluc3RhbmNlTG9va3VwKHtcbiAgICAgICAgc2VydmVyOiB0aGlzLmNvbmZpZy5zZXJ2ZXIsXG4gICAgICAgIGluc3RhbmNlTmFtZTogdGhpcy5jb25maWcub3B0aW9ucy5pbnN0YW5jZU5hbWUhLFxuICAgICAgICB0aW1lb3V0OiB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0LFxuICAgICAgICBzaWduYWw6IHNpZ25hbFxuICAgICAgfSkudGhlbigocG9ydCkgPT4ge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgICB0aGlzLmNvbm5lY3RPblBvcnQocG9ydCwgdGhpcy5jb25maWcub3B0aW9ucy5tdWx0aVN1Ym5ldEZhaWxvdmVyLCBzaWduYWwsIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdG9yKTtcbiAgICAgICAgfSk7XG4gICAgICB9LCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMuY2xlYXJDb25uZWN0VGltZXIoKTtcblxuICAgICAgICBpZiAoc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgICAgICAvLyBJZ25vcmUgdGhlIEFib3J0RXJyb3IgZm9yIG5vdywgdGhpcyBpcyBzdGlsbCBoYW5kbGVkIGJ5IHRoZSBjb25uZWN0VGltZXIgZmlyaW5nXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcihlcnIubWVzc2FnZSwgJ0VJTlNUTE9PS1VQJykpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYW51cENvbm5lY3Rpb24oY2xlYW51cFR5cGU6IHR5cGVvZiBDTEVBTlVQX1RZUEVba2V5b2YgdHlwZW9mIENMRUFOVVBfVFlQRV0pIHtcbiAgICBpZiAoIXRoaXMuY2xvc2VkKSB7XG4gICAgICB0aGlzLmNsZWFyQ29ubmVjdFRpbWVyKCk7XG4gICAgICB0aGlzLmNsZWFyUmVxdWVzdFRpbWVyKCk7XG4gICAgICB0aGlzLmNsZWFyUmV0cnlUaW1lcigpO1xuICAgICAgdGhpcy5jbG9zZUNvbm5lY3Rpb24oKTtcbiAgICAgIGlmIChjbGVhbnVwVHlwZSA9PT0gQ0xFQU5VUF9UWVBFLlJFRElSRUNUKSB7XG4gICAgICAgIHRoaXMuZW1pdCgncmVyb3V0aW5nJyk7XG4gICAgICB9IGVsc2UgaWYgKGNsZWFudXBUeXBlICE9PSBDTEVBTlVQX1RZUEUuUkVUUlkpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdlbmQnKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlcXVlc3QgPSB0aGlzLnJlcXVlc3Q7XG4gICAgICBpZiAocmVxdWVzdCkge1xuICAgICAgICBjb25zdCBlcnIgPSBuZXcgUmVxdWVzdEVycm9yKCdDb25uZWN0aW9uIGNsb3NlZCBiZWZvcmUgcmVxdWVzdCBjb21wbGV0ZWQuJywgJ0VDTE9TRScpO1xuICAgICAgICByZXF1ZXN0LmNhbGxiYWNrKGVycik7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgICAgdGhpcy5sb2dpbkVycm9yID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlRGVidWcoKSB7XG4gICAgY29uc3QgZGVidWcgPSBuZXcgRGVidWcodGhpcy5jb25maWcub3B0aW9ucy5kZWJ1Zyk7XG4gICAgZGVidWcub24oJ2RlYnVnJywgKG1lc3NhZ2UpID0+IHtcbiAgICAgIHRoaXMuZW1pdCgnZGVidWcnLCBtZXNzYWdlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVidWc7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2U6IE1lc3NhZ2UsIGhhbmRsZXI6IFRva2VuSGFuZGxlcikge1xuICAgIHJldHVybiBuZXcgVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgdGhpcy5kZWJ1ZywgaGFuZGxlciwgdGhpcy5jb25maWcub3B0aW9ucyk7XG4gIH1cblxuICBzb2NrZXRIYW5kbGluZ0ZvclNlbmRQcmVMb2dpbihzb2NrZXQ6IG5ldC5Tb2NrZXQpIHtcbiAgICBzb2NrZXQub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7IHRoaXMuc29ja2V0RXJyb3IoZXJyb3IpOyB9KTtcbiAgICBzb2NrZXQub24oJ2Nsb3NlJywgKCkgPT4geyB0aGlzLnNvY2tldENsb3NlKCk7IH0pO1xuICAgIHNvY2tldC5vbignZW5kJywgKCkgPT4geyB0aGlzLnNvY2tldEVuZCgpOyB9KTtcbiAgICBzb2NrZXQuc2V0S2VlcEFsaXZlKHRydWUsIEtFRVBfQUxJVkVfSU5JVElBTF9ERUxBWSk7XG5cbiAgICB0aGlzLm1lc3NhZ2VJbyA9IG5ldyBNZXNzYWdlSU8oc29ja2V0LCB0aGlzLmNvbmZpZy5vcHRpb25zLnBhY2tldFNpemUsIHRoaXMuZGVidWcpO1xuICAgIHRoaXMubWVzc2FnZUlvLm9uKCdzZWN1cmUnLCAoY2xlYXJ0ZXh0KSA9PiB7IHRoaXMuZW1pdCgnc2VjdXJlJywgY2xlYXJ0ZXh0KTsgfSk7XG5cbiAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcblxuICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgdGhpcy5kZWJ1Zy5sb2coJ2Nvbm5lY3RlZCB0byAnICsgdGhpcy5jb25maWcuc2VydmVyICsgJzonICsgdGhpcy5jb25maWcub3B0aW9ucy5wb3J0KTtcblxuICAgIHRoaXMuc2VuZFByZUxvZ2luKCk7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX1BSRUxPR0lOKTtcbiAgfVxuXG4gIHdyYXBXaXRoVGxzKHNvY2tldDogbmV0LlNvY2tldCwgc2lnbmFsOiBBYm9ydFNpZ25hbCk6IFByb21pc2U8dGxzLlRMU1NvY2tldD4ge1xuICAgIHNpZ25hbC50aHJvd0lmQWJvcnRlZCgpO1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHNlY3VyZUNvbnRleHQgPSB0bHMuY3JlYXRlU2VjdXJlQ29udGV4dCh0aGlzLnNlY3VyZUNvbnRleHRPcHRpb25zKTtcbiAgICAgIC8vIElmIGNvbm5lY3QgdG8gYW4gaXAgYWRkcmVzcyBkaXJlY3RseSxcbiAgICAgIC8vIG5lZWQgdG8gc2V0IHRoZSBzZXJ2ZXJuYW1lIHRvIGFuIGVtcHR5IHN0cmluZ1xuICAgICAgLy8gaWYgdGhlIHVzZXIgaGFzIG5vdCBnaXZlbiBhIHNlcnZlcm5hbWUgZXhwbGljaXRseVxuICAgICAgY29uc3Qgc2VydmVyTmFtZSA9ICFuZXQuaXNJUCh0aGlzLmNvbmZpZy5zZXJ2ZXIpID8gdGhpcy5jb25maWcuc2VydmVyIDogJyc7XG4gICAgICBjb25zdCBlbmNyeXB0T3B0aW9ucyA9IHtcbiAgICAgICAgaG9zdDogdGhpcy5jb25maWcuc2VydmVyLFxuICAgICAgICBzb2NrZXQ6IHNvY2tldCxcbiAgICAgICAgQUxQTlByb3RvY29sczogWyd0ZHMvOC4wJ10sXG4gICAgICAgIHNlY3VyZUNvbnRleHQ6IHNlY3VyZUNvbnRleHQsXG4gICAgICAgIHNlcnZlcm5hbWU6IHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA/IHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA6IHNlcnZlck5hbWUsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBlbmNyeXB0c29ja2V0ID0gdGxzLmNvbm5lY3QoZW5jcnlwdE9wdGlvbnMpO1xuXG4gICAgICBjb25zdCBvbkFib3J0ID0gKCkgPT4ge1xuICAgICAgICBlbmNyeXB0c29ja2V0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uRXJyb3IpO1xuICAgICAgICBlbmNyeXB0c29ja2V0LnJlbW92ZUxpc3RlbmVyKCdjb25uZWN0Jywgb25Db25uZWN0KTtcblxuICAgICAgICBlbmNyeXB0c29ja2V0LmRlc3Ryb3koKTtcblxuICAgICAgICByZWplY3Qoc2lnbmFsLnJlYXNvbik7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBvbkVycm9yID0gKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgc2lnbmFsLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Fib3J0Jywgb25BYm9ydCk7XG5cbiAgICAgICAgZW5jcnlwdHNvY2tldC5yZW1vdmVMaXN0ZW5lcignZXJyb3InLCBvbkVycm9yKTtcbiAgICAgICAgZW5jcnlwdHNvY2tldC5yZW1vdmVMaXN0ZW5lcignY29ubmVjdCcsIG9uQ29ubmVjdCk7XG5cbiAgICAgICAgZW5jcnlwdHNvY2tldC5kZXN0cm95KCk7XG5cbiAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBvbkNvbm5lY3QgPSAoKSA9PiB7XG4gICAgICAgIHNpZ25hbC5yZW1vdmVFdmVudExpc3RlbmVyKCdhYm9ydCcsIG9uQWJvcnQpO1xuXG4gICAgICAgIGVuY3J5cHRzb2NrZXQucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICAgIGVuY3J5cHRzb2NrZXQucmVtb3ZlTGlzdGVuZXIoJ2Nvbm5lY3QnLCBvbkNvbm5lY3QpO1xuXG4gICAgICAgIHJlc29sdmUoZW5jcnlwdHNvY2tldCk7XG4gICAgICB9O1xuXG4gICAgICBzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcignYWJvcnQnLCBvbkFib3J0LCB7IG9uY2U6IHRydWUgfSk7XG5cbiAgICAgIGVuY3J5cHRzb2NrZXQub24oJ2Vycm9yJywgb25FcnJvcik7XG4gICAgICBlbmNyeXB0c29ja2V0Lm9uKCdzZWN1cmVDb25uZWN0Jywgb25Db25uZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbm5lY3RPblBvcnQocG9ydDogbnVtYmVyLCBtdWx0aVN1Ym5ldEZhaWxvdmVyOiBib29sZWFuLCBzaWduYWw6IEFib3J0U2lnbmFsLCBjdXN0b21Db25uZWN0b3I/OiAoKSA9PiBQcm9taXNlPG5ldC5Tb2NrZXQ+KSB7XG4gICAgY29uc3QgY29ubmVjdE9wdHMgPSB7XG4gICAgICBob3N0OiB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5zZXJ2ZXIgOiB0aGlzLmNvbmZpZy5zZXJ2ZXIsXG4gICAgICBwb3J0OiB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5wb3J0IDogcG9ydCxcbiAgICAgIGxvY2FsQWRkcmVzczogdGhpcy5jb25maWcub3B0aW9ucy5sb2NhbEFkZHJlc3NcbiAgICB9O1xuXG4gICAgY29uc3QgY29ubmVjdCA9IGN1c3RvbUNvbm5lY3RvciB8fCAobXVsdGlTdWJuZXRGYWlsb3ZlciA/IGNvbm5lY3RJblBhcmFsbGVsIDogY29ubmVjdEluU2VxdWVuY2UpO1xuXG4gICAgKGFzeW5jICgpID0+IHtcbiAgICAgIGxldCBzb2NrZXQgPSBhd2FpdCBjb25uZWN0KGNvbm5lY3RPcHRzLCBkbnMubG9va3VwLCBzaWduYWwpO1xuXG4gICAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0ID09PSAnc3RyaWN0Jykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFdyYXAgdGhlIHNvY2tldCB3aXRoIFRMUyBmb3IgVERTIDguMFxuICAgICAgICAgIHNvY2tldCA9IGF3YWl0IHRoaXMud3JhcFdpdGhUbHMoc29ja2V0LCBzaWduYWwpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBzb2NrZXQuZW5kKCk7XG5cbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdGhpcy5zb2NrZXRIYW5kbGluZ0ZvclNlbmRQcmVMb2dpbihzb2NrZXQpO1xuICAgIH0pKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgdGhpcy5jbGVhckNvbm5lY3RUaW1lcigpO1xuXG4gICAgICBpZiAoc2lnbmFsLmFib3J0ZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHsgdGhpcy5zb2NrZXRFcnJvcihlcnIpOyB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xvc2VDb25uZWN0aW9uKCkge1xuICAgIGlmICh0aGlzLnNvY2tldCkge1xuICAgICAgdGhpcy5zb2NrZXQuZGVzdHJveSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY3JlYXRlQ29ubmVjdFRpbWVyKCkge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgdGhpcy5jb25uZWN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnRyb2xsZXIuYWJvcnQoKTtcbiAgICAgIHRoaXMuY29ubmVjdFRpbWVvdXQoKTtcbiAgICB9LCB0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3RUaW1lb3V0KTtcbiAgICByZXR1cm4gY29udHJvbGxlci5zaWduYWw7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGNyZWF0ZUNhbmNlbFRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJDYW5jZWxUaW1lcigpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmNhbmNlbFRpbWVvdXQ7XG4gICAgaWYgKHRpbWVvdXQgPiAwKSB7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuY2FuY2VsVGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVSZXF1ZXN0VGltZXIoKSB7XG4gICAgdGhpcy5jbGVhclJlcXVlc3RUaW1lcigpOyAvLyByZWxlYXNlIG9sZCB0aW1lciwganVzdCB0byBiZSBzYWZlXG4gICAgY29uc3QgcmVxdWVzdCA9IHRoaXMucmVxdWVzdCBhcyBSZXF1ZXN0O1xuICAgIGNvbnN0IHRpbWVvdXQgPSAocmVxdWVzdC50aW1lb3V0ICE9PSB1bmRlZmluZWQpID8gcmVxdWVzdC50aW1lb3V0IDogdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICBpZiAodGltZW91dCkge1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0VGltZW91dCgpO1xuICAgICAgfSwgdGltZW91dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjcmVhdGVSZXRyeVRpbWVyKCkge1xuICAgIHRoaXMuY2xlYXJSZXRyeVRpbWVyKCk7XG4gICAgdGhpcy5yZXRyeVRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLnJldHJ5VGltZW91dCgpO1xuICAgIH0sIHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvblJldHJ5SW50ZXJ2YWwpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjb25uZWN0VGltZW91dCgpIHtcbiAgICBjb25zdCBob3N0UG9zdGZpeCA9IHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCA/IGA6JHt0aGlzLmNvbmZpZy5vcHRpb25zLnBvcnR9YCA6IGBcXFxcJHt0aGlzLmNvbmZpZy5vcHRpb25zLmluc3RhbmNlTmFtZX1gO1xuICAgIC8vIElmIHdlIGhhdmUgcm91dGluZyBkYXRhIHN0b3JlZCwgdGhpcyBjb25uZWN0aW9uIGhhcyBiZWVuIHJlZGlyZWN0ZWRcbiAgICBjb25zdCBzZXJ2ZXIgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5zZXJ2ZXIgOiB0aGlzLmNvbmZpZy5zZXJ2ZXI7XG4gICAgY29uc3QgcG9ydCA9IHRoaXMucm91dGluZ0RhdGEgPyBgOiR7dGhpcy5yb3V0aW5nRGF0YS5wb3J0fWAgOiBob3N0UG9zdGZpeDtcbiAgICAvLyBHcmFiIHRoZSB0YXJnZXQgaG9zdCBmcm9tIHRoZSBjb25uZWN0aW9uIGNvbmZpZ3VyYXRpb24sIGFuZCBmcm9tIGEgcmVkaXJlY3QgbWVzc2FnZVxuICAgIC8vIG90aGVyd2lzZSwgbGVhdmUgdGhlIG1lc3NhZ2UgZW1wdHkuXG4gICAgY29uc3Qgcm91dGluZ01lc3NhZ2UgPSB0aGlzLnJvdXRpbmdEYXRhID8gYCAocmVkaXJlY3RlZCBmcm9tICR7dGhpcy5jb25maWcuc2VydmVyfSR7aG9zdFBvc3RmaXh9KWAgOiAnJztcbiAgICBjb25zdCBtZXNzYWdlID0gYEZhaWxlZCB0byBjb25uZWN0IHRvICR7c2VydmVyfSR7cG9ydH0ke3JvdXRpbmdNZXNzYWdlfSBpbiAke3RoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdFRpbWVvdXR9bXNgO1xuICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VUSU1FT1VUJykpO1xuICAgIHRoaXMuY29ubmVjdFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnY29ubmVjdFRpbWVvdXQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2FuY2VsVGltZW91dCgpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gYEZhaWxlZCB0byBjYW5jZWwgcmVxdWVzdCBpbiAke3RoaXMuY29uZmlnLm9wdGlvbnMuY2FuY2VsVGltZW91dH1tc2A7XG4gICAgdGhpcy5kZWJ1Zy5sb2cobWVzc2FnZSk7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdzb2NrZXRFcnJvcicsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VUSU1FT1VUJykpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICByZXF1ZXN0VGltZW91dCgpIHtcbiAgICB0aGlzLnJlcXVlc3RUaW1lciA9IHVuZGVmaW5lZDtcbiAgICBjb25zdCByZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICByZXF1ZXN0LmNhbmNlbCgpO1xuICAgIGNvbnN0IHRpbWVvdXQgPSAocmVxdWVzdC50aW1lb3V0ICE9PSB1bmRlZmluZWQpID8gcmVxdWVzdC50aW1lb3V0IDogdGhpcy5jb25maWcub3B0aW9ucy5yZXF1ZXN0VGltZW91dDtcbiAgICBjb25zdCBtZXNzYWdlID0gJ1RpbWVvdXQ6IFJlcXVlc3QgZmFpbGVkIHRvIGNvbXBsZXRlIGluICcgKyB0aW1lb3V0ICsgJ21zJztcbiAgICByZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcihtZXNzYWdlLCAnRVRJTUVPVVQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcmV0cnlUaW1lb3V0KCkge1xuICAgIHRoaXMucmV0cnlUaW1lciA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmVtaXQoJ3JldHJ5Jyk7XG4gICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5DT05ORUNUSU5HKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYXJDb25uZWN0VGltZXIoKSB7XG4gICAgaWYgKHRoaXMuY29ubmVjdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jb25uZWN0VGltZXIpO1xuICAgICAgdGhpcy5jb25uZWN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhckNhbmNlbFRpbWVyKCkge1xuICAgIGlmICh0aGlzLmNhbmNlbFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5jYW5jZWxUaW1lcik7XG4gICAgICB0aGlzLmNhbmNlbFRpbWVyID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgY2xlYXJSZXF1ZXN0VGltZXIoKSB7XG4gICAgaWYgKHRoaXMucmVxdWVzdFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5yZXF1ZXN0VGltZXIpO1xuICAgICAgdGhpcy5yZXF1ZXN0VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjbGVhclJldHJ5VGltZXIoKSB7XG4gICAgaWYgKHRoaXMucmV0cnlUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMucmV0cnlUaW1lcik7XG4gICAgICB0aGlzLnJldHJ5VGltZXIgPSB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICB0cmFuc2l0aW9uVG8obmV3U3RhdGU6IFN0YXRlKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IG5ld1N0YXRlKSB7XG4gICAgICB0aGlzLmRlYnVnLmxvZygnU3RhdGUgaXMgYWxyZWFkeSAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuc3RhdGUgJiYgdGhpcy5zdGF0ZS5leGl0KSB7XG4gICAgICB0aGlzLnN0YXRlLmV4aXQuY2FsbCh0aGlzLCBuZXdTdGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5kZWJ1Zy5sb2coJ1N0YXRlIGNoYW5nZTogJyArICh0aGlzLnN0YXRlID8gdGhpcy5zdGF0ZS5uYW1lIDogJ3VuZGVmaW5lZCcpICsgJyAtPiAnICsgbmV3U3RhdGUubmFtZSk7XG4gICAgdGhpcy5zdGF0ZSA9IG5ld1N0YXRlO1xuXG4gICAgaWYgKHRoaXMuc3RhdGUuZW50ZXIpIHtcbiAgICAgIHRoaXMuc3RhdGUuZW50ZXIuYXBwbHkodGhpcyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRFdmVudEhhbmRsZXI8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBUKTogTm9uTnVsbGFibGU8U3RhdGVbJ2V2ZW50cyddW1RdPiB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV07XG5cbiAgICBpZiAoIWhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZXZlbnQgJyR7ZXZlbnROYW1lfScgaW4gc3RhdGUgJyR7dGhpcy5zdGF0ZS5uYW1lfSdgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFuZGxlciE7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGRpc3BhdGNoRXZlbnQ8VCBleHRlbmRzIGtleW9mIFN0YXRlWydldmVudHMnXT4oZXZlbnROYW1lOiBULCAuLi5hcmdzOiBQYXJhbWV0ZXJzPE5vbk51bGxhYmxlPFN0YXRlWydldmVudHMnXVtUXT4+KSB7XG4gICAgY29uc3QgaGFuZGxlciA9IHRoaXMuc3RhdGUuZXZlbnRzW2V2ZW50TmFtZV0gYXMgKCh0aGlzOiBDb25uZWN0aW9uLCAuLi5hcmdzOiBhbnlbXSkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZW1pdCgnZXJyb3InLCBuZXcgRXJyb3IoYE5vIGV2ZW50ICcke2V2ZW50TmFtZX0nIGluIHN0YXRlICcke3RoaXMuc3RhdGUubmFtZX0nYCkpO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc29ja2V0RXJyb3IoZXJyb3I6IEVycm9yKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuQ09OTkVDVElORyB8fCB0aGlzLnN0YXRlID09PSB0aGlzLlNUQVRFLlNFTlRfVExTU1NMTkVHT1RJQVRJT04pIHtcbiAgICAgIGNvbnN0IGhvc3RQb3N0Zml4ID0gdGhpcy5jb25maWcub3B0aW9ucy5wb3J0ID8gYDoke3RoaXMuY29uZmlnLm9wdGlvbnMucG9ydH1gIDogYFxcXFwke3RoaXMuY29uZmlnLm9wdGlvbnMuaW5zdGFuY2VOYW1lfWA7XG4gICAgICAvLyBJZiB3ZSBoYXZlIHJvdXRpbmcgZGF0YSBzdG9yZWQsIHRoaXMgY29ubmVjdGlvbiBoYXMgYmVlbiByZWRpcmVjdGVkXG4gICAgICBjb25zdCBzZXJ2ZXIgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5zZXJ2ZXIgOiB0aGlzLmNvbmZpZy5zZXJ2ZXI7XG4gICAgICBjb25zdCBwb3J0ID0gdGhpcy5yb3V0aW5nRGF0YSA/IGA6JHt0aGlzLnJvdXRpbmdEYXRhLnBvcnR9YCA6IGhvc3RQb3N0Zml4O1xuICAgICAgLy8gR3JhYiB0aGUgdGFyZ2V0IGhvc3QgZnJvbSB0aGUgY29ubmVjdGlvbiBjb25maWd1cmF0aW9uLCBhbmQgZnJvbSBhIHJlZGlyZWN0IG1lc3NhZ2VcbiAgICAgIC8vIG90aGVyd2lzZSwgbGVhdmUgdGhlIG1lc3NhZ2UgZW1wdHkuXG4gICAgICBjb25zdCByb3V0aW5nTWVzc2FnZSA9IHRoaXMucm91dGluZ0RhdGEgPyBgIChyZWRpcmVjdGVkIGZyb20gJHt0aGlzLmNvbmZpZy5zZXJ2ZXJ9JHtob3N0UG9zdGZpeH0pYCA6ICcnO1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBGYWlsZWQgdG8gY29ubmVjdCB0byAke3NlcnZlcn0ke3BvcnR9JHtyb3V0aW5nTWVzc2FnZX0gLSAke2Vycm9yLm1lc3NhZ2V9YDtcbiAgICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcihtZXNzYWdlLCAnRVNPQ0tFVCcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBDb25uZWN0aW9uIGxvc3QgLSAke2Vycm9yLm1lc3NhZ2V9YDtcbiAgICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBDb25uZWN0aW9uRXJyb3IobWVzc2FnZSwgJ0VTT0NLRVQnKSk7XG4gICAgfVxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCgnc29ja2V0RXJyb3InLCBlcnJvcik7XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHNvY2tldEVuZCgpIHtcbiAgICB0aGlzLmRlYnVnLmxvZygnc29ja2V0IGVuZGVkJyk7XG4gICAgaWYgKHRoaXMuc3RhdGUgIT09IHRoaXMuU1RBVEUuRklOQUwpIHtcbiAgICAgIGNvbnN0IGVycm9yOiBFcnJvcldpdGhDb2RlID0gbmV3IEVycm9yKCdzb2NrZXQgaGFuZyB1cCcpO1xuICAgICAgZXJyb3IuY29kZSA9ICdFQ09OTlJFU0VUJztcbiAgICAgIHRoaXMuc29ja2V0RXJyb3IoZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc29ja2V0Q2xvc2UoKSB7XG4gICAgdGhpcy5kZWJ1Zy5sb2coJ2Nvbm5lY3Rpb24gdG8gJyArIHRoaXMuY29uZmlnLnNlcnZlciArICc6JyArIHRoaXMuY29uZmlnLm9wdGlvbnMucG9ydCArICcgY2xvc2VkJyk7XG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuUkVST1VUSU5HKSB7XG4gICAgICB0aGlzLmRlYnVnLmxvZygnUmVyb3V0aW5nIHRvICcgKyB0aGlzLnJvdXRpbmdEYXRhIS5zZXJ2ZXIgKyAnOicgKyB0aGlzLnJvdXRpbmdEYXRhIS5wb3J0KTtcblxuICAgICAgdGhpcy5kaXNwYXRjaEV2ZW50KCdyZWNvbm5lY3QnKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlkpIHtcbiAgICAgIGNvbnN0IHNlcnZlciA9IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnNlcnZlciA6IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICAgIGNvbnN0IHBvcnQgPSB0aGlzLnJvdXRpbmdEYXRhID8gdGhpcy5yb3V0aW5nRGF0YS5wb3J0IDogdGhpcy5jb25maWcub3B0aW9ucy5wb3J0O1xuICAgICAgdGhpcy5kZWJ1Zy5sb2coJ1JldHJ5IGFmdGVyIHRyYW5zaWVudCBmYWlsdXJlIGNvbm5lY3RpbmcgdG8gJyArIHNlcnZlciArICc6JyArIHBvcnQpO1xuXG4gICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoJ3JldHJ5Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgc2VuZFByZUxvZ2luKCkge1xuICAgIGNvbnN0IFssIG1ham9yLCBtaW5vciwgYnVpbGRdID0gL14oXFxkKylcXC4oXFxkKylcXC4oXFxkKykvLmV4ZWModmVyc2lvbikgPz8gWycwLjAuMCcsICcwJywgJzAnLCAnMCddO1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgUHJlbG9naW5QYXlsb2FkKHtcbiAgICAgIC8vIElmIGVuY3J5cHQgc2V0dGluZyBpcyBzZXQgdG8gJ3N0cmljdCcsIHRoZW4gd2Ugc2hvdWxkIGhhdmUgYWxyZWFkeSBkb25lIHRoZSBlbmNyeXB0aW9uIGJlZm9yZSBjYWxsaW5nXG4gICAgICAvLyB0aGlzIGZ1bmN0aW9uLiBUaGVyZWZvcmUsIHRoZSBlbmNyeXB0IHdpbGwgYmUgc2V0IHRvIGZhbHNlIGhlcmUuXG4gICAgICAvLyBPdGhlcndpc2UsIHdlIHdpbGwgc2V0IGVuY3J5cHQgaGVyZSBiYXNlZCBvbiB0aGUgZW5jcnlwdCBCb29sZWFuIHZhbHVlIGZyb20gdGhlIGNvbmZpZ3VyYXRpb24uXG4gICAgICBlbmNyeXB0OiB0eXBlb2YgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0ID09PSAnYm9vbGVhbicgJiYgdGhpcy5jb25maWcub3B0aW9ucy5lbmNyeXB0LFxuICAgICAgdmVyc2lvbjogeyBtYWpvcjogTnVtYmVyKG1ham9yKSwgbWlub3I6IE51bWJlcihtaW5vciksIGJ1aWxkOiBOdW1iZXIoYnVpbGQpLCBzdWJidWlsZDogMCB9XG4gICAgfSk7XG5cbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLlBSRUxPR0lOLCBwYXlsb2FkLmRhdGEpO1xuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kTG9naW43UGFja2V0KCkge1xuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgTG9naW43UGF5bG9hZCh7XG4gICAgICB0ZHNWZXJzaW9uOiB2ZXJzaW9uc1t0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb25dLFxuICAgICAgcGFja2V0U2l6ZTogdGhpcy5jb25maWcub3B0aW9ucy5wYWNrZXRTaXplLFxuICAgICAgY2xpZW50UHJvZ1ZlcjogMCxcbiAgICAgIGNsaWVudFBpZDogcHJvY2Vzcy5waWQsXG4gICAgICBjb25uZWN0aW9uSWQ6IDAsXG4gICAgICBjbGllbnRUaW1lWm9uZTogbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpLFxuICAgICAgY2xpZW50TGNpZDogMHgwMDAwMDQwOVxuICAgIH0pO1xuXG4gICAgY29uc3QgeyBhdXRoZW50aWNhdGlvbiB9ID0gdGhpcy5jb25maWc7XG4gICAgc3dpdGNoIChhdXRoZW50aWNhdGlvbi50eXBlKSB7XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXBhc3N3b3JkJzpcbiAgICAgICAgcGF5bG9hZC5mZWRBdXRoID0ge1xuICAgICAgICAgIHR5cGU6ICdBREFMJyxcbiAgICAgICAgICBlY2hvOiB0aGlzLmZlZEF1dGhSZXF1aXJlZCxcbiAgICAgICAgICB3b3JrZmxvdzogJ2RlZmF1bHQnXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWFjY2Vzcy10b2tlbic6XG4gICAgICAgIHBheWxvYWQuZmVkQXV0aCA9IHtcbiAgICAgICAgICB0eXBlOiAnU0VDVVJJVFlUT0tFTicsXG4gICAgICAgICAgZWNobzogdGhpcy5mZWRBdXRoUmVxdWlyZWQsXG4gICAgICAgICAgZmVkQXV0aFRva2VuOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnRva2VuXG4gICAgICAgIH07XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bSc6XG4gICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LWRlZmF1bHQnOlxuICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktYXBwLXNlcnZpY2UnOlxuICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1zZXJ2aWNlLXByaW5jaXBhbC1zZWNyZXQnOlxuICAgICAgICBwYXlsb2FkLmZlZEF1dGggPSB7XG4gICAgICAgICAgdHlwZTogJ0FEQUwnLFxuICAgICAgICAgIGVjaG86IHRoaXMuZmVkQXV0aFJlcXVpcmVkLFxuICAgICAgICAgIHdvcmtmbG93OiAnaW50ZWdyYXRlZCdcbiAgICAgICAgfTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ250bG0nOlxuICAgICAgICBwYXlsb2FkLnNzcGkgPSBjcmVhdGVOVExNUmVxdWVzdCh7IGRvbWFpbjogYXV0aGVudGljYXRpb24ub3B0aW9ucy5kb21haW4gfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBwYXlsb2FkLnVzZXJOYW1lID0gYXV0aGVudGljYXRpb24ub3B0aW9ucy51c2VyTmFtZTtcbiAgICAgICAgcGF5bG9hZC5wYXNzd29yZCA9IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmQ7XG4gICAgfVxuXG4gICAgcGF5bG9hZC5ob3N0bmFtZSA9IHRoaXMuY29uZmlnLm9wdGlvbnMud29ya3N0YXRpb25JZCB8fCBvcy5ob3N0bmFtZSgpO1xuICAgIHBheWxvYWQuc2VydmVyTmFtZSA9IHRoaXMucm91dGluZ0RhdGEgPyB0aGlzLnJvdXRpbmdEYXRhLnNlcnZlciA6IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICBwYXlsb2FkLmFwcE5hbWUgPSB0aGlzLmNvbmZpZy5vcHRpb25zLmFwcE5hbWUgfHwgJ1RlZGlvdXMnO1xuICAgIHBheWxvYWQubGlicmFyeU5hbWUgPSBsaWJyYXJ5TmFtZTtcbiAgICBwYXlsb2FkLmxhbmd1YWdlID0gdGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZTtcbiAgICBwYXlsb2FkLmRhdGFiYXNlID0gdGhpcy5jb25maWcub3B0aW9ucy5kYXRhYmFzZTtcbiAgICBwYXlsb2FkLmNsaWVudElkID0gQnVmZmVyLmZyb20oWzEsIDIsIDMsIDQsIDUsIDZdKTtcblxuICAgIHBheWxvYWQucmVhZE9ubHlJbnRlbnQgPSB0aGlzLmNvbmZpZy5vcHRpb25zLnJlYWRPbmx5SW50ZW50O1xuICAgIHBheWxvYWQuaW5pdERiRmF0YWwgPSAhdGhpcy5jb25maWcub3B0aW9ucy5mYWxsYmFja1RvRGVmYXVsdERiO1xuXG4gICAgdGhpcy5yb3V0aW5nRGF0YSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLkxPR0lONywgcGF5bG9hZC50b0J1ZmZlcigpKTtcblxuICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBwYXlsb2FkLnRvU3RyaW5nKCcgICcpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kRmVkQXV0aFRva2VuTWVzc2FnZSh0b2tlbjogc3RyaW5nKSB7XG4gICAgY29uc3QgYWNjZXNzVG9rZW5MZW4gPSBCdWZmZXIuYnl0ZUxlbmd0aCh0b2tlbiwgJ3VjczInKTtcbiAgICBjb25zdCBkYXRhID0gQnVmZmVyLmFsbG9jKDggKyBhY2Nlc3NUb2tlbkxlbik7XG4gICAgbGV0IG9mZnNldCA9IDA7XG4gICAgb2Zmc2V0ID0gZGF0YS53cml0ZVVJbnQzMkxFKGFjY2Vzc1Rva2VuTGVuICsgNCwgb2Zmc2V0KTtcbiAgICBvZmZzZXQgPSBkYXRhLndyaXRlVUludDMyTEUoYWNjZXNzVG9rZW5MZW4sIG9mZnNldCk7XG4gICAgZGF0YS53cml0ZSh0b2tlbiwgb2Zmc2V0LCAndWNzMicpO1xuICAgIHRoaXMubWVzc2FnZUlvLnNlbmRNZXNzYWdlKFRZUEUuRkVEQVVUSF9UT0tFTiwgZGF0YSk7XG4gICAgLy8gc2VudCB0aGUgZmVkQXV0aCB0b2tlbiBtZXNzYWdlLCB0aGUgcmVzdCBpcyBzaW1pbGFyIHRvIHN0YW5kYXJkIGxvZ2luIDdcbiAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfTE9HSU43X1dJVEhfU1RBTkRBUkRfTE9HSU4pO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBzZW5kSW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBwYXlsb2FkID0gbmV3IFNxbEJhdGNoUGF5bG9hZCh0aGlzLmdldEluaXRpYWxTcWwoKSwgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCksIHRoaXMuY29uZmlnLm9wdGlvbnMpO1xuXG4gICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKHsgdHlwZTogVFlQRS5TUUxfQkFUQ0ggfSk7XG4gICAgdGhpcy5tZXNzYWdlSW8ub3V0Z29pbmdNZXNzYWdlU3RyZWFtLndyaXRlKG1lc3NhZ2UpO1xuICAgIFJlYWRhYmxlLmZyb20ocGF5bG9hZCkucGlwZShtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZ2V0SW5pdGlhbFNxbCgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gW107XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9udWxscyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFuc2lfbnVsbHMgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQW5zaU51bGxEZWZhdWx0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpTnVsbERlZmF1bHQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX251bGxfZGZsdF9vbiBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpUGFkZGluZyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lQYWRkaW5nID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV9wYWRkaW5nIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFuc2lXYXJuaW5ncyA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgYW5zaV93YXJuaW5ncyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVBbnNpV2FybmluZ3MgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBhbnNpX3dhcm5pbmdzIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUFyaXRoQWJvcnQgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQXJpdGhBYm9ydCA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGFyaXRoYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ29uY2F0TnVsbFlpZWxkc051bGwgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGNvbmNhdF9udWxsX3lpZWxkc19udWxsIG9uJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZUNvbmNhdE51bGxZaWVsZHNOdWxsID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY29uY2F0X251bGxfeWllbGRzX251bGwgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlQ3Vyc29yQ2xvc2VPbkNvbW1pdCA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVDdXJzb3JDbG9zZU9uQ29tbWl0ID09PSBmYWxzZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgY3Vyc29yX2Nsb3NlX29uX2NvbW1pdCBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5kYXRlZmlyc3QgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmaXJzdCAke3RoaXMuY29uZmlnLm9wdGlvbnMuZGF0ZWZpcnN0fWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXQgIT09IG51bGwpIHtcbiAgICAgIG9wdGlvbnMucHVzaChgc2V0IGRhdGVmb3JtYXQgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmRhdGVGb3JtYXR9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlSW1wbGljaXRUcmFuc2FjdGlvbnMgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvbicpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb25maWcub3B0aW9ucy5lbmFibGVJbXBsaWNpdFRyYW5zYWN0aW9ucyA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IGltcGxpY2l0X3RyYW5zYWN0aW9ucyBvZmYnKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb25maWcub3B0aW9ucy5sYW5ndWFnZSAhPT0gbnVsbCkge1xuICAgICAgb3B0aW9ucy5wdXNoKGBzZXQgbGFuZ3VhZ2UgJHt0aGlzLmNvbmZpZy5vcHRpb25zLmxhbmd1YWdlfWApO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLmVuYWJsZU51bWVyaWNSb3VuZGFib3J0ID09PSB0cnVlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlTnVtZXJpY1JvdW5kYWJvcnQgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCBudW1lcmljX3JvdW5kYWJvcnQgb2ZmJyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gdHJ1ZSkge1xuICAgICAgb3B0aW9ucy5wdXNoKCdzZXQgcXVvdGVkX2lkZW50aWZpZXIgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuZW5hYmxlUXVvdGVkSWRlbnRpZmllciA9PT0gZmFsc2UpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHF1b3RlZF9pZGVudGlmaWVyIG9mZicpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRleHRzaXplICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0ZXh0c2l6ZSAke3RoaXMuY29uZmlnLm9wdGlvbnMudGV4dHNpemV9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuY29ubmVjdGlvbklzb2xhdGlvbkxldmVsICE9PSBudWxsKSB7XG4gICAgICBvcHRpb25zLnB1c2goYHNldCB0cmFuc2FjdGlvbiBpc29sYXRpb24gbGV2ZWwgJHt0aGlzLmdldElzb2xhdGlvbkxldmVsVGV4dCh0aGlzLmNvbmZpZy5vcHRpb25zLmNvbm5lY3Rpb25Jc29sYXRpb25MZXZlbCl9YCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IHRydWUpIHtcbiAgICAgIG9wdGlvbnMucHVzaCgnc2V0IHhhY3RfYWJvcnQgb24nKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMuYWJvcnRUcmFuc2FjdGlvbk9uRXJyb3IgPT09IGZhbHNlKSB7XG4gICAgICBvcHRpb25zLnB1c2goJ3NldCB4YWN0X2Fib3J0IG9mZicpO1xuICAgIH1cblxuICAgIHJldHVybiBvcHRpb25zLmpvaW4oJ1xcbicpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcm9jZXNzZWRJbml0aWFsU3FsKCkge1xuICAgIHRoaXMuY2xlYXJDb25uZWN0VGltZXIoKTtcbiAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIHRoZSBTUUwgYmF0Y2ggcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqIFRoZXJlIGlzIG5vIHBhcmFtIHN1cHBvcnQsIGFuZCB1bmxpa2UgW1tSZXF1ZXN0LmV4ZWNTcWxdXSxcbiAgICogaXQgaXMgbm90IGxpa2VseSB0aGF0IFNRTCBTZXJ2ZXIgd2lsbCByZXVzZSB0aGUgZXhlY3V0aW9uIHBsYW4gaXQgZ2VuZXJhdGVzIGZvciB0aGUgU1FMLlxuICAgKlxuICAgKiBJbiBhbG1vc3QgYWxsIGNhc2VzLCBbW1JlcXVlc3QuZXhlY1NxbF1dIHdpbGwgYmUgYSBiZXR0ZXIgY2hvaWNlLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIFtbUmVxdWVzdF1dIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIHJlcXVlc3QuXG4gICAqL1xuICBleGVjU3FsQmF0Y2gocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5TUUxfQkFUQ0gsIG5ldyBTcWxCYXRjaFBheWxvYWQocmVxdWVzdC5zcWxUZXh0T3JQcm9jZWR1cmUhLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucykpO1xuICB9XG5cbiAgLyoqXG4gICAqICBFeGVjdXRlIHRoZSBTUUwgcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqXG4gICAqIEFzIGBzcF9leGVjdXRlc3FsYCBpcyB1c2VkIHRvIGV4ZWN1dGUgdGhlIFNRTCwgaWYgdGhlIHNhbWUgU1FMIGlzIGV4ZWN1dGVkIG11bHRpcGxlcyB0aW1lc1xuICAgKiB1c2luZyB0aGlzIGZ1bmN0aW9uLCB0aGUgU1FMIFNlcnZlciBxdWVyeSBvcHRpbWl6ZXIgaXMgbGlrZWx5IHRvIHJldXNlIHRoZSBleGVjdXRpb24gcGxhbiBpdCBnZW5lcmF0ZXNcbiAgICogZm9yIHRoZSBmaXJzdCBleGVjdXRpb24uIFRoaXMgbWF5IGFsc28gcmVzdWx0IGluIFNRTCBzZXJ2ZXIgdHJlYXRpbmcgdGhlIHJlcXVlc3QgbGlrZSBhIHN0b3JlZCBwcm9jZWR1cmVcbiAgICogd2hpY2ggY2FuIHJlc3VsdCBpbiB0aGUgW1tFdmVudF9kb25lSW5Qcm9jXV0gb3IgW1tFdmVudF9kb25lUHJvY11dIGV2ZW50cyBiZWluZyBlbWl0dGVkIGluc3RlYWQgb2YgdGhlXG4gICAqIFtbRXZlbnRfZG9uZV1dIGV2ZW50IHlvdSBtaWdodCBleHBlY3QuIFVzaW5nIFtbZXhlY1NxbEJhdGNoXV0gd2lsbCBwcmV2ZW50IHRoaXMgZnJvbSBvY2N1cnJpbmcgYnV0IG1heSBoYXZlIGEgbmVnYXRpdmUgcGVyZm9ybWFuY2UgaW1wYWN0LlxuICAgKlxuICAgKiBCZXdhcmUgb2YgdGhlIHdheSB0aGF0IHNjb3BpbmcgcnVsZXMgYXBwbHksIGFuZCBob3cgdGhleSBtYXkgW2FmZmVjdCBsb2NhbCB0ZW1wIHRhYmxlc10oaHR0cDovL3dlYmxvZ3Muc3FsdGVhbS5jb20vbWxhZGVucC9hcmNoaXZlLzIwMDYvMTEvMDMvMTcxOTcuYXNweClcbiAgICogSWYgeW91J3JlIHJ1bm5pbmcgaW4gdG8gc2NvcGluZyBpc3N1ZXMsIHRoZW4gW1tleGVjU3FsQmF0Y2hdXSBtYXkgYmUgYSBiZXR0ZXIgY2hvaWNlLlxuICAgKiBTZWUgYWxzbyBbaXNzdWUgIzI0XShodHRwczovL2dpdGh1Yi5jb20vcGVraW0vdGVkaW91cy9pc3N1ZXMvMjQpXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGV4ZWNTcWwocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRyeSB7XG4gICAgICByZXF1ZXN0LnZhbGlkYXRlUGFyYW1ldGVycyh0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBwYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuTlZhckNoYXIsXG4gICAgICBuYW1lOiAnc3RhdGVtZW50JyxcbiAgICAgIHZhbHVlOiByZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgaWYgKHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGgpIHtcbiAgICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICAgIHR5cGU6IFRZUEVTLk5WYXJDaGFyLFxuICAgICAgICBuYW1lOiAncGFyYW1zJyxcbiAgICAgICAgdmFsdWU6IHJlcXVlc3QubWFrZVBhcmFtc1BhcmFtZXRlcihyZXF1ZXN0LnBhcmFtZXRlcnMpLFxuICAgICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICAgIH0pO1xuXG4gICAgICBwYXJhbWV0ZXJzLnB1c2goLi4ucmVxdWVzdC5wYXJhbWV0ZXJzKTtcbiAgICB9XG5cbiAgICB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuUlBDX1JFUVVFU1QsIG5ldyBScGNSZXF1ZXN0UGF5bG9hZChQcm9jZWR1cmVzLlNwX0V4ZWN1dGVTcWwsIHBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBCdWxrTG9hZCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHRhYmxlIFRoZSBuYW1lIG9mIHRoZSB0YWJsZSB0byBidWxrLWluc2VydCBpbnRvLlxuICAgKiBAcGFyYW0gb3B0aW9ucyBBIHNldCBvZiBidWxrIGxvYWQgb3B0aW9ucy5cbiAgICovXG4gIG5ld0J1bGtMb2FkKHRhYmxlOiBzdHJpbmcsIGNhbGxiYWNrOiBCdWxrTG9hZENhbGxiYWNrKTogQnVsa0xvYWRcbiAgbmV3QnVsa0xvYWQodGFibGU6IHN0cmluZywgb3B0aW9uczogQnVsa0xvYWRPcHRpb25zLCBjYWxsYmFjazogQnVsa0xvYWRDYWxsYmFjayk6IEJ1bGtMb2FkXG4gIG5ld0J1bGtMb2FkKHRhYmxlOiBzdHJpbmcsIGNhbGxiYWNrT3JPcHRpb25zOiBCdWxrTG9hZE9wdGlvbnMgfCBCdWxrTG9hZENhbGxiYWNrLCBjYWxsYmFjaz86IEJ1bGtMb2FkQ2FsbGJhY2spIHtcbiAgICBsZXQgb3B0aW9uczogQnVsa0xvYWRPcHRpb25zO1xuXG4gICAgaWYgKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2tPck9wdGlvbnMgYXMgQnVsa0xvYWRDYWxsYmFjaztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3B0aW9ucyA9IGNhbGxiYWNrT3JPcHRpb25zIGFzIEJ1bGtMb2FkT3B0aW9ucztcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcIm9wdGlvbnNcIiBhcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdCcpO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEJ1bGtMb2FkKHRhYmxlLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uLCB0aGlzLmNvbmZpZy5vcHRpb25zLCBvcHRpb25zLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSBhIFtbQnVsa0xvYWRdXS5cbiAgICpcbiAgICogYGBganNcbiAgICogLy8gV2Ugd2FudCB0byBwZXJmb3JtIGEgYnVsayBsb2FkIGludG8gYSB0YWJsZSB3aXRoIHRoZSBmb2xsb3dpbmcgZm9ybWF0OlxuICAgKiAvLyBDUkVBVEUgVEFCTEUgZW1wbG95ZWVzIChmaXJzdF9uYW1lIG52YXJjaGFyKDI1NSksIGxhc3RfbmFtZSBudmFyY2hhcigyNTUpLCBkYXlfb2ZfYmlydGggZGF0ZSk7XG4gICAqXG4gICAqIGNvbnN0IGJ1bGtMb2FkID0gY29ubmVjdGlvbi5uZXdCdWxrTG9hZCgnZW1wbG95ZWVzJywgKGVyciwgcm93Q291bnQpID0+IHtcbiAgICogICAvLyAuLi5cbiAgICogfSk7XG4gICAqXG4gICAqIC8vIEZpcnN0LCB3ZSBuZWVkIHRvIHNwZWNpZnkgdGhlIGNvbHVtbnMgdGhhdCB3ZSB3YW50IHRvIHdyaXRlIHRvLFxuICAgKiAvLyBhbmQgdGhlaXIgZGVmaW5pdGlvbnMuIFRoZXNlIGRlZmluaXRpb25zIG11c3QgbWF0Y2ggdGhlIGFjdHVhbCB0YWJsZSxcbiAgICogLy8gb3RoZXJ3aXNlIHRoZSBidWxrIGxvYWQgd2lsbCBmYWlsLlxuICAgKiBidWxrTG9hZC5hZGRDb2x1bW4oJ2ZpcnN0X25hbWUnLCBUWVBFUy5OVmFyY2hhciwgeyBudWxsYWJsZTogZmFsc2UgfSk7XG4gICAqIGJ1bGtMb2FkLmFkZENvbHVtbignbGFzdF9uYW1lJywgVFlQRVMuTlZhcmNoYXIsIHsgbnVsbGFibGU6IGZhbHNlIH0pO1xuICAgKiBidWxrTG9hZC5hZGRDb2x1bW4oJ2RhdGVfb2ZfYmlydGgnLCBUWVBFUy5EYXRlLCB7IG51bGxhYmxlOiBmYWxzZSB9KTtcbiAgICpcbiAgICogLy8gRXhlY3V0ZSBhIGJ1bGsgbG9hZCB3aXRoIGEgcHJlZGVmaW5lZCBsaXN0IG9mIHJvd3MuXG4gICAqIC8vXG4gICAqIC8vIE5vdGUgdGhhdCB0aGVzZSByb3dzIGFyZSBoZWxkIGluIG1lbW9yeSB1bnRpbCB0aGVcbiAgICogLy8gYnVsayBsb2FkIHdhcyBwZXJmb3JtZWQsIHNvIGlmIHlvdSBuZWVkIHRvIHdyaXRlIGEgbGFyZ2VcbiAgICogLy8gbnVtYmVyIG9mIHJvd3MgKGUuZy4gYnkgcmVhZGluZyBmcm9tIGEgQ1NWIGZpbGUpLFxuICAgKiAvLyBwYXNzaW5nIGFuIGBBc3luY0l0ZXJhYmxlYCBpcyBhZHZpc2FibGUgdG8ga2VlcCBtZW1vcnkgdXNhZ2UgbG93LlxuICAgKiBjb25uZWN0aW9uLmV4ZWNCdWxrTG9hZChidWxrTG9hZCwgW1xuICAgKiAgIHsgJ2ZpcnN0X25hbWUnOiAnU3RldmUnLCAnbGFzdF9uYW1lJzogJ0pvYnMnLCAnZGF5X29mX2JpcnRoJzogbmV3IERhdGUoJzAyLTI0LTE5NTUnKSB9LFxuICAgKiAgIHsgJ2ZpcnN0X25hbWUnOiAnQmlsbCcsICdsYXN0X25hbWUnOiAnR2F0ZXMnLCAnZGF5X29mX2JpcnRoJzogbmV3IERhdGUoJzEwLTI4LTE5NTUnKSB9XG4gICAqIF0pO1xuICAgKiBgYGBcbiAgICpcbiAgICogQHBhcmFtIGJ1bGtMb2FkIEEgcHJldmlvdXNseSBjcmVhdGVkIFtbQnVsa0xvYWRdXS5cbiAgICogQHBhcmFtIHJvd3MgQSBbW0l0ZXJhYmxlXV0gb3IgW1tBc3luY0l0ZXJhYmxlXV0gdGhhdCBjb250YWlucyB0aGUgcm93cyB0aGF0IHNob3VsZCBiZSBidWxrIGxvYWRlZC5cbiAgICovXG4gIGV4ZWNCdWxrTG9hZChidWxrTG9hZDogQnVsa0xvYWQsIHJvd3M6IEFzeW5jSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9PiB8IEl0ZXJhYmxlPHVua25vd25bXSB8IHsgW2NvbHVtbk5hbWU6IHN0cmluZ106IHVua25vd24gfT4pOiB2b2lkXG5cbiAgZXhlY0J1bGtMb2FkKGJ1bGtMb2FkOiBCdWxrTG9hZCwgcm93cz86IEFzeW5jSXRlcmFibGU8dW5rbm93bltdIHwgeyBbY29sdW1uTmFtZTogc3RyaW5nXTogdW5rbm93biB9PiB8IEl0ZXJhYmxlPHVua25vd25bXSB8IHsgW2NvbHVtbk5hbWU6IHN0cmluZ106IHVua25vd24gfT4pIHtcbiAgICBidWxrTG9hZC5leGVjdXRpb25TdGFydGVkID0gdHJ1ZTtcblxuICAgIGlmIChyb3dzKSB7XG4gICAgICBpZiAoYnVsa0xvYWQuc3RyZWFtaW5nTW9kZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb25uZWN0aW9uLmV4ZWNCdWxrTG9hZCBjYW4ndCBiZSBjYWxsZWQgd2l0aCBhIEJ1bGtMb2FkIHRoYXQgd2FzIHB1dCBpbiBzdHJlYW1pbmcgbW9kZS5cIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChidWxrTG9hZC5maXJzdFJvd1dyaXR0ZW4pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ29ubmVjdGlvbi5leGVjQnVsa0xvYWQgY2FuJ3QgYmUgY2FsbGVkIHdpdGggYSBCdWxrTG9hZCB0aGF0IGFscmVhZHkgaGFzIHJvd3Mgd3JpdHRlbiB0byBpdC5cIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJvd1N0cmVhbSA9IFJlYWRhYmxlLmZyb20ocm93cyk7XG5cbiAgICAgIC8vIERlc3Ryb3kgdGhlIHBhY2tldCB0cmFuc2Zvcm0gaWYgYW4gZXJyb3IgaGFwcGVucyBpbiB0aGUgcm93IHN0cmVhbSxcbiAgICAgIC8vIGUuZy4gaWYgYW4gZXJyb3IgaXMgdGhyb3duIGZyb20gd2l0aGluIGEgZ2VuZXJhdG9yIG9yIHN0cmVhbS5cbiAgICAgIHJvd1N0cmVhbS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG4gICAgICAgIGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtLmRlc3Ryb3koZXJyKTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBEZXN0cm95IHRoZSByb3cgc3RyZWFtIGlmIGFuIGVycm9yIGhhcHBlbnMgaW4gdGhlIHBhY2tldCB0cmFuc2Zvcm0sXG4gICAgICAvLyBlLmcuIGlmIHRoZSBidWxrIGxvYWQgaXMgY2FuY2VsbGVkLlxuICAgICAgYnVsa0xvYWQucm93VG9QYWNrZXRUcmFuc2Zvcm0ub24oJ2Vycm9yJywgKGVycikgPT4ge1xuICAgICAgICByb3dTdHJlYW0uZGVzdHJveShlcnIpO1xuICAgICAgfSk7XG5cbiAgICAgIHJvd1N0cmVhbS5waXBlKGJ1bGtMb2FkLnJvd1RvUGFja2V0VHJhbnNmb3JtKTtcbiAgICB9IGVsc2UgaWYgKCFidWxrTG9hZC5zdHJlYW1pbmdNb2RlKSB7XG4gICAgICAvLyBJZiB0aGUgYnVsa2xvYWQgd2FzIG5vdCBwdXQgaW50byBzdHJlYW1pbmcgbW9kZSBieSB0aGUgdXNlcixcbiAgICAgIC8vIHdlIGVuZCB0aGUgcm93VG9QYWNrZXRUcmFuc2Zvcm0gaGVyZSBmb3IgdGhlbS5cbiAgICAgIC8vXG4gICAgICAvLyBJZiBpdCB3YXMgcHV0IGludG8gc3RyZWFtaW5nIG1vZGUsIGl0J3MgdGhlIHVzZXIncyByZXNwb25zaWJpbGl0eVxuICAgICAgLy8gdG8gZW5kIHRoZSBzdHJlYW0uXG4gICAgICBidWxrTG9hZC5yb3dUb1BhY2tldFRyYW5zZm9ybS5lbmQoKTtcbiAgICB9XG5cbiAgICBjb25zdCBvbkNhbmNlbCA9ICgpID0+IHtcbiAgICAgIHJlcXVlc3QuY2FuY2VsKCk7XG4gICAgfTtcblxuICAgIGNvbnN0IHBheWxvYWQgPSBuZXcgQnVsa0xvYWRQYXlsb2FkKGJ1bGtMb2FkKTtcblxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdChidWxrTG9hZC5nZXRCdWxrSW5zZXJ0U3FsKCksIChlcnJvcjogKEVycm9yICYgeyBjb2RlPzogc3RyaW5nIH0pIHwgbnVsbCB8IHVuZGVmaW5lZCkgPT4ge1xuICAgICAgYnVsa0xvYWQucmVtb3ZlTGlzdGVuZXIoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcblxuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGlmIChlcnJvci5jb2RlID09PSAnVU5LTk9XTicpIHtcbiAgICAgICAgICBlcnJvci5tZXNzYWdlICs9ICcgVGhpcyBpcyBsaWtlbHkgYmVjYXVzZSB0aGUgc2NoZW1hIG9mIHRoZSBCdWxrTG9hZCBkb2VzIG5vdCBtYXRjaCB0aGUgc2NoZW1hIG9mIHRoZSB0YWJsZSB5b3UgYXJlIGF0dGVtcHRpbmcgdG8gaW5zZXJ0IGludG8uJztcbiAgICAgICAgfVxuICAgICAgICBidWxrTG9hZC5lcnJvciA9IGVycm9yO1xuICAgICAgICBidWxrTG9hZC5jYWxsYmFjayhlcnJvcik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5tYWtlUmVxdWVzdChidWxrTG9hZCwgVFlQRS5CVUxLX0xPQUQsIHBheWxvYWQpO1xuICAgIH0pO1xuXG4gICAgYnVsa0xvYWQub25jZSgnY2FuY2VsJywgb25DYW5jZWwpO1xuXG4gICAgdGhpcy5leGVjU3FsQmF0Y2gocmVxdWVzdCk7XG4gIH1cblxuICAvKipcbiAgICogUHJlcGFyZSB0aGUgU1FMIHJlcHJlc2VudGVkIGJ5IHRoZSByZXF1ZXN0LlxuICAgKlxuICAgKiBUaGUgcmVxdWVzdCBjYW4gdGhlbiBiZSB1c2VkIGluIHN1YnNlcXVlbnQgY2FsbHMgdG9cbiAgICogW1tleGVjdXRlXV0gYW5kIFtbdW5wcmVwYXJlXV1cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKiAgIFBhcmFtZXRlcnMgb25seSByZXF1aXJlIGEgbmFtZSBhbmQgdHlwZS4gUGFyYW1ldGVyIHZhbHVlcyBhcmUgaWdub3JlZC5cbiAgICovXG4gIHByZXBhcmUocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIGNvbnN0IHBhcmFtZXRlcnM6IFBhcmFtZXRlcltdID0gW107XG5cbiAgICBwYXJhbWV0ZXJzLnB1c2goe1xuICAgICAgdHlwZTogVFlQRVMuSW50LFxuICAgICAgbmFtZTogJ2hhbmRsZScsXG4gICAgICB2YWx1ZTogdW5kZWZpbmVkLFxuICAgICAgb3V0cHV0OiB0cnVlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdwYXJhbXMnLFxuICAgICAgdmFsdWU6IHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGggPyByZXF1ZXN0Lm1ha2VQYXJhbXNQYXJhbWV0ZXIocmVxdWVzdC5wYXJhbWV0ZXJzKSA6IG51bGwsXG4gICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5OVmFyQ2hhcixcbiAgICAgIG5hbWU6ICdzdG10JyxcbiAgICAgIHZhbHVlOiByZXF1ZXN0LnNxbFRleHRPclByb2NlZHVyZSxcbiAgICAgIG91dHB1dDogZmFsc2UsXG4gICAgICBsZW5ndGg6IHVuZGVmaW5lZCxcbiAgICAgIHByZWNpc2lvbjogdW5kZWZpbmVkLFxuICAgICAgc2NhbGU6IHVuZGVmaW5lZFxuICAgIH0pO1xuXG4gICAgcmVxdWVzdC5wcmVwYXJpbmcgPSB0cnVlO1xuXG4gICAgLy8gVE9ETzogV2UgbmVlZCB0byBjbGVhbiB1cCB0aGlzIGV2ZW50IGhhbmRsZXIsIG90aGVyd2lzZSB0aGlzIGxlYWtzIG1lbW9yeVxuICAgIHJlcXVlc3Qub24oJ3JldHVyblZhbHVlJywgKG5hbWU6IHN0cmluZywgdmFsdWU6IGFueSkgPT4ge1xuICAgICAgaWYgKG5hbWUgPT09ICdoYW5kbGUnKSB7XG4gICAgICAgIHJlcXVlc3QuaGFuZGxlID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0LmVycm9yID0gbmV3IFJlcXVlc3RFcnJvcihgVGVkaW91cyA+IFVuZXhwZWN0ZWQgb3V0cHV0IHBhcmFtZXRlciAke25hbWV9IGZyb20gc3BfcHJlcGFyZWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlJQQ19SRVFVRVNULCBuZXcgUnBjUmVxdWVzdFBheWxvYWQoUHJvY2VkdXJlcy5TcF9QcmVwYXJlLCBwYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbGVhc2UgdGhlIFNRTCBTZXJ2ZXIgcmVzb3VyY2VzIGFzc29jaWF0ZWQgd2l0aCBhIHByZXZpb3VzbHkgcHJlcGFyZWQgcmVxdWVzdC5cbiAgICpcbiAgICogQHBhcmFtIHJlcXVlc3QgQSBbW1JlcXVlc3RdXSBvYmplY3QgcmVwcmVzZW50aW5nIHRoZSByZXF1ZXN0LlxuICAgKiAgIFBhcmFtZXRlcnMgb25seSByZXF1aXJlIGEgbmFtZSBhbmQgdHlwZS5cbiAgICogICBQYXJhbWV0ZXIgdmFsdWVzIGFyZSBpZ25vcmVkLlxuICAgKi9cbiAgdW5wcmVwYXJlKHJlcXVlc3Q6IFJlcXVlc3QpIHtcbiAgICBjb25zdCBwYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuXG4gICAgcGFyYW1ldGVycy5wdXNoKHtcbiAgICAgIHR5cGU6IFRZUEVTLkludCxcbiAgICAgIG5hbWU6ICdoYW5kbGUnLFxuICAgICAgLy8gVE9ETzogQWJvcnQgaWYgYHJlcXVlc3QuaGFuZGxlYCBpcyBub3Qgc2V0XG4gICAgICB2YWx1ZTogcmVxdWVzdC5oYW5kbGUsXG4gICAgICBvdXRwdXQ6IGZhbHNlLFxuICAgICAgbGVuZ3RoOiB1bmRlZmluZWQsXG4gICAgICBwcmVjaXNpb246IHVuZGVmaW5lZCxcbiAgICAgIHNjYWxlOiB1bmRlZmluZWRcbiAgICB9KTtcblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKFByb2NlZHVyZXMuU3BfVW5wcmVwYXJlLCBwYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4ZWN1dGUgcHJldmlvdXNseSBwcmVwYXJlZCBTUUwsIHVzaW5nIHRoZSBzdXBwbGllZCBwYXJhbWV0ZXJzLlxuICAgKlxuICAgKiBAcGFyYW0gcmVxdWVzdCBBIHByZXZpb3VzbHkgcHJlcGFyZWQgW1tSZXF1ZXN0XV0uXG4gICAqIEBwYXJhbSBwYXJhbWV0ZXJzICBBbiBvYmplY3Qgd2hvc2UgbmFtZXMgY29ycmVzcG9uZCB0byB0aGUgbmFtZXMgb2ZcbiAgICogICBwYXJhbWV0ZXJzIHRoYXQgd2VyZSBhZGRlZCB0byB0aGUgW1tSZXF1ZXN0XV0gYmVmb3JlIGl0IHdhcyBwcmVwYXJlZC5cbiAgICogICBUaGUgb2JqZWN0J3MgdmFsdWVzIGFyZSBwYXNzZWQgYXMgdGhlIHBhcmFtZXRlcnMnIHZhbHVlcyB3aGVuIHRoZVxuICAgKiAgIHJlcXVlc3QgaXMgZXhlY3V0ZWQuXG4gICAqL1xuICBleGVjdXRlKHJlcXVlc3Q6IFJlcXVlc3QsIHBhcmFtZXRlcnM/OiB7IFtrZXk6IHN0cmluZ106IHVua25vd24gfSkge1xuICAgIGNvbnN0IGV4ZWN1dGVQYXJhbWV0ZXJzOiBQYXJhbWV0ZXJbXSA9IFtdO1xuXG4gICAgZXhlY3V0ZVBhcmFtZXRlcnMucHVzaCh7XG4gICAgICB0eXBlOiBUWVBFUy5JbnQsXG4gICAgICBuYW1lOiAnJyxcbiAgICAgIC8vIFRPRE86IEFib3J0IGlmIGByZXF1ZXN0LmhhbmRsZWAgaXMgbm90IHNldFxuICAgICAgdmFsdWU6IHJlcXVlc3QuaGFuZGxlLFxuICAgICAgb3V0cHV0OiBmYWxzZSxcbiAgICAgIGxlbmd0aDogdW5kZWZpbmVkLFxuICAgICAgcHJlY2lzaW9uOiB1bmRlZmluZWQsXG4gICAgICBzY2FsZTogdW5kZWZpbmVkXG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgZm9yIChsZXQgaSA9IDAsIGxlbiA9IHJlcXVlc3QucGFyYW1ldGVycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjb25zdCBwYXJhbWV0ZXIgPSByZXF1ZXN0LnBhcmFtZXRlcnNbaV07XG5cbiAgICAgICAgZXhlY3V0ZVBhcmFtZXRlcnMucHVzaCh7XG4gICAgICAgICAgLi4ucGFyYW1ldGVyLFxuICAgICAgICAgIHZhbHVlOiBwYXJhbWV0ZXIudHlwZS52YWxpZGF0ZShwYXJhbWV0ZXJzID8gcGFyYW1ldGVyc1twYXJhbWV0ZXIubmFtZV0gOiBudWxsLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKFByb2NlZHVyZXMuU3BfRXhlY3V0ZSwgZXhlY3V0ZVBhcmFtZXRlcnMsIHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpLCB0aGlzLmNvbmZpZy5vcHRpb25zLCB0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsbCBhIHN0b3JlZCBwcm9jZWR1cmUgcmVwcmVzZW50ZWQgYnkgW1tSZXF1ZXN0XV0uXG4gICAqXG4gICAqIEBwYXJhbSByZXF1ZXN0IEEgW1tSZXF1ZXN0XV0gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgcmVxdWVzdC5cbiAgICovXG4gIGNhbGxQcm9jZWR1cmUocmVxdWVzdDogUmVxdWVzdCkge1xuICAgIHRyeSB7XG4gICAgICByZXF1ZXN0LnZhbGlkYXRlUGFyYW1ldGVycyh0aGlzLmRhdGFiYXNlQ29sbGF0aW9uKTtcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICByZXF1ZXN0LmVycm9yID0gZXJyb3I7XG5cbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLmRlYnVnLmxvZyhlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmVxdWVzdC5jYWxsYmFjayhlcnJvcik7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5SUENfUkVRVUVTVCwgbmV3IFJwY1JlcXVlc3RQYXlsb2FkKHJlcXVlc3Quc3FsVGV4dE9yUHJvY2VkdXJlISwgcmVxdWVzdC5wYXJhbWV0ZXJzLCB0aGlzLmN1cnJlbnRUcmFuc2FjdGlvbkRlc2NyaXB0b3IoKSwgdGhpcy5jb25maWcub3B0aW9ucywgdGhpcy5kYXRhYmFzZUNvbGxhdGlvbikpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN0YXJ0IGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy4gUmVxdWlyZWQgd2hlbiBgaXNvbGF0aW9uTGV2ZWxgXG4gICAqICAgaXMgcHJlc2VudC5cbiAgICogQHBhcmFtIGlzb2xhdGlvbkxldmVsIFRoZSBpc29sYXRpb24gbGV2ZWwgdGhhdCB0aGUgdHJhbnNhY3Rpb24gaXMgdG8gYmUgcnVuIHdpdGguXG4gICAqXG4gICAqICAgVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogICAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAgICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAgICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogICAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICAgKiBgU05BUFNIT1RgXG4gICAqXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byB0aGUgQ29ubmVjdGlvbidzIGlzb2xhdGlvbiBsZXZlbC5cbiAgICovXG4gIGJlZ2luVHJhbnNhY3Rpb24oY2FsbGJhY2s6IEJlZ2luVHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnLCBpc29sYXRpb25MZXZlbCA9IHRoaXMuY29uZmlnLm9wdGlvbnMuaXNvbGF0aW9uTGV2ZWwpIHtcbiAgICBhc3NlcnRWYWxpZElzb2xhdGlvbkxldmVsKGlzb2xhdGlvbkxldmVsLCAnaXNvbGF0aW9uTGV2ZWwnKTtcblxuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUsIGlzb2xhdGlvbkxldmVsKTtcblxuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdTRVQgVFJBTlNBQ1RJT04gSVNPTEFUSU9OIExFVkVMICcgKyAodHJhbnNhY3Rpb24uaXNvbGF0aW9uTGV2ZWxUb1RTUUwoKSkgKyAnO0JFR0lOIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoKys7XG4gICAgICAgIGlmICh0aGlzLnRyYW5zYWN0aW9uRGVwdGggPT09IDEpIHtcbiAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KHVuZGVmaW5lZCwgKGVycikgPT4ge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgdGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLm1ha2VSZXF1ZXN0KHJlcXVlc3QsIFRZUEUuVFJBTlNBQ1RJT05fTUFOQUdFUiwgdHJhbnNhY3Rpb24uYmVnaW5QYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogQ29tbWl0IGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBhbiBhY3RpdmUgdHJhbnNhY3Rpb24gLSB0aGF0IGlzLCBbW2JlZ2luVHJhbnNhY3Rpb25dXVxuICAgKiBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byBhbiBlbXB0eSBzdHJpbmcuIFJlcXVpcmVkIHdoZW4gYGlzb2xhdGlvbkxldmVsYGlzIHByZXNlbnQuXG4gICAqL1xuICBjb21taXRUcmFuc2FjdGlvbihjYWxsYmFjazogQ29tbWl0VHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnKSB7XG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSk7XG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ0NPTU1JVCBUUkFOICcgKyB0cmFuc2FjdGlvbi5uYW1lLCAoZXJyKSA9PiB7XG4gICAgICAgIHRoaXMudHJhbnNhY3Rpb25EZXB0aC0tO1xuICAgICAgICBpZiAodGhpcy50cmFuc2FjdGlvbkRlcHRoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5pblRyYW5zYWN0aW9uID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5jb21taXRQYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogUm9sbGJhY2sgYSB0cmFuc2FjdGlvbi5cbiAgICpcbiAgICogVGhlcmUgc2hvdWxkIGJlIGFuIGFjdGl2ZSB0cmFuc2FjdGlvbiAtIHRoYXQgaXMsIFtbYmVnaW5UcmFuc2FjdGlvbl1dXG4gICAqIHNob3VsZCBoYXZlIGJlZW4gcHJldmlvdXNseSBjYWxsZWQuXG4gICAqXG4gICAqIEBwYXJhbSBjYWxsYmFja1xuICAgKiBAcGFyYW0gbmFtZSBBIHN0cmluZyByZXByZXNlbnRpbmcgYSBuYW1lIHRvIGFzc29jaWF0ZSB3aXRoIHRoZSB0cmFuc2FjdGlvbi5cbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy5cbiAgICogICBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGAgaXMgcHJlc2VudC5cbiAgICovXG4gIHJvbGxiYWNrVHJhbnNhY3Rpb24oY2FsbGJhY2s6IFJvbGxiYWNrVHJhbnNhY3Rpb25DYWxsYmFjaywgbmFtZSA9ICcnKSB7XG4gICAgY29uc3QgdHJhbnNhY3Rpb24gPSBuZXcgVHJhbnNhY3Rpb24obmFtZSk7XG4gICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1JPTExCQUNLIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoLS07XG4gICAgICAgIGlmICh0aGlzLnRyYW5zYWN0aW9uRGVwdGggPT09IDApIHtcbiAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgfSkpO1xuICAgIH1cbiAgICBjb25zdCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QodW5kZWZpbmVkLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHRoaXMubWFrZVJlcXVlc3QocmVxdWVzdCwgVFlQRS5UUkFOU0FDVElPTl9NQU5BR0VSLCB0cmFuc2FjdGlvbi5yb2xsYmFja1BheWxvYWQodGhpcy5jdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgYSBzYXZlcG9pbnQgd2l0aGluIGEgdHJhbnNhY3Rpb24uXG4gICAqXG4gICAqIFRoZXJlIHNob3VsZCBiZSBhbiBhY3RpdmUgdHJhbnNhY3Rpb24gLSB0aGF0IGlzLCBbW2JlZ2luVHJhbnNhY3Rpb25dXVxuICAgKiBzaG91bGQgaGF2ZSBiZWVuIHByZXZpb3VzbHkgY2FsbGVkLlxuICAgKlxuICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICogQHBhcmFtIG5hbWUgQSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgbmFtZSB0byBhc3NvY2lhdGUgd2l0aCB0aGUgdHJhbnNhY3Rpb24uXFxcbiAgICogICBPcHRpb25hbCwgYW5kIGRlZmF1bHRzIHRvIGFuIGVtcHR5IHN0cmluZy5cbiAgICogICBSZXF1aXJlZCB3aGVuIGBpc29sYXRpb25MZXZlbGAgaXMgcHJlc2VudC5cbiAgICovXG4gIHNhdmVUcmFuc2FjdGlvbihjYWxsYmFjazogU2F2ZVRyYW5zYWN0aW9uQ2FsbGJhY2ssIG5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IHRyYW5zYWN0aW9uID0gbmV3IFRyYW5zYWN0aW9uKG5hbWUpO1xuICAgIGlmICh0aGlzLmNvbmZpZy5vcHRpb25zLnRkc1ZlcnNpb24gPCAnN18yJykge1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY1NxbEJhdGNoKG5ldyBSZXF1ZXN0KCdTQVZFIFRSQU4gJyArIHRyYW5zYWN0aW9uLm5hbWUsIChlcnIpID0+IHtcbiAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoKys7XG4gICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICB9KSk7XG4gICAgfVxuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh1bmRlZmluZWQsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcy5tYWtlUmVxdWVzdChyZXF1ZXN0LCBUWVBFLlRSQU5TQUNUSU9OX01BTkFHRVIsIHRyYW5zYWN0aW9uLnNhdmVQYXlsb2FkKHRoaXMuY3VycmVudFRyYW5zYWN0aW9uRGVzY3JpcHRvcigpKSk7XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRoZSBnaXZlbiBjYWxsYmFjayBhZnRlciBzdGFydGluZyBhIHRyYW5zYWN0aW9uLCBhbmQgY29tbWl0IG9yXG4gICAqIHJvbGxiYWNrIHRoZSB0cmFuc2FjdGlvbiBhZnRlcndhcmRzLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgaGVscGVyIHRoYXQgZW1wbG95cyBbW2JlZ2luVHJhbnNhY3Rpb25dXSwgW1tjb21taXRUcmFuc2FjdGlvbl1dLFxuICAgKiBbW3JvbGxiYWNrVHJhbnNhY3Rpb25dXSwgYW5kIFtbc2F2ZVRyYW5zYWN0aW9uXV0gdG8gZ3JlYXRseSBzaW1wbGlmeSB0aGVcbiAgICogdXNlIG9mIGRhdGFiYXNlIHRyYW5zYWN0aW9ucyBhbmQgYXV0b21hdGljYWxseSBoYW5kbGUgdHJhbnNhY3Rpb24gbmVzdGluZy5cbiAgICpcbiAgICogQHBhcmFtIGNiXG4gICAqIEBwYXJhbSBpc29sYXRpb25MZXZlbFxuICAgKiAgIFRoZSBpc29sYXRpb24gbGV2ZWwgdGhhdCB0aGUgdHJhbnNhY3Rpb24gaXMgdG8gYmUgcnVuIHdpdGguXG4gICAqXG4gICAqICAgVGhlIGlzb2xhdGlvbiBsZXZlbHMgYXJlIGF2YWlsYWJsZSBmcm9tIGByZXF1aXJlKCd0ZWRpb3VzJykuSVNPTEFUSU9OX0xFVkVMYC5cbiAgICogICAqIGBSRUFEX1VOQ09NTUlUVEVEYFxuICAgKiAgICogYFJFQURfQ09NTUlUVEVEYFxuICAgKiAgICogYFJFUEVBVEFCTEVfUkVBRGBcbiAgICogICAqIGBTRVJJQUxJWkFCTEVgXG4gICAqICAgKiBgU05BUFNIT1RgXG4gICAqXG4gICAqICAgT3B0aW9uYWwsIGFuZCBkZWZhdWx0cyB0byB0aGUgQ29ubmVjdGlvbidzIGlzb2xhdGlvbiBsZXZlbC5cbiAgICovXG4gIHRyYW5zYWN0aW9uKGNiOiAoZXJyOiBFcnJvciB8IG51bGwgfCB1bmRlZmluZWQsIHR4RG9uZT86IDxUIGV4dGVuZHMgVHJhbnNhY3Rpb25Eb25lQ2FsbGJhY2s+KGVycjogRXJyb3IgfCBudWxsIHwgdW5kZWZpbmVkLCBkb25lOiBULCAuLi5hcmdzOiBDYWxsYmFja1BhcmFtZXRlcnM8VD4pID0+IHZvaWQpID0+IHZvaWQsIGlzb2xhdGlvbkxldmVsPzogdHlwZW9mIElTT0xBVElPTl9MRVZFTFtrZXlvZiB0eXBlb2YgSVNPTEFUSU9OX0xFVkVMXSkge1xuICAgIGlmICh0eXBlb2YgY2IgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2BjYmAgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgfVxuXG4gICAgY29uc3QgdXNlU2F2ZXBvaW50ID0gdGhpcy5pblRyYW5zYWN0aW9uO1xuICAgIGNvbnN0IG5hbWUgPSAnX3RlZGlvdXNfJyArIChjcnlwdG8ucmFuZG9tQnl0ZXMoMTApLnRvU3RyaW5nKCdoZXgnKSk7XG4gICAgY29uc3QgdHhEb25lOiA8VCBleHRlbmRzIFRyYW5zYWN0aW9uRG9uZUNhbGxiYWNrPihlcnI6IEVycm9yIHwgbnVsbCB8IHVuZGVmaW5lZCwgZG9uZTogVCwgLi4uYXJnczogQ2FsbGJhY2tQYXJhbWV0ZXJzPFQ+KSA9PiB2b2lkID0gKGVyciwgZG9uZSwgLi4uYXJncykgPT4ge1xuICAgICAgaWYgKGVycikge1xuICAgICAgICBpZiAodGhpcy5pblRyYW5zYWN0aW9uICYmIHRoaXMuc3RhdGUgPT09IHRoaXMuU1RBVEUuTE9HR0VEX0lOKSB7XG4gICAgICAgICAgdGhpcy5yb2xsYmFja1RyYW5zYWN0aW9uKCh0eEVycikgPT4ge1xuICAgICAgICAgICAgZG9uZSh0eEVyciB8fCBlcnIsIC4uLmFyZ3MpO1xuICAgICAgICAgIH0sIG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvbmUoZXJyLCAuLi5hcmdzKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh1c2VTYXZlcG9pbnQpIHtcbiAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICAgICAgdGhpcy50cmFuc2FjdGlvbkRlcHRoLS07XG4gICAgICAgIH1cbiAgICAgICAgZG9uZShudWxsLCAuLi5hcmdzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY29tbWl0VHJhbnNhY3Rpb24oKHR4RXJyKSA9PiB7XG4gICAgICAgICAgZG9uZSh0eEVyciwgLi4uYXJncyk7XG4gICAgICAgIH0sIG5hbWUpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICBpZiAodXNlU2F2ZXBvaW50KSB7XG4gICAgICByZXR1cm4gdGhpcy5zYXZlVHJhbnNhY3Rpb24oKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmV0dXJuIGNiKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNvbGF0aW9uTGV2ZWwpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5leGVjU3FsQmF0Y2gobmV3IFJlcXVlc3QoJ1NFVCB0cmFuc2FjdGlvbiBpc29sYXRpb24gbGV2ZWwgJyArIHRoaXMuZ2V0SXNvbGF0aW9uTGV2ZWxUZXh0KGlzb2xhdGlvbkxldmVsKSwgKGVycikgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGNiKGVyciwgdHhEb25lKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR4RG9uZSk7XG4gICAgICAgIH1cbiAgICAgIH0sIG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdGhpcy5iZWdpblRyYW5zYWN0aW9uKChlcnIpID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHJldHVybiBjYihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNiKG51bGwsIHR4RG9uZSk7XG4gICAgICB9LCBuYW1lLCBpc29sYXRpb25MZXZlbCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBtYWtlUmVxdWVzdChyZXF1ZXN0OiBSZXF1ZXN0IHwgQnVsa0xvYWQsIHBhY2tldFR5cGU6IG51bWJlciwgcGF5bG9hZDogKEl0ZXJhYmxlPEJ1ZmZlcj4gfCBBc3luY0l0ZXJhYmxlPEJ1ZmZlcj4pICYgeyB0b1N0cmluZzogKGluZGVudD86IHN0cmluZykgPT4gc3RyaW5nIH0pIHtcbiAgICBpZiAodGhpcy5zdGF0ZSAhPT0gdGhpcy5TVEFURS5MT0dHRURfSU4pIHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSAnUmVxdWVzdHMgY2FuIG9ubHkgYmUgbWFkZSBpbiB0aGUgJyArIHRoaXMuU1RBVEUuTE9HR0VEX0lOLm5hbWUgKyAnIHN0YXRlLCBub3QgdGhlICcgKyB0aGlzLnN0YXRlLm5hbWUgKyAnIHN0YXRlJztcbiAgICAgIHRoaXMuZGVidWcubG9nKG1lc3NhZ2UpO1xuICAgICAgcmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKG1lc3NhZ2UsICdFSU5WQUxJRFNUQVRFJykpO1xuICAgIH0gZWxzZSBpZiAocmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHJlcXVlc3QuY2FsbGJhY2sobmV3IFJlcXVlc3RFcnJvcignQ2FuY2VsZWQuJywgJ0VDQU5DRUwnKSk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHBhY2tldFR5cGUgPT09IFRZUEUuU1FMX0JBVENIKSB7XG4gICAgICAgIHRoaXMuaXNTcWxCYXRjaCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmlzU3FsQmF0Y2ggPSBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICAgIHJlcXVlc3QuY29ubmVjdGlvbiEgPSB0aGlzO1xuICAgICAgcmVxdWVzdC5yb3dDb3VudCEgPSAwO1xuICAgICAgcmVxdWVzdC5yb3dzISA9IFtdO1xuICAgICAgcmVxdWVzdC5yc3QhID0gW107XG5cbiAgICAgIGNvbnN0IG9uQ2FuY2VsID0gKCkgPT4ge1xuICAgICAgICBwYXlsb2FkU3RyZWFtLnVucGlwZShtZXNzYWdlKTtcbiAgICAgICAgcGF5bG9hZFN0cmVhbS5kZXN0cm95KG5ldyBSZXF1ZXN0RXJyb3IoJ0NhbmNlbGVkLicsICdFQ0FOQ0VMJykpO1xuXG4gICAgICAgIC8vIHNldCB0aGUgaWdub3JlIGJpdCBhbmQgZW5kIHRoZSBtZXNzYWdlLlxuICAgICAgICBtZXNzYWdlLmlnbm9yZSA9IHRydWU7XG4gICAgICAgIG1lc3NhZ2UuZW5kKCk7XG5cbiAgICAgICAgaWYgKHJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHJlcXVlc3QucGF1c2VkKSB7XG4gICAgICAgICAgLy8gcmVzdW1lIHRoZSByZXF1ZXN0IGlmIGl0IHdhcyBwYXVzZWQgc28gd2UgY2FuIHJlYWQgdGhlIHJlbWFpbmluZyB0b2tlbnNcbiAgICAgICAgICByZXF1ZXN0LnJlc3VtZSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICByZXF1ZXN0Lm9uY2UoJ2NhbmNlbCcsIG9uQ2FuY2VsKTtcblxuICAgICAgdGhpcy5jcmVhdGVSZXF1ZXN0VGltZXIoKTtcblxuICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlKHsgdHlwZTogcGFja2V0VHlwZSwgcmVzZXRDb25uZWN0aW9uOiB0aGlzLnJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3QgfSk7XG4gICAgICB0aGlzLm1lc3NhZ2VJby5vdXRnb2luZ01lc3NhZ2VTdHJlYW0ud3JpdGUobWVzc2FnZSk7XG4gICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfQ0xJRU5UX1JFUVVFU1QpO1xuXG4gICAgICBtZXNzYWdlLm9uY2UoJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgcmVxdWVzdC5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgICAgICByZXF1ZXN0Lm9uY2UoJ2NhbmNlbCcsIHRoaXMuX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnQpO1xuXG4gICAgICAgIHRoaXMucmVzZXRDb25uZWN0aW9uT25OZXh0UmVxdWVzdCA9IGZhbHNlO1xuICAgICAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHBheWxvYWQhLnRvU3RyaW5nKCcgICcpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBwYXlsb2FkU3RyZWFtID0gUmVhZGFibGUuZnJvbShwYXlsb2FkKTtcbiAgICAgIHBheWxvYWRTdHJlYW0ub25jZSgnZXJyb3InLCAoZXJyb3IpID0+IHtcbiAgICAgICAgcGF5bG9hZFN0cmVhbS51bnBpcGUobWVzc2FnZSk7XG5cbiAgICAgICAgLy8gT25seSBzZXQgYSByZXF1ZXN0IGVycm9yIGlmIG5vIGVycm9yIHdhcyBzZXQgeWV0LlxuICAgICAgICByZXF1ZXN0LmVycm9yID8/PSBlcnJvcjtcblxuICAgICAgICBtZXNzYWdlLmlnbm9yZSA9IHRydWU7XG4gICAgICAgIG1lc3NhZ2UuZW5kKCk7XG4gICAgICB9KTtcbiAgICAgIHBheWxvYWRTdHJlYW0ucGlwZShtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2FuY2VsIGN1cnJlbnRseSBleGVjdXRlZCByZXF1ZXN0LlxuICAgKi9cbiAgY2FuY2VsKCkge1xuICAgIGlmICghdGhpcy5yZXF1ZXN0KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucmVxdWVzdC5jYW5jZWxlZCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWVzdC5jYW5jZWwoKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXNldCB0aGUgY29ubmVjdGlvbiB0byBpdHMgaW5pdGlhbCBzdGF0ZS5cbiAgICogQ2FuIGJlIHVzZWZ1bCBmb3IgY29ubmVjdGlvbiBwb29sIGltcGxlbWVudGF0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAqL1xuICByZXNldChjYWxsYmFjazogUmVzZXRDYWxsYmFjaykge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgUmVxdWVzdCh0aGlzLmdldEluaXRpYWxTcWwoKSwgKGVycikgPT4ge1xuICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInKSB7XG4gICAgICAgIHRoaXMuaW5UcmFuc2FjdGlvbiA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICB9KTtcbiAgICB0aGlzLnJlc2V0Q29ubmVjdGlvbk9uTmV4dFJlcXVlc3QgPSB0cnVlO1xuICAgIHRoaXMuZXhlY1NxbEJhdGNoKHJlcXVlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBjdXJyZW50VHJhbnNhY3Rpb25EZXNjcmlwdG9yKCkge1xuICAgIHJldHVybiB0aGlzLnRyYW5zYWN0aW9uRGVzY3JpcHRvcnNbdGhpcy50cmFuc2FjdGlvbkRlc2NyaXB0b3JzLmxlbmd0aCAtIDFdO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBnZXRJc29sYXRpb25MZXZlbFRleHQoaXNvbGF0aW9uTGV2ZWw6IHR5cGVvZiBJU09MQVRJT05fTEVWRUxba2V5b2YgdHlwZW9mIElTT0xBVElPTl9MRVZFTF0pIHtcbiAgICBzd2l0Y2ggKGlzb2xhdGlvbkxldmVsKSB7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5SRUFEX1VOQ09NTUlUVEVEOlxuICAgICAgICByZXR1cm4gJ3JlYWQgdW5jb21taXR0ZWQnO1xuICAgICAgY2FzZSBJU09MQVRJT05fTEVWRUwuUkVQRUFUQUJMRV9SRUFEOlxuICAgICAgICByZXR1cm4gJ3JlcGVhdGFibGUgcmVhZCc7XG4gICAgICBjYXNlIElTT0xBVElPTl9MRVZFTC5TRVJJQUxJWkFCTEU6XG4gICAgICAgIHJldHVybiAnc2VyaWFsaXphYmxlJztcbiAgICAgIGNhc2UgSVNPTEFUSU9OX0xFVkVMLlNOQVBTSE9UOlxuICAgICAgICByZXR1cm4gJ3NuYXBzaG90JztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiAncmVhZCBjb21taXR0ZWQnO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBpc1RyYW5zaWVudEVycm9yKGVycm9yOiBBZ2dyZWdhdGVFcnJvciB8IENvbm5lY3Rpb25FcnJvcik6IGJvb2xlYW4ge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBZ2dyZWdhdGVFcnJvcikge1xuICAgIGVycm9yID0gZXJyb3IuZXJyb3JzWzBdO1xuICB9XG4gIHJldHVybiAoZXJyb3IgaW5zdGFuY2VvZiBDb25uZWN0aW9uRXJyb3IpICYmICEhZXJyb3IuaXNUcmFuc2llbnQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IENvbm5lY3Rpb247XG5tb2R1bGUuZXhwb3J0cyA9IENvbm5lY3Rpb247XG5cbkNvbm5lY3Rpb24ucHJvdG90eXBlLlNUQVRFID0ge1xuICBJTklUSUFMSVpFRDoge1xuICAgIG5hbWU6ICdJbml0aWFsaXplZCcsXG4gICAgZXZlbnRzOiB7fVxuICB9LFxuICBDT05ORUNUSU5HOiB7XG4gICAgbmFtZTogJ0Nvbm5lY3RpbmcnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuaW5pdGlhbGlzZUNvbm5lY3Rpb24oKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgU0VOVF9QUkVMT0dJTjoge1xuICAgIG5hbWU6ICdTZW50UHJlbG9naW4nLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlQnVmZmVyID0gQnVmZmVyLmFsbG9jKDApO1xuXG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgYXdhaXQgKGNvbnN0IGRhdGEgb2YgbWVzc2FnZSkge1xuICAgICAgICAgIG1lc3NhZ2VCdWZmZXIgPSBCdWZmZXIuY29uY2F0KFttZXNzYWdlQnVmZmVyLCBkYXRhXSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwcmVsb2dpblBheWxvYWQgPSBuZXcgUHJlbG9naW5QYXlsb2FkKG1lc3NhZ2VCdWZmZXIpO1xuICAgICAgICB0aGlzLmRlYnVnLnBheWxvYWQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHByZWxvZ2luUGF5bG9hZC50b1N0cmluZygnICAnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHByZWxvZ2luUGF5bG9hZC5mZWRBdXRoUmVxdWlyZWQgPT09IDEpIHtcbiAgICAgICAgICB0aGlzLmZlZEF1dGhSZXF1aXJlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdzdHJpY3QnICE9PSB0aGlzLmNvbmZpZy5vcHRpb25zLmVuY3J5cHQgJiYgKHByZWxvZ2luUGF5bG9hZC5lbmNyeXB0aW9uU3RyaW5nID09PSAnT04nIHx8IHByZWxvZ2luUGF5bG9hZC5lbmNyeXB0aW9uU3RyaW5nID09PSAnUkVRJykpIHtcbiAgICAgICAgICBpZiAoIXRoaXMuY29uZmlnLm9wdGlvbnMuZW5jcnlwdCkge1xuICAgICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcihcIlNlcnZlciByZXF1aXJlcyBlbmNyeXB0aW9uLCBzZXQgJ2VuY3J5cHQnIGNvbmZpZyBvcHRpb24gdG8gdHJ1ZS5cIiwgJ0VFTkNSWVBUJykpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2xvc2UoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX1RMU1NTTE5FR09USUFUSU9OKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMubWVzc2FnZUlvLnN0YXJ0VGxzKHRoaXMuc2VjdXJlQ29udGV4dE9wdGlvbnMsIHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA/IHRoaXMuY29uZmlnLm9wdGlvbnMuc2VydmVyTmFtZSA6IHRoaXMucm91dGluZ0RhdGE/LnNlcnZlciA/PyB0aGlzLmNvbmZpZy5zZXJ2ZXIsIHRoaXMuY29uZmlnLm9wdGlvbnMudHJ1c3RTZXJ2ZXJDZXJ0aWZpY2F0ZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5zZW5kTG9naW43UGFja2V0KCk7XG5cbiAgICAgICAgY29uc3QgeyBhdXRoZW50aWNhdGlvbiB9ID0gdGhpcy5jb25maWc7XG5cbiAgICAgICAgc3dpdGNoIChhdXRoZW50aWNhdGlvbi50eXBlKSB7XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCc6XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1tc2ktdm0nOlxuICAgICAgICAgIGNhc2UgJ2F6dXJlLWFjdGl2ZS1kaXJlY3RvcnktbXNpLWFwcC1zZXJ2aWNlJzpcbiAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JzpcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9MT0dJTjdfV0lUSF9GRURBVVRIKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ250bG0nOlxuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0xPR0lON19XSVRIX05UTE0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuU0VOVF9MT0dJTjdfV0lUSF9TVEFOREFSRF9MT0dJTik7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgUkVST1VUSU5HOiB7XG4gICAgbmFtZTogJ1JlUm91dGluZycsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jbGVhbnVwQ29ubmVjdGlvbihDTEVBTlVQX1RZUEUuUkVESVJFQ1QpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBtZXNzYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIH0sXG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9LFxuICAgICAgcmVjb25uZWN0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5DT05ORUNUSU5HKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFRSQU5TSUVOVF9GQUlMVVJFX1JFVFJZOiB7XG4gICAgbmFtZTogJ1RSQU5TSUVOVF9GQUlMVVJFX1JFVFJZJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmN1clRyYW5zaWVudFJldHJ5Q291bnQrKztcbiAgICAgIHRoaXMuY2xlYW51cENvbm5lY3Rpb24oQ0xFQU5VUF9UWVBFLlJFVFJZKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgbWVzc2FnZTogZnVuY3Rpb24oKSB7XG4gICAgICB9LFxuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIHJldHJ5OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5jcmVhdGVSZXRyeVRpbWVyKCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX1RMU1NTTE5FR09USUFUSU9OOiB7XG4gICAgbmFtZTogJ1NlbnRUTFNTU0xOZWdvdGlhdGlvbicsXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0xPR0lON19XSVRIX1NUQU5EQVJEX0xPR0lOOiB7XG4gICAgbmFtZTogJ1NlbnRMb2dpbjdXaXRoU3RhbmRhcmRMb2dpbicsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgbWVzc2FnZSA9IGF3YWl0IHRoaXMubWVzc2FnZUlvLnJlYWRNZXNzYWdlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuc29ja2V0RXJyb3IoZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgTG9naW43VG9rZW5IYW5kbGVyKHRoaXMpO1xuICAgICAgICBjb25zdCB0b2tlblN0cmVhbVBhcnNlciA9IHRoaXMuY3JlYXRlVG9rZW5TdHJlYW1QYXJzZXIobWVzc2FnZSwgaGFuZGxlcik7XG5cbiAgICAgICAgYXdhaXQgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpO1xuXG4gICAgICAgIGlmIChoYW5kbGVyLmxvZ2luQWNrUmVjZWl2ZWQpIHtcbiAgICAgICAgICBpZiAoaGFuZGxlci5yb3V0aW5nRGF0YSkge1xuICAgICAgICAgICAgdGhpcy5yb3V0aW5nRGF0YSA9IGhhbmRsZXIucm91dGluZ0RhdGE7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlJFUk9VVElORyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLmxvZ2luRXJyb3IpIHtcbiAgICAgICAgICBpZiAoaXNUcmFuc2llbnRFcnJvcih0aGlzLmxvZ2luRXJyb3IpKSB7XG4gICAgICAgICAgICB0aGlzLmRlYnVnLmxvZygnSW5pdGlhdGluZyByZXRyeSBvbiB0cmFuc2llbnQgZXJyb3InKTtcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuVFJBTlNJRU5UX0ZBSUxVUkVfUkVUUlkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCB0aGlzLmxvZ2luRXJyb3IpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoJ0xvZ2luIGZhaWxlZC4nLCAnRUxPR0lOJykpO1xuICAgICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICB9XG4gICAgICB9KSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0xPR0lON19XSVRIX05UTE06IHtcbiAgICBuYW1lOiAnU2VudExvZ2luN1dpdGhOVExNTG9naW4nLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgbGV0IG1lc3NhZ2U7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgTG9naW43VG9rZW5IYW5kbGVyKHRoaXMpO1xuICAgICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcblxuICAgICAgICAgIGF3YWl0IG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKTtcblxuICAgICAgICAgIGlmIChoYW5kbGVyLmxvZ2luQWNrUmVjZWl2ZWQpIHtcbiAgICAgICAgICAgIGlmIChoYW5kbGVyLnJvdXRpbmdEYXRhKSB7XG4gICAgICAgICAgICAgIHRoaXMucm91dGluZ0RhdGEgPSBoYW5kbGVyLnJvdXRpbmdEYXRhO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5SRVJPVVRJTkcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5udGxtcGFja2V0KSB7XG4gICAgICAgICAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IHRoaXMuY29uZmlnLmF1dGhlbnRpY2F0aW9uIGFzIE50bG1BdXRoZW50aWNhdGlvbjtcblxuICAgICAgICAgICAgY29uc3QgcGF5bG9hZCA9IG5ldyBOVExNUmVzcG9uc2VQYXlsb2FkKHtcbiAgICAgICAgICAgICAgZG9tYWluOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmRvbWFpbixcbiAgICAgICAgICAgICAgdXNlck5hbWU6IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudXNlck5hbWUsXG4gICAgICAgICAgICAgIHBhc3N3b3JkOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnBhc3N3b3JkLFxuICAgICAgICAgICAgICBudGxtcGFja2V0OiB0aGlzLm50bG1wYWNrZXRcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VJby5zZW5kTWVzc2FnZShUWVBFLk5UTE1BVVRIX1BLVCwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgICAgIHRoaXMuZGVidWcucGF5bG9hZChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHBheWxvYWQudG9TdHJpbmcoJyAgJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdGhpcy5udGxtcGFja2V0ID0gdW5kZWZpbmVkO1xuICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5sb2dpbkVycm9yKSB7XG4gICAgICAgICAgICBpZiAoaXNUcmFuc2llbnRFcnJvcih0aGlzLmxvZ2luRXJyb3IpKSB7XG4gICAgICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdJbml0aWF0aW5nIHJldHJ5IG9uIHRyYW5zaWVudCBlcnJvcicpO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5UUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLmVtaXQoJ2Nvbm5lY3QnLCB0aGlzLmxvZ2luRXJyb3IpO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIG5ldyBDb25uZWN0aW9uRXJyb3IoJ0xvZ2luIGZhaWxlZC4nLCAnRUxPR0lOJykpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9KSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0xPR0lON19XSVRIX0ZFREFVVEg6IHtcbiAgICBuYW1lOiAnU2VudExvZ2luN1dpdGhmZWRhdXRoJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBMb2dpbjdUb2tlbkhhbmRsZXIodGhpcyk7XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcbiAgICAgICAgYXdhaXQgb25jZSh0b2tlblN0cmVhbVBhcnNlciwgJ2VuZCcpO1xuICAgICAgICBpZiAoaGFuZGxlci5sb2dpbkFja1JlY2VpdmVkKSB7XG4gICAgICAgICAgaWYgKGhhbmRsZXIucm91dGluZ0RhdGEpIHtcbiAgICAgICAgICAgIHRoaXMucm91dGluZ0RhdGEgPSBoYW5kbGVyLnJvdXRpbmdEYXRhO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5SRVJPVVRJTkcpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTl9TRU5ESU5HX0lOSVRJQUxfU1FMKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmZWRBdXRoSW5mb1Rva2VuID0gaGFuZGxlci5mZWRBdXRoSW5mb1Rva2VuO1xuXG4gICAgICAgIGlmIChmZWRBdXRoSW5mb1Rva2VuICYmIGZlZEF1dGhJbmZvVG9rZW4uc3RzdXJsICYmIGZlZEF1dGhJbmZvVG9rZW4uc3BuKSB7XG4gICAgICAgICAgY29uc3QgYXV0aGVudGljYXRpb24gPSB0aGlzLmNvbmZpZy5hdXRoZW50aWNhdGlvbiBhcyBBenVyZUFjdGl2ZURpcmVjdG9yeVBhc3N3b3JkQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaVZtQXV0aGVudGljYXRpb24gfCBBenVyZUFjdGl2ZURpcmVjdG9yeU1zaUFwcFNlcnZpY2VBdXRoZW50aWNhdGlvbiB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5U2VydmljZVByaW5jaXBhbFNlY3JldCB8IEF6dXJlQWN0aXZlRGlyZWN0b3J5RGVmYXVsdEF1dGhlbnRpY2F0aW9uO1xuICAgICAgICAgIGNvbnN0IHRva2VuU2NvcGUgPSBuZXcgVVJMKCcvLmRlZmF1bHQnLCBmZWRBdXRoSW5mb1Rva2VuLnNwbikudG9TdHJpbmcoKTtcblxuICAgICAgICAgIGxldCBjcmVkZW50aWFscztcblxuICAgICAgICAgIHN3aXRjaCAoYXV0aGVudGljYXRpb24udHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1wYXNzd29yZCc6XG4gICAgICAgICAgICAgIGNyZWRlbnRpYWxzID0gbmV3IFVzZXJuYW1lUGFzc3dvcmRDcmVkZW50aWFsKFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMudGVuYW50SWQgPz8gJ2NvbW1vbicsXG4gICAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy5jbGllbnRJZCxcbiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLnVzZXJOYW1lLFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMucGFzc3dvcmRcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS12bSc6XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LW1zaS1hcHAtc2VydmljZSc6XG4gICAgICAgICAgICAgIGNvbnN0IG1zaUFyZ3MgPSBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkID8gW2F1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWQsIHt9XSA6IFt7fV07XG4gICAgICAgICAgICAgIGNyZWRlbnRpYWxzID0gbmV3IE1hbmFnZWRJZGVudGl0eUNyZWRlbnRpYWwoLi4ubXNpQXJncyk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXp1cmUtYWN0aXZlLWRpcmVjdG9yeS1kZWZhdWx0JzpcbiAgICAgICAgICAgICAgY29uc3QgYXJncyA9IGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50SWQgPyB7IG1hbmFnZWRJZGVudGl0eUNsaWVudElkOiBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkIH0gOiB7fTtcbiAgICAgICAgICAgICAgY3JlZGVudGlhbHMgPSBuZXcgRGVmYXVsdEF6dXJlQ3JlZGVudGlhbChhcmdzKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhenVyZS1hY3RpdmUtZGlyZWN0b3J5LXNlcnZpY2UtcHJpbmNpcGFsLXNlY3JldCc6XG4gICAgICAgICAgICAgIGNyZWRlbnRpYWxzID0gbmV3IENsaWVudFNlY3JldENyZWRlbnRpYWwoXG4gICAgICAgICAgICAgICAgYXV0aGVudGljYXRpb24ub3B0aW9ucy50ZW5hbnRJZCxcbiAgICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbi5vcHRpb25zLmNsaWVudElkLFxuICAgICAgICAgICAgICAgIGF1dGhlbnRpY2F0aW9uLm9wdGlvbnMuY2xpZW50U2VjcmV0XG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxldCB0b2tlblJlc3BvbnNlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0b2tlblJlc3BvbnNlID0gYXdhaXQgY3JlZGVudGlhbHMuZ2V0VG9rZW4odG9rZW5TY29wZSk7XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICB0aGlzLmxvZ2luRXJyb3IgPSBuZXcgQWdncmVnYXRlRXJyb3IoXG4gICAgICAgICAgICAgIFtuZXcgQ29ubmVjdGlvbkVycm9yKCdTZWN1cml0eSB0b2tlbiBjb3VsZCBub3QgYmUgYXV0aGVudGljYXRlZCBvciBhdXRob3JpemVkLicsICdFRkVEQVVUSCcpLCBlcnJdKTtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cblxuICAgICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5SZXNwb25zZS50b2tlbjtcbiAgICAgICAgICB0aGlzLnNlbmRGZWRBdXRoVG9rZW5NZXNzYWdlKHRva2VuKTtcblxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMubG9naW5FcnJvcikge1xuICAgICAgICAgIGlmIChpc1RyYW5zaWVudEVycm9yKHRoaXMubG9naW5FcnJvcikpIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcubG9nKCdJbml0aWF0aW5nIHJldHJ5IG9uIHRyYW5zaWVudCBlcnJvcicpO1xuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5UUkFOU0lFTlRfRkFJTFVSRV9SRVRSWSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZW1pdCgnY29ubmVjdCcsIHRoaXMubG9naW5FcnJvcik7XG4gICAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdjb25uZWN0JywgbmV3IENvbm5lY3Rpb25FcnJvcignTG9naW4gZmFpbGVkLicsICdFTE9HSU4nKSk7XG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICAgIH1cblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgTE9HR0VEX0lOX1NFTkRJTkdfSU5JVElBTF9TUUw6IHtcbiAgICBuYW1lOiAnTG9nZ2VkSW5TZW5kaW5nSW5pdGlhbFNxbCcsXG4gICAgZW50ZXI6IGZ1bmN0aW9uKCkge1xuICAgICAgKGFzeW5jICgpID0+IHtcbiAgICAgICAgdGhpcy5zZW5kSW5pdGlhbFNxbCgpO1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBuZXcgSW5pdGlhbFNxbFRva2VuSGFuZGxlcih0aGlzKSk7XG4gICAgICAgIGF3YWl0IG9uY2UodG9rZW5TdHJlYW1QYXJzZXIsICdlbmQnKTtcblxuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG4gICAgICAgIHRoaXMucHJvY2Vzc2VkSW5pdGlhbFNxbCgpO1xuXG4gICAgICB9KSgpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBzb2NrZXRFcnJvcjogZnVuY3Rpb24gc29ja2V0RXJyb3IoKSB7XG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuICAgICAgfSxcbiAgICAgIGNvbm5lY3RUaW1lb3V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5GSU5BTCk7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBMT0dHRURfSU46IHtcbiAgICBuYW1lOiAnTG9nZ2VkSW4nLFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIFNFTlRfQ0xJRU5UX1JFUVVFU1Q6IHtcbiAgICBuYW1lOiAnU2VudENsaWVudFJlcXVlc3QnLFxuICAgIGVudGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIChhc3luYyAoKSA9PiB7XG4gICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBhd2FpdCB0aGlzLm1lc3NhZ2VJby5yZWFkTWVzc2FnZSgpO1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLnNvY2tldEVycm9yKGVycik7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVxdWVzdCB0aW1lciBpcyBzdG9wcGVkIG9uIGZpcnN0IGRhdGEgcGFja2FnZVxuICAgICAgICB0aGlzLmNsZWFyUmVxdWVzdFRpbWVyKCk7XG5cbiAgICAgICAgY29uc3QgdG9rZW5TdHJlYW1QYXJzZXIgPSB0aGlzLmNyZWF0ZVRva2VuU3RyZWFtUGFyc2VyKG1lc3NhZ2UsIG5ldyBSZXF1ZXN0VG9rZW5IYW5kbGVyKHRoaXMsIHRoaXMucmVxdWVzdCEpKTtcblxuICAgICAgICAvLyBJZiB0aGUgcmVxdWVzdCB3YXMgY2FuY2VsZWQgYW5kIHdlIGhhdmUgYSBgY2FuY2VsVGltZXJgXG4gICAgICAgIC8vIGRlZmluZWQsIHdlIHNlbmQgYSBhdHRlbnRpb24gbWVzc2FnZSBhZnRlciB0aGVcbiAgICAgICAgLy8gcmVxdWVzdCBtZXNzYWdlIHdhcyBmdWxseSBzZW50IG9mZi5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2UgYWxyZWFkeSBzdGFydGVkIGNvbnN1bWluZyB0aGUgY3VycmVudCBtZXNzYWdlXG4gICAgICAgIC8vIChidXQgYWxsIHRoZSB0b2tlbiBoYW5kbGVycyBzaG91bGQgYmUgbm8tb3BzKSwgYW5kXG4gICAgICAgIC8vIG5lZWQgdG8gZW5zdXJlIHRoZSBuZXh0IG1lc3NhZ2UgaXMgaGFuZGxlZCBieSB0aGVcbiAgICAgICAgLy8gYFNFTlRfQVRURU5USU9OYCBzdGF0ZS5cbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdD8uY2FuY2VsZWQgJiYgdGhpcy5jYW5jZWxUaW1lcikge1xuICAgICAgICAgIHJldHVybiB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLlNFTlRfQVRURU5USU9OKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IG9uUmVzdW1lID0gKCkgPT4ge1xuICAgICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLnJlc3VtZSgpO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBvblBhdXNlID0gKCkgPT4ge1xuICAgICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLnBhdXNlKCk7XG5cbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/Lm9uY2UoJ3Jlc3VtZScsIG9uUmVzdW1lKTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLnJlcXVlc3Q/Lm9uKCdwYXVzZScsIG9uUGF1c2UpO1xuXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QgaW5zdGFuY2VvZiBSZXF1ZXN0ICYmIHRoaXMucmVxdWVzdC5wYXVzZWQpIHtcbiAgICAgICAgICBvblBhdXNlKCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBvbkNhbmNlbCA9ICgpID0+IHtcbiAgICAgICAgICB0b2tlblN0cmVhbVBhcnNlci5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25FbmRPZk1lc3NhZ2UpO1xuXG4gICAgICAgICAgaWYgKHRoaXMucmVxdWVzdCBpbnN0YW5jZW9mIFJlcXVlc3QgJiYgdGhpcy5yZXF1ZXN0LnBhdXNlZCkge1xuICAgICAgICAgICAgLy8gcmVzdW1lIHRoZSByZXF1ZXN0IGlmIGl0IHdhcyBwYXVzZWQgc28gd2UgY2FuIHJlYWQgdGhlIHJlbWFpbmluZyB0b2tlbnNcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5yZXN1bWUoKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLnJlcXVlc3Q/LnJlbW92ZUxpc3RlbmVyKCdwYXVzZScsIG9uUGF1c2UpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3Jlc3VtZScsIG9uUmVzdW1lKTtcblxuICAgICAgICAgIC8vIFRoZSBgX2NhbmNlbEFmdGVyUmVxdWVzdFNlbnRgIGNhbGxiYWNrIHdpbGwgaGF2ZSBzZW50IGFcbiAgICAgICAgICAvLyBhdHRlbnRpb24gbWVzc2FnZSwgc28gbm93IHdlIG5lZWQgdG8gYWxzbyBzd2l0Y2ggdG9cbiAgICAgICAgICAvLyB0aGUgYFNFTlRfQVRURU5USU9OYCBzdGF0ZSB0byBtYWtlIHN1cmUgdGhlIGF0dGVudGlvbiBhY2tcbiAgICAgICAgICAvLyBtZXNzYWdlIGlzIHByb2Nlc3NlZCBjb3JyZWN0bHkuXG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5TRU5UX0FUVEVOVElPTik7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgb25FbmRPZk1lc3NhZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgdGhpcy5fY2FuY2VsQWZ0ZXJSZXF1ZXN0U2VudCk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcignY2FuY2VsJywgb25DYW5jZWwpO1xuICAgICAgICAgIHRoaXMucmVxdWVzdD8ucmVtb3ZlTGlzdGVuZXIoJ3BhdXNlJywgb25QYXVzZSk7XG4gICAgICAgICAgdGhpcy5yZXF1ZXN0Py5yZW1vdmVMaXN0ZW5lcigncmVzdW1lJywgb25SZXN1bWUpO1xuXG4gICAgICAgICAgdGhpcy50cmFuc2l0aW9uVG8odGhpcy5TVEFURS5MT0dHRURfSU4pO1xuICAgICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QgYXMgUmVxdWVzdDtcbiAgICAgICAgICB0aGlzLnJlcXVlc3QgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9wdGlvbnMudGRzVmVyc2lvbiA8ICc3XzInICYmIHNxbFJlcXVlc3QuZXJyb3IgJiYgdGhpcy5pc1NxbEJhdGNoKSB7XG4gICAgICAgICAgICB0aGlzLmluVHJhbnNhY3Rpb24gPSBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhzcWxSZXF1ZXN0LmVycm9yLCBzcWxSZXF1ZXN0LnJvd0NvdW50LCBzcWxSZXF1ZXN0LnJvd3MpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRva2VuU3RyZWFtUGFyc2VyLm9uY2UoJ2VuZCcsIG9uRW5kT2ZNZXNzYWdlKTtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Py5vbmNlKCdjYW5jZWwnLCBvbkNhbmNlbCk7XG4gICAgICB9KSgpO1xuXG4gICAgfSxcbiAgICBleGl0OiBmdW5jdGlvbihuZXh0U3RhdGUpIHtcbiAgICAgIHRoaXMuY2xlYXJSZXF1ZXN0VGltZXIoKTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkZJTkFMKTtcblxuICAgICAgICBzcWxSZXF1ZXN0LmNhbGxiYWNrKGVycik7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBTRU5UX0FUVEVOVElPTjoge1xuICAgIG5hbWU6ICdTZW50QXR0ZW50aW9uJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICAoYXN5bmMgKCkgPT4ge1xuICAgICAgICBsZXQgbWVzc2FnZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtZXNzYWdlID0gYXdhaXQgdGhpcy5tZXNzYWdlSW8ucmVhZE1lc3NhZ2UoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5zb2NrZXRFcnJvcihlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFuZGxlciA9IG5ldyBBdHRlbnRpb25Ub2tlbkhhbmRsZXIodGhpcywgdGhpcy5yZXF1ZXN0ISk7XG4gICAgICAgIGNvbnN0IHRva2VuU3RyZWFtUGFyc2VyID0gdGhpcy5jcmVhdGVUb2tlblN0cmVhbVBhcnNlcihtZXNzYWdlLCBoYW5kbGVyKTtcblxuICAgICAgICBhd2FpdCBvbmNlKHRva2VuU3RyZWFtUGFyc2VyLCAnZW5kJyk7XG4gICAgICAgIC8vIDMuMi41LjcgU2VudCBBdHRlbnRpb24gU3RhdGVcbiAgICAgICAgLy8gRGlzY2FyZCBhbnkgZGF0YSBjb250YWluZWQgaW4gdGhlIHJlc3BvbnNlLCB1bnRpbCB3ZSByZWNlaXZlIHRoZSBhdHRlbnRpb24gcmVzcG9uc2VcbiAgICAgICAgaWYgKGhhbmRsZXIuYXR0ZW50aW9uUmVjZWl2ZWQpIHtcbiAgICAgICAgICB0aGlzLmNsZWFyQ2FuY2VsVGltZXIoKTtcblxuICAgICAgICAgIGNvbnN0IHNxbFJlcXVlc3QgPSB0aGlzLnJlcXVlc3QhO1xuICAgICAgICAgIHRoaXMucmVxdWVzdCA9IHVuZGVmaW5lZDtcbiAgICAgICAgICB0aGlzLnRyYW5zaXRpb25Ubyh0aGlzLlNUQVRFLkxPR0dFRF9JTik7XG5cbiAgICAgICAgICBpZiAoc3FsUmVxdWVzdC5lcnJvciAmJiBzcWxSZXF1ZXN0LmVycm9yIGluc3RhbmNlb2YgUmVxdWVzdEVycm9yICYmIHNxbFJlcXVlc3QuZXJyb3IuY29kZSA9PT0gJ0VUSU1FT1VUJykge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhzcWxSZXF1ZXN0LmVycm9yKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3FsUmVxdWVzdC5jYWxsYmFjayhuZXcgUmVxdWVzdEVycm9yKCdDYW5jZWxlZC4nLCAnRUNBTkNFTCcpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfSkoKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICAgIGV2ZW50czoge1xuICAgICAgc29ja2V0RXJyb3I6IGZ1bmN0aW9uKGVycikge1xuICAgICAgICBjb25zdCBzcWxSZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0ITtcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gdW5kZWZpbmVkO1xuXG4gICAgICAgIHRoaXMudHJhbnNpdGlvblRvKHRoaXMuU1RBVEUuRklOQUwpO1xuXG4gICAgICAgIHNxbFJlcXVlc3QuY2FsbGJhY2soZXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIEZJTkFMOiB7XG4gICAgbmFtZTogJ0ZpbmFsJyxcbiAgICBlbnRlcjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmNsZWFudXBDb25uZWN0aW9uKENMRUFOVVBfVFlQRS5OT1JNQUwpO1xuICAgIH0sXG4gICAgZXZlbnRzOiB7XG4gICAgICBjb25uZWN0VGltZW91dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIERvIG5vdGhpbmcsIGFzIHRoZSB0aW1lciBzaG91bGQgYmUgY2xlYW5lZCB1cC5cbiAgICAgIH0sXG4gICAgICBtZXNzYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgfSxcbiAgICAgIHNvY2tldEVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRG8gbm90aGluZ1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsSUFBQUEsT0FBQSxHQUFBQyxzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUMsR0FBQSxHQUFBRixzQkFBQSxDQUFBQyxPQUFBO0FBQ0EsSUFBQUUsR0FBQSxHQUFBQyx1QkFB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