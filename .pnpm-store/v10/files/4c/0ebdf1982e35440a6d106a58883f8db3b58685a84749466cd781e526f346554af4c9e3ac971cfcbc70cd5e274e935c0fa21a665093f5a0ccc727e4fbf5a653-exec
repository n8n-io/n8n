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

const net = require('node:net')

/**
 * Tests if a port is free.
 * @param {number} port The port to test.
 * @param {string=} opt_host The bound host to test the {@code port} against.
 *     Defaults to {@code INADDR_ANY}.
 * @return {!Promise<boolean>} A promise that will resolve with whether the port
 *     is free.
 */
function isFree(port, opt_host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer().on('error', function (e) {
      if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
        resolve(false)
      } else {
        reject(e)
      }
    })

    server.listen(port, opt_host, function () {
      server.close(() => resolve(true))
    })
  })
}

/**
 * @param {string=} opt_host The bound host to test the {@code port} against.
 *     Defaults to {@code INADDR_ANY}.
 * @return {!Promise<number>} A promise that will resolve to a free port. If a
 *     port cannot be found, the promise will be rejected.
 */

function findFreePort(opt_host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('listening', function () {
      resolve(server.address().port)
      server.close()
    })
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
        resolve('Unable to find a free port')
      } else {
        reject(e)
      }
    })
    // By providing 0 we let the operative system find an arbitrary port
    server.listen(0, opt_host)
  })
}

// PUBLIC API
module.exports = {
  findFreePort,
  isFree,
}
