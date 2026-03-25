const Util = require('../util');
const Core = require('./core');

/**
 * Creates a new Logger instance for when we're running in the browser.
 *
 * @param {Object} [options]
 *
 * @constructor
 */
function Logger(options) {
  /**
   * The array to which all log messages will be added.
   *
   * @type {String[]}
   */
  const buffer = [];

  /**
   * Logs a message at a given level.
   *
   * @param {String} levelTag the tag associated with the level at which to log
   *   the message.
   * @param {String} message the message to log.
   * @param {Number} bufferMaxLength the maximum size to which the message
   *   buffer can grow.
   */
  const logMessage = function (levelTag, message, bufferMaxLength) {
    // add the log level tag (e.g. info, warn, etc.) to the front of the message
    message = Util.format('%s: %s', levelTag, message);

    // if the buffer is full, evict old messages
    while (buffer.length >= bufferMaxLength) {
      buffer.shift();
    }

    // add the new message to the buffer
    buffer.push(message);
  };

  // create an inner implementation to which all our methods will be forwarded
  const common = Core.createLogger(options, logMessage);

  /**
   * Configures this logger.
   *
   * @param {Object} options
   */
  this.configure = function (options) {
    common.configure(options);
  };

  /**
   * Returns the current log level.
   *
   * @returns {Number}
   */
  this.getLevel = function () {
    return common.getLevelNumber();
  };

  /**
   * Logs a given message at the error level.
   *
   * @param {String} message
   * @param params
   */
  this.error = function (message, ...params) {
    common.error.apply(common, [message, ...params]);
  };

  /**
   * Logs a given message at the warning level.
   *
   * @param {String} message
   * @param params
   */
  this.warn = function (message, ...params) {
    common.warn.apply(common, [message, ...params]);
  };

  /**
   * Logs a given message at the info level.
   *
   * @param {String} message
   * @param params
   */
  this.info = function (message, ...params) {
    common.info.apply(common, [message, ...params]);
  };

  /**
   * Logs a given message at the debug level.
   *
   * @param {String} message
   * @param params
   */
  this.debug = function (message, ...params) {
    common.debug.apply(common, [message, ...params]);
  };

  /**
   * Logs a given message at the trace level.
   *
   * @param {String} message
   * @param params
   */
  this.trace = function (message, ...params ) {
    common.trace.apply(common, [message, ...params]);
  };

  /**
   * Returns the log buffer.
   *
   * @returns {String[]}
   */
  this.getLogBuffer = function () {
    // return a copy of the buffer array; calling slice() shallow-copies the
    // original array, but that's sufficient in this case because the array
    // contains strings
    return buffer.slice();
  };
}

module.exports = Logger;