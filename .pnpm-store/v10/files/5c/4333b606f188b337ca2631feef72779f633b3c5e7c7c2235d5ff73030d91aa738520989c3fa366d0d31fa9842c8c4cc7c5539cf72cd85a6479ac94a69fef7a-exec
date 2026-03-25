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

const WindowState = Object.freeze({
  FULLSCREEN: 'fullscreen',
  MAXIMIZED: 'maximized',
  MINIMIZED: 'minimized',
  NORMAL: 'normal',
})

class ClientWindowInfo {
  /**
   * @param {Object} params Window information parameters
   * @param {string} params.clientWindow Window identifier
   * @param {string} params.state Window state from WindowState
   * @param {number} params.width Window width
   * @param {number} params.height Window height
   * @param {number} params.x Window x coordinate
   * @param {number} params.y Window y coordinate
   * @param {boolean} params.active Whether window is active and can receive keyboard input
   */
  constructor({ clientWindow, state, width, height, x, y, active }) {
    this.clientWindow = clientWindow
    this.state = state
    this.width = width
    this.height = height
    this.x = x
    this.y = y
    this.active = active
  }

  static fromJson(json) {
    return new ClientWindowInfo({
      ...json,
      state: json.state.toLowerCase(),
    })
  }
}

module.exports = { WindowState, ClientWindowInfo }
