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
 * Represents the type of script evaluation result.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-EvaluateResult.
 * @enum {string}
 */
const EvaluateResultType = {
  SUCCESS: 'success',
  EXCEPTION: 'exception',
}

/**
 * Represents a successful evaluation result.
 * @class
 */
class EvaluateResultSuccess {
  constructor(realmId, value) {
    this.resultType = EvaluateResultType.SUCCESS
    this.realmId = realmId
    this.result = value
  }
}

/**
 * Represents an exception that occurred during evaluation of a result.
 * @class
 */
class EvaluateResultException {
  constructor(realmId, exceptionDetails) {
    this.resultType = EvaluateResultType.EXCEPTION
    this.realmId = realmId
    this.exceptionDetails = exceptionDetails
  }
}

/**
 * Represents details of an exception.
 * @class
 */
class ExceptionDetails {
  constructor(exceptionDetails) {
    this.columnNumber = 'columnNumber' in exceptionDetails ? exceptionDetails['columnNumber'] : null
    this.exception = 'exception' in exceptionDetails ? exceptionDetails['exception'] : null
    this.lineNumber = 'lineNumber' in exceptionDetails ? exceptionDetails['lineNumber'] : null
    this.stackTrace = 'stackTrace' in exceptionDetails ? exceptionDetails['stackTrace'] : null
    this.text = 'text' in exceptionDetails ? exceptionDetails['text'] : null
  }
}

module.exports = {
  EvaluateResultType,
  EvaluateResultSuccess,
  EvaluateResultException,
  ExceptionDetails,
}
