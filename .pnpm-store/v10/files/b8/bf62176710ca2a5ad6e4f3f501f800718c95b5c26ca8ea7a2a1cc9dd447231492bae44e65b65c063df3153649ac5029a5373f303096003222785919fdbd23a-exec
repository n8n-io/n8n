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

const { Network: getNetwork } = require('../bidi/network')
const { InterceptPhase } = require('../bidi/interceptPhase')
const { AddInterceptParameters } = require('../bidi/addInterceptParameters')

class Network {
  #callbackId = 0
  #driver
  #network
  #authHandlers = new Map()

  constructor(driver) {
    this.#driver = driver
  }

  // This should be done in the constructor.
  // But since it needs to call async methods we cannot do that in the constructor.
  // We can have a separate async method that initialises the Network instance.
  // However, that pattern does not allow chaining the methods as we would like the user to use it.
  // Since it involves awaiting to get the instance and then another await to call the method.
  // Using this allows the user to do this "await driver.network.addAuthenticationHandler(callback)"
  async #init() {
    if (this.#network !== undefined) {
      return
    }
    this.#network = await getNetwork(this.#driver)

    await this.#network.addIntercept(new AddInterceptParameters(InterceptPhase.AUTH_REQUIRED))

    await this.#network.authRequired(async (event) => {
      const requestId = event.request.request
      const uri = event.request.url
      const credentials = this.getAuthCredentials(uri)
      if (credentials !== null) {
        await this.#network.continueWithAuth(requestId, credentials.username, credentials.password)
        return
      }

      await this.#network.continueWithAuthNoCredentials(requestId)
    })
  }

  getAuthCredentials(uri) {
    for (let [, value] of this.#authHandlers) {
      if (uri.match(value.uri)) {
        return value
      }
    }
    return null
  }
  async addAuthenticationHandler(username, password, uri = '//') {
    await this.#init()

    const id = this.#callbackId++

    this.#authHandlers.set(id, { username, password, uri })
    return id
  }

  async removeAuthenticationHandler(id) {
    await this.#init()

    if (this.#authHandlers.has(id)) {
      this.#authHandlers.delete(id)
    } else {
      throw Error(`Callback with id ${id} not found`)
    }
  }

  async clearAuthenticationHandlers() {
    this.#authHandlers.clear()
  }
}

module.exports = Network
