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

const { BeforeRequestSent, ResponseStarted, FetchError } = require('./networkTypes')
const { AddInterceptParameters } = require('./addInterceptParameters')
const { ContinueResponseParameters } = require('./continueResponseParameters')
const { ContinueRequestParameters } = require('./continueRequestParameters')
const { ProvideResponseParameters } = require('./provideResponseParameters')

const NetworkEvent = {
  BEFORE_REQUEST_SENT: 'network.beforeRequestSent',
  RESPONSE_STARTED: 'network.responseStarted',
  RESPONSE_COMPLETED: 'network.responseCompleted',
  AUTH_REQUIRED: 'network.authRequired',
  FETCH_ERROR: 'network.fetchError',
}

const CacheBehavior = Object.freeze({
  DEFAULT: 'default',
  BYPASS: 'bypass',
})

/**
 * Represents all commands and events of Network module.
 * Described in https://w3c.github.io/webdriver-bidi/#module-network.
 */
class Network {
  #callbackId = 0
  #listener

  /**
   * Represents a Network object.
   * @constructor
   * @param {Driver} driver - The driver to fetch the BiDi connection.
   * @param {Array} browsingContextIds - An array of browsing context IDs that the network events will be subscribed to.
   */
  constructor(driver, browsingContextIds) {
    this._driver = driver
    this._browsingContextIds = browsingContextIds
    this.#listener = new Map()
    this.#listener.set(NetworkEvent.AUTH_REQUIRED, new Map())
    this.#listener.set(NetworkEvent.BEFORE_REQUEST_SENT, new Map())
    this.#listener.set(NetworkEvent.FETCH_ERROR, new Map())
    this.#listener.set(NetworkEvent.RESPONSE_STARTED, new Map())
    this.#listener.set(NetworkEvent.RESPONSE_COMPLETED, new Map())
  }

  addCallback(eventType, callback) {
    const id = ++this.#callbackId

    const eventCallbackMap = this.#listener.get(eventType)
    eventCallbackMap.set(id, callback)
    return id
  }

  removeCallback(id) {
    let hasId = false
    for (const [, callbacks] of this.#listener) {
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
    const callbacks = this.#listener.get(eventType)
    if (callbacks) {
      for (const [, callback] of callbacks) {
        callback(data)
      }
    }
  }

  async init() {
    this.bidi = await this._driver.getBidi()
  }

  /**
   * Subscribes to the 'network.beforeRequestSent' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async beforeRequestSent(callback) {
    await this.subscribeAndHandleEvent('network.beforeRequestSent', callback)
  }

  /**
   * Subscribes to the 'network.responseStarted' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async responseStarted(callback) {
    await this.subscribeAndHandleEvent('network.responseStarted', callback)
  }

  /**
   * Subscribes to the 'network.responseCompleted' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async responseCompleted(callback) {
    await this.subscribeAndHandleEvent('network.responseCompleted', callback)
  }

  /**
   * Subscribes to the 'network.authRequired' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<number>} - A promise that resolves when the subscription is successful.
   */
  async authRequired(callback) {
    return await this.subscribeAndHandleEvent('network.authRequired', callback)
  }

  /**
   * Subscribes to the 'network.fetchError' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the event.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async fetchError(callback) {
    await this.subscribeAndHandleEvent('network.fetchError', callback)
  }

  async subscribeAndHandleEvent(eventType, callback) {
    if (this._browsingContextIds != null) {
      await this.bidi.subscribe(eventType, this._browsingContextIds)
    } else {
      await this.bidi.subscribe(eventType)
    }
    let id = this.addCallback(eventType, callback)

    this.ws = await this.bidi.socket
    this.ws.on('message', (event) => {
      const { params } = JSON.parse(Buffer.from(event.toString()))
      if (params) {
        let response = null
        if ('initiator' in params) {
          response = new BeforeRequestSent(
            params.context,
            params.navigation,
            params.redirectCount,
            params.request,
            params.timestamp,
            params.initiator,
          )
        } else if ('response' in params) {
          response = new ResponseStarted(
            params.context,
            params.navigation,
            params.redirectCount,
            params.request,
            params.timestamp,
            params.response,
          )
        } else if ('errorText' in params) {
          response = new FetchError(
            params.context,
            params.navigation,
            params.redirectCount,
            params.request,
            params.timestamp,
            params.errorText,
          )
        }
        this.invokeCallbacks(eventType, response)
      }
    })
    return id
  }

  /**
   * Adds a network intercept.
   *
   * @param {AddInterceptParameters} params - The parameters for the network intercept.
   * @returns {Promise<string>} - A promise that resolves to the added intercept's id.
   * @throws {Error} - If params is not an instance of AddInterceptParameters.
   */
  async addIntercept(params) {
    if (!(params instanceof AddInterceptParameters)) {
      throw new Error(`Params must be an instance of AddInterceptParameters. Received:'${params}'`)
    }

    const command = {
      method: 'network.addIntercept',
      params: Object.fromEntries(params.asMap()),
    }

    let response = await this.bidi.send(command)

    return response.result.intercept
  }

  /**
   * Removes an intercept.
   *
   * @param {string} interceptId - The ID of the intercept to be removed.
   * @returns {Promise<void>} - A promise that resolves when the intercept is successfully removed.
   */
  async removeIntercept(interceptId) {
    const command = {
      method: 'network.removeIntercept',
      params: { intercept: interceptId },
    }

    await this.bidi.send(command)
  }

  /**
   * Continues the network request with authentication credentials.
   * @param {string} requestId - The ID of the request to continue.
   * @param {string} username - The username for authentication.
   * @param {string} password - The password for authentication.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async continueWithAuth(requestId, username, password) {
    const command = {
      method: 'network.continueWithAuth',
      params: {
        request: requestId.toString(),
        action: 'provideCredentials',
        credentials: {
          type: 'password',
          username: username,
          password: password,
        },
      },
    }
    await this.bidi.send(command)
  }

  /**
   * Fails a network request.
   *
   * @param {number} requestId - The ID of the request to fail.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async failRequest(requestId) {
    const command = {
      method: 'network.failRequest',
      params: {
        request: requestId.toString(),
      },
    }
    await this.bidi.send(command)
  }

  /**
   * Continues the network request with authentication but without providing credentials.
   * @param {string} requestId - The ID of the request to continue with authentication.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async continueWithAuthNoCredentials(requestId) {
    const command = {
      method: 'network.continueWithAuth',
      params: {
        request: requestId.toString(),
        action: 'default',
      },
    }
    await this.bidi.send(command)
  }

  /**
   * Cancels the authentication for a specific request.
   *
   * @param {string} requestId - The ID of the request to cancel authentication for.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async cancelAuth(requestId) {
    const command = {
      method: 'network.continueWithAuth',
      params: {
        request: requestId.toString(),
        action: 'cancel',
      },
    }
    await this.bidi.send(command)
  }

  /**
   * Continues the network request with the provided parameters.
   *
   * @param {ContinueRequestParameters} params - The parameters for continuing the request.
   * @throws {Error} If params is not an instance of ContinueRequestParameters.
   * @returns {Promise<void>} A promise that resolves when the command is sent.
   */
  async continueRequest(params) {
    if (!(params instanceof ContinueRequestParameters)) {
      throw new Error(`Params must be an instance of ContinueRequestParameters. Received:'${params}'`)
    }

    const command = {
      method: 'network.continueRequest',
      params: Object.fromEntries(params.asMap()),
    }

    await this.bidi.send(command)
  }

  /**
   * Continues the network response with the given parameters.
   *
   * @param {ContinueResponseParameters} params - The parameters for continuing the response.
   * @throws {Error} If params is not an instance of ContinueResponseParameters.
   * @returns {Promise<void>} A promise that resolves when the command is sent.
   */
  async continueResponse(params) {
    if (!(params instanceof ContinueResponseParameters)) {
      throw new Error(`Params must be an instance of ContinueResponseParameters. Received:'${params}'`)
    }

    const command = {
      method: 'network.continueResponse',
      params: Object.fromEntries(params.asMap()),
    }

    await this.bidi.send(command)
  }

  /**
   * Provides a response for the network.
   *
   * @param {ProvideResponseParameters} params - The parameters for providing the response.
   * @throws {Error} If params is not an instance of ProvideResponseParameters.
   * @returns {Promise<void>} A promise that resolves when the command is sent.
   */
  async provideResponse(params) {
    if (!(params instanceof ProvideResponseParameters)) {
      throw new Error(`Params must be an instance of ProvideResponseParameters. Received:'${params}'`)
    }

    const command = {
      method: 'network.provideResponse',
      params: Object.fromEntries(params.asMap()),
    }

    await this.bidi.send(command)
  }

  /**
   * Sets the cache behavior for network requests.
   *
   * @param {string} behavior - The cache behavior ("default" or "bypass")
   * @param {Array<string>} [contexts] - Optional array of browsing context IDs
   * @returns {Promise<void>} A promise that resolves when the cache behavior is set
   * @throws {Error} If behavior is invalid or context IDs are invalid
   */
  async setCacheBehavior(behavior, contexts = null) {
    if (!Object.values(CacheBehavior).includes(behavior)) {
      throw new Error(`Cache behavior must be either "${CacheBehavior.DEFAULT}" or "${CacheBehavior.BYPASS}"`)
    }

    const command = {
      method: 'network.setCacheBehavior',
      params: {
        cacheBehavior: behavior,
      },
    }

    if (contexts !== null) {
      if (
        !Array.isArray(contexts) ||
        contexts.length === 0 ||
        contexts.some((c) => typeof c !== 'string' || c.trim() === '')
      ) {
        throw new Error('Contexts must be an array of non-empty strings')
      }
      command.params.contexts = contexts
    }

    await this.bidi.send(command)
  }

  /**
   * Unsubscribes from network events for all browsing contexts.
   * @returns {Promise<void>} A promise that resolves when the network connection is closed.
   */
  async close() {
    if (
      this._browsingContextIds !== null &&
      this._browsingContextIds !== undefined &&
      this._browsingContextIds.length > 0
    ) {
      await this.bidi.unsubscribe(
        'network.beforeRequestSent',
        'network.responseStarted',
        'network.responseCompleted',
        'network.authRequired',
        this._browsingContextIds,
      )
    } else {
      await this.bidi.unsubscribe(
        'network.beforeRequestSent',
        'network.responseStarted',
        'network.responseCompleted',
        'network.authRequired',
      )
    }
  }
}

async function getNetworkInstance(driver, browsingContextIds = null) {
  let instance = new Network(driver, browsingContextIds)
  await instance.init()
  return instance
}

module.exports = { Network: getNetworkInstance, CacheBehavior }
