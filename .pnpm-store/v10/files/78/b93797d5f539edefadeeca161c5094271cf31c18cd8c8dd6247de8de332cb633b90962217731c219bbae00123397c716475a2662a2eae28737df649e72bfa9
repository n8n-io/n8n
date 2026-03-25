const Util = require('../util');
const Errors = require('../errors');
const SfService = require('../services/sf');
const LargeResultSetService = require('../services/large_result_set');
const Logger = require('../logger');

/**
 * Creates a new ConnectionContext.
 *
 * @param {ConnectionConfig} connectionConfig
 * @param {Object} httpClient
 * @param {Object} config
 *
 * @constructor
 */
function ConnectionContext(connectionConfig, httpClient, config) {
  // validate input
  Logger.getInstance().trace('Creating ConnectionContext object.');
  Errors.assertInternal(Util.isObject(connectionConfig));
  Errors.assertInternal(Util.isObject(httpClient));

  // if a config object was specified, verify
  // that it has all the information we need
  let sfServiceConfig;
  if (Util.exists(config)) {
    Logger.getInstance().trace('ConnectionContext - validating received config.');

    Errors.assertInternal(Util.isObject(config));
    Errors.assertInternal(Util.isObject(config.services));
    Errors.assertInternal(Util.isObject(config.services.sf));

    sfServiceConfig = config.services.sf;
  }
  Logger.getInstance().debug('ConnectionContext - received data was validated.');

  // create a map that contains all the services we'll be using
  const services =
    {
      sf: new SfService(connectionConfig, httpClient, sfServiceConfig),
      largeResultSet: new LargeResultSetService(connectionConfig, httpClient)
    };
  Logger.getInstance().debug('ConnectionContext - services were instantiated.');

  /**
   * Returns the ConnectionConfig for use by the connection.
   *
   * @returns {ConnectionConfig}
   */
  this.getConnectionConfig = function () {
    return connectionConfig;
  };

  /**
   * Returns a map that contains all the available services.
   *
   * @returns {Object}
   */
  this.getServices = function () {
    return services;
  };

  /**
   * Returns a configuration object that can be passed as an optional argument
   * to the ConnectionContext constructor to create a new object that has the
   * same state as this ConnectionContext instance.
   *
   * @returns {Object}
   */
  this.getConfig = function () {
    return {
      services:
        {
          sf: services.sf.getConfig()
        }
    };
  };
  /**
   * Returns instance of httpClient
   *
   * @returns {NodeHttpClient}
   */
  this.getHttpClient = function () {
    return httpClient;
  };
}

module.exports = ConnectionContext;