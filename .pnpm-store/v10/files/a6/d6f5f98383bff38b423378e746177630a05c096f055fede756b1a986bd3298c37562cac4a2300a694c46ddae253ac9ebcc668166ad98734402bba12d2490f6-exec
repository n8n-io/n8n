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

const { FilterBy } = require('./filterBy')
const { ConsoleLogEntry, JavascriptLogEntry, GenericLogEntry } = require('./logEntries')

const LOG = {
  TYPE_CONSOLE: 'console',
  TYPE_JS_LOGS: 'javascript',
  TYPE_JS_EXCEPTION: 'javascriptException',
  TYPE_LOGS: 'logs',
  TYPE_CONSOLE_FILTER: 'console_filter',
  TYPE_JS_LOGS_FILTER: 'javascript_filter',
  TYPE_JS_EXCEPTION_FILTER: 'javascriptException_filter',
  TYPE_LOGS_FILTER: 'logs_filter',
}

class LogInspector {
  bidi
  ws
  #callbackId = 0

  constructor(driver, browsingContextIds) {
    this._driver = driver
    this._browsingContextIds = browsingContextIds
    this.listener = new Map()
    this.listener.set(LOG.TYPE_CONSOLE, new Map())
    this.listener.set(LOG.TYPE_JS_LOGS, new Map())
    this.listener.set(LOG.TYPE_JS_EXCEPTION, new Map())
    this.listener.set(LOG.TYPE_LOGS, new Map())
    this.listener.set(LOG.TYPE_CONSOLE_FILTER, new Map())
    this.listener.set(LOG.TYPE_JS_LOGS_FILTER, new Map())
    this.listener.set(LOG.TYPE_JS_EXCEPTION_FILTER, new Map())
    this.listener.set(LOG.TYPE_LOGS_FILTER, new Map())
  }

  /**
   * Subscribe to log event
   * @returns {Promise<void>}
   */
  async init() {
    this.bidi = await this._driver.getBidi()
    await this.bidi.subscribe('log.entryAdded', this._browsingContextIds)
  }

  addCallback(eventType, callback) {
    const id = ++this.#callbackId

    const eventCallbackMap = this.listener.get(eventType)
    eventCallbackMap.set(id, callback)
    return id
  }

  removeCallback(id) {
    let hasId = false
    for (const [, callbacks] of this.listener) {
      if (callbacks.has(id)) {
        callbacks.delete(id)
        hasId = true
      }
    }

    if (!hasId) {
      throw Error(`Callback with id ${id} not found`)
    }
  }

  invokeCallbacks(eventType, data) {
    const callbacks = this.listener.get(eventType)
    if (callbacks) {
      for (const [, callback] of callbacks) {
        callback(data)
      }
    }
  }

  invokeCallbacksWithFilter(eventType, data, filterLevel) {
    const callbacks = this.listener.get(eventType)
    if (callbacks) {
      for (const [, value] of callbacks) {
        const callback = value.callback
        const filter = value.filter
        if (filterLevel === filter.getLevel()) {
          callback(data)
        }
      }
    }
  }

  /**
   * Listen to Console logs
   * @param callback
   * @param filterBy
   * @returns {Promise<number>}
   */
  async onConsoleEntry(callback, filterBy = undefined) {
    if (filterBy !== undefined && !(filterBy instanceof FilterBy)) {
      throw Error(`Pass valid FilterBy object. Received: ${filterBy}`)
    }

    let id

    if (filterBy !== undefined) {
      id = this.addCallback(LOG.TYPE_CONSOLE_FILTER, { callback: callback, filter: filterBy })
    } else {
      id = this.addCallback(LOG.TYPE_CONSOLE, callback)
    }

    this.ws = await this.bidi.socket

    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))

      if (params?.type === LOG.TYPE_CONSOLE) {
        let consoleEntry = new ConsoleLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.method,
          params.args,
          params.stackTrace,
        )

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            this.invokeCallbacksWithFilter(LOG.TYPE_CONSOLE_FILTER, consoleEntry, filterBy.getLevel())
          }
          return
        }

        this.invokeCallbacks(LOG.TYPE_CONSOLE, consoleEntry)
      }
    })

    return id
  }

  /**
   * Listen to JS logs
   * @param callback
   * @param filterBy
   * @returns {Promise<number>}
   */
  async onJavascriptLog(callback, filterBy = undefined) {
    if (filterBy !== undefined && !(filterBy instanceof FilterBy)) {
      throw Error(`Pass valid FilterBy object. Received: ${filterBy}`)
    }

    let id

    if (filterBy !== undefined) {
      id = this.addCallback(LOG.TYPE_JS_LOGS_FILTER, { callback: callback, filter: filterBy })
    } else {
      id = this.addCallback(LOG.TYPE_JS_LOGS, callback)
    }

    this.ws = await this.bidi.socket

    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))

      if (params?.type === LOG.TYPE_JS_LOGS) {
        let jsEntry = new JavascriptLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.stackTrace,
        )

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            this.invokeCallbacksWithFilter(LOG.TYPE_JS_LOGS_FILTER, jsEntry, filterBy.getLevel())
          }
          return
        }

        this.invokeCallbacks(LOG.TYPE_JS_LOGS, jsEntry)
      }
    })

    return id
  }

  /**
   * Listen to JS Exceptions
   * @param callback
   * @returns {Promise<number>}
   */
  async onJavascriptException(callback) {
    const id = this.addCallback(LOG.TYPE_JS_EXCEPTION, callback)
    this.ws = await this.bidi.socket

    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if (params?.type === 'javascript' && params?.level === 'error') {
        let jsErrorEntry = new JavascriptLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.stackTrace,
        )

        this.invokeCallbacks(LOG.TYPE_JS_EXCEPTION, jsErrorEntry)
      }
    })

    return id
  }

  /**
   * Listen to any logs
   * @param callback
   * @param filterBy
   * @returns {Promise<number>}
   */
  async onLog(callback, filterBy = undefined) {
    if (filterBy !== undefined && !(filterBy instanceof FilterBy)) {
      throw Error(`Pass valid FilterBy object. Received: ${filterBy}`)
    }

    let id
    if (filterBy !== undefined) {
      id = this.addCallback(LOG.TYPE_LOGS_FILTER, { callback: callback, filter: filterBy })
    } else {
      id = this.addCallback(LOG.TYPE_LOGS, callback)
    }

    this.ws = await this.bidi.socket

    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if (params?.type === 'javascript') {
        let jsEntry = new JavascriptLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.stackTrace,
        )

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            callback(jsEntry)
          }
          return
        }

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            {
              this.invokeCallbacksWithFilter(LOG.TYPE_LOGS_FILTER, jsEntry, filterBy.getLevel())
            }
            return
          }
        }

        this.invokeCallbacks(LOG.TYPE_LOGS, jsEntry)
        return
      }

      if (params?.type === 'console') {
        let consoleEntry = new ConsoleLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.method,
          params.args,
          params.stackTrace,
        )

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            this.invokeCallbacksWithFilter(LOG.TYPE_LOGS_FILTER, consoleEntry, filterBy.getLevel())
          }
          return
        }

        this.invokeCallbacks(LOG.TYPE_LOGS, consoleEntry)
        return
      }

      if (params !== undefined && !['console', 'javascript'].includes(params?.type)) {
        let genericEntry = new GenericLogEntry(
          params.level,
          params.source,
          params.text,
          params.timestamp,
          params.type,
          params.stackTrace,
        )

        if (filterBy !== undefined) {
          if (params?.level === filterBy.getLevel()) {
            {
              this.invokeCallbacksWithFilter(LOG.TYPE_LOGS_FILTER, genericEntry, filterBy.getLevel())
            }
            return
          }
        }

        this.invokeCallbacks(LOG.TYPE_LOGS, genericEntry)
        return
      }
    })

    return id
  }

  /**
   * Unsubscribe to log event
   * @returns {Promise<void>}
   */
  async close() {
    if (
      this._browsingContextIds !== null &&
      this._browsingContextIds !== undefined &&
      this._browsingContextIds.length > 0
    ) {
      await this.bidi.unsubscribe('log.entryAdded', this._browsingContextIds)
    } else {
      await this.bidi.unsubscribe('log.entryAdded')
    }
  }
}

/**
 * initiate inspector instance and return
 * @param driver
 * @param browsingContextIds
 * @returns {Promise<LogInspector>}
 */
async function getLogInspectorInstance(driver, browsingContextIds) {
  let instance = new LogInspector(driver, browsingContextIds)
  await instance.init()
  return instance
}

/**
 * API
 * @type {function(*, *): Promise<LogInspector>}
 */
module.exports = getLogInspectorInstance
