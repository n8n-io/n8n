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

const crypto = require('node:crypto')

class PinnedScript {
  constructor(script) {
    this.scriptSource_ = script
    // eslint-disable-next-line
    this.scriptHandle_ = crypto.randomUUID().replace(/-/gi, '')
  }

  get handle() {
    return this.scriptHandle_
  }

  get source() {
    return this.scriptSource_
  }

  get scriptId() {
    return this.scriptId_
  }

  set scriptId(id) {
    this.scriptId_ = id
  }

  creationScript() {
    return `function __webdriver_${this.scriptHandle_}(arguments) { ${this.scriptSource_} }`
  }

  executionScript() {
    return `return __webdriver_${this.scriptHandle_}(arguments)`
  }

  removalScript() {
    return `__webdriver_${this.scriptHandle_} = undefined`
  }
}

// PUBLIC API

module.exports = {
  PinnedScript,
}
