const moment = require('moment');
const Util = require('../util');
const Errors = require('../errors');
const SecretDetector = new (require('../secret_detector.js'))();

const LOG_LEVEL_OFF =
  {
    tag: 'OFF',
    level: -1
  };

const LOG_LEVEL_ERROR =
  {
    tag: 'ERROR',
    level: 0
  };

const LOG_LEVEL_WARN =
  {
    tag: 'WARN',
    level: 1
  };

const LOG_LEVEL_INFO =
  {
    tag: 'INFO',
    level: 2
  };

const LOG_LEVEL_DEBUG =
  {
    tag: 'DEBUG',
    level: 3
  };

const LOG_LEVEL_TRACE =
  {
    tag: 'TRACE',
    level: 4
  };

const LOG_LEVELS =
  [
    LOG_LEVEL_OFF,
    LOG_LEVEL_ERROR,
    LOG_LEVEL_WARN,
    LOG_LEVEL_INFO,
    LOG_LEVEL_DEBUG,
    LOG_LEVEL_TRACE
  ];

const LOG_LEVEL_TAGS = {
  OFF: LOG_LEVEL_OFF.tag,
  ERROR: LOG_LEVEL_ERROR.tag,
  WARN: LOG_LEVEL_WARN.tag,
  INFO: LOG_LEVEL_INFO.tag,
  DEBUG: LOG_LEVEL_DEBUG.tag,
  TRACE: LOG_LEVEL_TRACE.tag,
};
exports.LOG_LEVEL_TAGS = LOG_LEVEL_TAGS;

// create two maps, one in which the key is the log level and the value is the
// corresponding log level object, and another in which the key is the log tag
// and the value is the corresponding log level
const MAP_LOG_LEVEL_TO_OBJECT = {};
const MAP_LOG_TAG_TO_LEVEL = {};
for (let index = 0, length = LOG_LEVELS.length; index < length; index++) {
  const logLevelObject = LOG_LEVELS[index];
  MAP_LOG_LEVEL_TO_OBJECT[logLevelObject.level] = logLevelObject;
  MAP_LOG_TAG_TO_LEVEL[logLevelObject.tag] = logLevelObject.level;
}

const DEFAULT_BUFFER_MAX_LENGTH = 500;
const DEFAULT_MESSAGE_MAX_LENGTH = 500;
const DEFAULT_LEVEL = LOG_LEVEL_INFO;

/**
 * Creates a new Logger instance.
 *
 * @param options {Object}
 * @param logMessage {Function}
 * @param reconfigureOperation {Function} Action to perform to change log destination file
 *
 * @returns {Object}
 */
exports.createLogger = function (options, logMessage, reconfigureOperation) {
  // a log function must be specified
  Errors.assertInternal(Util.isFunction(logMessage));

  /**
   * Whether to include the current timestamp in the log message.
   */
  let includeTimestamp;

  /**
   * The maximum size (in terms of number of messages) to which the log buffer
   * can grow.
   *
   * @type {Number}
   */
  let bufferMaxLength;

  /**
   * The maximum message length. Longer messages will be truncated.
   *
   * @type {Number}
   */
  let messageMaxLength;

  /**
   * The current log level. Any message logged at a lower level won't be added
   * to the log buffer.
   *
   * @type {Object}
   */
  let currlevelObject;

  // create a new logger instance
  const logger = {
    /**
     * Configures this logger.
     *
     * @param {Object} options
     */
    configure: function (options) {
      let localIncludeTimestamp;
      let localBufferMaxLength;
      let localMessageMaxLength;
      let localLevel;
      let localFilePath;
      let localAdditionalLogToConsole;

      // if an options argument is specified
      if (Util.exists(options)) {
        // make sure it's an object
        Errors.assertInternal(Util.isObject(options));

        localIncludeTimestamp = options.includeTimestamp;
        localBufferMaxLength = options.bufferMaxLength;
        localMessageMaxLength = options.messageMaxLength;
        localLevel = options.level;
        localFilePath = options.filePath;
        localAdditionalLogToConsole = options.additionalLogToConsole;
      }

      // if an includeTimestamp options is specified, convert it to a boolean
      if (Util.exists(localIncludeTimestamp)) {
        includeTimestamp = !!localIncludeTimestamp;
      } else if (!Util.exists(includeTimestamp)) {
        // default to true
        includeTimestamp = true;
      }

      // if a bufferMaxLength option is specified, make sure
      // it's a positive integer before updating the logger option
      if (Util.exists(localBufferMaxLength)) {
        Errors.assertInternal(
          Util.number.isPositiveInteger(localBufferMaxLength));
        bufferMaxLength = localBufferMaxLength;
      } else if (!Util.exists(bufferMaxLength)) { // initialize logger option if configure() hasn't been called before
        bufferMaxLength = DEFAULT_BUFFER_MAX_LENGTH;
      }

      // if a messageMaxLength option is specified, make sure
      // it's a positive integer before updating the logger option
      if (Util.exists(localMessageMaxLength)) {
        Errors.assertInternal(
          Util.number.isPositiveInteger(localMessageMaxLength));
        messageMaxLength = localMessageMaxLength;
      } else if (!Util.exists(messageMaxLength)) { // initialize logger option if configure() hasn't been called before
        messageMaxLength = DEFAULT_MESSAGE_MAX_LENGTH;
      }

      // if a level option is specified, make sure
      // it's valid before updating the logger option
      if (Util.exists(localLevel)) {
        Errors.assertInternal(
          Object.prototype.hasOwnProperty.call(MAP_LOG_LEVEL_TO_OBJECT, localLevel));
        currlevelObject = MAP_LOG_LEVEL_TO_OBJECT[localLevel];
      } else if (!Util.exists(currlevelObject)) { // initialize logger option if configure() hasn't been called before
        currlevelObject = DEFAULT_LEVEL;
      }

      if (Util.isFunction(reconfigureOperation)) {
        reconfigureOperation(localFilePath, localAdditionalLogToConsole);
      }
    },

    /**
     * Logs a given message at the error level.
     *
     * @param {String} message
     */
    error: function (message) {
      log(LOG_LEVEL_ERROR, message, getMessageArgs(arguments));
    },

    /**
     * Logs a given message at the warn level.
     *
     * @param {String} message
     */
    warn: function (message) {
      log(LOG_LEVEL_WARN, message, getMessageArgs(arguments));
    },

    /**
     * Logs a given message at the info level.
     *
     * @param {String} message
     */
    info: function (message) {
      log(LOG_LEVEL_INFO, message, getMessageArgs(arguments));
    },

    /**
     * Logs a given message at the debug level.
     *
     * @param {String} message
     */
    debug: function (message) {
      log(LOG_LEVEL_DEBUG, message, getMessageArgs(arguments));
    },

    /**
     * Logs a given message at the trace level.
     *
     * @param {String} message
     */
    trace: function (message) {
      log(LOG_LEVEL_TRACE, message, getMessageArgs(arguments));
    },

    /**
     * Returns the log buffer.
     *
     * @returns {String[]}
     */
    getLogBuffer: function () {
      return [];
    },

    /**
     * Returns the level number associated with the current log level.
     *
     * @returns {Number}
     */
    getLevelNumber: function () {
      return currlevelObject.level;
    },

    /**
     * Returns the tag associated with the current log level.
     *
     * @returns {String}
     */
    getLevelTag: function () {
      return currlevelObject.tag;
    },

    /**
     * Returns a map in which the keys are the level tags and the values are the
     * corresponding log levels.
     *
     * @returns {Object}
     */
    getLevelTagsMap: function () {
      return MAP_LOG_TAG_TO_LEVEL;
    }
  };

  // configure the logger
  logger.configure(options);

  /**
   * Logs a message at a given level.
   *
   * @param {Object} targetLevelObject the level at which to log the message.
   * @param {String} message the message template.
   * @param {String[]} messageArgs any arguments to substitute into the message.
   */
  const log = function (targetLevelObject, message, messageArgs) {
    // the message should not be logged if the target
    // level is more verbose than the current level
    if (targetLevelObject.level <= currlevelObject.level) {
      // substitute the messageArgs into the message template
      messageArgs.unshift(message);
      message = Util.format.apply(Util, messageArgs);

      // truncate the message if it's too long
      if (message.length > messageMaxLength) {
        message = message.slice(0, messageMaxLength);
      }

      // if needed, add the current time to the front of the message
      if (includeTimestamp) {
        message = Util.format(
          '[%s]: %s', moment().format('h:mm:ss.SSS A'), message);
      }

      // mask secrets
      message = SecretDetector.maskSecrets(message).maskedtxt;

      // log the message
      logMessage(targetLevelObject.tag, message, bufferMaxLength);
    }
  };

  return logger;
};

exports.isValidLogTag = function (logTag) {
  if (!Util.isString(logTag)) {
    return false;
  }

  return (Object.prototype.hasOwnProperty.call(MAP_LOG_TAG_TO_LEVEL, logTag.toUpperCase()));

};

exports.logTagToLevel = function (logTag) {
  Errors.assertInternal(Util.isString(logTag));
  return MAP_LOG_TAG_TO_LEVEL[logTag.toUpperCase()];
};

/**
 * Helper method to extract the messageArgs from the arguments passed to
 * trace(), debug(), info(), warn() and error().
 *
 * @param {Object} args
 *
 * @returns {*}
 */
function getMessageArgs(args) {
  return Array.prototype.slice.call(args, 1);
}
