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

const logInspector = require('../bidi/logInspector')
const scriptManager = require('../bidi//scriptManager')
const { LocalValue, ChannelValue } = require('../bidi/protocolValue')
const fs = require('node:fs')
const path = require('node:path')
const by = require('./by')

class Script {
  #driver
  #logInspector
  #script

  constructor(driver) {
    this.#driver = driver
  }

  // This should be done in the constructor.
  // But since it needs to call async methods we cannot do that in the constructor.
  // We can have a separate async method that initialises the Script instance.
  // However, that pattern does not allow chaining the methods as we would like the user to use it.
  // Since it involves awaiting to get the instance and then another await to call the method.
  // Using this allows the user to do this "await driver.script().addJavaScriptErrorHandler(callback)"
  async #init() {
    if (this.#logInspector !== undefined) {
      return
    }
    this.#logInspector = await logInspector(this.#driver)
  }

  async #initScript() {
    if (this.#script !== undefined) {
      return
    }
    this.#script = await scriptManager([], this.#driver)
  }

  async addJavaScriptErrorHandler(callback) {
    await this.#init()
    return await this.#logInspector.onJavascriptException(callback)
  }

  async removeJavaScriptErrorHandler(id) {
    await this.#init()
    await this.#logInspector.removeCallback(id)
  }

  async addConsoleMessageHandler(callback) {
    await this.#init()
    return this.#logInspector.onConsoleEntry(callback)
  }

  async removeConsoleMessageHandler(id) {
    await this.#init()

    await this.#logInspector.removeCallback(id)
  }

  async addDomMutationHandler(callback) {
    await this.#initScript()

    let argumentValues = []
    let value = LocalValue.createChannelValue(new ChannelValue('channel_name'))
    argumentValues.push(value)

    const filePath = path.join(__dirname, 'atoms', 'bidi-mutation-listener.js')

    let mutationListener = fs.readFileSync(filePath, 'utf-8').toString()
    await this.#script.addPreloadScript(mutationListener, argumentValues)

    let id = await this.#script.onMessage(async (message) => {
      let payload = JSON.parse(message['data']['value'])
      let elements = await this.#driver.findElements({
        css: '*[data-__webdriver_id=' + by.escapeCss(payload['target']) + ']',
      })

      if (elements.length === 0) {
        return
      }

      let event = {
        element: elements[0],
        attribute_name: payload['name'],
        current_value: payload['value'],
        old_value: payload['oldValue'],
      }
      callback(event)
    })

    return id
  }

  async removeDomMutationHandler(id) {
    await this.#initScript()

    await this.#script.removeCallback(id)
  }

  async pin(script) {
    await this.#initScript()
    return await this.#script.addPreloadScript(script)
  }

  async unpin(id) {
    await this.#initScript()
    await this.#script.removePreloadScript(id)
  }

  async execute(script, ...args) {
    await this.#initScript()

    const browsingContextId = await this.#driver.getWindowHandle()

    const argumentList = []

    args.forEach((arg) => {
      argumentList.push(LocalValue.getArgument(arg))
    })

    const response = await this.#script.callFunctionInBrowsingContext(browsingContextId, script, true, argumentList)

    return response.result
  }
}

module.exports = Script
