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

const { BrowsingContextInfo, NavigationInfo, UserPromptOpened, UserPromptClosed } = require('./browsingContextTypes')

/**
 * Represents a browsing context related events.
 * Described in https://w3c.github.io/webdriver-bidi/#module-contexts-events.
 * While BrowsingContext class represents a browsing context lifecycle and related commands.
 * This class is specific to listening to events. Events can be subscribed to multiple browsing contexts or all of them.
 */
class BrowsingContextInspector {
  constructor(driver, browsingContextIds) {
    this._driver = driver
    this._browsingContextIds = browsingContextIds
  }

  async init() {
    this.bidi = await this._driver.getBidi()
  }

  /**
   * Subscribes to the 'browsingContext.contextCreated' event.
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onBrowsingContextCreated(callback) {
    await this.subscribeAndHandleEvent('browsingContext.contextCreated', callback)
  }

  /**
   * Subscribes to the 'browsingContext.contextDestroyed' event.
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onBrowsingContextDestroyed(callback) {
    await this.subscribeAndHandleEvent('browsingContext.contextDestroyed', callback)
  }

  /**
   * Subscribe to the 'browsingContext.navigationStarted' event.
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onNavigationStarted(callback) {
    await this.subscribeAndHandleEvent('browsingContext.navigationStarted', callback)
  }

  /**
   * Subscribes to the 'browsingContext.fragmentNavigated' event.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onFragmentNavigated(callback) {
    await this.subscribeAndHandleEvent('browsingContext.fragmentNavigated', callback)
  }

  /**
   * Subscribes to the 'browsingContext.userPromptClosed' event.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onUserPromptClosed(callback) {
    await this.subscribeAndHandleEvent('browsingContext.userPromptClosed', callback)
  }

  /**
   * Subscribes to the 'browsingContext.userPromptOpened' event.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onUserPromptOpened(callback) {
    await this.subscribeAndHandleEvent('browsingContext.userPromptOpened', callback)
  }

  /**
   * Subscribes to the 'browsingContext.domContentLoaded' event.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onDomContentLoaded(callback) {
    await this.subscribeAndHandleEvent('browsingContext.domContentLoaded', callback)
  }

  /**
   * Subscribes to the 'browsingContext.load' event.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the event is emitted.
   */
  async onBrowsingContextLoaded(callback) {
    await this.subscribeAndHandleEvent('browsingContext.load', callback)
  }

  async subscribeAndHandleEvent(eventType, callback) {
    if (this._browsingContextIds != null) {
      await this.bidi.subscribe(eventType, this._browsingContextIds)
    } else {
      await this.bidi.subscribe(eventType)
    }
    await this._on(callback)
  }

  async _on(callback) {
    this.ws = await this.bidi.socket
    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if (params) {
        let response = null
        if ('navigation' in params) {
          response = new NavigationInfo(params.context, params.navigation, params.timestamp, params.url)
        } else if ('accepted' in params) {
          response = new UserPromptClosed(params.context, params.accepted, params.userText)
        } else if ('type' in params) {
          response = new UserPromptOpened(params.context, params.type, params.message)
        } else {
          response = new BrowsingContextInfo(params.context, params.url, params.children, params.parent)
        }
        callback(response)
      }
    })
  }

  async close() {
    if (
      this._browsingContextIds !== null &&
      this._browsingContextIds !== undefined &&
      this._browsingContextIds.length > 0
    ) {
      await this.bidi.unsubscribe(
        'browsingContext.contextCreated',
        'browsingContext.contextDestroyed',
        'browsingContext.fragmentNavigated',
        'browsingContext.userPromptClosed',
        this._browsingContextIds,
      )
    } else {
      await this.bidi.unsubscribe(
        'browsingContext.contextCreated',
        'browsingContext.contextDestroyed',
        'browsingContext.fragmentNavigated',
        'browsingContext.userPromptClosed',
      )
    }
  }
}

async function getBrowsingContextInstance(driver, browsingContextIds = null) {
  let instance = new BrowsingContextInspector(driver, browsingContextIds)
  await instance.init()
  return instance
}

module.exports = getBrowsingContextInstance
