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

const {
  EvaluateResultType,
  EvaluateResultSuccess,
  EvaluateResultException,
  ExceptionDetails,
} = require('./evaluateResult')
const { Message } = require('./scriptTypes')
const { RealmInfo, RealmType, WindowRealmInfo } = require('./realmInfo')
const { RemoteValue } = require('./protocolValue')
const { Source } = require('./scriptTypes')
const { WebDriverError } = require('../lib/error')

const ScriptEvent = {
  MESSAGE: 'script.message',
  REALM_CREATED: 'script.realmCreated',
  REALM_DESTROYED: 'script.realmDestroyed',
}

/**
 * Represents class to run events and commands of Script module.
 * Described in https://w3c.github.io/webdriver-bidi/#module-script.
 * @class
 */
class ScriptManager {
  #callbackId = 0
  #listener

  constructor(driver) {
    this._driver = driver
    this.#listener = new Map()
    this.#listener.set(ScriptEvent.MESSAGE, new Map())
    this.#listener.set(ScriptEvent.REALM_CREATED, new Map())
    this.#listener.set(ScriptEvent.REALM_DESTROYED, new Map())
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

  async init(browsingContextIds) {
    if (!(await this._driver.getCapabilities()).get('webSocketUrl')) {
      throw Error('WebDriver instance must support BiDi protocol')
    }

    this.bidi = await this._driver.getBidi()
    this._browsingContextIds = browsingContextIds
  }

  /**
   * Disowns the handles in the specified realm.
   *
   * @param {string} realmId - The ID of the realm.
   * @param {string[]} handles - The handles to disown to allow garbage collection.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async disownRealmScript(realmId, handles) {
    const params = {
      method: 'script.disown',
      params: {
        handles: handles,
        target: {
          realm: realmId,
        },
      },
    }

    await this.bidi.send(params)
  }

  /**
   * Disowns the handles in the specified browsing context.
   * @param {string} browsingContextId - The ID of the browsing context.
   * @param {string[]} handles - The handles to disown to allow garbage collection.
   * @param {String|null} [sandbox=null] - The sandbox name.
   * @returns {Promise<void>} - A promise that resolves when the command is sent.
   */
  async disownBrowsingContextScript(browsingContextId, handles, sandbox = null) {
    const params = {
      method: 'script.disown',
      params: {
        handles: handles,
        target: {
          context: browsingContextId,
        },
      },
    }

    if (sandbox != null) {
      params.params.target['sandbox'] = sandbox
    }

    await this.bidi.send(params)
  }

  /**
   * Calls a function in the specified realm.
   *
   * @param {string} realmId - The ID of the realm.
   * @param {string} functionDeclaration - The function to call.
   * @param {boolean} awaitPromise - Whether to await the promise returned by the function.
   * @param {LocalValue[]} [argumentValueList|null] - The list of argument values to pass to the function.
   * @param {Object} [thisParameter|null] - The value of 'this' parameter for the function.
   * @param {ResultOwnership} [resultOwnership|null] - The ownership of the result.
   * @returns {Promise<EvaluateResultSuccess|EvaluateResultException>} - A promise that resolves to the evaluation result or exception.
   */
  async callFunctionInRealm(
    realmId,
    functionDeclaration,
    awaitPromise,
    argumentValueList = null,
    thisParameter = null,
    resultOwnership = null,
  ) {
    const params = this.getCallFunctionParams(
      'realm',
      realmId,
      null,
      functionDeclaration,
      awaitPromise,
      argumentValueList,
      thisParameter,
      resultOwnership,
    )

    const command = {
      method: 'script.callFunction',
      params,
    }

    let response = await this.bidi.send(command)
    return this.createEvaluateResult(response)
  }

  /**
   * Calls a function in the specified browsing context.
   *
   * @param {string} realmId - The ID of the browsing context.
   * @param {string} functionDeclaration - The function to call.
   * @param {boolean} awaitPromise - Whether to await the promise returned by the function.
   * @param {LocalValue[]} [argumentValueList|null] - The list of argument values to pass to the function.
   * @param {Object} [thisParameter|null] - The value of 'this' parameter for the function.
   * @param {ResultOwnership} [resultOwnership|null] - The ownership of the result.
   * @returns {Promise<EvaluateResultSuccess|EvaluateResultException>} - A promise that resolves to the evaluation result or exception.
   */
  async callFunctionInBrowsingContext(
    browsingContextId,
    functionDeclaration,
    awaitPromise,
    argumentValueList = null,
    thisParameter = null,
    resultOwnership = null,
    sandbox = null,
  ) {
    const params = this.getCallFunctionParams(
      'contextTarget',
      browsingContextId,
      sandbox,
      functionDeclaration,
      awaitPromise,
      argumentValueList,
      thisParameter,
      resultOwnership,
    )

    const command = {
      method: 'script.callFunction',
      params,
    }
    const response = await this.bidi.send(command)
    return this.createEvaluateResult(response)
  }

  /**
   * Evaluates a function in the specified realm.
   *
   * @param {string} realmId - The ID of the realm.
   * @param {string} expression - The expression to function to evaluate.
   * @param {boolean} awaitPromise - Whether to await the promise.
   * @param {ResultOwnership|null} resultOwnership - The ownership of the result.
   * @returns {Promise<EvaluateResultSuccess|EvaluateResultException>} - A promise that resolves to the evaluation result or exception.
   */
  async evaluateFunctionInRealm(realmId, expression, awaitPromise, resultOwnership = null) {
    const params = this.getEvaluateParams('realm', realmId, null, expression, awaitPromise, resultOwnership)

    const command = {
      method: 'script.evaluate',
      params,
    }

    let response = await this.bidi.send(command)
    return this.createEvaluateResult(response)
  }

  /**
   * Evaluates a function in the browsing context.
   *
   * @param {string} realmId - The ID of the browsing context.
   * @param {string} expression - The expression to function to evaluate.
   * @param {boolean} awaitPromise - Whether to await the promise.
   * @param {ResultOwnership|null} resultOwnership - The ownership of the result.
   * @returns {Promise<EvaluateResultSuccess|EvaluateResultException>} - A promise that resolves to the evaluation result or exception.
   */
  async evaluateFunctionInBrowsingContext(
    browsingContextId,
    expression,
    awaitPromise,
    resultOwnership = null,
    sandbox = null,
  ) {
    const params = this.getEvaluateParams(
      'contextTarget',
      browsingContextId,
      sandbox,
      expression,
      awaitPromise,
      resultOwnership,
    )

    const command = {
      method: 'script.evaluate',
      params,
    }

    let response = await this.bidi.send(command)
    return this.createEvaluateResult(response)
  }

  /**
   * Adds a preload script.
   *
   * @param {string} functionDeclaration - The declaration of the function to be added as a preload script.
   * @param {LocalValue[]} [argumentValueList=[]] - The list of argument values to be passed to the preload script function.
   * @param {string} [sandbox|null] - The sandbox object to be used for the preload script.
   * @returns {Promise<number>} - A promise that resolves to the added preload script ID.
   */
  async addPreloadScript(functionDeclaration, argumentValueList = [], sandbox = null) {
    const params = {
      functionDeclaration: functionDeclaration,
      arguments: argumentValueList,
    }

    if (sandbox !== null) {
      params.sandbox = sandbox
    }

    if (Array.isArray(this._browsingContextIds) && this._browsingContextIds.length > 0) {
      params.contexts = this._browsingContextIds
    }

    if (typeof this._browsingContextIds === 'string') {
      params.contexts = new Array(this._browsingContextIds)
    }

    if (argumentValueList != null) {
      let argumentParams = []
      argumentValueList.forEach((argumentValue) => {
        argumentParams.push(argumentValue.asMap())
      })
      params['arguments'] = argumentParams
    }

    const command = {
      method: 'script.addPreloadScript',
      params,
    }

    let response = await this.bidi.send(command)
    return response.result.script
  }

  /**
   * Removes a preload script.
   *
   * @param {string} script - The ID for the script to be removed.
   * @returns {Promise<any>} - A promise that resolves with the result of the removal.
   * @throws {WebDriverError} - If an error occurs during the removal process.
   */
  async removePreloadScript(script) {
    const params = { script: script }
    const command = {
      method: 'script.removePreloadScript',
      params,
    }
    let response = await this.bidi.send(command)
    if ('error' in response) {
      throw new WebDriverError(response.error)
    }
    return response.result
  }

  getCallFunctionParams(
    targetType,
    id,
    sandbox,
    functionDeclaration,
    awaitPromise,
    argumentValueList = null,
    thisParameter = null,
    resultOwnership = null,
  ) {
    const params = {
      functionDeclaration: functionDeclaration,
      awaitPromise: awaitPromise,
    }
    if (targetType === 'contextTarget') {
      if (sandbox != null) {
        params['target'] = { context: id, sandbox: sandbox }
      } else {
        params['target'] = { context: id }
      }
    } else {
      params['target'] = { realm: id }
    }

    if (argumentValueList != null) {
      let argumentParams = []
      argumentValueList.forEach((argumentValue) => {
        argumentParams.push(argumentValue.asMap())
      })
      params['arguments'] = argumentParams
    }

    if (thisParameter != null) {
      params['this'] = thisParameter
    }

    if (resultOwnership != null) {
      params['resultOwnership'] = resultOwnership
    }

    return params
  }

  getEvaluateParams(targetType, id, sandbox, expression, awaitPromise, resultOwnership = null) {
    const params = {
      expression: expression,
      awaitPromise: awaitPromise,
    }
    if (targetType === 'contextTarget') {
      if (sandbox != null) {
        params['target'] = { context: id, sandbox: sandbox }
      } else {
        params['target'] = { context: id }
      }
    } else {
      params['target'] = { realm: id }
    }
    if (resultOwnership != null) {
      params['resultOwnership'] = resultOwnership
    }

    return params
  }

  createEvaluateResult(response) {
    const type = response.result.type
    const realmId = response.result.realm
    let evaluateResult

    if (type === EvaluateResultType.SUCCESS) {
      const result = response.result.result
      evaluateResult = new EvaluateResultSuccess(realmId, new RemoteValue(result))
    } else {
      const exceptionDetails = response.result.exceptionDetails
      evaluateResult = new EvaluateResultException(realmId, new ExceptionDetails(exceptionDetails))
    }
    return evaluateResult
  }

  realmInfoMapper(realms) {
    const realmsList = []
    realms.forEach((realm) => {
      realmsList.push(RealmInfo.fromJson(realm))
    })
    return realmsList
  }

  /**
   * Retrieves all realms.
   * @returns {Promise<RealmInfo[]>} - A promise that resolves to an array of RealmInfo objects.
   */
  async getAllRealms() {
    const command = {
      method: 'script.getRealms',
      params: {},
    }
    let response = await this.bidi.send(command)
    return this.realmInfoMapper(response.result.realms)
  }

  /**
   * Retrieves the realms by type.
   *
   * @param {Type} type - The type of realms to retrieve.
   * @returns {Promise<RealmInfo[]>} - A promise that resolves to an array of RealmInfo objects.
   */
  async getRealmsByType(type) {
    const command = {
      method: 'script.getRealms',
      params: { type: type },
    }
    let response = await this.bidi.send(command)
    return this.realmInfoMapper(response.result.realms)
  }

  /**
   * Retrieves the realms in the specified browsing context.
   *
   * @param {string} browsingContext - The browsing context ID.
   * @returns {Promise<RealmInfo[]>} - A promise that resolves to an array of RealmInfo objects.
   */
  async getRealmsInBrowsingContext(browsingContext) {
    const command = {
      method: 'script.getRealms',
      params: { context: browsingContext },
    }
    let response = await this.bidi.send(command)
    return this.realmInfoMapper(response.result.realms)
  }

  /**
   * Retrieves the realms in a browsing context based on the specified type.
   *
   * @param {string} browsingContext - The browsing context ID.
   * @param {string} type - The type of realms to retrieve.
   * @returns {Promise<RealmInfo[]>} - A promise that resolves to an array of RealmInfo objects.
   */
  async getRealmsInBrowsingContextByType(browsingContext, type) {
    const command = {
      method: 'script.getRealms',
      params: { context: browsingContext, type: type },
    }
    let response = await this.bidi.send(command)
    return this.realmInfoMapper(response.result.realms)
  }

  /**
   * Subscribes to the 'script.message' event and handles the callback function when a message is received.
   *
   * @param {Function} callback - The callback function to be executed when a message is received.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async onMessage(callback) {
    return await this.subscribeAndHandleEvent(ScriptEvent.MESSAGE, callback)
  }

  /**
   * Subscribes to the 'script.realmCreated' event and handles it with the provided callback.
   *
   * @param {Function} callback - The callback function to handle the 'script.realmCreated' event.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async onRealmCreated(callback) {
    return await this.subscribeAndHandleEvent(ScriptEvent.REALM_CREATED, callback)
  }

  /**
   * Subscribes to the 'script.realmDestroyed' event and handles it with the provided callback function.
   *
   * @param {Function} callback - The callback function to be executed when the 'script.realmDestroyed' event occurs.
   * @returns {Promise<void>} - A promise that resolves when the subscription is successful.
   */
  async onRealmDestroyed(callback) {
    return await this.subscribeAndHandleEvent(ScriptEvent.REALM_DESTROYED, callback)
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
        if ('channel' in params) {
          response = new Message(params.channel, new RemoteValue(params.data), new Source(params.source))
        } else if ('realm' in params) {
          if (params.type === RealmType.WINDOW) {
            response = new WindowRealmInfo(params.realm, params.origin, params.type, params.context, params.sandbox)
          } else if (params.realm !== null && params.type !== null) {
            response = new RealmInfo(params.realm, params.origin, params.type)
          } else if (params.realm !== null) {
            response = params.realm
          }
        }
        this.invokeCallbacks(eventType, response)
      }
    })

    return id
  }

  async close() {
    if (
      this._browsingContextIds !== null &&
      this._browsingContextIds !== undefined &&
      this._browsingContextIds.length > 0
    ) {
      await this.bidi.unsubscribe(
        'script.message',
        'script.realmCreated',
        'script.realmDestroyed',
        this._browsingContextIds,
      )
    } else {
      await this.bidi.unsubscribe('script.message', 'script.realmCreated', 'script.realmDestroyed')
    }
  }
}

async function getScriptManagerInstance(browsingContextId, driver) {
  let instance = new ScriptManager(driver)
  await instance.init(browsingContextId)
  return instance
}

module.exports = getScriptManagerInstance
