const core = require('./core');
const Util = require('./util');
const Errors = require('./errors');
const ErrorCodes = Errors.codes;

const clientEnvironment = process.versions;

// if we're not using the minimum supported version of node.js, raise an error
const minimumNodeVersion = '6.0.0';
if (Util.string.compareVersions(clientEnvironment.node, minimumNodeVersion) < 0) {
  throw Errors.createClientError(
    ErrorCodes.ERR_UNSUPPORTED_NODE_JS_VERSION, true, minimumNodeVersion);
}

module.exports = core(
  {
    httpClientClass: require('./http/node').NodeHttpClient,
    loggerClass: require('./logger/node'),
    client:
      {
        version: Util.driverVersion,
        name: Util.driverName,
        environment: clientEnvironment
      }
  });
