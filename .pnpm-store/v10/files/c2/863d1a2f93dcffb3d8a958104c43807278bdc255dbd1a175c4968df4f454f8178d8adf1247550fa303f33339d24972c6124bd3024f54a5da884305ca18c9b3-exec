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

/**
 * @fileoverview Various HTTP utilities.
 */

'use strict'

const Executor = require('./index').Executor
const HttpClient = require('./index').HttpClient
const HttpRequest = require('./index').Request
const Command = require('../lib/command').Command
const CommandName = require('../lib/command').Name
const error = require('../lib/error')

/**
 * Queries a WebDriver server for its current status.
 * @param {string} url Base URL of the server to query.
 * @return {!Promise<!Object>} A promise that resolves with
 *     a hash of the server status.
 */
function getStatus(url) {
  const client = new HttpClient(url)
  const executor = new Executor(client)
  const command = new Command(CommandName.GET_SERVER_STATUS)
  return executor.execute(command)
}

class CancellationError {}

/**
 * Waits for a WebDriver server to be healthy and accepting requests.
 * @param {string} url Base URL of the server to query.
 * @param {number} timeout How long to wait for the server.
 * @param {Promise=} opt_cancelToken A promise used as a cancellation signal:
 *     if resolved before the server is ready, the wait will be terminated
 *     early with a {@link CancellationError}.
 * @return {!Promise} A promise that will resolve when the server is ready, or
 *     if the wait is cancelled.
 */
function waitForServer(url, timeout, opt_cancelToken) {
  return new Promise((onResolve, onReject) => {
    let start = Date.now()

    let done = false
    let resolve = (status) => {
      done = true
      onResolve(status)
    }
    let reject = (err) => {
      done = true
      onReject(err)
    }

    if (opt_cancelToken) {
      opt_cancelToken.then((_) => reject(new CancellationError()))
    }

    checkServerStatus()

    function checkServerStatus() {
      return getStatus(url).then((status) => resolve(status), onError)
    }

    function onError(e) {
      // Some servers don't support the status command. If they are able to
      // response with an error, then can consider the server ready.
      if (e instanceof error.UnsupportedOperationError) {
        resolve({})
        return
      }

      if (Date.now() - start > timeout) {
        reject(Error('Timed out waiting for the WebDriver server at ' + url))
      } else {
        setTimeout(function () {
          if (!done) {
            checkServerStatus()
          }
        }, 50)
      }
    }
  })
}

/**
 * Polls a URL with GET requests until it returns a 2xx response or the
 * timeout expires.
 * @param {string} url The URL to poll.
 * @param {number} timeout How long to wait, in milliseconds.
 * @param {Promise=} opt_cancelToken A promise used as a cancellation signal:
 *     if resolved before the a 2xx response is received, the wait will be
 *     terminated early with a {@link CancellationError}.
 * @return {!Promise} A promise that will resolve when a 2xx is received from
 *     the given URL, or if the wait is cancelled.
 */
function waitForUrl(url, timeout, opt_cancelToken) {
  return new Promise((onResolve, onReject) => {
    let client = new HttpClient(url)
    let request = new HttpRequest('GET', '')
    let start = Date.now()

    let done = false
    let resolve = () => {
      done = true
      onResolve()
    }
    let reject = (err) => {
      done = true
      onReject(err)
    }

    if (opt_cancelToken) {
      opt_cancelToken.then((_) => reject(new CancellationError()))
    }

    testUrl()

    function testUrl() {
      client.send(request).then(onResponse, onError)
    }

    function onError() {
      if (Date.now() - start > timeout) {
        reject(Error('Timed out waiting for the URL to return 2xx: ' + url))
      } else {
        setTimeout(function () {
          if (!done) {
            testUrl()
          }
        }, 50)
      }
    }

    function onResponse(response) {
      if (done) {
        return
      }
      if (response.status > 199 && response.status < 300) {
        resolve()
        return
      }
      onError()
    }
  })
}

// PUBLIC API
module.exports.getStatus = getStatus
module.exports.CancellationError = CancellationError
module.exports.waitForServer = waitForServer
module.exports.waitForUrl = waitForUrl
