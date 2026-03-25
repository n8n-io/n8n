const Util = require('./util');
const Errors = require('./errors');
const ErrorCodes = Errors.codes;
const Connection = require('./connection/connection');
const ConnectionConfig = require('./connection/connection_config');
const ConnectionContext = require('./connection/connection_context');
const GenericPool = require('generic-pool');
const Logger = require('./logger');
const LoggerCore = require('./logger/core');
const DataTypes = require('./connection/result/data_types');
const GlobalConfig = require('./global_config');
const { loadConnectionConfiguration } = require('./configuration/connection_configuration');

/**
 * Creates a new instance of the Snowflake core module.
 *
 * @param {Object} options
 *
 * @returns {Object}
 * @constructor
 */
function Core(options) {
  // validate input
  Errors.assertInternal(Util.isObject(options));
  Errors.assertInternal(
    Util.exists(options.httpClient || options.httpClientClass));
  Errors.assertInternal(Util.exists(options.loggerClass));

  // set the logger instance
  Logger.setInstance(new (options.loggerClass)());
  Logger.getInstance().trace('Logger was initialized.');

  // if a connection class is specified, it must be an object or function
  let connectionClass = options.connectionClass;
  if (Util.exists(connectionClass)) {
    Errors.assertInternal(
      Util.isObject(connectionClass) || Util.isFunction(connectionClass));
    Logger.getInstance().debug('Connection class provided in driver core options will be used.');
  } else {
    // fall back to Connection
    connectionClass = Connection;
    Logger.getInstance().debug('Connection class was not overridden. Default connection class will be used.');
  }

  const qaMode = options.qaMode;
  const clientInfo = options.client;
  const ocspModes = GlobalConfig.ocspModes;

  /**
   * Creates a new Connection instance.
   *
   * @param {Object} connectionOptions
   * @param {Object} [config]
   *
   * @returns {Object}
   */
  const createConnection = function createConnection(connectionOptions, config) {
    // create a new ConnectionConfig and skip credential-validation if a config
    // object has been specified; this is because if a config object has been
    // specified, we're trying to deserialize a connection and the account name,
    // username and password don't need to be specified because the config
    // object already contains the tokens we need
    // Alternatively, if the connectionOptions includes token information then we will use that
    // instead of the username/password

    Logger.getInstance().info('Creating new connection object');

    if (connectionOptions == null) {
      Logger.getInstance().info('Connection options were not specified. Loading connection configuration.');
      try {
        connectionOptions = loadConnectionConfiguration();
      } catch ( error ) {
        Logger.getInstance().error('Unable to load the connection configuration. Error: %s',  error.message);
        Errors.checkArgumentExists(Util.exists(connectionOptions),
          ErrorCodes.ERR_CONN_CREATE_MISSING_OPTIONS);
      }
    }

    const validateCredentials = !config && (connectionOptions && !connectionOptions.sessionToken);

    const connectionConfig =
      new ConnectionConfig(connectionOptions, validateCredentials, qaMode, clientInfo);
    Logger.getInstance().debug('Connection configuration object created');

    // if an http client was specified in the options passed to the module, use
    // it, otherwise create a new HttpClient
    const httpClient = options.httpClient ||
      new options.httpClientClass(connectionConfig);
    Logger.getInstance().debug('HttpClient setup finished');


    const connection = new connectionClass(
      new ConnectionContext(connectionConfig, httpClient, config)
    );

    Logger.getInstance().info('Connection[id: %s] - connection object created successfully.', connection.getId());
    return connection;
  };

  const instance =
    {
      ocspModes: ocspModes,
      /**
       * Creates a connection object that can be used to communicate with
       * Snowflake.
       *
       * @param {Object} options
       *
       * @returns {Object}
       */
      createConnection: function (options) {
        return createConnection(options);
      },

      /**
      * Creates a connection pool for Snowflake connections
      *
      * @param {Object} connectionOptions
      * @param {Object} poolOptions
      *
      * @returns {Object}
      */
      createPool: function (connectionOptions, poolOptions) {
        return createPool(connectionOptions, poolOptions);
      },

      /**
       * Deserializes a serialized connection.
       *
       * @param {Object} options
       * @param {String} serializedConnection
       *
       * @returns {Object}
       */
      deserializeConnection: function (options, serializedConnection) {
        // check for missing serializedConfig
        Logger.getInstance().trace('Deserializing connection');

        Errors.checkArgumentExists(Util.exists(serializedConnection),
          ErrorCodes.ERR_CONN_DESERIALIZE_MISSING_CONFIG);

        // check for invalid serializedConfig
        Errors.checkArgumentValid(Util.isString(serializedConnection),
          ErrorCodes.ERR_CONN_DESERIALIZE_INVALID_CONFIG_TYPE);

        Logger.getInstance().debug('Deserializing connection from string object');

        // try to json-parse serializedConfig
        let config;
        try {
          config = JSON.parse(serializedConnection);
        } finally {
          // if serializedConfig can't be parsed to json, throw an error
          Errors.checkArgumentValid(Util.isObject(config),
            ErrorCodes.ERR_CONN_DESERIALIZE_INVALID_CONFIG_FORM);
        }
        Logger.getInstance().debug('Connection deserialized successfully');

        return createConnection(options, config);
      },

      /**
       * Serializes a given connection.
       *
       * @param {Object} connection
       *
       * @returns {String} a serialized version of the connection.
       */
      serializeConnection: function (connection) {
        Logger.getInstance().trace('Connection[id: %s] - serializing connection.', connection.getId());
        return connection ? connection.serialize() : connection;
      },

      /**
       * Configures this instance of the Snowflake core module.
       *
       * @param {Object} options
       */
      configure: function (options) {
        Logger.getInstance().debug('Configuring Snowflake core module.');
        const logLevel = extractLogLevel(options);
        const logFilePath = options.logFilePath;
        const additionalLogToConsole = options.additionalLogToConsole;

        if (logLevel != null || logFilePath) {
          Logger.getInstance().configure(
            {
              level: logLevel,
              filePath: logFilePath,
              additionalLogToConsole: additionalLogToConsole
            });
          Logger.getInstance().info('Configuring logger with level: %s, filePath: %s, additionalLogToConsole: %s', logLevel, logFilePath, additionalLogToConsole);
        }

        const disableOCSPChecks = options.disableOCSPChecks;
        if (Util.exists(disableOCSPChecks)) {
          // check that the specified value is a boolean
          Errors.checkArgumentValid(Util.isBoolean(disableOCSPChecks),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_DISABLE_OCSP_CHECKS);

          GlobalConfig.setDisableOCSPChecks(disableOCSPChecks);
          Logger.getInstance().debug('Setting disableOCSPChecks to value from core options: %s', disableOCSPChecks);
        }

        const ocspFailOpen = options.ocspFailOpen;
        if (Util.exists(ocspFailOpen)) {
          Errors.checkArgumentValid(Util.isBoolean(ocspFailOpen),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_OCSP_MODE);

          GlobalConfig.setOcspFailOpen(ocspFailOpen);
          Logger.getInstance().debug('Setting ocspFailOpen to value from core options: %s ', ocspFailOpen);
        }

        const jsonColumnVariantParser = options.jsonColumnVariantParser;
        if (Util.exists(jsonColumnVariantParser)) {
          Errors.checkArgumentValid(Util.isFunction(jsonColumnVariantParser),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_JSON_PARSER);

          GlobalConfig.setJsonColumnVariantParser(jsonColumnVariantParser);
          Logger.getInstance().debug('Setting JSON Column Variant Parser to value from core options');
        }

        const xmlColumnVariantParser = options.xmlColumnVariantParser;
        const xmlParserConfig = options.xmlParserConfig;
        if (Util.exists(xmlColumnVariantParser)) {
          Errors.checkArgumentValid(Util.isFunction(xmlColumnVariantParser),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_XML_PARSER);

          GlobalConfig.setXmlColumnVariantParser(xmlColumnVariantParser);
          Logger.getInstance().debug('Setting XML Column Variant Parser to value from core options');
        } else if (Util.exists(xmlParserConfig)) {
          GlobalConfig.createXmlColumnVariantParserWithParameters(xmlParserConfig);
          Logger.getInstance().debug('Creating XML Column Variant Parser with parameters from core options');
        }

        const keepAlive = options.keepAlive;
        if (Util.exists(keepAlive)) {
          Errors.checkArgumentValid(Util.isBoolean(keepAlive),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_KEEP_ALIVE);

          GlobalConfig.setKeepAlive(keepAlive);
          Logger.getInstance().debug('Setting keepAlive to value from core options: %s', keepAlive);
        }

        const useEnvProxy = options.useEnvProxy;
        if (Util.exists(useEnvProxy)) {
          Errors.checkArgumentValid(Util.isBoolean(useEnvProxy),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_USE_ENV_PROXY);

          GlobalConfig.setEnvProxy(useEnvProxy);
        }

        const customCredentialManager = options.customCredentialManager;
        if (Util.exists(customCredentialManager)) {
          Errors.checkArgumentValid(Util.isObject(customCredentialManager),
            ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_CUSTOM_CREDENTIAL_MANAGER);

          GlobalConfig.setCustomCredentialManager(customCredentialManager);
          Logger.getInstance().debug('Setting customCredentialManager to value from core options %s', customCredentialManager);
        }
      }
    };

  function extractLogLevel(options) {
    const logTag = options.logLevel;
    if (Util.exists(logTag)) {
      Errors.checkArgumentValid(LoggerCore.isValidLogTag(logTag),
        ErrorCodes.ERR_GLOBAL_CONFIGURE_INVALID_LOG_LEVEL);

      return LoggerCore.logTagToLevel(logTag);
    }
    return null;
  }

  // add some read-only constants
  const nativeTypeValues = DataTypes.NativeTypes.values;
  Object.defineProperties(instance,
    {
      STRING: { value: nativeTypeValues.STRING },
      BOOLEAN: { value: nativeTypeValues.BOOLEAN },
      NUMBER: { value: nativeTypeValues.NUMBER },
      DATE: { value: nativeTypeValues.DATE },
      OBJECT: { value: nativeTypeValues.OBJECT },
      ARRAY: { value: nativeTypeValues.ARRAY },
      MAP: { value: nativeTypeValues.MAP },
      JSON: { value: nativeTypeValues.JSON }
    });

  /**
  * Factory for Snowflake connections based on Generic Pool
  *
  * @param {Object} connectionOptions
  *
  * @returns {null}
  */
  function ConnectionFactory(connectionOptions) {
    /**
     * Creates a new connection instance.
     *
     * @returns {Object}
     */
    this.create = function () {
      Logger.getInstance().debug('Creating new connection from factory.');
      const connection = new createConnection(connectionOptions);

      return new Promise((resolve, reject) => {
        connection.connect(
          function (err, conn) {
            if (err) {
              Logger.getInstance().error('Connection[id: %s] - Unable to connect. Error: %s', conn.getId(), err.message);
              reject(new Error(err.message));
            } else {
              Logger.getInstance().debug('Connection[id: %s] - connected successfully. Callback called.', conn.getId());
              resolve(conn);
            }
          }
        );
      });
    };

    /**
    * Destroys the specified connection instance.
    *
    * @param {Object} connection
    *
    * @returns {Object}
    */
    this.destroy = function (connection) {
      Logger.getInstance().debug('Destroying connection instance.');
      return new Promise((resolve) => {
        connection.destroy(function (err, conn) {
          if (err) {
            Logger.getInstance().error('Connection[id: %s] - disconnecting failed with error: %s', conn.getId(), err.message);
          } else {
            Logger.getInstance().debug('Connection[id: %s] - connection disconnected successfully. Callback called.', conn.getId());
          }
          resolve();
        });
      });
    };

    /**
    * Returns the status of the connection.
    *
    * @param {Object} connection
    *
    * @returns {Boolean}
    */
    this.validate = async function (connection) {
      Logger.getInstance().debug('Connection[id: %s] - validating connection instance', connection.getId());
      return await connection.isValidAsync();
    };
  }

  /**
  * Creates a connection pool for Snowflake connections
  *
  * @param {Object} connectionOptions
  * @param {Object} poolOptions
  *
  * @returns {Object}
  */
  const createPool = function createPool(connectionOptions, poolOptions) {
    Logger.getInstance().info('Creating connection pool with provided options');

    const connectionPool = GenericPool.createPool(
      new ConnectionFactory(connectionOptions),
      poolOptions
    );
    Logger.getInstance().debug('Base for connection pool created');

    // avoid infinite loop if factory creation fails
    connectionPool.on('factoryCreateError', function (err) {
      Logger.getInstance().error('Connection pool factory creation failed: %s',  err.message);
      const clientResourceRequest = connectionPool._waitingClientsQueue.dequeue();
      if (clientResourceRequest) {
        clientResourceRequest.reject(err);
      }
    });

    Logger.getInstance().info('Connection pool object created successfully');

    return connectionPool;
  };

  return instance;
}

module.exports = Core;
