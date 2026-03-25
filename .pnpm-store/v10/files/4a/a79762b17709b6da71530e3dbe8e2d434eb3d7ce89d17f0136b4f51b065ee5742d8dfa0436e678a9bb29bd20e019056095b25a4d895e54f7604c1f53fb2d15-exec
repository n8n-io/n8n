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
 * Represents information about a browsing context.
 * Described in https://w3c.github.io/webdriver-bidi/#type-browsingContext-Info
 */
class BrowsingContextInfo {
  constructor(id, url, children, parentBrowsingContext) {
    this._id = id
    this._url = url
    this._children = children
    this._parentBrowsingContext = parentBrowsingContext
  }

  /**
   * Get the ID of the browsing context.
   * @returns {string} The ID of the browsing context.
   */
  get id() {
    return this._id
  }

  /**
   * Get the URL of the browsing context.
   * @returns {string} The URL of the browsing context.
   */
  get url() {
    return this._url
  }

  /**
   * Get the children of the browsing context.
   * @returns {Array<BrowsingContextInfo>} The children of the browsing context.
   */
  get children() {
    return this._children
  }

  /**
   * Get the parent browsing context.
   * @returns {BrowsingContextInfo} The parent browsing context.
   */
  get parentBrowsingContext() {
    return this._parentBrowsingContext
  }
}

/**
 * Represents information about a navigation.
 * Described in https://w3c.github.io/webdriver-bidi/#type-browsingContext-NavigationInfo.
 */
class NavigationInfo {
  /**
   * Constructs a new NavigationInfo object.
   * @param {string} browsingContextId - The ID of the browsing context.
   * @param {string} navigationId - The ID of the navigation.
   * @param {number} timestamp - The timestamp of the navigation.
   * @param {string} url - The URL of the page navigated to.
   */
  constructor(browsingContextId, navigationId, timestamp, url) {
    this.browsingContextId = browsingContextId
    this.navigationId = navigationId
    this.timestamp = timestamp
    this.url = url
  }
}

class UserPromptOpened {
  constructor(browsingContextId, type, message) {
    this.browsingContextId = browsingContextId
    this.type = type
    this.message = message
  }
}

class UserPromptClosed {
  constructor(browsingContextId, accepted, userText = undefined) {
    this.browsingContextId = browsingContextId
    this.accepted = accepted
    this.userText = userText
  }
}

module.exports = { BrowsingContextInfo, NavigationInfo, UserPromptOpened, UserPromptClosed }
