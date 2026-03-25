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

class HttpResponse {
  /**
   * Creates a HTTP Response that will be used to
   * mock out network interceptions.
   * @param {*} urlToIntercept
   */
  constructor(urlToIntercept = '') {
    this.returnBody = ''
    this.returnHeaders = []
    this.returnMethod = 'GET'
    this.returnStatus = 200
    this.urlToIntercept = urlToIntercept
  }

  /**
   * Add headers that will be returned when we intercept
   * a HTTP Request
   * @param {*} header
   * @param {*} value
   */
  addHeaders(header, value) {
    this.returnHeaders.push({ name: header, value: value })
  }

  get headers() {
    return this.returnHeaders
  }

  /**
   * Set the STATUS value of the returned HTTP Request
   * @param {*} value
   */
  set status(value) {
    // Add in check that his should be a number
    this.returnStatus = value
  }

  get status() {
    return this.returnStatus
  }

  /**
   * Sets the value of the body of the HTTP Request that
   * will be returned.
   * @param {*} value
   */
  set body(value) {
    this.returnBody = value
  }

  get body() {
    let buff = Buffer.from(this.returnBody, 'utf-8')
    return buff.toString('base64')
  }

  /**
   * Sets the method of the HTTP Request
   * @param {*} value the method of the request.
   */
  set method(value) {
    this.returnMethod = value
  }

  /**
   * Returns the Method to be used in the intercept
   */
  get method() {
    return this.returnMethod
  }
}

exports.HttpResponse = HttpResponse
