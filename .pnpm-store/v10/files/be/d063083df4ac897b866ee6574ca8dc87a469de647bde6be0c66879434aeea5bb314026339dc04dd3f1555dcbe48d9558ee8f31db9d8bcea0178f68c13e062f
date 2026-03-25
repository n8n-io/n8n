const os = require('os');
const url = require('url');
const Util = require('../util');
const ProxyUtil = require('../proxy_util');
const Errors = require('../errors');
const ConnectionConstants = require('../constants/connection_constants');
const path = require('path');
const ErrorCodes = Errors.codes;
const NativeTypes = require('./result/data_types').NativeTypes;
const GlobalConfig = require('../global_config');
const AuthenticationTypes = require('../authentication/authentication_types');
const levenshtein = require('fastest-levenshtein');
const RowMode = require('./../constants/row_mode');
const DataTypes = require('./result/data_types');
const Logger = require('../logger');
const { isSnowflakeHost } = require('../authentication/authentication_util');
const WAIT_FOR_BROWSER_ACTION_TIMEOUT = 120000;
const SNOWFLAKE_AUTHORIZE_ENDPOINT = '/oauth/authorize';
const SNOWFLAKE_TOKEN_REQUEST_ENDPOINT = '/oauth/token-request';
const LOCAL_APPLICATION_CLIENT_CREDENTIAL = 'LOCAL_APPLICATION';
const DEFAULT_PARAMS =
[
  'account',
  'application',
  'region',
  'host',
  'accessUrl',
  'username',
  'password',
  'authenticator',
  'proxyHost',
  'proxyPort',
  'serviceName',
  'privateKey',
  'privateKeyPath',
  'privateKeyPass',
  'token',
  'warehouse',
  'database',
  'schema',
  'role',
  'rowMode',
  'streamResult',
  'fetchAsString',
  'clientSessionKeepAlive',
  'clientSessionKeepAliveHeartbeatFrequency',
  'jsTreatIntegerAsBigInt',
  'sessionToken',
  'masterToken',
  'sessionTokenExpirationTime',
  'masterTokenExpirationTime',
  'agentClass',
  'validateDefaultParameters',
  'arrayBindingThreshold',
  'gcsUseDownscopedCredential',
  'forceStageBindError',
  'includeRetryReason',
  'disableQueryContextCache',
  'retryTimeout',
  'clientRequestMFAToken',
  'clientStoreTemporaryCredential',
  'disableConsoleLogin',
  'forceGCPUseDownscopedCredential',
  'representNullAsStringNull',
  'disableSamlURLCheck',
  'credentialCacheDir',
  'passcodeInPassword',
  'passcode',
  'oauthClientId',
  'oauthClientSecret',
  'oauthRedirectUri',
  'oauthAuthorizationUrl',
  'oauthTokenRequestUrl',
  'oauthScope',
  'oauthChallengeMethod',
  'oauthHttpAllowed', //only for tests
];

function consolidateHostAndAccount(options) {
  let dotPos = -1;
  let realAccount = undefined;
  let realRegion = undefined;
  const protocol = options.protocol || 'https';
  const port = Util.exists(options.port) ? Util.format(':%s', options.port) : '';


  if (Util.exists(options.region)) {
    Errors.checkArgumentValid(Util.isCorrectSubdomain(options.region), ErrorCodes.ERR_CONN_CREATE_INVALID_REGION_REGEX);
    realRegion = options.region;
  }

  if (Util.exists(options.account)) {
    Errors.checkArgumentValid(Util.isString(options.account), ErrorCodes.ERR_CONN_CREATE_INVALID_ACCOUNT);
    Errors.checkArgumentValid(Util.isCorrectSubdomain(options.account), ErrorCodes.ERR_CONN_CREATE_INVALID_ACCOUNT_REGEX);
    dotPos = options.account.indexOf('.');
    realAccount = options.account;
    if (dotPos > 0) {
      realRegion = realAccount.substring(dotPos + 1);
      realAccount = realAccount.substring(0, dotPos);
    }
  }

  if (Util.exists(options.accessUrl)) { //accessUrl is set in configuration
    try {
      const parsedUrl = url.parse(options.accessUrl);
      Errors.checkArgumentValid(Util.exists(parsedUrl.hostname), ErrorCodes.ERR_CONN_CREATE_INVALID_ACCESS_URL);
      if (!Util.exists(options.host)) {
        options.host = parsedUrl.hostname;
      }
      const dotPos = parsedUrl.hostname.indexOf('.');
      if (dotPos > 0 && !Util.exists(options.account)) {
        realAccount = parsedUrl.hostname.substring(0, dotPos);
      }
    } catch (e) {
      Errors.checkArgumentValid(
        false, ErrorCodes.ERR_CONN_CREATE_MISSING_ACCOUNT);
    }
  } else if (Util.exists(options.host)) { //host is set in configuration
    options.accessUrl = Util.format('%s://%s%s', protocol, options.host, port);
    const dotPos = options.host.indexOf('.');
    if (dotPos > 0 && !Util.exists(options.account)) {
      realAccount = options.host.substring(0, dotPos);
    } else {
      realAccount = options.account;
    }
  } else if (Util.exists(options.account)) { //only account() is set in configuration
    if (options.region === 'us-west-2') {
      options.region = '';
    }
    options.host = Util.constructHostname(realRegion, realAccount);
    options.accessUrl = Util.format('%s://%s%s', protocol, options.host, port);
  }

  if (Util.exists(realAccount) && options.accessUrl.includes('global.snowflakecomputing')) {
    const dashPos = realAccount.indexOf('-');
    if (dashPos > 0) {
      // global URL
      realAccount = realAccount.substring(0, dashPos);
    }
  }
  options.account = realAccount;
  options.region = realRegion;

  // check for missing accessURL
  Errors.checkArgumentExists(Util.exists(options.account), ErrorCodes.ERR_CONN_CREATE_MISSING_ACCOUNT);
  // check for missing account
  Errors.checkArgumentExists(Util.exists(options.accessUrl), ErrorCodes.ERR_CONN_CREATE_MISSING_ACCESS_URL);
}

/**
 * A Connection configuration object that should be available to all stateful
 * objects in the driver.
 *
 * @param {Object} options
 * @param {Boolean} [validateCredentials]
 * @param {Boolean} [qaMode]
 * @param {Object} [clientInfo]
 *
 * @constructor
 */
function ConnectionConfig(options, validateCredentials, qaMode, clientInfo) {
  // if no value is specified for the validate credentials flag, default to true
  if (!Util.exists(validateCredentials)) {
    validateCredentials = true;
  }

  // check for missing options
  Errors.checkArgumentExists(Util.exists(options),
    ErrorCodes.ERR_CONN_CREATE_MISSING_OPTIONS);

  // check for invalid options
  Errors.checkArgumentValid(Util.isObject(options),
    ErrorCodes.ERR_CONN_CREATE_INVALID_OPTIONS);

  // only validate credentials if necessary
  if (validateCredentials) {
    // username is not required for oauth and external browser authenticators
    if (!Util.exists(options.authenticator) ||
      (options.authenticator.toUpperCase() !== AuthenticationTypes.OAUTH_AUTHENTICATOR &&
        options.authenticator.toUpperCase() !== AuthenticationTypes.EXTERNAL_BROWSER_AUTHENTICATOR &&
        options.authenticator.toUpperCase() !== AuthenticationTypes.PROGRAMMATIC_ACCESS_TOKEN &&
        options.authenticator.toUpperCase() !== AuthenticationTypes.OAUTH_CLIENT_CREDENTIALS)) {
      // check for missing username
      Errors.checkArgumentExists(Util.exists(options.username),
        ErrorCodes.ERR_CONN_CREATE_MISSING_USERNAME);
    }

    if (Util.exists(options.username)) {
      // check for invalid username
      Errors.checkArgumentValid(Util.isString(options.username),
        ErrorCodes.ERR_CONN_CREATE_INVALID_USERNAME);
    }

    // password is only required for default authenticator
    if (!Util.exists(options.authenticator) ||
      options.authenticator === AuthenticationTypes.DEFAULT_AUTHENTICATOR) {
      // check for missing password
      Errors.checkArgumentExists(Util.exists(options.password),
        ErrorCodes.ERR_CONN_CREATE_MISSING_PASSWORD);

      // check for invalid password
      Errors.checkArgumentValid(Util.isString(options.password),
        ErrorCodes.ERR_CONN_CREATE_INVALID_PASSWORD);
    }

    if (!Util.exists(options.authenticator) ||
      options.authenticator === AuthenticationTypes.PROGRAMMATIC_ACCESS_TOKEN) {
      // PASSWORD or TOKEN is needed
      Errors.checkArgumentExists(Util.exists(options.password) || Util.exists(options.token),
        ErrorCodes.ERR_CONN_CREATE_MISSING_PASSWORD);

      if (Util.exists(options.password)) {
        // check for invalid password
        Errors.checkArgumentValid(Util.isString(options.password),
          ErrorCodes.ERR_CONN_CREATE_INVALID_PASSWORD);
      }
      if (Util.exists(options.token)) {
        Errors.checkArgumentValid(Util.isString(options.token),
          ErrorCodes.ERR_CONN_CREATE_INVALID_OAUTH_TOKEN);
      }
    }

    if (options.authenticator === AuthenticationTypes.OAUTH_AUTHORIZATION_CODE) {
      if (Util.exists(options.oauthAuthorizationUrl)) {
        let parsedUrl;
        try {
          parsedUrl = new URL(options.oauthAuthorizationUrl);
        } catch (error) {
          throw Errors.createInvalidParameterError(ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_AUTHORIZATION_URL);
        }
        Errors.checkArgumentValid((parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'),  ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_AUTHORIZATION_URL);
      }
      if ((options.oauthAuthorizationUrl && !isSnowflakeHost(options.oauthAuthorizationUrl))
      || (options.oauthTokenRequestUrl && !isSnowflakeHost(options.oauthTokenRequestUrl))
      ) {
        Errors.checkArgumentValid(Util.isString(options.oauthClientId),
          ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_ID);
        Errors.checkArgumentValid(Util.isString(options.oauthClientSecret),
          ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_SECRET);
      }
    }

    if (options.authenticator === AuthenticationTypes.OAUTH_CLIENT_CREDENTIALS) {
      if (Util.exists(options.oauthTokenRequestUrl)) {
        let parsedUrl;
        try {
          parsedUrl = new URL(options.oauthTokenRequestUrl);
        } catch (error) {
          throw Errors.createInvalidParameterError(ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_TOKEN_REQUEST_URL);
        }
        Errors.checkArgumentValid((parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'),  ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_TOKEN_REQUEST_URL);
      }
      Errors.checkArgumentValid(Util.isString(options.oauthClientId),
        ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_ID);
      Errors.checkArgumentValid(Util.isString(options.oauthClientSecret),
        ErrorCodes.ERR_CONN_CREATE_INVALID_OUATH_CLIENT_SECRET);
    }

    consolidateHostAndAccount(options);
  }

  // check for missing accessUrl
  Errors.checkArgumentExists(Util.exists(options.accessUrl),
    ErrorCodes.ERR_CONN_CREATE_MISSING_ACCESS_URL);

  // check for invalid accessUrl
  Errors.checkArgumentValid(Util.isString(options.accessUrl),
    ErrorCodes.ERR_CONN_CREATE_INVALID_ACCESS_URL);

  const proxyHost = options.proxyHost;
  const proxyPort = options.proxyPort;
  const proxyUser = options.proxyUser;
  const proxyPassword = options.proxyPassword;
  const proxyProtocol = options.proxyProtocol || 'http';
  const noProxy = options.noProxy;
  let oauthClientId = options.oauthClientId;
  let oauthClientSecret = options.oauthClientSecret;
  const oauthRedirectUri = options.oauthRedirectUri;
  const oauthAuthorizationUrl = options.oauthAuthorizationUrl;
  const oauthTokenRequestUrl = options.oauthTokenRequestUrl;
  const oauthChallengeMethod = options.oauthChallengeMethod;
  const oauthScope = options.oauthScope;
  const oauthHttpAllowed = options.oauthHttpAllowed;

  // if we're running in node and some proxy information is specified
  let proxy;
  if (Util.isNode() && (Util.exists(proxyHost) || Util.exists(proxyPort))) {
    proxy =
    {
      host: proxyHost,
      port: proxyPort,
      user: proxyUser,
      password: proxyPassword,
      protocol: proxyProtocol,
      noProxy: noProxy
    };
    ProxyUtil.validateProxy(proxy);
  }

  const serviceName = options.serviceName;
  let authenticator = options.authenticator;

  // if no value is specified for authenticator, default to Snowflake
  if (!Util.exists(authenticator)) {
    authenticator = AuthenticationTypes.DEFAULT_AUTHENTICATOR;
  } else {
    authenticator = authenticator.toUpperCase();
  }

  let browserActionTimeout = options.browserActionTimeout;
  if (Util.exists(options.browserActionTimeout)) {
    Errors.checkArgumentValid(Util.number.isPositiveInteger(browserActionTimeout),
      ErrorCodes.ERR_CONN_CREATE_INVALID_BROWSER_TIMEOUT);
  } else {
    browserActionTimeout = WAIT_FOR_BROWSER_ACTION_TIMEOUT;
  }

  const privateKey = options.privateKey;
  if (Util.exists(options.privateKey)) {
    Errors.checkArgumentValid((Util.isString(privateKey) && Util.isPrivateKey(privateKey)),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY);
  }

  const privateKeyPath = options.privateKeyPath;
  if (Util.exists(options.privateKeyPath)) {
    Errors.checkArgumentValid(Util.isString(privateKeyPath),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY_PATH);
  }

  const privateKeyPass = options.privateKeyPass;
  if (Util.exists(options.privateKeyPass)) {
    Errors.checkArgumentValid(Util.isString(privateKeyPass),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PRIVATE_KEY_PASS);
  }

  const token = options.token;
  if (Util.exists(token)) {
    Errors.checkArgumentValid(Util.isString(token),
      ErrorCodes.ERR_CONN_CREATE_INVALID_OAUTH_TOKEN);
  }

  const warehouse = options.warehouse;
  const database = options.database;
  const schema = options.schema;
  const role = options.role;

  // check for invalid warehouse
  if (Util.exists(warehouse)) {
    Errors.checkArgumentValid(Util.isString(warehouse),
      ErrorCodes.ERR_CONN_CREATE_INVALID_WAREHOUSE);
  }

  // check for invalid database
  if (Util.exists(database)) {
    Errors.checkArgumentValid(Util.isString(database),
      ErrorCodes.ERR_CONN_CREATE_INVALID_DATABASE);
  }

  // check for invalid schema
  if (Util.exists(schema)) {
    Errors.checkArgumentValid(Util.isString(schema),
      ErrorCodes.ERR_CONN_CREATE_INVALID_SCHEMA);
  }

  // check for invalid role
  if (Util.exists(role)) {
    Errors.checkArgumentValid(Util.isString(role),
      ErrorCodes.ERR_CONN_CREATE_INVALID_ROLE);
  }

  // check for invalid streamResult
  const streamResult = options.streamResult;
  if (Util.exists(streamResult)) {
    Errors.checkArgumentValid(Util.isBoolean(streamResult),
      ErrorCodes.ERR_CONN_CREATE_INVALID_STREAM_RESULT);
  }

  // check for invalid fetchAsString
  const fetchAsString = options.fetchAsString;
  if (Util.exists(fetchAsString)) {
    // check that the value is an array
    Errors.checkArgumentValid(Util.isArray(fetchAsString),
      ErrorCodes.ERR_CONN_CREATE_INVALID_FETCH_AS_STRING);

    // check that all the array elements are valid
    const invalidValueIndex = NativeTypes.findInvalidValue(fetchAsString);
    Errors.checkArgumentValid(invalidValueIndex === -1,
      ErrorCodes.ERR_CONN_CREATE_INVALID_FETCH_AS_STRING_VALUES,
      JSON.stringify(fetchAsString[invalidValueIndex]));
  }
  // Row mode is optional, can be undefined
  const rowMode = options.rowMode;
  if (Util.exists(rowMode)) {
    RowMode.checkRowModeValid(rowMode);
  }

  // check for invalid clientSessionKeepAlive
  const clientSessionKeepAlive = options.clientSessionKeepAlive;
  if (Util.exists(clientSessionKeepAlive)) {
    Errors.checkArgumentValid(Util.isBoolean(clientSessionKeepAlive),
      ErrorCodes.ERR_CONN_CREATE_INVALID_KEEP_ALIVE);
  }

  // check for invalid clientSessionKeepAliveHeartbeatFrequency
  let clientSessionKeepAliveHeartbeatFrequency = options.clientSessionKeepAliveHeartbeatFrequency;
  if (Util.exists(clientSessionKeepAliveHeartbeatFrequency)) {
    Errors.checkArgumentValid(Util.isNumber(clientSessionKeepAliveHeartbeatFrequency),
      ErrorCodes.ERR_CONN_CREATE_INVALID_KEEP_ALIVE_HEARTBEAT_FREQ);
    clientSessionKeepAliveHeartbeatFrequency =
      Util.validateClientSessionKeepAliveHeartbeatFrequency(clientSessionKeepAliveHeartbeatFrequency, ConnectionConstants.HEARTBEAT_FREQUENCY_MASTER_VALIDITY);
  }

  const jsTreatIntegerAsBigInt = options.jsTreatIntegerAsBigInt;
  if (Util.exists(jsTreatIntegerAsBigInt)) {
    Errors.checkArgumentValid(Util.isBoolean(jsTreatIntegerAsBigInt),
      ErrorCodes.ERR_CONN_CREATE_INVALID_TREAT_INTEGER_AS_BIGINT);
  }

  const gcsUseDownscopedCredential = options.gcsUseDownscopedCredential;
  if (Util.exists(gcsUseDownscopedCredential)) {
    Errors.checkArgumentValid(Util.isBoolean(gcsUseDownscopedCredential),
      ErrorCodes.ERR_CONN_CREATE_INVALID_GCS_USE_DOWNSCOPED_CREDENTIAL);
  }

  const clientConfigFile = options.clientConfigFile;
  if (Util.exists(clientConfigFile)) {
    Errors.checkArgumentValid(Util.isString(clientConfigFile), ErrorCodes.ERR_CONN_CREATE_INVALID_CLIENT_CONFIG_FILE);
  }

  // remember if we're in qa mode
  this._qaMode = qaMode;

  // if a client-info argument is specified, validate it
  const clientType = 'JavaScript';
  let clientName;
  let clientVersion;
  let clientEnvironment;
  if (Util.exists(clientInfo)) {
    Errors.assertInternal(Util.isObject(clientInfo));
    Errors.assertInternal(Util.isString(clientInfo.version));
    Errors.assertInternal(Util.isObject(clientInfo.environment));

    clientName = clientInfo.name;
    clientVersion = clientInfo.version;
    clientEnvironment = clientInfo.environment;
    clientEnvironment.OS = os.platform();
    clientEnvironment.OS_VERSION = os.release();
    clientEnvironment.OCSP_MODE = GlobalConfig.getOcspMode();
  }

  const clientApplication = options.application;
  if (Util.exists(clientApplication)) {
    Errors.checkArgumentValid(Util.isString(clientApplication),
      ErrorCodes.ERR_CONN_CREATE_INVALID_APPLICATION);

    const APPLICATION_PATTERN = new RegExp(String.raw`^[A-Za-z]([A-Za-z0-9.\-_]){1,50}$`,
      'gi');

    Errors.checkArgumentValid(APPLICATION_PATTERN.test(clientApplication),
      ErrorCodes.ERR_CONN_CREATE_INVALID_APPLICATION);
  }

  let validateDefaultParameters = false;
  if (Util.exists(options.validateDefaultParameters)) {
    // check for invalid validateDefaultParameters
    Errors.checkArgumentValid(Util.isBoolean(options.validateDefaultParameters),
      ErrorCodes.ERR_CONN_CREATE_INVALID_VALIDATE_DEFAULT_PARAMETERS);

    validateDefaultParameters = options.validateDefaultParameters;
  }

  let bindThreshold = null;
  if (Util.exists(options.arrayBindingThreshold)) {
    // check for invalid arrayBindingThreshold
    Errors.checkArgumentValid(Util.isNumber(options.arrayBindingThreshold),
      ErrorCodes.ERR_CONN_CREATE_INVALID_ARRAY_BINDING_THRESHOLD);

    bindThreshold = options.arrayBindingThreshold;
  }

  let forceStageBindError = null;
  if (Util.exists(options.forceStageBindError)) {
    // check for invalid forceStageBindError
    Errors.checkArgumentValid(Util.isNumber(options.forceStageBindError),
      ErrorCodes.ERR_CONN_CREATE_INVALID_FORCE_STAGE_BIND_ERROR);

    forceStageBindError = options.forceStageBindError;
  }

  let disableQueryContextCache = false;
  if (Util.exists(options.disableQueryContextCache)) {
    Errors.checkArgumentValid(Util.isBoolean(options.disableQueryContextCache),
      ErrorCodes.ERR_CONN_CREATE_INVALID_DISABLED_QUERY_CONTEXT_CACHE);

    disableQueryContextCache = options.disableQueryContextCache;
  }

  let retryTimeout = 300;
  if (Util.exists(options.retryTimeout)) {
    Errors.checkArgumentValid(Util.isNumber(options.retryTimeout),
      ErrorCodes.ERR_CONN_CREATE_INVALID_MAX_RETRY_TIMEOUT);

    retryTimeout = options.retryTimeout !== 0 ? Math.max(retryTimeout, options.retryTimeout) : 0;
  }

  let includeRetryReason = true;
  if (Util.exists(options.includeRetryReason)) {
    Errors.checkArgumentValid(Util.isBoolean(options.includeRetryReason),
      ErrorCodes.ERR_CONN_CREATE_INVALID_INCLUDE_RETRY_REASON);

    includeRetryReason = options.includeRetryReason;
  }

  let clientRequestMFAToken = false;
  if (Util.exists(options.clientRequestMFAToken)) {
    Errors.checkArgumentValid(Util.isBoolean(options.clientRequestMFAToken),
      ErrorCodes.ERR_CONN_CREATE_INVALID_CLIENT_REQUEST_MFA_TOKEN);

    clientRequestMFAToken = options.clientRequestMFAToken;
  }

  let disableConsoleLogin = true;
  if (Util.exists(options.disableConsoleLogin)) {
    Errors.checkArgumentValid(Util.isBoolean(options.disableConsoleLogin),
      ErrorCodes.ERR_CONN_CREATE_INVALID_DISABLE_CONSOLE_LOGIN);

    disableConsoleLogin = options.disableConsoleLogin;
  }

  if (Util.exists(options.forceGCPUseDownscopedCredential)) {
    Errors.checkArgumentValid(Util.isBoolean(options.forceGCPUseDownscopedCredential),
      ErrorCodes.ERR_CONN_CREATE_INVALID_FORCE_GCP_USE_DOWNSCOPED_CREDENTIAL);

    process.env.SNOWFLAKE_FORCE_GCP_USE_DOWNSCOPED_CREDENTIAL = options.forceGCPUseDownscopedCredential;
  } else {
    process.env.SNOWFLAKE_FORCE_GCP_USE_DOWNSCOPED_CREDENTIAL = false;
  }

  if (Util.exists(options.representNullAsStringNull)) {
    Errors.checkArgumentValid(Util.isBoolean(options.representNullAsStringNull),
      ErrorCodes.ERR_CONN_CREATE_INVALID_REPRESENT_NULL_AS_STRING_NULL);

    DataTypes.setIsRepresentNullAsStringNull(options.representNullAsStringNull);
  }

  let disableSamlURLCheck = false;
  if (Util.exists(options.disableSamlURLCheck)) {
    Errors.checkArgumentValid(Util.isBoolean(options.disableSamlURLCheck),
      ErrorCodes.ERR_CONN_CREATE_INVALID_DISABLE_SAML_URL_CHECK);

    disableSamlURLCheck = options.disableSamlURLCheck;
  }

  let clientStoreTemporaryCredential = false;
  if (Util.exists(options.clientStoreTemporaryCredential)) {
    Errors.checkArgumentValid(Util.isBoolean(options.clientStoreTemporaryCredential),
      ErrorCodes.ERR_CONN_CREATE_INVALID_CLIENT_STORE_TEMPORARY_CREDENTIAL);

    clientStoreTemporaryCredential = options.clientStoreTemporaryCredential;
  }

  let credentialCacheDir = null;
  if (Util.exists(options.credentialCacheDir)) {
    const absolutePath = path.resolve(options.credentialCacheDir);
    Errors.checkArgumentValid(Util.validatePath(absolutePath),
      ErrorCodes.ERR_CONN_CREATE_INVALID_CREDENTIAL_CACHE_DIR);

    credentialCacheDir = absolutePath;
  }

  let passcodeInPassword = false;
  if (Util.exists(options.passcodeInPassword)) {
    Errors.checkArgumentValid(Util.isBoolean(options.passcodeInPassword), 
      ErrorCodes.ERR_CONN_CREATE_INVALID_PASSCODE_IN_PASSWORD);

    passcodeInPassword = options.passcodeInPassword;
  }

  let passcode = null;
  if (Util.exists(options.passcode)) {
    Errors.checkArgumentValid(Util.isString(options.passcode),
      ErrorCodes.ERR_CONN_CREATE_INVALID_PASSCODE);

    passcode = options.passcode;
  }
  
  if (validateDefaultParameters) {
    for (const [key] of Object.entries(options)) {
      if (!DEFAULT_PARAMS.includes(key)) {
        const result = levenshtein.closest(key, DEFAULT_PARAMS);
        Logger.getInstance().error(`'${key}' is an unknown connection parameter. Did you mean '${result}'?`);
      }
    }
  }

  /**
   * Returns an object that contains information about the proxy hostname, port,
   * etc. for when http requests are made.
   *
   * @returns {Object}
   */
  this.getProxy = function () {
    return proxy;
  };

  /**
   * Returns the warehouse to automatically use once a connection has been
   * established.
   *
   * @returns {String}
   */
  this.getWarehouse = function () {
    return warehouse;
  };

  /**
   * Returns the database to automatically use once a connection has been
   * established.
   *
   * @returns {String}
   */
  this.getDatabase = function () {
    return database;
  };

  /**
   * Returns the schema to automatically use once a connection has been
   * established.
   *
   * @returns {String}
   */
  this.getSchema = function () {
    return schema;
  };

  /**
   * Returns the role to automatically use once a connection has been
   * established.
   *
   * @returns {String}
   */
  this.getRole = function () {
    return role;
  };

  /**
   * Returns the service name.
   *
   * @returns {String}
   */
  this.getServiceName = function () {
    return serviceName;
  };

  /**
   * Returns the authenticator to use for establishing a connection.
   *
   * @returns {String}
   */
  this.getAuthenticator = function () {
    return authenticator;
  };

  /**
   * Returns the timeout in millis used for authentication by external browser.
   *
   * @returns {String}
   */
  this.getBrowserActionTimeout = function () {
    return browserActionTimeout;
  };

  /**
   * Returns the private key string.
   *
   * @returns {String}
   */
  this.getPrivateKey = function () {
    return privateKey;
  };

  /**
   * Returns the private key file location.
   *
   * @returns {String}
   */
  this.getPrivateKeyPath = function () {
    return privateKeyPath;
  };

  /**
   * Returns the private key passphrase.
   *
   * @returns {String}
   */
  this.getPrivateKeyPass = function () {
    return privateKeyPass;
  };

  /**
   * Returns the OAuth token.
   *
   * @returns {String}
   */
  this.getToken = function () {
    return token;
  };

  /**
   * Returns the streamResult flag.
   *
   * @returns {boolean}
   */
  this.getStreamResult = function () {
    return streamResult;
  };

  /**
   * Returns the fetchAsString array.
   *
   * @returns {String[]}
   */
  this.getFetchAsString = function () {
    return fetchAsString;
  };

  /**
   * Returns the rowMode string value ('array', 'object' or 'object_with_renamed_duplicated_columns'). Could be null or undefined.
   *
   * @returns  {String}
   */
  this.getRowMode = function () {
    return rowMode;
  };

  /**
   * Returns the client type.
   *
   * @returns {String}
   */
  this.getClientType = function () {
    return clientType;
  };

  /**
   * Returns the client name.
   *
   * @returns {String}
   */
  this.getClientName = function () {
    return clientName;
  };

  /**
   * Returns the client version.
   *
   * @returns {String}
   */
  this.getClientVersion = function () {
    return clientVersion;
  };

  /**
   * Returns the client application.
   *
   * @returns {String}
   */
  this.getClientApplication = function () {
    return clientApplication;
  };

  /**
   * Returns a JSON object containing version information for all the various
   * components of the runtime, e.g. node, v8, openssl, etc.
   *
   * @returns {Object}
   */
  this.getClientEnvironment = function () {
    return clientEnvironment;
  };

  /**
   * Returns the client session keep alive setting.
   *
   * @returns {String}
   */
  this.getClientSessionKeepAlive = function () {
    return clientSessionKeepAlive;
  };

  /**
   * Returns the client session keep alive heartbeat frequency setting.
   *
   * @returns {String}
   */
  this.getClientSessionKeepAliveHeartbeatFrequency = function () {
    return clientSessionKeepAliveHeartbeatFrequency;
  };

  /**
   * Returns the client treat integer as setting
   *
   * @returns {String}
   */
  this.getJsTreatIntegerAsBigInt = function () {
    return jsTreatIntegerAsBigInt;
  };

  /**
   * Returns the setting for the GCS_USE_DOWNSCOPED_CREDENTIAL session parameter
   *
   * @returns {String}
   */
  this.getGcsUseDownscopedCredential = function () {
    return gcsUseDownscopedCredential;
  };

  /**
   * Returns the bind threshold
   *
   * @returns {string}
   */
  this.getbindThreshold = function () {
    return bindThreshold;
  };

  /**
   * Returns the force stage bind error
   *
   * @returns {string}
   */
  this.getForceStageBindError = function () {
    return forceStageBindError;
  };

  /**
   * Returns whether the Retry reason is included or not in the retry url
   *
   * @returns {Boolean}
   */
  this.getIncludeRetryReason = function () {
    return includeRetryReason;
  };

  /**
   * Returns whether the Query Context Cache is enabled or not by the configuration
   *
   * @returns {Boolean}
   */
  this.getDisableQueryContextCache = function () {
    return disableQueryContextCache;
  };

  /**
   * Returns the client config file
   *
   * @returns {String}
   */
  this.getClientConfigFile = function () {
    return clientConfigFile;
  };

  /**
   * Returns the max login timeout
   *
   * @returns {Number}
   */
  this.getRetryTimeout = function () {
    return retryTimeout;
  };

  this.getDisableConsoleLogin = function () {
    return disableConsoleLogin;
  };

  /**
   * Returns whether the SAML URL check is enabled or not.
   *
   * @returns {Boolean}
   */
  this.getDisableSamlURLCheck = function () {
    return disableSamlURLCheck;
  };

  this.getCredentialCacheDir = function () {
    return credentialCacheDir;
  };

  this.getClientRequestMFAToken = function () {
    return clientRequestMFAToken;
  };
  /** 
   * Returns whether the auth token saves on the local machine or not. 
   *
   * @returns {Boolean}
   */
  this.getClientStoreTemporaryCredential = function () {
    return clientStoreTemporaryCredential;
  };

  this.getPasscodeInPassword = function () {
    return passcodeInPassword;
  };

  this.getPasscode = function () {
    return passcode;
  };


  this.getOauthClientId = function () {
    if (!Util.isNotEmptyString(options.oauthClientId)
      && !Util.isNotEmptyString(options.oauthClientSecret)
      && authenticator === AuthenticationTypes.OAUTH_AUTHORIZATION_CODE
      && isSnowflakeHost(this.getOauthAuthorizationUrl())
      && isSnowflakeHost(this.getOauthTokenRequestUrl())
    ) {
      Logger.getInstance().debug(`Using default values for oauthClientId: ${LOCAL_APPLICATION_CLIENT_CREDENTIAL}`);
      oauthClientId = LOCAL_APPLICATION_CLIENT_CREDENTIAL;
    }
    return oauthClientId;
  };

  this.getOauthClientSecret = function () {
    if (!options.oauthClientId && !options.oauthClientSecret
      && authenticator === AuthenticationTypes.OAUTH_AUTHORIZATION_CODE
      && isSnowflakeHost(this.getOauthAuthorizationUrl())
      && isSnowflakeHost(this.getOauthTokenRequestUrl())
    ) {
      Logger.getInstance().debug(`Using default values for oauthClientSecret: ${LOCAL_APPLICATION_CLIENT_CREDENTIAL}`);
      oauthClientSecret = LOCAL_APPLICATION_CLIENT_CREDENTIAL;
    }
    return oauthClientSecret;
  };

  this.getOauthAuthorizationUrl = function () {
    return oauthAuthorizationUrl ?? options.accessUrl + SNOWFLAKE_AUTHORIZE_ENDPOINT;
  };

  this.getOauthTokenRequestUrl = function () {
    return oauthTokenRequestUrl ?? options.accessUrl + SNOWFLAKE_TOKEN_REQUEST_ENDPOINT;
  };

  this.getOauthRedirectUri = function () {
    return oauthRedirectUri;
  };

  this.getOauthScope = function () {
    return oauthScope;
  };


  this.getOauthChallengeMethod = function () {
    return oauthChallengeMethod;
  };

  this.getOauthHttpAllowed = function () {
    return oauthHttpAllowed;
  };

  /**
   * Returns attributes of Connection Config object that can be used to identify
   * the connection, when ID is not available in the scope. This is not sufficient set,
   * since multiple connections can be instantiated for the same config, but can be treated as a hint.
   *
   * @returns {string}
   */
  this.describeIdentityAttributes = function () {
    return `host: ${this.host}, account: ${this.account}, accessUrl: ${this.accessUrl}, `
        + `user: ${this.username}, role: ${this.getRole()}, database: ${this.getDatabase()}, `
        + `schema: ${this.getSchema()}, warehouse: ${this.getWarehouse()}, ` + ProxyUtil.describeProxy(this.getProxy());
  };

  // save config options
  this.username = options.username;
  this.password = options.password;
  this.accessUrl = options.accessUrl;
  this.region = options.region;
  this.account = options.account;
  this.host = options.host;
  this.sessionToken = options.sessionToken;
  this.masterToken = options.masterToken;
  this.masterTokenExpirationTime = options.masterTokenExpirationTime;
  this.sessionTokenExpirationTime = options.sessionTokenExpirationTime;
  this.clientConfigFile = options.clientConfigFile;
  this.openExternalBrowserCallback = options.openExternalBrowserCallback;

  // create the parameters array
  const parameters = createParameters();

  // create a map in which the keys are the parameter names and the values are
  // the corresponding parameters
  const mapParameters = {};
  let index, length, parameter;
  for (index = 0, length = parameters.length; index < length; index++) {
    parameter = parameters[index];
    mapParameters[parameter.name] = parameter;

    // initialize the value to the default
    parameter.value = parameter.defaultValue;
  }

  // for each property in the options object that matches a known parameter name
  let propertyName, propertyValue;
  for (propertyName in options) {
    if (Object.prototype.hasOwnProperty.call(options, propertyName) &&
      Object.prototype.hasOwnProperty.call(mapParameters, propertyName)) {
      // if the parameter matching the property is external and the specified
      // value is valid for the parameter, update the parameter value
      propertyValue = options[propertyName];
      parameter = mapParameters[propertyName];
      if (parameter.external && parameter.validate(propertyValue)) {
        parameter.value = propertyValue;
      }
    }
  }

  // save the parameters map
  this._mapParameters = mapParameters;

  // custom agent class, test only
  this.agentClass = options.agentClass;
}

/**
 * Determines if qa-mode is on.
 *
 * @returns {Boolean}
 */
ConnectionConfig.prototype.isQaMode = function () {
  return this._qaMode;
};

/**
 * Clears all credential-related information.
 */
ConnectionConfig.prototype.clearCredentials = function () {
  // clear the password
  this.password = null;

  // TODO: clear passcode and other credential-related information as well
};

const PARAM_TIMEOUT = 'timeout';
const PARAM_RESULT_PREFETCH = 'resultPrefetch';
const PARAM_RESULT_STREAM_INTERRUPTS = 'resultStreamInterrupts';
const PARAM_RESULT_CHUNK_CACHE_SIZE = 'resultChunkCacheSize';
const PARAM_RESULT_PROCESSING_BATCH_SIZE = 'resultProcessingBatchSize';
const PARAM_RESULT_PROCESSING_BATCH_DURATION = 'resultProcessingBatchDuration';
const PARAM_ROW_STREAM_HIGH_WATER_MARK = 'rowStreamHighWaterMark';
const PARAM_RETRY_LARGE_RESULT_SET_MAX_NUM_RETRIES = 'largeResultSetRetryMaxNumRetries';
const PARAM_RETRY_LARGE_RESULT_SET_MAX_SLEEP_TIME = 'largeResultSetRetryMaxSleepTime';
const PARAM_RETRY_SF_MAX_LOGIN_RETRIES = 'sfRetryMaxLoginRetries';
const PARAM_RETRY_SF_MAX_NUM_RETRIES = 'sfRetryMaxNumRetries';
const PARAM_RETRY_SF_STARTING_SLEEP_TIME = 'sfRetryStartingSleepTime';
const PARAM_RETRY_SF_MAX_SLEEP_TIME = 'sfRetryMaxSleepTime';

/**
 * Creates the list of known parameters. If a parameter is marked as external,
 * its value can be overridden by adding the appropriate name-value mapping to
 * the ConnectionConfig options.
 *
 * @returns {Object[]}
 */
function createParameters() {
  const isNonNegativeInteger = Util.number.isNonNegativeInteger.bind(Util.number);
  const isPositiveInteger = Util.number.isPositiveInteger.bind(Util.number);
  const isNonNegativeNumber = Util.number.isNonNegative.bind(Util.number);

  return [
    {
      name: PARAM_TIMEOUT,
      defaultValue: 90 * 1000,
      external: true,
      validate: isPositiveInteger
    },
    {
      name: PARAM_RESULT_PREFETCH,
      defaultValue: 2,
      external: true,
      validate: isPositiveInteger
    },
    {
      name: PARAM_RESULT_STREAM_INTERRUPTS,
      defaultValue: 3,
      validate: isPositiveInteger
    },
    // for now we set chunk cache size to 1, which is same as 
    // disabling the chunk cache. Otherwise, cache will explode
    // memory when fetching large result set 
    {
      name: PARAM_RESULT_CHUNK_CACHE_SIZE,
      defaultValue: 1,
      validate: isPositiveInteger
    },
    {
      name: PARAM_RESULT_PROCESSING_BATCH_SIZE,
      defaultValue: 1000,
      validate: isPositiveInteger
    },
    {
      name: PARAM_RESULT_PROCESSING_BATCH_DURATION,
      defaultValue: 100,
      validate: isPositiveInteger
    },
    {
      name: PARAM_ROW_STREAM_HIGH_WATER_MARK,
      defaultValue: 10,
      validate: isPositiveInteger
    },
    {
      name: PARAM_RETRY_LARGE_RESULT_SET_MAX_NUM_RETRIES,
      defaultValue: 10,
      validate: isNonNegativeInteger
    },
    {
      name: PARAM_RETRY_LARGE_RESULT_SET_MAX_SLEEP_TIME,
      defaultValue: 16,
      validate: isNonNegativeInteger
    },
    {
      name: PARAM_RETRY_SF_MAX_LOGIN_RETRIES,
      defaultValue: 7,
      external: true,
      validate: isNonNegativeInteger
    },
    {
      name: PARAM_RETRY_SF_MAX_NUM_RETRIES,
      defaultValue: 1000,
      validate: isNonNegativeInteger
    },
    {
      name: PARAM_RETRY_SF_STARTING_SLEEP_TIME,
      defaultValue: 1,
      validate: isNonNegativeNumber
    },
    {
      name: PARAM_RETRY_SF_MAX_SLEEP_TIME,
      defaultValue: 16,
      validate: isNonNegativeNumber
    }
  ];
}

ConnectionConfig.prototype.getTimeout = function () {
  return this._getParameterValue(PARAM_TIMEOUT);
};

ConnectionConfig.prototype.getResultPrefetch = function () {
  return this._getParameterValue(PARAM_RESULT_PREFETCH);
};

ConnectionConfig.prototype.getResultStreamInterrupts = function () {
  return this._getParameterValue(PARAM_RESULT_STREAM_INTERRUPTS);
};

ConnectionConfig.prototype.getResultChunkCacheSize = function () {
  return this._getParameterValue(PARAM_RESULT_CHUNK_CACHE_SIZE);
};

ConnectionConfig.prototype.getResultProcessingBatchSize = function () {
  return this._getParameterValue(PARAM_RESULT_PROCESSING_BATCH_SIZE);
};

ConnectionConfig.prototype.getResultProcessingBatchDuration = function () {
  return this._getParameterValue(PARAM_RESULT_PROCESSING_BATCH_DURATION);
};

ConnectionConfig.prototype.getRowStreamHighWaterMark = function () {
  return this._getParameterValue(PARAM_ROW_STREAM_HIGH_WATER_MARK);
};

ConnectionConfig.prototype.getRetryLargeResultSetMaxNumRetries = function () {
  return this._getParameterValue(PARAM_RETRY_LARGE_RESULT_SET_MAX_NUM_RETRIES);
};

ConnectionConfig.prototype.getRetryLargeResultSetMaxSleepTime = function () {
  return this._getParameterValue(PARAM_RETRY_LARGE_RESULT_SET_MAX_SLEEP_TIME);
};

ConnectionConfig.prototype.getRetrySfMaxNumRetries = function () {
  return this._getParameterValue(PARAM_RETRY_SF_MAX_NUM_RETRIES);
};

ConnectionConfig.prototype.getRetrySfMaxLoginRetries = function () {
  return this._getParameterValue(PARAM_RETRY_SF_MAX_LOGIN_RETRIES);
};

ConnectionConfig.prototype.getRetrySfStartingSleepTime = function () {
  return this._getParameterValue(PARAM_RETRY_SF_STARTING_SLEEP_TIME);
};

ConnectionConfig.prototype.getRetrySfMaxSleepTime = function () {
  return this._getParameterValue(PARAM_RETRY_SF_MAX_SLEEP_TIME);
};

/**
 * Returns the value of a given connection config parameter.
 *
 * @param parameterName
 *
 * @returns {Object}
 * @private
 */
ConnectionConfig.prototype._getParameterValue = function (parameterName) {
  const parameter = this._mapParameters[parameterName];
  return parameter ? parameter.value : undefined;
};

module.exports = ConnectionConfig;
