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

const { BeforeRequestSent, ResponseStarted } = require('./networkTypes')

/**
 * @deprecated
 * in favor of using the `Network` class from `bidi/network.js`
 *  Inspector is specific to listening to events.
 *  Goal is to club commands and events under one class called Network.
 */
class NetworkInspector {
  constructor(driver, browsingContextIds) {
    this._driver = driver
    this._browsingContextIds = browsingContextIds
  }

  async init() {
    this.bidi = await this._driver.getBidi()
  }

  async beforeRequestSent(callback) {
    await this.subscribeAndHandleEvent('network.beforeRequestSent', callback)
  }

  async responseStarted(callback) {
    await this.subscribeAndHandleEvent('network.responseStarted', callback)
  }

  async responseCompleted(callback) {
    await this.subscribeAndHandleEvent('network.responseCompleted', callback)
  }

  async authRequired(callback) {
    await this.subscribeAndHandleEvent('network.authRequired', callback)
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
        }
        callback(response)
      }
    })
  }
}

async function getNetworkInspectorInstance(driver, browsingContextIds = null) {
  let instance = new NetworkInspector(driver, browsingContextIds)
  await instance.init()
  return instance
}

module.exports = getNetworkInspectorInstance
