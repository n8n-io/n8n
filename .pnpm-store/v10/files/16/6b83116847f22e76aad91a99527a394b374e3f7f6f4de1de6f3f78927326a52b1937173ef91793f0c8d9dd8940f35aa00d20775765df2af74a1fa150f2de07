const Util = require('../util');
const request = require('browser-request');
const Base = require('./base');
const Logger = require('../logger');

/**
 * Creates a client that can be used to make requests in the browser.
 *
 * @param {ConnectionConfig} connectionConfig
 * @constructor
 */
function BrowserHttpClient(connectionConfig) {
  Logger.getInstance().trace('Initializing BrowserHttpClient with Connection Config[%s]',
    connectionConfig.describeIdentityAttributes());
  Base.apply(this, [connectionConfig]);
}

Util.inherits(BrowserHttpClient, Base);

/**
 * @inheritDoc
 */
BrowserHttpClient.prototype.getRequestModule = function () {
  return request;
};

module.exports = BrowserHttpClient;