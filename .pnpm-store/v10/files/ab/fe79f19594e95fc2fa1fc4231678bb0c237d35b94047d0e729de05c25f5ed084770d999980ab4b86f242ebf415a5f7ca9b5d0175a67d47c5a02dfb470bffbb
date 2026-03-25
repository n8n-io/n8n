/*
  SnowflakeService state machine

  Preconnected - enter()      - Preconnected
               - connect()    - Connecting
               - request()    - Connecting
               - destroy()    - Preconnected

  Connecting   - enter()      - async operation
                                - Connected if operation succeeds
                                - Disconnected if network error (we need another PreConnected state)
                                - Disconnected if operation fails
                 connect()    - error
                 request()    - enqueue
                 destroy()    - enqueue

  Connected    - enter()      - Connected
                 connect()    - error
                 request()    - async operation
                                - Connected if operation succeeds
                                - Connected if network error
                                - Renewing if GS says session token has expired
                                - Disconnected if GS says session token is invalid
                 destroy()    - async operation
                              - Disconnected if operation succeeds
                              - Connected if network error
                              - Connected if operation fails

  Renewing     - enter()      - async operation
                                - Connected if operation succeeds
                                - Connected if network error
                                - Disconnected if operation fails
               - connect()    - error
               - request()    - enqueue
               - destroy()    - enqueue

  Disconnected - enter()      - Disconnected
               - connect()    - Disconnected
               - request()    - Disconnected
               - destroy()    - Disconnected
 */

const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events').EventEmitter;
const Util = require('../util');
const Errors = require('../errors');
const ErrorCodes = Errors.codes;
const Url = require('url');
const QueryString = require('querystring');
const Parameters = require('../parameters');
const GSErrors = require('../constants/gs_errors');
const QueryContextCache = require('../queryContextCache');
const Logger = require('../logger');
const GlobalConfig = require('../global_config');
const AuthenticationTypes  = require('../authentication/authentication_types');
const AuthOkta = require('../authentication/auth_okta');
const AuthKeypair = require('../authentication/auth_keypair');
const Authenticator = require('../authentication/authentication');
const sfParams = require('../constants/sf_params');

function isRetryableNetworkError(err) {
  // anything other than REVOKED error can be retryable.
  return !Object.prototype.hasOwnProperty.call(err, 'cause') ||
    err.cause === undefined ||
    !Object.prototype.hasOwnProperty.call(err.cause, 'code') ||
    (
      err.cause.code !== ErrorCodes.ERR_OCSP_REVOKED &&
      err.cause.code !== 'DEPTH_ZERO_SELF_SIGNED_CERT' &&
      err.cause.code !== 'CERT_HAS_EXPIRED' &&
      err.cause.code !== 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' &&
      err.cause.code !== 'SELF_SIGNED_CERT_IN_CHAIN'
    );
}

function isRetryableHttpError(err) {
  return Object.prototype.hasOwnProperty.call(err, 'response') &&
    Util.isRetryableHttpError(err.response, false);
}

/**
 * Creates a new SnowflakeService instance.
 *
 * @param {Object} connectionConfig
 * @param {Object} httpClient
 * @param {Object} [config]
 * @constructor
 */
function SnowflakeService(connectionConfig, httpClient, config) {
  // validate input
  Errors.assertInternal(Util.isObject(connectionConfig));
  Errors.assertInternal(Util.isObject(httpClient));
  Errors.assertInternal(!Util.exists(config) || Util.isObject(config));

  // if a config object was specified, verify
  // that it has all the information we need
  let tokenInfoConfig;
  if (Util.exists(config)) {
    Errors.assertInternal(Util.isObject(config));
    Errors.assertInternal(Util.isObject(config.tokenInfo));

    tokenInfoConfig = config.tokenInfo;
  } else if (connectionConfig.sessionToken) {
    tokenInfoConfig = {
      sessionToken: connectionConfig.sessionToken,
      masterToken: connectionConfig.masterToken || connectionConfig.sessionToken,
      sessionTokenExpirationTime: connectionConfig.sessionTokenExpirationTime || Date.now() + 1000 * 60 * 60 * 24,
      masterTokenExpirationTime: connectionConfig.masterTokenExpirationTime || Date.now() + 1000 * 60 * 60 * 24
    };
  }

  // create a new TokenInfo instance
  const tokenInfo = new TokenInfo(tokenInfoConfig);
  try {
    Logger.getInstance().debug('Retrieving authenticator');
    this.authenticator = Authenticator.getAuthenticator(connectionConfig, httpClient);
  } catch (error) {
    const message = `Failed to initialize authenticator: ${error}`;
    Logger.getInstance().error(message);
    throw Errors.createClientError(ErrorCodes.ERR_CONN_CREATE_INVALID_AUTH_UNSUPPORTED, true, message);
  }

  // create state objects for all the different states we can be in
  const stateOptions =
    {
      snowflakeService: this,
      httpClient: httpClient,
      connectionConfig: connectionConfig,
      tokenInfo: tokenInfo
    };
  const statePristine = new StatePristine(stateOptions);
  const stateConnecting = new StateConnecting(stateOptions);
  const stateConnected = new StateConnected(stateOptions);
  const stateRenewing = new StateRenewing(stateOptions);
  const stateDisconnected = new StateDisconnected(stateOptions);

  let currentState;

  /**
   * Transitions to a given state.
   *
   * @param {Object} state
   * @param {Object} [transitionContext]
   */
  const transitionTo = function (state, transitionContext) {
    // this check is necessary to make sure we don't re-enter a transient state
    // like Renewing when we're already in it
    if (currentState !== state) {
      // if we have a current state, exit it; the null check is necessary
      // because the currentState is undefined at bootstrap time when we
      // transition to the first state
      if (currentState) {
        currentState.exit();
      }

      // update the current state
      currentState = state;

      // enter the new state
      currentState.enter(transitionContext);
    }
  };

  /**
   * Set the session id for the current SnowflakeService
   * @param sessionId
   */
  this.setSessionId = function (sessionId) {
    this.sessionId = sessionId;
  };

  /**
   * Get the session id.
   * @returns {number}
   */
  this.getSessionId = function () {
    return this.sessionId;
  };

  /**
   * Transitions to the Pristine state.
   *
   * {Object} [transitionContext]
   */
  this.transitionToPristine = function (transitionContext) {
    transitionTo(statePristine, transitionContext);
  };

  /**
   * Transitions to the Connecting state.
   *
   * {Object} [transitionContext]
   */
  this.transitionToConnecting = function (transitionContext) {
    transitionTo(stateConnecting, transitionContext);
  };

  /**
   * Transitions to the Connected state.
   *
   * {Object} [transitionContext]
   */
  this.transitionToConnected = function (transitionContext) {
    transitionTo(stateConnected, transitionContext);
  };

  /**
   * Transitions to the Renewing state.
   *
   * {Object} [transitionContext]
   */
  this.transitionToRenewing = function (transitionContext) {
    transitionTo(stateRenewing, transitionContext);
  };

  /**
   * Transitions to the Disconnected state.
   *
   * {Object} [transitionContext]
   */
  this.transitionToDisconnected = function (transitionContext) {
    transitionTo(stateDisconnected, transitionContext);

    // clear the tokens because we're in a fatal state and we don't want the
    // tokens to be available via getConfig() anymore
    tokenInfo.clearTokens();
  };

  /**
   * Returns a configuration object that can be passed to the SnowflakeService
   * constructor to get an equivalent SnowflakeService object.
   *
   * @returns {Object}
   */
  this.getConfig = function () {
    return {
      tokenInfo: tokenInfo.getConfig()
    };
  };

  /**
   * Establishes a connection to Snowflake.
   *
   * @param {Object} options
   */
  this.connect = function (options) {
    new OperationConnect(options).validate().execute();
  };

  /**
   * Issues a connect-continue request to Snowflake.
   *
   * @param {Object} [options]
   */
  this.continue = function (options) {
    new OperationContinue(options).validate().execute();
  };

  /**
   * Issues a generic request to Snowflake.
   *
   * @param {Object} options
   */
  this.request = function (options) {
    new OperationRequest(options).validate().execute();
  };

  /**
   * Issues a generic async request to Snowflake.
   *
   * @param {Object} options
   */
  this.requestAsync = async function (options) {
    return await new OperationRequest(options).validate().executeAsync();
  };

  /**
   * Terminates the current connection to Snowflake.
   *
   * @param {Object} options
   */
  this.destroy = function (options) {
    this.clearCache();
    new OperationDestroy(options).validate().execute();
  };

  /**
   * Creates a new OperationAbstract.
   *
   * @param {Object} options
   * @constructor
   */
  function OperationAbstract(options) {
    this.options = options;
  }

  /**
   * Validates the operation options.
   *
   * @returns {Object} the operation.
   */
  OperationAbstract.prototype.validate = function () {
    return this;
  };

  /**
   * Executes the operation.
   */
  OperationAbstract.prototype.execute = function () {
  };

  /**
   * Creates a new OperationConnect.
   *
   * @param {Object} options
   * @constructor
   */
  function OperationConnect(options) {
    OperationAbstract.apply(this, [options]);
  }

  Util.inherits(OperationConnect, OperationAbstract);

  /**
   * @inheritDoc
   */
  OperationConnect.prototype.validate = function () {
    // verify that the options object contains a callback function
    const options = this.options;
    Errors.assertInternal(
      (Util.isObject(options) && Util.isFunction(options.callback)));

    return this;
  };

  /**
   * @inheritDoc
   */
  OperationConnect.prototype.execute = function () {
    currentState.connect(this.options);
  };

  /**
   * Creates a new OperationContinue.
   *
   * @param {Object} options
   * @constructor
   */
  function OperationContinue(options) {
    OperationAbstract.apply(this, [options]);
  }

  Util.inherits(OperationContinue, OperationAbstract);

  /**
   * @inheritDoc
   */
  OperationContinue.prototype.validate = function () {
    // verify that the options contain a json object
    const options = this.options;
    Errors.assertInternal(
      Util.isObject(options) && Util.isObject(options.json));

    return this;
  };

  /**
   * @inheritDoc
   */
  OperationContinue.prototype.execute = function () {
    currentState.continue(this.options);
  };

  /**
   * Creates a new OperationRequest.
   *
   * @param {Object} options
   * @constructor
   */
  function OperationRequest(options) {
    OperationAbstract.apply(this, [options]);
  }

  Util.inherits(OperationRequest, OperationAbstract);

  /**
   * @inheritDoc
   */
  OperationRequest.prototype.validate = function () {
    // verify that the options object contains all the necessary information
    const options = this.options;
    Errors.assertInternal(Util.isObject(options));
    Errors.assertInternal(Util.isString(options.method));
    Errors.assertInternal(
      !Util.exists(options.headers) || Util.isObject(options.headers));
    Errors.assertInternal(Util.isString(options.url));
    Errors.assertInternal(
      !Util.exists(options.json) || Util.isObject(options.json));

    return this;
  };

  /**
   * @inheritDoc
   */
  OperationRequest.prototype.execute = function () {
    currentState.request(this.options);
  };

  /**
  * @inheritDoc
  */
  OperationRequest.prototype.executeAsync = async function () {
    return await currentState.requestAsync(this.options);
  };

  /**
   * Creates a new OperationDestroy.
   *
   * @param {Object} options
   * @constructor
   */
  function OperationDestroy(options) {
    OperationAbstract.apply(this, [options]);
  }

  Util.inherits(OperationDestroy, OperationAbstract);

  /**
   * @inheritDoc
   */
  OperationDestroy.prototype.validate = function () {
    // verify that the options object contains a callback function
    const options = this.options;
    Errors.assertInternal(Util.isObject(options) &&
      Util.isFunction(options.callback));

    return this;
  };

  /**
   * @inheritDoc
   */
  OperationDestroy.prototype.execute = function () {
    // delegate to current state
    currentState.destroy(this.options);
  };

  /* All queued operations will be added to this array */
  const operationQueue = [];

  /**
   * Appends a request operation to the queue.
   *
   * @param {Object} options
   */
  this.enqueueRequest = function (options) {
    operationQueue.push(new OperationRequest(options));
  };

  /**
   * Appends a destroy operation to the queue.
   *
   * @param {Object} options
   */
  this.enqueueDestroy = function (options) {
    operationQueue.push(new OperationDestroy(options));
  };

  /**
   * Executes all the operations in the queue.
   */
  this.drainOperationQueue = function () {
    // execute all the operations in the queue
    for (let index = 0, length = operationQueue.length; index < length; index++) {
      operationQueue[index].execute();
    }

    // empty the queue
    operationQueue.length = 0;
  };

  this.isConnected = function () {
    return currentState === stateConnected ||
      currentState === stateConnecting ||
      currentState === stateRenewing;
  };

  this.getServiceName = function () {
    return Parameters.getValue(Parameters.names.SERVICE_NAME);
  };

  this.getClientSessionKeepAlive = function () {
    return Parameters.getValue(Parameters.names.CLIENT_SESSION_KEEP_ALIVE);
  };

  this.getClientSessionKeepAliveHeartbeatFrequency = function () {
    return Parameters.getValue(Parameters.names.CLIENT_SESSION_KEEP_ALIVE_HEARTBEAT_FREQUENCY);
  };

  this.getJsTreatIntegerAsBigInt = function () {
    return Parameters.getValue(Parameters.names.JS_TREAT_INTEGER_AS_BIGINT);
  };

  this.getAuthenticator = function () {
    return this.authenticator;
  };

  // if we don't have any tokens, start out as pristine
  if (tokenInfo.isEmpty()) {
    this.transitionToPristine();
  } else {
    // we're already connected
    this.transitionToConnected();
  }

  /**
  * Issues a post request to Snowflake.
  *
  * @param {Object} options
  */
  this.postAsync = function (options) {
    return new OperationRequest(options).validate().executeAsync();
  };

  this.getQueryContextDTO = function () {
    if (!this.qcc){
      return;
    }
    return this.qcc.getQueryContextDTO();
  };

  this.deserializeQueryContext = function (data) {
    if (!this.qcc){
      return;
    }
    this.qcc.deserializeQueryContext(data);
  };

  this.clearCache = function () {
    if (!this.qcc){
      return;
    }
    this.qcc.clearCache(); 
  };

  this.initializeQueryContextCache = function (size) {
    if (!connectionConfig.getDisableQueryContextCache()){
      this.qcc = new QueryContextCache(size, this.getSessionId());
    } else {
      Logger.getInstance().debug(`QueryContextCache initialization skipped as it is disabled for connection with sessionId: ${this.sessionId}`);
    }
  };

  // testing purpose
  this.getQueryContextCacheSize = function () {
    if (!this.qcc){
      return;
    }
    return this.qcc.getSize();
  };
}

Util.inherits(SnowflakeService, EventEmitter);

module.exports = SnowflakeService;


///////////////////////////////////////////////////////////////////////////
////                StateAbstract                                      ////
///////////////////////////////////////////////////////////////////////////

/**
 * Creates a new StateAbstract instance.
 *
 * @param {Object} options
 * @constructor
 */
function StateAbstract(options) {
  /**
   * Issues an http request to Snowflake.
   *
   * @param {Object} requestOptions
   * @param {Object} httpClient
   * @param {Object} auth
   * @returns {Object} the http request object.
   */
  function sendHttpRequest(requestOptions, httpClient, auth) {

    const params = requestOptions.params || {};
    if (!requestOptions.excludeGuid) {
      addGuidToParams(params);
    }

    const realRequestOptions =
      {
        method: requestOptions.method,
        headers: requestOptions.headers,
        url: requestOptions.absoluteUrl,
        gzip: requestOptions.gzip,
        json: requestOptions.json,
        params: params,
        callback: async function (err, response, body) {
          // if we got an error, wrap it into a network error
          if (err) {
            // if we're running in DEBUG loglevel, probably we want to see the full error instead
            Logger.getInstance().debug('Encountered an error when sending the request. Details: '
                + JSON.stringify(err, Object.getOwnPropertyNames(err)));

            err = Errors.createNetworkError(
              ErrorCodes.ERR_SF_NETWORK_COULD_NOT_CONNECT, err);
          } else if (!response) {
            // empty response
            err = Errors.createUnexpectedContentError(
              ErrorCodes.ERR_SF_RESPONSE_NOT_JSON, '(EMPTY)');
          } else if (Object.prototype.hasOwnProperty.call(response, 'statusCode') &&
            response.statusCode !== 200) {
            // if we didn't get a 200, the request failed
            if (response.statusCode === 401 && response.body) {
              let innerCode;
              try {
                innerCode = JSON.parse(response.body).code;
              } catch (e) {
                err = Errors.createRequestFailedError(
                  ErrorCodes.ERR_SF_RESPONSE_FAILURE, response);
                Logger.getInstance().debug('HTTP Error: %s', response.statusCode);
              }
              if (innerCode === '390104') {
                err = Errors.createRequestFailedError(
                  ErrorCodes.ERR_SF_RESPONSE_INVALID_TOKEN, response);
                Logger.getInstance().debug('HTTP Error: %s', response.statusCode);
              } else {
                err = Errors.createRequestFailedError(
                  ErrorCodes.ERR_SF_RESPONSE_FAILURE, response);
                Logger.getInstance().debug('HTTP Error: %s', response.statusCode);
              }
            } else {
              err = Errors.createRequestFailedError(
                ErrorCodes.ERR_SF_RESPONSE_FAILURE, response);
              Logger.getInstance().debug('HTTP Error: %s', response.statusCode);
            }
          } else {
            // if the response body is a non-empty string and the response is
            // supposed to contain json, try to json-parse the body
            if (Util.isString(body) &&
              response.getResponseHeader('Content-Type') ===
              'application/json') {
              try {
                if (body.includes('smkId')) {
                  body = Util.convertSmkIdToString(body);
                }
                body = JSON.parse(body);
              } catch (parseError) {
                // we expected to get json
                err = Errors.createUnexpectedContentError(
                  ErrorCodes.ERR_SF_RESPONSE_NOT_JSON, response.body);
              }
            }

            // if we were able to successfully json-parse the body and the
            // success flag is false, the operation we tried to perform failed
            if (body && !body.success) {
              const data = body.data;

              if (body.code === GSErrors.code.ID_TOKEN_INVALID && data.authnMethod === 'TOKEN' ||
                body.code === GSErrors.code.OAUTH_TOKEN_EXPIRED && data.authnMethod === 'OAUTH'
              ) {
                Logger.getInstance().debug('ID Token being used has expired. Reauthenticating');

                await auth.reauthenticate(requestOptions.json);
                return httpClient.request(realRequestOptions);
              }

              err = Errors.createOperationFailedError(
                body.code, data, body.message,
                data && data.sqlState ? data.sqlState : undefined);
            }
          }
          
          // if we have an error, clear the body
          if (err) {
            body = undefined;
          }

          // if a callback was specified, invoke it
          if (Util.isFunction(requestOptions.callback)) {
            await requestOptions.callback.apply(requestOptions.scope, [err, body]);
          }
        }
      };

    if (requestOptions.retry > 2) {
      const includesParam = requestOptions.url.includes('?');
      realRequestOptions.url += (includesParam ? '&' : '?');
      realRequestOptions.url +=
        ('clientStartTime=' + requestOptions.startTime
          + '&' + 'retryCount=' + (requestOptions.retry - 1));
    }

    return httpClient.request(realRequestOptions);
  }

  this.snowflakeService = options.snowflakeService;
  this.httpClient = options.httpClient;
  this.connectionConfig = options.connectionConfig;
  this.tokenInfo = options.tokenInfo;

  const connectionConfig = options.connectionConfig;
  const snowflakeService = options.snowflakeService;
  const httpClient = options.httpClient;

  ///////////////////////////////////////////////////////////////////////////
  ////                Request                                            ////
  ///////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new Request to Snowflake.
   *
   * @param {Object} requestOptions
   * @constructor
   */
  function Request(requestOptions) {
    this.requestOptions = requestOptions;
  }

  /**
  * Sends out the request.
  *
  * @returns {Object} the request that was issued.
  */
  Request.prototype.sendAsync = async function () {
    // pre-process the request options
    this.preprocessOptions(this.requestOptions);

    const params = this.requestOptions.params || {};
    if (!this.requestOptions.excludeGuid) {
      addGuidToParams(params);
    }
    const options =
    {
      method: this.requestOptions.method,
      headers: this.requestOptions.headers,
      url: this.requestOptions.absoluteUrl,
      json: this.requestOptions.json,
      params: params
    };

    // issue the async http request
    //TODO: this should be wrapped with the same operations, as in the synchronous send method's callback.
    return await httpClient.requestAsync(options);
  };

  function addGuidToParams(params) {
    // In case of repeated requests for the same request ID,
    // the Global UID is added for better traceability.
    const guid = uuidv4();
    params[sfParams.paramsNames.SF_REQUEST_GUID] = guid;
  }

  /**
   * Sends out the request.
   *
   * @returns {Object} the request that was issued.
   */
  Request.prototype.send = function () {
    // pre-process the request options
    this.preprocessOptions(this.requestOptions);

    // issue the http request
    sendHttpRequest(this.requestOptions, httpClient, snowflakeService.getAuthenticator());
  };

  /**
   * Pre-processes the request options just before the request is sent.
   *
   * @param {Object} requestOptions
   */
  Request.prototype.preprocessOptions = function (requestOptions) {
    // augment the headers with the default request headers
    requestOptions.headers =
      Util.apply(this.getDefaultReqHeaders(), requestOptions.headers || {});

    if (Util.isLoginRequest(requestOptions.url)) {
      Util.apply(requestOptions.headers, {
        'CLIENT_APP_VERSION': requestOptions.json.data.CLIENT_APP_VERSION,
        'CLIENT_APP_ID': requestOptions.json.data.CLIENT_APP_ID,
      });
    }

    // augment the options with the absolute url
    requestOptions.absoluteUrl = this.buildFullUrl(requestOptions.url);

    requestOptions.excludeGuid = !Util.exists(requestOptions.excludeGuid) ? false : requestOptions.excludeGuid;
  };

  /**
   * Converts a relative url to an absolute url.
   *
   * @param {String} relativeUrl
   *
   * @returns {String}
   */
  Request.prototype.buildFullUrl = function (relativeUrl) {
    return connectionConfig.accessUrl + relativeUrl;
  };

  /**
   * Returns the default headers to send with every request.
   *
   * @returns {Object}
   */
  Request.prototype.getDefaultReqHeaders = function () {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  };

  ///////////////////////////////////////////////////////////////////////////
  ////                SessionTokenRequest                                ////
  ///////////////////////////////////////////////////////////////////////////

  /**
   * @constructor
   */
  function SessionTokenRequest() {
    Request.apply(this, arguments);
  }

  Util.inherits(SessionTokenRequest, Request);

  /**
   * @inheritDoc
   */
  SessionTokenRequest.prototype.preprocessOptions = function (requestOptions) {
    // call super
    Request.prototype.preprocessOptions.apply(this, arguments);

    // add the current session token to the request headers
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers.Authorization =
      'Snowflake Token="' + options.tokenInfo.getSessionToken() + '"';
    if (Util.string.isNotNullOrEmpty(
      Parameters.getValue(Parameters.names.SERVICE_NAME))) {
      requestOptions.headers['X-Snowflake-Service'] =
        Parameters.getValue(Parameters.names.SERVICE_NAME);
    }
  };

  ///////////////////////////////////////////////////////////////////////////
  ////                MasterTokenRequest                                 ////
  ///////////////////////////////////////////////////////////////////////////

  /**
   * @constructor
   */
  function MasterTokenRequest() {
    Request.apply(this, arguments);
  }

  Util.inherits(MasterTokenRequest, Request);

  /**
   * @inheritDoc
   */
  MasterTokenRequest.prototype.preprocessOptions = function (requestOptions) {
    // call super
    Request.prototype.preprocessOptions.apply(this, arguments);

    // add the current master token to the request headers
    requestOptions.headers = requestOptions.headers || {};
    requestOptions.headers.Authorization =
      'Snowflake Token="' + options.tokenInfo.getMasterToken() + '"';
  };

  ///////////////////////////////////////////////////////////////////////////
  ////                UnauthenticatedRequest                             ////
  ///////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new UnauthenticatedRequest.
   *
   * @constructor
   */
  function UnauthenticatedRequest() {
    Request.apply(this, arguments);
  }

  Util.inherits(UnauthenticatedRequest, Request);

  /**
   * Creates a new SessionTokenRequest.
   *
   * @param {Object} requestOptions
   *
   * @returns {Object}
   */
  this.createSessionTokenRequest = function (requestOptions) {
    return new SessionTokenRequest(requestOptions);
  };

  /**
   * Creates a new MasterTokenRequest.
   *
   * @param {Object} requestOptions
   *
   * @returns {Object}
   */
  this.createMasterTokenRequest = function (requestOptions) {
    return new MasterTokenRequest(requestOptions);
  };

  /**
   * Creates a new UnauthenticatedRequest.
   *
   * @param {Object} requestOptions
   *
   * @returns {Object}
   */
  this.createUnauthenticatedRequest = function (requestOptions) {
    return new UnauthenticatedRequest(requestOptions);
  };
}

/**
 * Enters this state.
 * @abstract
 */
StateAbstract.prototype.enter = function () {
};

/**
 * Exits this state.
 * @abstract
 */
StateAbstract.prototype.exit = function () {
};

/**
 * Establishes a connection to Snowflake.
 *
 * @abstract
 */
StateAbstract.prototype.connect = function () {
};

/**
 * Issues a connect-continue request to Snowflake.
 *
 * @abstract
 */
StateAbstract.prototype.continue = function () {
};

/**
 * Issues a generic request to Snowflake.
 *
 * @abstract
 */
StateAbstract.prototype.request = function () {
};

/**
 * Terminates the current connection to Snowflake.
 *
 * @abstract
 */
StateAbstract.prototype.destroy = function () {
};

///////////////////////////////////////////////////////////////////////////
////                StatePristine                                      ////
///////////////////////////////////////////////////////////////////////////

function StatePristine() {
  StateAbstract.apply(this, arguments);
}

Util.inherits(StatePristine, StateAbstract);

/**
 * @inheritDoc
 */
StatePristine.prototype.connect = function (options) {
  // transition to the Connecting state with the callback in the transition
  // context
  this.snowflakeService.transitionToConnecting(
    {
      options: options
    });
};

/**
 * @inheritDoc
 */
StatePristine.prototype.request = function (options) {
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_REQUEST_STATUS_PRISTINE));
  });
};

/**
 * @inheritDoc
 */
StatePristine.prototype.destroy = function (options) {
  // we're still in the preconnected state so any
  // attempts to destroy should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_DESTROY_STATUS_PRISTINE));
  });
};

///////////////////////////////////////////////////////////////////////////
////                StateConnecting                                    ////
///////////////////////////////////////////////////////////////////////////

function StateConnecting() {
  StateAbstract.apply(this, arguments);
}

Util.inherits(StateConnecting, StateAbstract);

/**
 * @inheritDoc
 */
StateConnecting.prototype.enter = function (context) {
  // save the context
  this.context = context;

  // initiate the connection process
  this.continue();
};

/**
 * @inheritDoc
 */
StateConnecting.prototype.exit = function () {
  // clear the context
  this.context = null;
};

/**
 * @inheritDoc
 */
StateConnecting.prototype.connect = function (options) {
  // we're already connecting so any attempts
  // to connect should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_CONNECT_STATUS_CONNECTING));
  });
};

/**
 * @inheritDoc
 */
StateConnecting.prototype.continue = function () {
  const context = this.context;
  const err = context.options.err;
  let json = context.options.json;
  
  // if no json was specified, treat this as the first connect
  // and get the necessary information from connectionConfig
  if (!json) {
    json =
      {
        data:
          {
            ACCOUNT_NAME: this.connectionConfig.account,
            LOGIN_NAME: this.connectionConfig.username,
            PASSWORD: this.connectionConfig.password
          }
      };
  }

  // extract the inflight context from the error and put it back in the json
  if (err && err.data && err.data.inFlightCtx) {
    json.inFlightCtx = err.data.inFlightCtx;
  }

  // initialize the json data if necessary
  json.data = json.data || {};

  // add the client-app-id, client-app-version, and client-app-name
  const clientInfo =
    {
      CLIENT_APP_ID: this.connectionConfig.getClientType(),
      CLIENT_APP_VERSION: this.connectionConfig.getClientVersion(),
    };

  // if we have some information about the client environment, add it as well
  const clientEnvironment = this.connectionConfig.getClientEnvironment();
  if (Util.isObject(clientEnvironment)) {
    clientInfo.CLIENT_ENVIRONMENT = clientEnvironment;
  }

  const clientApplication = this.connectionConfig.getClientApplication();
  if (Util.isString(clientApplication)) {
    clientEnvironment['APPLICATION'] = clientApplication;
  }

  const sessionParameters =
    {
      SESSION_PARAMETERS: {}
    };

  if (Util.exists(this.connectionConfig.getClientSessionKeepAlive())) {
    sessionParameters.SESSION_PARAMETERS.CLIENT_SESSION_KEEP_ALIVE =
      this.connectionConfig.getClientSessionKeepAlive();
  }

  if (Util.exists(this.connectionConfig.getClientSessionKeepAliveHeartbeatFrequency())) {
    sessionParameters.SESSION_PARAMETERS.CLIENT_SESSION_KEEP_ALIVE_HEARTBEAT_FREQUENCY =
      this.connectionConfig.getClientSessionKeepAliveHeartbeatFrequency();
  }

  if (Util.exists(this.connectionConfig.getJsTreatIntegerAsBigInt())) {
    sessionParameters.SESSION_PARAMETERS.JS_TREAT_INTEGER_AS_BIGINT =
      this.connectionConfig.getJsTreatIntegerAsBigInt();
  }

  if (Util.exists(this.connectionConfig.getGcsUseDownscopedCredential())) {
    sessionParameters.SESSION_PARAMETERS.GCS_USE_DOWNSCOPED_CREDENTIAL =
      this.connectionConfig.getGcsUseDownscopedCredential();
  }

  if (Util.exists(this.connectionConfig.getClientRequestMFAToken())) {
    sessionParameters.SESSION_PARAMETERS.CLIENT_REQUEST_MFA_TOKEN =
      this.connectionConfig.getClientRequestMFAToken();
  }

  if (Util.exists(this.connectionConfig.getClientStoreTemporaryCredential())) {
    sessionParameters.SESSION_PARAMETERS.CLIENT_STORE_TEMPORARY_CREDENTIAL =
      this.connectionConfig.getClientStoreTemporaryCredential();
  }

  Util.apply(json.data, clientInfo);
  Util.apply(json.data, sessionParameters);

  const connectionConfig = this.connectionConfig;
  const maxLoginRetries = connectionConfig.getRetrySfMaxLoginRetries();
  const maxRetryTimeout = connectionConfig.getRetryTimeout();
  const startTime = connectionConfig.accessUrl.startsWith('https://') ?
    Date.now() : 'FIXEDTIMESTAMP';
  let numRetries = 0;
  let sleep = connectionConfig.getRetrySfStartingSleepTime();
  let totalElapsedTime = 0;
  Logger.getInstance().debug('Total retryTimeout is for the retries = ' + maxRetryTimeout === 0 ? 
    'unlimited' : maxRetryTimeout);
  const parent = this;
  const requestCallback = async function (err, body) {
    // clear credential-related information
    connectionConfig.clearCredentials();

    // if the request succeeded
    if (!err) {
      Errors.assertInternal(Util.exists(body));
      Errors.assertInternal(Util.exists(body.data));

      parent.snowflakeService.setSessionId(body.data.sessionId);
      Logger.getInstance().debug(`New session with id ${parent.snowflakeService.getSessionId()} initialized`);
      
      // update the parameters
      Parameters.update(body.data.parameters);

      // update all token-related information
      parent.tokenInfo.update(body.data);

      if (connectionConfig.getClientRequestMFAToken() && body.data.mfaToken) {
        const key = Util.buildCredentialCacheKey(connectionConfig.host,
          connectionConfig.username, AuthenticationTypes.USER_PWD_MFA_AUTHENTICATOR);
        await GlobalConfig.getCredentialManager().write(key, body.data.mfaToken);
      }

      if (connectionConfig.getClientStoreTemporaryCredential() && body.data.idToken) {
        const key = Util.buildCredentialCacheKey(connectionConfig.host,
          connectionConfig.username, AuthenticationTypes.ID_TOKEN_AUTHENTICATOR);
        await GlobalConfig.getCredentialManager().write(key, body.data.idToken);
      }

      // we're now connected
      parent.snowflakeService.transitionToConnected();

      const qccSize = Parameters.getValue('QUERY_CONTEXT_CACHE_SIZE');
      parent.snowflakeService.initializeQueryContextCache(qccSize);
    } else {
      if (Errors.isNetworkError(err) || Errors.isRequestFailedError(err)) {
        if (numRetries < maxLoginRetries && (
          isRetryableNetworkError(err) || isRetryableHttpError(err)) &&
          (maxRetryTimeout === 0 || totalElapsedTime < maxRetryTimeout)) {
          numRetries++;
          const jitter = Util.getJitteredSleepTime(numRetries, sleep, totalElapsedTime, maxRetryTimeout);
          sleep = jitter.sleep;
          totalElapsedTime = jitter.totalElapsedTime;

          if (sleep <= 0) {
            Logger.getInstance().debug('Reached out to the max Login Timeout');
            parent.snowflakeService.transitionToDisconnected();
          }

          const auth = parent.snowflakeService.getAuthenticator();
          if (auth instanceof AuthOkta) {
            Logger.getInstance().debug('OKTA authentication requires token refresh.');
            const retryOption = {
              totalElapsedTime, 
              numRetries,
            };

            await auth.reauthenticate(context.options.json, retryOption);
            numRetries = retryOption.numRetries;
            totalElapsedTime = retryOption.totalElapsedTime;
            setTimeout(sendRequest, sleep * 1000);
            return;
          } else {
            if (auth instanceof AuthKeypair) {
              Logger.getInstance().debug('AuthKeyPair authentication requires token refresh.');
              await auth.reauthenticate(context.options.json);
            }
            setTimeout(sendRequest, sleep * 1000);
            return;
          }
        } else {
          Logger.getInstance().debug('Failed to all retries to SF.');
          // we're now disconnected
          parent.snowflakeService.transitionToDisconnected();
        }
      } else {
        // we're now disconnected
        parent.snowflakeService.transitionToDisconnected();
      }
    }

    // invoke the transition-context callback that was passed to us by the
    // Pristine state on connect()
    if (Util.isFunction(context.options.callback)) {
      context.options.callback(err);
    }

    // all queued operations are now free to go
    parent.snowflakeService.drainOperationQueue();
  };

  // issue a login request
  const sendRequest = function () {
    const targetUrl = buildLoginUrl(connectionConfig);
    Logger.getInstance().debug(
      'Contacting SF: %s, (%s/%s)', targetUrl, numRetries, maxLoginRetries);
    const request = parent.createUnauthenticatedRequest({
      method: 'POST',
      url: targetUrl,
      json: json,
      scope: this,
      startTime: startTime,
      retry: numRetries,
      callback: requestCallback
    });
    request.send();
  };
  sendRequest();
};

/**
 * Builds the url for a login request.
 *
 * @param connectionConfig
 *
 * @returns {*}
 */
function buildLoginUrl(connectionConfig) {
  const queryParams =
    [
      { name: 'warehouse', value: connectionConfig.getWarehouse() },
      { name: 'databaseName', value: connectionConfig.getDatabase() },
      { name: 'schemaName', value: connectionConfig.getSchema() },
      { name: 'roleName', value: connectionConfig.getRole() }
    ];

  const queryStringObject = {};
  if (!connectionConfig.isQaMode()) {
    // No requestId is attached to login-request in test mode.
    queryStringObject.requestId = uuidv4();
  }
  for (let index = 0, length = queryParams.length; index < length; index++) {
    const queryParam = queryParams[index];
    if (Util.string.isNotNullOrEmpty(queryParam.value)) {
      queryStringObject[queryParam.name] = queryParam.value;
    }
  }

  return Url.format(
    {
      pathname: '/session/v1/login-request',
      search: QueryString.stringify(queryStringObject)
    });
}

/**
 * @inheritDoc
 */
StateConnecting.prototype.request = function (options) {
  // enqueue the request operation
  this.snowflakeService.enqueueRequest(options);
};

/**
 * @inheritDoc
 */
StateConnecting.prototype.destroy = function (options) {
  // enqueue the destroy operation
  this.snowflakeService.enqueueDestroy(options);
};

///////////////////////////////////////////////////////////////////////////
////                StateConnected                                     ////
///////////////////////////////////////////////////////////////////////////

function StateConnected() {
  StateAbstract.apply(this, arguments);
}

Util.inherits(StateConnected, StateAbstract);

/**
 * @inheritDoc
 */
StateConnected.prototype.connect = function (options) {
  // we're already connected so any attempts
  // to connect should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_CONNECT_STATUS_CONNECTED));
  });
};

StateConnected.prototype.requestAsync = async function (options) {
  // create a session token request from the options and send out the request
  return await this.createSessionTokenRequest(options).sendAsync();
};

/**
 * @inheritDoc
 */
StateConnected.prototype.request = function (options) {
  const scopeOrig = options.scope;
  const callbackOrig = options.callback;

  // define our own scope and callback
  options.scope = this;
  options.callback = async function (err, body) {
    // if there was no error, invoke the callback if one was specified
    if (!err) {
      if (Util.isFunction(callbackOrig)) {
        await callbackOrig.apply(scopeOrig, [err, body]);
      }
    } else {
      // restore the original scope and callback to the options object because
      // we might need to repeat the request
      options.scope = scopeOrig;
      options.callback = callbackOrig;

      // if the session token has expired
      if (err.code === GSErrors.code.SESSION_TOKEN_EXPIRED) {
        // enqueue the request operation
        this.snowflakeService.enqueueRequest(options);

        // if a session token renewal isn't already in progress, issue a
        // request to renew the session token
        this.snowflakeService.transitionToRenewing();
      } else if ((err.code === GSErrors.code.SESSION_TOKEN_INVALID) ||
        (err.code === GSErrors.code.GONE_SESSION)) {
        // if the session token is invalid or it doesn't exist
        // enqueue the request operation
        this.snowflakeService.enqueueRequest(options);

        // we're disconnected
        this.snowflakeService.transitionToDisconnected();

        // all queued operations are now free to go
        this.snowflakeService.drainOperationQueue();

        // TODO: remember that a session renewal is no longer in progress
        // TODO: make sure the last session renewal did not time out
      } else {
        // it's a normal failure
        // if a callback was specified, invoke it
        if (Util.isFunction(callbackOrig)) {
          callbackOrig.apply(scopeOrig, [err, body]);
        }
      }
    }
  };

  // create a session token request from the options and send out the request
  this.createSessionTokenRequest(options).send();
};

/**
 * @inheritDoc
 */
StateConnected.prototype.destroy = function (options) {
  const requestID = uuidv4();

  // send out a session token request to terminate the current connection
  this.createSessionTokenRequest(
    {
      method: 'POST',
      url: `/session?delete=true&requestId=${requestID}`,
      scope: this,
      callback: function (err) {
        // if the destroy request succeeded or the session already expired, we're disconnected
        if (!err || err.code === GSErrors.code.GONE_SESSION || err.code === GSErrors.code.SESSION_TOKEN_EXPIRED) {
          err = undefined;
          this.snowflakeService.transitionToDisconnected();
        }

        // invoke the original callback
        options.callback(err);
      }
    }).send();
};

///////////////////////////////////////////////////////////////////////////
////                StateRenewing                                      ////
///////////////////////////////////////////////////////////////////////////

function StateRenewing() {
  StateAbstract.apply(this, arguments);
}

Util.inherits(StateRenewing, StateAbstract);

/**
 * @inheritDoc
 */
StateRenewing.prototype.enter = function () {
  // send out a master token request to renew the current session token
  this.createMasterTokenRequest(
    {
      method: 'POST',
      url: '/session/token-request',
      headers: {
        CLIENT_APP_ID: this.connectionConfig.getClientType(),
        CLIENT_APP_VERSION: this.connectionConfig.getClientVersion(),
      },
      json: {
        'REQUEST_TYPE': 'RENEW',
        'oldSessionToken': this.tokenInfo.getSessionToken(),
      },
      scope: this,
      callback: function (err, body) {
        // if the request succeeded
        if (!err) {
          // update the token information
          this.tokenInfo.update(body.data);

          // we're now connected again
          this.snowflakeService.transitionToConnected();
        } else {
          // if the master token has expired, transition to the disconnected
          // state
          if (err.code === GSErrors.code.MASTER_TOKEN_EXPIRED) {
            this.snowflakeService.transitionToDisconnected();
          } else if (Errors.isNetworkError(err)) {
            // go back to the connected state
            this.snowflakeService.transitionToConnected();
          } else {
            // if the renewal failed for some other reason, we're
            // disconnected
            // TODO: what should our state be here? also disconnected?
            this.snowflakeService.transitionToDisconnected();
          }
        }

        // all queued operations are now free to go
        this.snowflakeService.drainOperationQueue();
      }
    }).send();
};

/**
 * @inheritDoc
 */
StateRenewing.prototype.connect = function (options) {
  // we're renewing the session token, which means we're connected,
  // so any attempts to connect should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_CONNECT_STATUS_CONNECTED));
  });
};

/**
 * @inheritDoc
 */
StateRenewing.prototype.request = function (options) {
  // enqueue the request operation
  this.snowflakeService.enqueueRequest(options);
};

/**
 * @inheritDoc
 */
StateRenewing.prototype.destroy = function (options) {
  // enqueue the destroy operation
  this.snowflakeService.enqueueDestroy(options);
};

///////////////////////////////////////////////////////////////////////////
////                StateDisconnected                                  ////
///////////////////////////////////////////////////////////////////////////

function StateDisconnected() {
  StateAbstract.apply(this, arguments);
}

Util.inherits(StateDisconnected, StateAbstract);

/**
 * @inheritDoc
 */
StateDisconnected.prototype.connect = function (options) {
  // we're disconnected -- and fatally so -- so any
  // attempts to connect should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_CONNECT_STATUS_DISCONNECTED));
  });
};

/**
 * @inheritDoc
 */
StateDisconnected.prototype.request = function (options) {
  // we're disconnected, so any attempts to
  // send a request should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_REQUEST_STATUS_DISCONNECTED, true));
  });
};

/**
 * @inheritDoc
 */
StateDisconnected.prototype.destroy = function (options) {
  // we're already disconnected so any attempts
  // to destroy should result in an error
  const callback = options.callback;
  process.nextTick(function () {
    callback(Errors.createClientError(
      ErrorCodes.ERR_CONN_DESTROY_STATUS_DISCONNECTED));
  });
};

/**
 * Creates a TokenInfo object that encapsulates all token-related information,
 * e.g. the master token, the session token, the tokens' expiration times, etc.
 *
 * @param {Object} [config]
 *
 * @constructor
 */
function TokenInfo(config) {
  let masterToken;
  let sessionToken;
  let masterTokenExpirationTime;
  let sessionTokenExpirationTime;

  if (Util.isObject(config)) {
    masterToken = config.masterToken;
    sessionToken = config.sessionToken;
    masterTokenExpirationTime = config.masterTokenExpirationTime;
    sessionTokenExpirationTime = config.sessionTokenExpirationTime;
  }

  /**
   * Returns true if no token-related information is available, false otherwise.
   *
   * @returns {Boolean}
   */
  this.isEmpty = function () {
    return !Util.exists(masterToken) ||
      !Util.exists(masterTokenExpirationTime) ||
      !Util.exists(sessionToken) ||
      !Util.exists(sessionTokenExpirationTime);
  };

  /**
   * Clears all token-related information.
   */
  this.clearTokens = function () {
    masterToken = undefined;
    masterTokenExpirationTime = undefined;
    sessionToken = undefined;
    sessionTokenExpirationTime = undefined;
  };

  /**
   * Updates the tokens and their expiration times.
   *
   * @param {Object} data
   */
  this.update = function (data) {
    masterToken = data.masterToken;
    sessionToken = data.token || data.sessionToken;

    const currentTime = new Date().getTime();

    masterTokenExpirationTime = currentTime +
      1000 * (data.masterValidityInSeconds ||
        data.validityInSecondsMT);

    sessionTokenExpirationTime = currentTime +
      1000 * (data.validityInSeconds ||
        data.validityInSecondsST);
  };

  /**
   * Returns the master token.
   *
   * @returns {String}
   */
  this.getMasterToken = function () {
    return masterToken;
  };

  /**
   * Returns the expiration time of the master token.
   *
   * @returns {Number}
   */
  this.getMasterTokenExpirationTime = function () {
    return masterTokenExpirationTime;
  };

  /**
   * Returns the session token.
   *
   * @returns {String}
   */
  this.getSessionToken = function () {
    return sessionToken;
  };

  /**
   * Returns the expiration time of the session token.
   *
   * @returns {Number}
   */
  this.getSessionTokenExpirationTime = function () {
    return sessionTokenExpirationTime;
  };

  /**
   * Returns a configuration object that can be passed to the TokenInfo
   * constructor to get an equivalent TokenInfo object.
   *
   * @returns {Object}
   */
  this.getConfig = function () {
    return {
      masterToken: masterToken,
      masterTokenExpirationTime: masterTokenExpirationTime,
      sessionToken: sessionToken,
      sessionTokenExpirationTime: sessionTokenExpirationTime
    };
  };
}
