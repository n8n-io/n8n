// Licensed to the Software Freedom Conservancy (SFC) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The SFC licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

'use strict'

/**
 * @fileoverview Defines WebDriver's logging system. The logging system is
 * broken into major components: local and remote logging.
 *
 * The local logging API, which is anchored by the {@linkplain Logger} class is
 * similar to Java's logging API. Loggers, retrieved by
 * {@linkplain #getLogger getLogger(name)}, use hierarchical, dot-delimited
 * namespaces (e.g. "" > "webdriver" > "webdriver.logging"). Recorded log
 * messages are represented by the {@linkplain Entry} class. You can capture log
 * records by {@linkplain Logger#addHandler attaching} a handler function to the
 * desired logger. For convenience, you can quickly enable logging to the
 * console by simply calling {@linkplain #installConsoleHandler
 * installConsoleHandler}.
 *
 * The [remote logging API](https://github.com/SeleniumHQ/selenium/wiki/Logging)
 * allows you to retrieve logs from a remote WebDriver server. This API uses the
 * {@link Preferences} class to define desired log levels prior to creating
 * a WebDriver session:
 *
 *     var prefs = new logging.Preferences();
 *     prefs.setLevel(logging.Type.BROWSER, logging.Level.DEBUG);
 *
 *     var caps = Capabilities.chrome();
 *     caps.setLoggingPrefs(prefs);
 *     // ...
 *
 * Remote log entries, also represented by the {@link Entry} class, may be
 * retrieved via {@link webdriver.WebDriver.Logs}:
 *
 *     driver.manage().logs().get(logging.Type.BROWSER)
 *         .then(function(entries) {
 *            entries.forEach(function(entry) {
 *              console.log('[%s] %s', entry.level.name, entry.message);
 *            });
 *         });
 *
 * **NOTE:** Only a few browsers support the remote logging API (notably
 * Firefox and Chrome). Firefox supports basic logging functionality, while
 * Chrome exposes robust
 * [performance logging](https://chromedriver.chromium.org/logging)
 * options. Remote logging is still considered a non-standard feature, and the
 * APIs exposed by this module for it are non-frozen. This module will be
 * updated, possibly breaking backwards-compatibility, once logging is
 * officially defined by the
 * [W3C WebDriver spec](http://www.w3.org/TR/webdriver/).
 */

/**
 * Defines a message level that may be used to control logging output.
 *
 * @final
 */
class Level {
  /**
   * @param {string} name the level's name.
   * @param {number} level the level's numeric value.
   */
  constructor(name, level) {
    if (level < 0) {
      throw new TypeError('Level must be >= 0')
    }

    /** @private {string} */
    this.name_ = name

    /** @private {number} */
    this.value_ = level
  }

  /** This logger's name. */
  get name() {
    return this.name_
  }

  /** The numeric log level. */
  get value() {
    return this.value_
  }

  /** @override */
  toString() {
    return this.name
  }
}

/**
 * Indicates no log messages should be recorded.
 * @const
 */
Level.OFF = new Level('OFF', Infinity)

/**
 * Log messages with a level of `1000` or higher.
 * @const
 */
Level.SEVERE = new Level('SEVERE', 1000)

/**
 * Log messages with a level of `900` or higher.
 * @const
 */
Level.WARNING = new Level('WARNING', 900)

/**
 * Log messages with a level of `800` or higher.
 * @const
 */
Level.INFO = new Level('INFO', 800)

/**
 * Log messages with a level of `700` or higher.
 * @const
 */
Level.DEBUG = new Level('DEBUG', 700)

/**
 * Log messages with a level of `500` or higher.
 * @const
 */
Level.FINE = new Level('FINE', 500)

/**
 * Log messages with a level of `400` or higher.
 * @const
 */
Level.FINER = new Level('FINER', 400)

/**
 * Log messages with a level of `300` or higher.
 * @const
 */
Level.FINEST = new Level('FINEST', 300)

/**
 * Indicates all log messages should be recorded.
 * @const
 */
Level.ALL = new Level('ALL', 0)

const ALL_LEVELS = /** !Set<Level> */ new Set([
  Level.OFF,
  Level.SEVERE,
  Level.WARNING,
  Level.INFO,
  Level.DEBUG,
  Level.FINE,
  Level.FINER,
  Level.FINEST,
  Level.ALL,
])

const LEVELS_BY_NAME = /** !Map<string, !Level> */ new Map([
  [Level.OFF.name, Level.OFF],
  [Level.SEVERE.name, Level.SEVERE],
  [Level.WARNING.name, Level.WARNING],
  [Level.INFO.name, Level.INFO],
  [Level.DEBUG.name, Level.DEBUG],
  [Level.FINE.name, Level.FINE],
  [Level.FINER.name, Level.FINER],
  [Level.FINEST.name, Level.FINEST],
  [Level.ALL.name, Level.ALL],
])

/**
 * Converts a level name or value to a {@link Level} value. If the name/value
 * is not recognized, {@link Level.ALL} will be returned.
 *
 * @param {(number|string)} nameOrValue The log level name, or value, to
 *     convert.
 * @return {!Level} The converted level.
 */
function getLevel(nameOrValue) {
  if (typeof nameOrValue === 'string') {
    return LEVELS_BY_NAME.get(nameOrValue) || Level.ALL
  }
  if (typeof nameOrValue !== 'number') {
    throw new TypeError('not a string or number')
  }
  for (let level of ALL_LEVELS) {
    if (nameOrValue >= level.value) {
      return level
    }
  }
  return Level.ALL
}

/**
 * Describes a single log entry.
 *
 * @final
 */
class Entry {
  /**
   * @param {(!Level|string|number)} level The entry level.
   * @param {string} message The log message.
   * @param {number=} opt_timestamp The time this entry was generated, in
   *     milliseconds since 0:00:00, January 1, 1970 UTC. If omitted, the
   *     current time will be used.
   * @param {string=} opt_type The log type, if known.
   */
  constructor(level, message, opt_timestamp, opt_type) {
    this.level = level instanceof Level ? level : getLevel(level)
    this.message = message
    this.timestamp = typeof opt_timestamp === 'number' ? opt_timestamp : Date.now()
    this.type = opt_type || ''
  }

  /**
   * @return {{level: string, message: string, timestamp: number,
   *           type: string}} The JSON representation of this entry.
   */
  toJSON() {
    return {
      level: this.level.name,
      message: this.message,
      timestamp: this.timestamp,
      type: this.type,
    }
  }
}

/**
 * An object used to log debugging messages. Loggers use a hierarchical,
 * dot-separated naming scheme. For instance, "foo" is considered the parent of
 * the "foo.bar" and an ancestor of "foo.bar.baz".
 *
 * Each logger may be assigned a {@linkplain #setLevel log level}, which
 * controls which level of messages will be reported to the
 * {@linkplain #addHandler handlers} attached to this instance. If a log level
 * is not explicitly set on a logger, it will inherit its parent.
 *
 * This class should never be directly instantiated. Instead, users should
 * obtain logger references using the {@linkplain ./logging.getLogger()
 * getLogger()} function.
 *
 * @final
 */
class Logger {
  /**
   * @param {string} name the name of this logger.
   * @param {Level=} opt_level the initial level for this logger.
   */
  constructor(name, opt_level) {
    /** @private {string} */
    this.name_ = name

    /** @private {Level} */
    this.level_ = opt_level || null

    /** @private {Logger} */
    this.parent_ = null

    /** @private {Set<function(!Entry)>} */
    this.handlers_ = null
  }

  /** @return {string} the name of this logger. */
  getName() {
    return this.name_
  }

  /**
   * @param {Level} level the new level for this logger, or `null` if the logger
   *     should inherit its level from its parent logger.
   */
  setLevel(level) {
    this.level_ = level
  }

  /** @return {Level} the log level for this logger. */
  getLevel() {
    return this.level_
  }

  /**
   * @return {!Level} the effective level for this logger.
   */
  getEffectiveLevel() {
    let logger = this
    let level
    do {
      level = logger.level_
      logger = logger.parent_
    } while (logger && !level)
    return level || Level.OFF
  }

  /**
   * @param {!Level} level the level to check.
   * @return {boolean} whether messages recorded at the given level are loggable
   *     by this instance.
   */
  isLoggable(level) {
    return level.value !== Level.OFF.value && level.value >= this.getEffectiveLevel().value
  }

  /**
   * Adds a handler to this logger. The handler will be invoked for each message
   * logged with this instance, or any of its descendants.
   *
   * @param {function(!Entry)} handler the handler to add.
   */
  addHandler(handler) {
    if (!this.handlers_) {
      this.handlers_ = new Set()
    }
    this.handlers_.add(handler)
  }

  /**
   * Removes a handler from this logger.
   *
   * @param {function(!Entry)} handler the handler to remove.
   * @return {boolean} whether a handler was successfully removed.
   */
  removeHandler(handler) {
    if (!this.handlers_) {
      return false
    }
    return this.handlers_.delete(handler)
  }

  /**
   * Logs a message at the given level. The message may be defined as a string
   * or as a function that will return the message. If a function is provided,
   * it will only be invoked if this logger's
   * {@linkplain #getEffectiveLevel() effective log level} includes the given
   * `level`.
   *
   * @param {!Level} level the level at which to log the message.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  log(level, loggable) {
    if (!this.isLoggable(level)) {
      return
    }
    let message = '[' + this.name_ + '] ' + (typeof loggable === 'function' ? loggable() : loggable)
    let entry = new Entry(level, message, Date.now())
    for (let logger = this; logger; logger = logger.parent_) {
      if (logger.handlers_) {
        for (let handler of logger.handlers_) {
          handler(entry)
        }
      }
    }
  }

  /**
   * Logs a message at the {@link Level.SEVERE} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  severe(loggable) {
    this.log(Level.SEVERE, loggable)
  }

  /**
   * Logs a message at the {@link Level.WARNING} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  warning(loggable) {
    this.log(Level.WARNING, loggable)
  }

  /**
   * Logs a message at the {@link Level.INFO} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  info(loggable) {
    this.log(Level.INFO, loggable)
  }

  /**
   * Logs a message at the {@link Level.DEBUG} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  debug(loggable) {
    this.log(Level.DEBUG, loggable)
  }

  /**
   * Logs a message at the {@link Level.FINE} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  fine(loggable) {
    this.log(Level.FINE, loggable)
  }

  /**
   * Logs a message at the {@link Level.FINER} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  finer(loggable) {
    this.log(Level.FINER, loggable)
  }

  /**
   * Logs a message at the {@link Level.FINEST} log level.
   * @param {(string|function(): string)} loggable the message to log, or a
   *     function that will return the message.
   */
  finest(loggable) {
    this.log(Level.FINEST, loggable)
  }
}

/**
 * Maintains a collection of loggers.
 *
 * @final
 */
class LogManager {
  constructor() {
    /** @private {!Map<string, !Logger>} */
    this.loggers_ = new Map()
    this.root_ = new Logger('', Level.OFF)
  }

  /**
   * Retrieves a named logger, creating it in the process. This function will
   * implicitly create the requested logger, and any of its parents, if they
   * do not yet exist.
   *
   * @param {string} name the logger's name.
   * @return {!Logger} the requested logger.
   */
  getLogger(name) {
    if (!name) {
      return this.root_
    }
    let parent = this.root_
    for (let i = name.indexOf('.'); i != -1; i = name.indexOf('.', i + 1)) {
      let parentName = name.substr(0, i)
      parent = this.createLogger_(parentName, parent)
    }
    return this.createLogger_(name, parent)
  }

  /**
   * Creates a new logger.
   *
   * @param {string} name the logger's name.
   * @param {!Logger} parent the logger's parent.
   * @return {!Logger} the new logger.
   * @private
   */
  createLogger_(name, parent) {
    if (this.loggers_.has(name)) {
      return /** @type {!Logger} */ (this.loggers_.get(name))
    }
    let logger = new Logger(name, null)
    logger.parent_ = parent
    this.loggers_.set(name, logger)
    return logger
  }
}

const logManager = new LogManager()

/**
 * Retrieves a named logger, creating it in the process. This function will
 * implicitly create the requested logger, and any of its parents, if they
 * do not yet exist.
 *
 * The log level will be unspecified for newly created loggers. Use
 * {@link Logger#setLevel(level)} to explicitly set a level.
 *
 * @param {string} name the logger's name.
 * @return {!Logger} the requested logger.
 */
function getLogger(name) {
  return logManager.getLogger(name)
}

/**
 * Pads a number to ensure it has a minimum of two digits.
 *
 * @param {number} n the number to be padded.
 * @return {string} the padded number.
 */
function pad(n) {
  if (n >= 10) {
    return '' + n
  } else {
    return '0' + n
  }
}

/**
 * Logs all messages to the Console API.
 * @param {!Entry} entry the entry to log.
 */
function consoleHandler(entry) {
  if (typeof console === 'undefined' || !console) {
    return
  }

  var timestamp = new Date(entry.timestamp)
  var msg =
    '[' +
    timestamp.getUTCFullYear() +
    '-' +
    pad(timestamp.getUTCMonth() + 1) +
    '-' +
    pad(timestamp.getUTCDate()) +
    'T' +
    pad(timestamp.getUTCHours()) +
    ':' +
    pad(timestamp.getUTCMinutes()) +
    ':' +
    pad(timestamp.getUTCSeconds()) +
    'Z] ' +
    '[' +
    entry.level.name +
    '] ' +
    entry.message

  var level = entry.level.value
  if (level >= Level.SEVERE.value) {
    console.error(msg)
  } else if (level >= Level.WARNING.value) {
    console.warn(msg)
  } else {
    console.log(msg)
  }
}

/**
 * Adds the console handler to the given logger. The console handler will log
 * all messages using the JavaScript Console API.
 *
 * @param {Logger=} opt_logger The logger to add the handler to; defaults
 *     to the root logger.
 */
function addConsoleHandler(opt_logger) {
  let logger = opt_logger || logManager.root_
  logger.addHandler(consoleHandler)
}

/**
 * Removes the console log handler from the given logger.
 *
 * @param {Logger=} opt_logger The logger to remove the handler from; defaults
 *     to the root logger.
 * @see exports.addConsoleHandler
 */
function removeConsoleHandler(opt_logger) {
  let logger = opt_logger || logManager.root_
  logger.removeHandler(consoleHandler)
}

/**
 * Installs the console log handler on the root logger.
 */
function installConsoleHandler() {
  addConsoleHandler(logManager.root_)
}

/**
 * Common log types.
 * @enum {string}
 */
const Type = {
  /** Logs originating from the browser. */
  BROWSER: 'browser',
  /** Logs from a WebDriver client. */
  CLIENT: 'client',
  /** Logs from a WebDriver implementation. */
  DRIVER: 'driver',
  /** Logs related to performance. */
  PERFORMANCE: 'performance',
  /** Logs from the remote server. */
  SERVER: 'server',
}

/**
 * Describes the log preferences for a WebDriver session.
 *
 * @final
 */
class Preferences {
  constructor() {
    /** @private {!Map<string, !Level>} */
    this.prefs_ = new Map()
  }

  /**
   * Sets the desired logging level for a particular log type.
   * @param {(string|Type)} type The log type.
   * @param {(!Level|string|number)} level The desired log level.
   * @throws {TypeError} if `type` is not a `string`.
   */
  setLevel(type, level) {
    if (typeof type !== 'string') {
      throw TypeError('specified log type is not a string: ' + typeof type)
    }
    this.prefs_.set(type, level instanceof Level ? level : getLevel(level))
  }

  /**
   * Converts this instance to its JSON representation.
   * @return {!Object<string, string>} The JSON representation of this set of
   *     preferences.
   */
  toJSON() {
    let json = {}
    for (let key of this.prefs_.keys()) {
      json[key] = this.prefs_.get(key).name
    }
    return json
  }
}

// PUBLIC API

module.exports = {
  Entry: Entry,
  Level: Level,
  LogManager: LogManager,
  Logger: Logger,
  Preferences: Preferences,
  Type: Type,
  addConsoleHandler: addConsoleHandler,
  getLevel: getLevel,
  getLogger: getLogger,
  installConsoleHandler: installConsoleHandler,
  removeConsoleHandler: removeConsoleHandler,
}
