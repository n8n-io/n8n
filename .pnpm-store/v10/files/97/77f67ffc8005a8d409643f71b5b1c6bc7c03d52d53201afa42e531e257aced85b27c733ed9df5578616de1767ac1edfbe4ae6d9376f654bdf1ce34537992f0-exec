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
 * @fileoverview Contains several classes for handling commands.
 */

'use strict'

/**
 * Describes a command to execute.
 * @final
 */
class Command {
  /** @param {string} name The name of this command. */
  constructor(name) {
    /** @private {string} */
    this.name_ = name

    /** @private {!Object<*>} */
    this.parameters_ = {}
  }

  /** @return {string} This command's name. */
  getName() {
    return this.name_
  }

  /**
   * Sets a parameter to send with this command.
   * @param {string} name The parameter name.
   * @param {*} value The parameter value.
   * @return {!Command} A self reference.
   */
  setParameter(name, value) {
    this.parameters_[name] = value
    return this
  }

  /**
   * Sets the parameters for this command.
   * @param {!Object<*>} parameters The command parameters.
   * @return {!Command} A self reference.
   */
  setParameters(parameters) {
    this.parameters_ = parameters
    return this
  }

  /**
   * Returns a named command parameter.
   * @param {string} key The parameter key to look up.
   * @return {*} The parameter value, or undefined if it has not been set.
   */
  getParameter(key) {
    return this.parameters_[key]
  }

  /**
   * @return {!Object<*>} The parameters to send with this command.
   */
  getParameters() {
    return this.parameters_
  }
}

/**
 * Enumeration of predefined names command names that all command processors
 * will support.
 * @enum {string}
 */
const Name = {
  GET_SERVER_STATUS: 'getStatus',

  NEW_SESSION: 'newSession',
  GET_SESSIONS: 'getSessions',

  CLOSE: 'close',
  QUIT: 'quit',

  GET_CURRENT_URL: 'getCurrentUrl',
  GET: 'get',
  GO_BACK: 'goBack',
  GO_FORWARD: 'goForward',
  REFRESH: 'refresh',

  ADD_COOKIE: 'addCookie',
  GET_COOKIE: 'getCookie',
  GET_ALL_COOKIES: 'getCookies',
  DELETE_COOKIE: 'deleteCookie',
  DELETE_ALL_COOKIES: 'deleteAllCookies',

  GET_ACTIVE_ELEMENT: 'getActiveElement',
  FIND_ELEMENT: 'findElement',
  FIND_ELEMENTS: 'findElements',
  FIND_ELEMENTS_RELATIVE: 'findElementsRelative',
  FIND_CHILD_ELEMENT: 'findChildElement',
  FIND_CHILD_ELEMENTS: 'findChildElements',

  CLEAR_ELEMENT: 'clearElement',
  CLICK_ELEMENT: 'clickElement',
  SEND_KEYS_TO_ELEMENT: 'sendKeysToElement',

  GET_CURRENT_WINDOW_HANDLE: 'getCurrentWindowHandle',
  GET_WINDOW_HANDLES: 'getWindowHandles',
  GET_WINDOW_RECT: 'getWindowRect',
  SET_WINDOW_RECT: 'setWindowRect',
  MAXIMIZE_WINDOW: 'maximizeWindow',
  MINIMIZE_WINDOW: 'minimizeWindow',
  FULLSCREEN_WINDOW: 'fullscreenWindow',

  SWITCH_TO_WINDOW: 'switchToWindow',
  SWITCH_TO_NEW_WINDOW: 'newWindow',
  SWITCH_TO_FRAME: 'switchToFrame',
  SWITCH_TO_FRAME_PARENT: 'switchToFrameParent',
  GET_PAGE_SOURCE: 'getPageSource',
  GET_TITLE: 'getTitle',

  EXECUTE_SCRIPT: 'executeScript',
  EXECUTE_ASYNC_SCRIPT: 'executeAsyncScript',

  GET_ELEMENT_TEXT: 'getElementText',
  GET_COMPUTED_ROLE: 'getAriaRole',
  GET_COMPUTED_LABEL: 'getAccessibleName',
  GET_ELEMENT_TAG_NAME: 'getElementTagName',
  IS_ELEMENT_SELECTED: 'isElementSelected',
  IS_ELEMENT_ENABLED: 'isElementEnabled',
  IS_ELEMENT_DISPLAYED: 'isElementDisplayed',
  GET_ELEMENT_RECT: 'getElementRect',
  GET_ELEMENT_ATTRIBUTE: 'getElementAttribute',
  GET_DOM_ATTRIBUTE: 'getDomAttribute',
  GET_ELEMENT_VALUE_OF_CSS_PROPERTY: 'getElementValueOfCssProperty',
  GET_ELEMENT_PROPERTY: 'getElementProperty',

  SCREENSHOT: 'screenshot',
  TAKE_ELEMENT_SCREENSHOT: 'takeElementScreenshot',

  PRINT_PAGE: 'printPage',

  GET_TIMEOUT: 'getTimeout',
  SET_TIMEOUT: 'setTimeout',

  ACCEPT_ALERT: 'acceptAlert',
  DISMISS_ALERT: 'dismissAlert',
  GET_ALERT_TEXT: 'getAlertText',
  SET_ALERT_TEXT: 'setAlertValue',

  // Shadow DOM Commands
  GET_SHADOW_ROOT: 'getShadowRoot',
  FIND_ELEMENT_FROM_SHADOWROOT: 'findElementFromShadowRoot',
  FIND_ELEMENTS_FROM_SHADOWROOT: 'findElementsFromShadowRoot',

  // Virtual Authenticator Commands
  ADD_VIRTUAL_AUTHENTICATOR: 'addVirtualAuthenticator',
  REMOVE_VIRTUAL_AUTHENTICATOR: 'removeVirtualAuthenticator',
  ADD_CREDENTIAL: 'addCredential',
  GET_CREDENTIALS: 'getCredentials',
  REMOVE_CREDENTIAL: 'removeCredential',
  REMOVE_ALL_CREDENTIALS: 'removeAllCredentials',
  SET_USER_VERIFIED: 'setUserVerified',

  GET_AVAILABLE_LOG_TYPES: 'getAvailableLogTypes',
  GET_LOG: 'getLog',

  // Non-standard commands used by the standalone Selenium server.
  UPLOAD_FILE: 'uploadFile',

  ACTIONS: 'actions',
  CLEAR_ACTIONS: 'clearActions',

  GET_DOWNLOADABLE_FILES: 'getDownloadableFiles',
  DOWNLOAD_FILE: 'downloadFile',
  DELETE_DOWNLOADABLE_FILES: 'deleteDownloadableFiles',

  // Federated Credential Management API
  // https://www.w3.org/TR/fedcm/#automation
  CANCEL_DIALOG: 'cancelDialog',
  SELECT_ACCOUNT: 'selectAccount',
  GET_ACCOUNTS: 'getAccounts',
  GET_FEDCM_TITLE: 'getFedCmTitle',
  GET_FEDCM_DIALOG_TYPE: 'getFedCmDialogType',
  SET_DELAY_ENABLED: 'setDelayEnabled',
  RESET_COOLDOWN: 'resetCooldown',
  CLICK_DIALOG_BUTTON: 'clickdialogbutton',
}

/**
 * Handles the execution of WebDriver {@link Command commands}.
 * @record
 */
class Executor {
  /**
   * Executes the given {@code command}. If there is an error executing the
   * command, the provided callback will be invoked with the offending error.
   * Otherwise, the callback will be invoked with a null Error and non-null
   * response object.
   *
   * @param {!Command} command The command to execute.
   * @return {!Promise<?>} A promise that will be fulfilled with the command
   *     result.
   */
  execute(command) {} // eslint-disable-line
}

// PUBLIC API

module.exports = {
  Command,
  Name,
  Executor,
}
