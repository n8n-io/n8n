const { v4: uuidv4 } = require('uuid');
const Url = require('url');
const QueryString = require('querystring');
const QueryStatus = require('../constants/query_status');

const LoggingUtil = require('../logger/logging_util');
const Util = require('../util');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;
const EventEmitter = require('events').EventEmitter;
const Statement = require('./statement');
const Parameters = require('../parameters');
const Authenticator = require('../authentication/authentication');
const AuthenticationTypes = require('../authentication/authentication_types');
const Logger = require('../logger');
const { isOktaAuth } = require('../authentication/authentication');
const { init: initEasyLogging } = require('../logger/easy_logging_starter');
const GlobalConfig = require('../global_config');
const { JsonCredentialManager } = require('../authentication/secure_storage/json_credential_manager');
const ExecutionTimer = require('../logger/execution_timer');

/**
 * Creates a new Connection instance.
 *
 * @param {ConnectionContext} context
 *
 * @returns {Object}
 */
function Connection(context) {
  // validate input
  Logger.getInstance().trace('Connection object is being constructed');
  Errors.assertInternal(Util.isObject(context));

  const services = context.getServices();
  const connectionConfig = context.getConnectionConfig();

  // generate an id for the connection
  const id = uuidv4();
  Logger.getInstance().trace('Generated connection id: %s', id);

  Logger.getInstance().info(
    'Creating Connection[id: %s] with %s, password is %s, region: %s, '
    + 'authenticator: %s, ocsp mode: %s, os: %s, os version: %s',
    id,
    connectionConfig.describeIdentityAttributes(),
    LoggingUtil.describePresence(connectionConfig.password),
    connectionConfig.region, connectionConfig.getAuthenticator(),
    connectionConfig.getClientEnvironment().OCSP_MODE,
    connectionConfig.getClientEnvironment().OS,
    connectionConfig.getClientEnvironment().OS_VERSION);

  // Log was split due to possibility of exceeding the max message length of the logger
  Logger.getInstance().info(
    'Connection[id: %s] additional details: '
    + 'passcode in password is %s, passcode is %s, private key is %s, '
    + 'application: %s, client name: %s, client version: %s, retry timeout: %s, '
    + 'private key path: %s, private key pass is %s, '
    + 'client store temporary credential: %s, browser response timeout: %s',
    id,
    LoggingUtil.describePresence(connectionConfig.getPasscodeInPassword()),
    LoggingUtil.describePresence(connectionConfig.getPasscode()),
    LoggingUtil.describePresence(connectionConfig.getPrivateKey()),
    connectionConfig.getClientApplication(), connectionConfig.getClientName(),
    connectionConfig.getClientVersion(), connectionConfig.getRetryTimeout(),
    connectionConfig.getPrivateKeyPath(),
    LoggingUtil.describePresence(connectionConfig.getPrivateKeyPass()),
    connectionConfig.getClientStoreTemporaryCredential(),
    connectionConfig.getBrowserActionTimeout());


  // async max retry and retry pattern from python connector
  const asyncNoDataMaxRetry = 24;
  const asyncRetryPattern = [1, 1, 2, 3, 4, 8, 10];
  const asyncRetryInMilliseconds = 500;

  // Custom regex based on uuid validate
  // Unable to directly use uuid validate because the queryId returned from the server doesn't match the regex
  const queryIdRegex = new RegExp(/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i);

  //Make session tokens available for testing
  this.getTokens = function () {
    if (connectionConfig._qaMode) {
      return services.sf.getConfig() && services.sf.getConfig().tokenInfo;
    }
    return {};
  };
  /**
   * Returns true if the connection is active otherwise false
   *
   * @returns {boolean}
   */
  this.isUp = function () {
    const isUp = services.sf.isConnected();
    Logger.getInstance().trace('Connection[id: %s] - isUp called. Returning: %s', this.getId(), isUp);
    return isUp;
  };

  /**
  * Returns true if the session token and master token are valid
  *
  * @returns {boolean}
  */
  this.isTokenValid = function () {
    Logger.getInstance().trace('Connection[id: %s] - isTokenValid called', this.getId());
    const tokenInfo = services.sf.getConfig().tokenInfo;

    const sessionTokenExpirationTime = tokenInfo.sessionTokenExpirationTime;
    const isSessionValid = sessionTokenExpirationTime > Date.now();
    Logger.getInstance().trace('Connection[id: %s] - isSessionTokenValid: %s', this.getId(), isSessionValid);


    const masterTokenExpirationTime = tokenInfo.masterTokenExpirationTime;
    const isMasterValid = masterTokenExpirationTime > Date.now();
    Logger.getInstance().trace('Connection[id: %s] - isMasterTokenValid: %s', this.getId(), isMasterValid);

    const areTokensValid = (isSessionValid && isMasterValid);
    Logger.getInstance().trace('Connection[id: %s] - isTokenValid returned: %s', this.getId(), areTokensValid);
    return areTokensValid;
  };

  this.getServiceName = function () {
    return services.sf.getServiceName();
  };

  this.getClientSessionKeepAlive = function () {
    return services.sf.getClientSessionKeepAlive();
  };

  this.getClientSessionKeepAliveHeartbeatFrequency = function () {
    return services.sf.getClientSessionKeepAliveHeartbeatFrequency();
  };

  this.getJsTreatIntegerAsBigInt = function () {
    return services.sf.getJsTreatIntegerAsBigInt();
  };

  /**
   * Returns the connection id.
   *
   * @returns {String}
   */
  this.getId = function () {
    return id;
  };

  this.heartbeat = callback => {
    Logger.getInstance().trace('Issuing heartbeat call');
    const requestId = uuidv4();

    services.sf.request(
      {
        method: 'POST',
        url: Url.format(
          {
            pathname: '/session/heartbeat',
            search: QueryString.stringify(
              {
                requestId: requestId
              })
          }),
        callback: Util.isFunction(callback) ? callback : function (err, body) {
          if (err) {
            Logger.getInstance().error('Error issuing heartbeat call: %s', err.message);
          } else {
            Logger.getInstance().trace('Heartbeat response %s', JSON.stringify(body));
          }
        }
      }
    );
  };

  this.heartbeatAsync = () => {
    return new Promise((resolve, reject) => {
      // previous version of driver called `select 1;` which result in `[ { '1': 1 } ]`
      Logger.getInstance().trace('Issuing async heartbeat call');
      this.heartbeat((err) => err ? reject(err) : resolve([{ '1': 1 }]));
    });
  };

  /**
   * @return {Promise<boolean>}
   */
  this.isValidAsync = async () => {
    Logger.getInstance().trace('Connection[id: %s] - isValidAsync called', this.getId());
    if (!this.isUp()) {
      return false;
    }
    try {
      await this.heartbeatAsync();
      return true;
    } catch (e) {
      Logger.getInstance().debug('Connection[id: %s] - heartbeat failed: %s', this.getId(), JSON.stringify(e, Object.getOwnPropertyNames(e)));
      return false;
    }
  };

  /**
  * Set the private link as the OCSP cache server's URL.
  *
  * @param {String} host
  *
  * @returns {null}
  */
  this.setupOcspPrivateLink = function (host) {
    process.env.SF_OCSP_RESPONSE_CACHE_SERVER_URL = Util.createOcspResponseCacheServerUrl(host);
  };

  /**
   * Method returning callback function for connect() - used to establish a connection.
   *
   * @param self
   * @param {Function} callback
   *
   * @returns {function}
   */
  function connectCallback(self, callback) {
    return function (err) {
      if (Parameters.getValue(Parameters.names.CLIENT_SESSION_KEEP_ALIVE)) {
        const SECONDS_TO_MILLISECONDS_MULTIPLIER = 1000;
        const KEEP_ALIVE_HEARTBEAT_FREQUENCY_IN_MS = Parameters.getValue(Parameters.names.CLIENT_SESSION_KEEP_ALIVE_HEARTBEAT_FREQUENCY) * SECONDS_TO_MILLISECONDS_MULTIPLIER;
        self.keepalive = setInterval(self.heartbeat, KEEP_ALIVE_HEARTBEAT_FREQUENCY_IN_MS, self);
        Logger.getInstance().trace('Connection[id: %s] - keepAlive internal created', id);
      }
      if (Util.isFunction(callback)) {
        callback(Errors.externalize(err), self);
      }
    };
  }

  this.determineConnectionDomain = () => connectionConfig.accessUrl && connectionConfig.accessUrl.includes('snowflakecomputing.cn') ? 'CHINA' : 'GLOBAL';

  /**
   * Establishes a connection if we aren't in a fatal state.
   *
   * @param {Function} callback
   *
   * @returns {Object} the connection object.
   */
  this.connect = function (callback) {
    const timer = new ExecutionTimer().start();
    const connectionDomain = this.determineConnectionDomain();
    Logger.getInstance().info('Connection[id: %s] - connecting. Associated Snowflake domain: %s', this.getId(), connectionDomain);
    // invalid callback
    Errors.checkArgumentValid(
      !Util.exists(callback) || Util.isFunction(callback),
      ErrorCodes.ERR_CONN_CONNECT_INVALID_CALLBACK);

    if (Util.exists(connectionConfig.host) && Util.isPrivateLink(connectionConfig.host)) {
      Logger.getInstance().info('Connection[id: %s] - setting up private link', this.getId());
      this.setupOcspPrivateLink(connectionConfig.host);
    }

    // connect to the snowflake service and provide our own callback so that
    // the connection can be passed in when invoking the connection.connect()
    // callback
    const self = this;

    const authenticationType = connectionConfig.getAuthenticator();
    Logger.getInstance().debug('Connection[id: %s] - using authentication type: %s', this.getId(), authenticationType);

    // check if authentication type is compatible with connect()
    // external browser and okta are not compatible with connect() due to their usage of async functions
    if (authenticationType === AuthenticationTypes.EXTERNAL_BROWSER_AUTHENTICATOR ||
      isOktaAuth(authenticationType)) {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().error('Connection[id: %s] - connecting failed after %s milliseconds.' +
          'Error: External browser and Okta are not compatible with connection process', this.getId(), connectingDuration
      );
      throw Errors.createClientError(
        ErrorCodes.ERR_CONN_CREATE_INVALID_AUTH_CONNECT);
    }

    // Get authenticator to use
    Logger.getInstance().debug('Connection[id: %s] - retrieving authenticator', this.getId());
    const auth = services.sf.getAuthenticator();

    Logger.getInstance().debug('Connection[id: %s] - trying to authenticate', this.getId());
    auth.authenticate(connectionConfig.getAuthenticator(),
      connectionConfig.getServiceName(),
      connectionConfig.account,
      connectionConfig.username).then(() => {
      Logger.getInstance().info('Connection[id: %s] - authentication successful using: %s', this.getId(), connectionConfig.getAuthenticator());
      // JSON for connection
      const body = Authenticator.formAuthJSON(connectionConfig.getAuthenticator(),
        connectionConfig.account,
        connectionConfig.username,
        connectionConfig.getClientType(),
        connectionConfig.getClientVersion(),
        connectionConfig.getClientEnvironment());

      // Update JSON body with the authentication values
      auth.updateBody(body);

      Logger.getInstance().debug('Connection[id: %s] - initializing easyLogging', this.getId());
      initEasyLogging(connectionConfig.clientConfigFile)
        .then(() => {
          Logger.getInstance().debug('Connection[id: %s] - easyLogging initialized', this.getId());
          try {
            Logger.getInstance().debug('Connection[id: %s] - connecting through service', this.getId());
            services.sf.connect({
              callback: connectCallback(self, callback),
              json: body
            });

            const connectingDuration = timer.getDuration();
            Logger.getInstance().info(
              'Connection[id: %s] - connected successfully after %s milliseconds',
              this.getId(), connectingDuration
            );
            return this;
          } catch (e) {
            // we don't expect an error here since callback method should be called
            const connectingDuration = timer.getDuration();
            Logger.getInstance().info('Connection[id: %s] - failed to connect after %s milliseconds. ' +
                'Error: Unexpected error from calling connectCallback function in snowflake service - %s', this.getId(), connectingDuration, e);
          }
        },
        ()  => {
          const connectingDuration = timer.getDuration();
          Logger.getInstance().error('Connection[id: %s] - failed to initialize easyLogging. ' +
              'Connecting failed after %s milliseconds', this.getId(), connectingDuration);
          callback(Errors.createClientError(ErrorCodes.ERR_CONN_CONNECT_INVALID_CLIENT_CONFIG, true), self);
        });
    },
    (err) => {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().error('Connection[id: %s] - authentication failed. Error: %s. ' +
            'Connecting failed after %s milliseconds', this.getId(), err, connectingDuration);
      callback(err, self);
    });

    return this;
  };


  /**
   * Establishes a connection if we aren't in a fatal state.
   *
   * @param {Function} callback
   *
   * @returns {Object} the connection object.
   */
  this.connectAsync = async function (callback) {
    const timer = new ExecutionTimer().start();
    const connectingDomain = this.determineConnectionDomain();
    Logger.getInstance().info('Connection[id: %s] - async connecting. Associated Snowflake domain: %s', this.getId(), connectingDomain);

    // invalid callback
    Errors.checkArgumentValid(
      !Util.exists(callback) || Util.isFunction(callback),
      ErrorCodes.ERR_CONN_CONNECT_INVALID_CALLBACK);

    if (Util.isPrivateLink(connectionConfig.host)) {
      this.setupOcspPrivateLink(connectionConfig.host);
      Logger.getInstance().info('Connection[id: %s] - setting up private link', this.getId());
    }

    // connect to the snowflake service and provide our own callback so that
    // the connection can be passed in when invoking the connection.connect()
    // callback
    
    const self = this;

    if (connectionConfig.getClientStoreTemporaryCredential()) {
      Logger.getInstance().debug('Connection[id: %s] - storing temporary credential of client', this.getId());
      const key = Util.buildCredentialCacheKey(connectionConfig.host,
        connectionConfig.username, AuthenticationTypes.ID_TOKEN_AUTHENTICATOR);
      if (GlobalConfig.getCredentialManager() === null) {
        Logger.getInstance().debug('Connection[id: %s] - using default json credential manager', this.getId());
        GlobalConfig.setCustomCredentialManager(new JsonCredentialManager(connectionConfig.getCredentialCacheDir()));
      }
      Logger.getInstance().debug('Connection[id: %s] - reading idToken using credential manager', this.getId());
      connectionConfig.idToken = await GlobalConfig.getCredentialManager().read(key);
    }

    if (connectionConfig.getClientRequestMFAToken()) {
      Logger.getInstance().debug('Connection[id: %s] - extracting mfaToken of client', this.getId());
      const key = Util.buildCredentialCacheKey(connectionConfig.host,
        connectionConfig.username, AuthenticationTypes.USER_PWD_MFA_AUTHENTICATOR);
      if (GlobalConfig.getCredentialManager() === null) {
        Logger.getInstance().debug('Connection[id: %s] - using default json credential manager', this.getId());
        GlobalConfig.setCustomCredentialManager(new JsonCredentialManager(connectionConfig.getCredentialCacheDir()));
      }
      Logger.getInstance().debug('Connection[id: %s] - reading mfaToken using credential manager', this.getId());
      connectionConfig.mfaToken = await GlobalConfig.getCredentialManager().read(key);
    }
   
    // Get authenticator to use
    let auth;
    try {
      Logger.getInstance().debug('Connection[id: %s] - retrieving authenticator', this.getId());
      auth = Authenticator.getAuthenticator(connectionConfig, context.getHttpClient());
      services.sf.authenticator = auth;
    } catch (error) {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().error('Connection[id: %s] - failed to initialize authenticator. ' +
        'Connecting failed after %s milliseconds', this.getId(), connectingDuration);
      throw Errors.createClientError(ErrorCodes.ERR_CONN_CREATE_INVALID_AUTH_UNSUPPORTED, true);
    }

    try {
      Logger.getInstance().debug('Connection[id: %s] - initializing easyLogging', this.getId());
      await initEasyLogging(connectionConfig.clientConfigFile);
    } catch (err) {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().error('Connection[id: %s] - failed to initialize easyLogging. ' +
          'Connecting failed after %s milliseconds', this.getId(), connectingDuration);
      throw Errors.createClientError(ErrorCodes.ERR_CONN_CONNECT_INVALID_CLIENT_CONFIG, true);
    }

    let body = null;
    try {
      Logger.getInstance().debug('Connection[id: %s] - using authentication type: %s', this.getId(), connectionConfig.getAuthenticator());

      Logger.getInstance().debug('Connection[id: %s] - trying to authenticate', this.getId());
      await auth.authenticate(connectionConfig.getAuthenticator(),
        connectionConfig.getServiceName(),
        connectionConfig.account,
        connectionConfig.username);

      Logger.getInstance().info('Connection[id: %s] - authentication successful using: %s', this.getId(), connectionConfig.getAuthenticator());

      // JSON for connection
      body = Authenticator.formAuthJSON(connectionConfig.getAuthenticator(),
        connectionConfig.account,
        connectionConfig.username,
        connectionConfig.getClientType(),
        connectionConfig.getClientVersion(),
        connectionConfig.getClientEnvironment());
    
      // Update JSON body with the authentication values
      auth.updateBody(body);
    } catch (authErr) {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().info('Connection[id: %s] - failed to connect async after %s milliseconds.' +
          'Failed during authentication. Error: %s', this.getId(), connectingDuration, authErr);

      Logger.getInstance().error('Connection[id: %s] - failed during authentication. Error: %s', this.getId(), authErr);
      callback(authErr);
      return this;
    }

    try {
      // Request connection
      Logger.getInstance().debug('Connection[id: %s] - connecting through service', this.getId());
      services.sf.connect({
        callback: connectCallback(self, callback),
        json: body,
      });
      // return the connection to facilitate chaining
      const connectingDuration = timer.getDuration();
      Logger.getInstance().info('Connection[id: %s] - connected successfully after %s milliseconds', this.getId(), connectingDuration);

    } catch (callbackErr) {
      const connectingDuration = timer.getDuration();
      Logger.getInstance().info('Connection[id: %s] - failed to connect async after %s milliseconds.' +
          'Error: Unexpected error from calling connectCallback function in snowflake service - %s', this.getId(), connectingDuration, callbackErr);
      callback(callbackErr);
      return this;
    }

    return this;
  };

  /**
   * Executes a statement.
   *
   * @param {Object} options
   *
   * @returns {Object}
   */
  this.execute = function (options) {
    Logger.getInstance().trace('Connection[id: %s] - execute called with options.', this.getId());
    return Statement.createStatementPreExec(
      options, services, connectionConfig);
  };

  /**
   * Fetches the result of a previously issued statement.
   *
   * @param {Object} options
   *
   * @returns {Object}
   */
  this.fetchResult = function (options) {
    Logger.getInstance().trace('Connection[id: %s] - fetchResult called with options', this.getId());
    return Statement.createStatementPostExec(
      options, services, connectionConfig);
  };

  /**
   * Immediately terminates the connection without waiting for currently
   * executing statements to complete.
   *
   * @param {Function} callback
   *
   * @returns {Object} the connection object.
   */
  this.destroy = function (callback) {
    // invalid callback
    Logger.getInstance().trace('Connection[id: %s] - destroy called', this.getId());
    Errors.checkArgumentValid(
      !Util.exists(callback) || Util.isFunction(callback),
      ErrorCodes.ERR_CONN_DESTROY_INVALID_CALLBACK);

    // log out of the snowflake service and provide our own callback so that
    // the connection can be passed in when invoking the connection.destroy()
    // callback
    Logger.getInstance().trace('Connection[id: %s] - destroying through service', this.getId());
    const self = this;
    services.sf.destroy(
      {
        callback: function (err) {
          if (Util.exists(self.keepalive)) {
            clearInterval(self.keepalive);
            Logger.getInstance().trace('Connection[id: %s] - keepAlive interval cleared', self.getId());
          }

          if (Util.isFunction(callback)) {
            callback(Errors.externalize(err), self);
          }
        }
      });

    Logger.getInstance().trace('Connection[id: %s] - connection destroyed successfully', this.getId());
    // return the connection to facilitate chaining
    return this;
  };

  /**
   * Gets the response containing the status of the query based on queryId.
   *
   * @param {String} queryId
   *
   * @returns {Object} the query response
   */
  async function getQueryResponse(queryId) {
    Logger.getInstance().trace('Connection[id: %s] - requested query response for Query[id: %s]', id, queryId);
    // Check if queryId exists and is valid uuid
    Errors.checkArgumentExists(Util.exists(queryId),
      ErrorCodes.ERR_CONN_FETCH_RESULT_MISSING_QUERY_ID);
    Errors.checkArgumentValid(queryIdRegex.test(queryId),
      ErrorCodes.ERR_GET_RESPONSE_QUERY_INVALID_UUID, queryId);
    Logger.getInstance().debug('Connection[id: %s] - Query[id: %s] is valid', id, queryId);

    // Form the request options
    const options =
    {
      method: 'GET',
      url: Url.format(
        {
          pathname: `/monitoring/queries/${queryId}`
        }),
    };

    Logger.getInstance().debug('Connection[id: %s] - fetching query response for Query[id: %s]', id, queryId);
    const timer = new ExecutionTimer().start();
    // Get the response containing the query status
    const response = await services.sf.requestAsync(options);
    const fetchingDuration = timer.getDuration();
    Logger.getInstance().debug('Connection[id: %s] - query response for Query[id: %s] fetched successfully after: %s milliseconds', id, queryId, fetchingDuration);

    return response['data'];
  }

  /**
   * Extracts the status of the query from the query response.
   *
   * @param {Object} queryResponse
   *
   * @returns {String} the query status.
   */
  function extractQueryStatus(queryResponse) {
    const queries = queryResponse['data']['queries'];
    let status = QueryStatus.code.NO_QUERY_DATA; // default status
    if ( queries.length > 0) {
      status =  queries[0]['status'];
    }

    Logger.getInstance().trace('Connection[id: %s] - Extracted query status: %s', status);
    return status;
  }

  /**
   * Gets the status of the query based on queryId.
   *
   * @param {String} queryId
   *
   * @returns {String} the query status.
   */
  this.getQueryStatus = async function (queryId) {
    Logger.getInstance().trace('Connection[id: %s] - getQueryStatus called for Query[id: %s]', this.getId(), queryId);
    return extractQueryStatus(await getQueryResponse(queryId));
  };

  /**
   * Gets the status of the query based on queryId and throws if there's an error.
   *
   * @param {String} queryId
   *
   * @returns {String} the query status.
   */
  this.getQueryStatusThrowIfError = async function (queryId) {
    Logger.getInstance().trace('Connection[id: %s] - getQueryStatusThrowIfError called for Query[id: %s]', this.getId(), queryId);
    const response = await getQueryResponse(queryId);
    const status =  extractQueryStatus(response);
    let sqlState = null;

    if (this.isAnError(status) ) {
      let message = response['message'] || '';
      const code = response['code'] || -1;

      if (response['data']) {
        message += response['data']['queries'].length > 0 ? response['data']['queries'][0]['errorMessage'] : '';
        sqlState = response['data']['sqlState'];
      }

      Logger.getInstance().debug('Connection[id: %s] - query error for Query[id: %s]. Error: %s. SQLState: %s', this.getId(), queryId, message, sqlState);
      throw Errors.createOperationFailedError(
        code, response, message, sqlState);
    }

    return status;
  };

  /**
   * Gets the results from a previously ran query based on queryId
   *
   * @param {Object} options
   *
   * @returns {Object}
   */
  this.getResultsFromQueryId = async function (options) {
    const queryId = options.queryId;
    Logger.getInstance().trace('Connection[id: %s] - getResultsFromQueryId called for Query[id: %s].', this.getId(), queryId);

    let status, noDataCounter = 0, retryPatternPos = 0;

    // Wait until query has finished executing
    let queryStillExecuting = true;
    while (queryStillExecuting) {
      Logger.getInstance().trace('Connection[id: %s] - checking if Query[id: %s] is still executing. Retries with no data count: %d', this.getId(), queryId, noDataCounter);
      // Check if query is still running.
      // Trigger exception if it failed or there is no query data in the server.
      status = await this.getQueryStatusThrowIfError(queryId);
      queryStillExecuting = this.isStillRunning(status);
      if (!queryStillExecuting || status === QueryStatus.code.NO_QUERY_DATA) {
        Logger.getInstance().trace('Connection[id: %s] - end of waiting for Query[id: %s] to finish executing. ' +
            queryStillExecuting ? 'Query is no longer executing. ' : '' +
            'Query status: %s.', this.getId(), queryId, status);
        break;
      }

      // Timeout based on query status retry rules
      await new Promise((resolve) => {
        setTimeout(() => resolve(), asyncRetryInMilliseconds * asyncRetryPattern[retryPatternPos]);
      });

      // If no data, increment the no data counter
      if (QueryStatus.code[status] === QueryStatus.code.NO_DATA) {
        noDataCounter++;
        Logger.getInstance().trace('Connection[id: %s] - no data returned for Query[id: %s]. Retries with no data count: %d', this.getId(), queryId, noDataCounter);
        // Check if retry for no data is exceeded
        if (noDataCounter > asyncNoDataMaxRetry) {
          Logger.getInstance().error('Connection[id: %s] - no data returned for Query[id: %s]. Retry limit: %s reached.', this.getId(), queryId, asyncNoDataMaxRetry);
          throw Errors.createClientError(
            ErrorCodes.ERR_GET_RESULTS_QUERY_ID_NO_DATA, true, queryId);
        }
      }

      if (retryPatternPos < asyncRetryPattern.length - 1) {
        retryPatternPos++;
      }
    }

    if (QueryStatus.code[status] === QueryStatus.code.NO_QUERY_DATA) {
      Logger.getInstance().error('Connection[id: %s] - Query[id: %s] did not succeed. Final status: %s', this.getId(), queryId, status);
      throw Errors.createClientError(
        ErrorCodes.ERR_GET_RESULTS_QUERY_ID_NO_DATA, true, queryId, status);
    }

    if (QueryStatus.code[status] !== QueryStatus.code.SUCCESS) {
      Logger.getInstance().error('Connection[id: %s] - Query[id: %s] did not succeed. Final status: %s', this.getId(), queryId, status);
      throw Errors.createClientError(
        ErrorCodes.ERR_GET_RESULTS_QUERY_ID_NOT_SUCCESS_STATUS, true, queryId, status);
    }

    Logger.getInstance().debug('Connection[id: %s] - Query[id: %s] succeeded. Fetching the result.', this.getId(), queryId);
    return this.fetchResult(options);
  };

  /**
   * Checks whether the given status is currently running.
   *
   * @param {String} status
   *
   * @returns {Boolean}
   */
  this.isStillRunning = function (status) {
    Logger.getInstance().trace('Connection[id: %s] - checking if status %s is still running', this.getId(), status);
    return QueryStatus.runningStatuses.includes(QueryStatus.code[status]);
  };

  /**
   * Checks whether the given status means that there has been an error.
   *
   * @param {String} status
   *
   * @returns {Boolean}
   */
  this.isAnError = function (status) {
    return QueryStatus.errorStatuses.includes(QueryStatus.code[status]);
  };

  /**
   * Returns a serialized version of this connection.
   *
   * @returns {String}
   */
  this.serialize = function () {
    Logger.getInstance().trace('Connection[id: %s] - serialize called', this.getId());
    return JSON.stringify(context.getConfig());
  };

  EventEmitter.call(this);
}

Util.inherits(Connection, EventEmitter);

module.exports = Connection;
