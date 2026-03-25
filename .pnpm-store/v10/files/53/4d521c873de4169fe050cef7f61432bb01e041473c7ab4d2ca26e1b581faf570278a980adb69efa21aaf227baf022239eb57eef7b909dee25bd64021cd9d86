/**
 * winston.js: Top-level include defining Winston.
 *
 * (C) 2010 Charlie Robbins
 * MIT LICENCE
 */

'use strict';

const logform = require('logform');
const { warn } = require('./winston/common');

/**
 * Expose version. Use `require` method for `webpack` support.
 * @type {string}
 */
exports.version = require('../package.json').version;
/**
 * Include transports defined by default by winston
 * @type {Array}
 */
exports.transports = require('./winston/transports');
/**
 * Expose utility methods
 * @type {Object}
 */
exports.config = require('./winston/config');
/**
 * Hoist format-related functionality from logform.
 * @type {Object}
 */
exports.addColors = logform.levels;
/**
 * Hoist format-related functionality from logform.
 * @type {Object}
 */
exports.format = logform.format;
/**
 * Expose core Logging-related prototypes.
 * @type {function}
 */
exports.createLogger = require('./winston/create-logger');
/**
 * Expose core Logging-related prototypes.
 * @type {function}
 */
exports.Logger = require('./winston/logger');
/**
 * Expose core Logging-related prototypes.
 * @type {Object}
 */
exports.ExceptionHandler = require('./winston/exception-handler');
/**
 * Expose core Logging-related prototypes.
 * @type {Object}
 */
exports.RejectionHandler = require('./winston/rejection-handler');
/**
 * Expose core Logging-related prototypes.
 * @type {Container}
 */
exports.Container = require('./winston/container');
/**
 * Expose core Logging-related prototypes.
 * @type {Object}
 */
exports.Transport = require('winston-transport');
/**
 * We create and expose a default `Container` to `winston.loggers` so that the
 * programmer may manage multiple `winston.Logger` instances without any
 * additional overhead.
 * @example
 *   // some-file1.js
 *   const logger = require('winston').loggers.get('something');
 *
 *   // some-file2.js
 *   const logger = require('winston').loggers.get('something');
 */
exports.loggers = new exports.Container();

/**
 * We create and expose a 'defaultLogger' so that the programmer may do the
 * following without the need to create an instance of winston.Logger directly:
 * @example
 *   const winston = require('winston');
 *   winston.log('info', 'some message');
 *   winston.error('some error');
 */
const defaultLogger = exports.createLogger();

// Pass through the target methods onto `winston.
Object.keys(exports.config.npm.levels)
  .concat([
    'log',
    'query',
    'stream',
    'add',
    'remove',
    'clear',
    'profile',
    'startTimer',
    'handleExceptions',
    'unhandleExceptions',
    'handleRejections',
    'unhandleRejections',
    'configure',
    'child'
  ])
  .forEach(
    method => (exports[method] = (...args) => defaultLogger[method](...args))
  );

/**
 * Define getter / setter for the default logger level which need to be exposed
 * by winston.
 * @type {string}
 */
Object.defineProperty(exports, 'level', {
  get() {
    return defaultLogger.level;
  },
  set(val) {
    defaultLogger.level = val;
  }
});

/**
 * Define getter for `exceptions` which replaces `handleExceptions` and
 * `unhandleExceptions`.
 * @type {Object}
 */
Object.defineProperty(exports, 'exceptions', {
  get() {
    return defaultLogger.exceptions;
  }
});

/**
 * Define getter for `rejections` which replaces `handleRejections` and
 * `unhandleRejections`.
 * @type {Object}
 */
Object.defineProperty(exports, 'rejections', {
  get() {
    return defaultLogger.rejections;
  }
});

/**
 * Define getters / setters for appropriate properties of the default logger
 * which need to be exposed by winston.
 * @type {Logger}
 */
['exitOnError'].forEach(prop => {
  Object.defineProperty(exports, prop, {
    get() {
      return defaultLogger[prop];
    },
    set(val) {
      defaultLogger[prop] = val;
    }
  });
});

/**
 * The default transports and exceptionHandlers for the default winston logger.
 * @type {Object}
 */
Object.defineProperty(exports, 'default', {
  get() {
    return {
      exceptionHandlers: defaultLogger.exceptionHandlers,
      rejectionHandlers: defaultLogger.rejectionHandlers,
      transports: defaultLogger.transports
    };
  }
});

// Have friendlier breakage notices for properties that were exposed by default
// on winston < 3.0.
warn.deprecated(exports, 'setLevels');
warn.forFunctions(exports, 'useFormat', ['cli']);
warn.forProperties(exports, 'useFormat', ['padLevels', 'stripColors']);
warn.forFunctions(exports, 'deprecated', [
  'addRewriter',
  'addFilter',
  'clone',
  'extend'
]);
warn.forProperties(exports, 'deprecated', ['emitErrs', 'levelLength']);

