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

/**
 * Protocol for virtual authenticators
 * @enum {string}
 */
const Protocol = {
  CTAP2: 'ctap2',
  U2F: 'ctap1/u2f',
}

/**
 * AuthenticatorTransport values
 * @enum {string}
 */
const Transport = {
  BLE: 'ble',
  USB: 'usb',
  NFC: 'nfc',
  INTERNAL: 'internal',
}

/**
 * Options for the creation of virtual authenticators.
 * @see http://w3c.github.io/webauthn/#sctn-automation
 */
class VirtualAuthenticatorOptions {
  /**
   * Constructor to initialise VirtualAuthenticatorOptions object.
   */
  constructor() {
    this._protocol = Protocol['CTAP2']
    this._transport = Transport['USB']
    this._hasResidentKey = false
    this._hasUserVerification = false
    this._isUserConsenting = true
    this._isUserVerified = false
  }

  getProtocol() {
    return this._protocol
  }

  setProtocol(protocol) {
    this._protocol = protocol
  }

  getTransport() {
    return this._transport
  }

  setTransport(transport) {
    this._transport = transport
  }

  getHasResidentKey() {
    return this._hasResidentKey
  }

  setHasResidentKey(value) {
    this._hasResidentKey = value
  }

  getHasUserVerification() {
    return this._hasUserVerification
  }

  setHasUserVerification(value) {
    this._hasUserVerification = value
  }

  getIsUserConsenting() {
    return this._isUserConsenting
  }

  setIsUserConsenting(value) {
    this._isUserConsenting = value
  }

  getIsUserVerified() {
    return this._isUserVerified
  }

  setIsUserVerified(value) {
    this._isUserVerified = value
  }

  toDict() {
    return {
      protocol: this.getProtocol(),
      transport: this.getTransport(),
      hasResidentKey: this.getHasResidentKey(),
      hasUserVerification: this.getHasUserVerification(),
      isUserConsenting: this.getIsUserConsenting(),
      isUserVerified: this.getIsUserVerified(),
    }
  }
}

/**
 * A credential stored in a virtual authenticator.
 * @see https://w3c.github.io/webauthn/#credential-parameters
 */
class Credential {
  constructor(credentialId, isResidentCredential, rpId, userHandle, privateKey, signCount) {
    this._id = credentialId
    this._isResidentCredential = isResidentCredential
    this._rpId = rpId
    this._userHandle = userHandle
    this._privateKey = privateKey
    this._signCount = signCount
  }

  static createResidentCredential(id, rpId, userHandle, privateKey, signCount) {
    return new Credential(id, true, rpId, userHandle, privateKey, signCount)
  }

  static createNonResidentCredential(id, rpId, privateKey, signCount) {
    return new Credential(id, false, rpId, null, privateKey, signCount)
  }

  id() {
    return this._id
  }

  isResidentCredential() {
    return this._isResidentCredential
  }

  rpId() {
    return this._rpId
  }

  userHandle() {
    if (this._userHandle != null) {
      return this._userHandle
    }
    return null
  }

  privateKey() {
    return this._privateKey
  }

  signCount() {
    return this._signCount
  }

  /**
   * Creates a resident (i.e. stateless) credential.
   * @param id Unique base64 encoded string.
   * @param rpId Relying party identifier.
   * @param userHandle userHandle associated to the credential. Must be Base64 encoded string.
   * @param privateKey Base64 encoded PKCS
   * @param signCount initial value for a signature counter.
   * @deprecated This method has been made static. Call it with class name. Example, Credential.createResidentCredential()
   * @returns A resident credential
   */
  createResidentCredential(id, rpId, userHandle, privateKey, signCount) {
    return new Credential(id, true, rpId, userHandle, privateKey, signCount)
  }

  /**
   * Creates a non-resident (i.e. stateless) credential.
   * @param id Unique base64 encoded string.
   * @param rpId Relying party identifier.
   * @param privateKey Base64 encoded PKCS
   * @param signCount initial value for a signature counter.
   * @deprecated This method has been made static. Call it with class name. Example, Credential.createNonResidentCredential()
   * @returns A non-resident credential
   */
  createNonResidentCredential(id, rpId, privateKey, signCount) {
    return new Credential(id, false, rpId, null, privateKey, signCount)
  }

  toDict() {
    let credentialData = {
      credentialId: Buffer.from(this._id).toString('base64url'),
      isResidentCredential: this._isResidentCredential,
      rpId: this._rpId,
      privateKey: Buffer.from(this._privateKey, 'binary').toString('base64url'),
      signCount: this._signCount,
    }

    if (this.userHandle() != null) {
      credentialData['userHandle'] = Buffer.from(this._userHandle).toString('base64url')
    }

    return credentialData
  }

  /**
   * Creates a credential from a map.
   */
  fromDict(data) {
    let id = new Uint8Array(Buffer.from(data['credentialId'], 'base64url'))
    let isResidentCredential = data['isResidentCredential']
    let rpId = data['rpId']
    let privateKey = Buffer.from(data['privateKey'], 'base64url').toString('binary')
    let signCount = data['signCount']
    let userHandle

    if ('userHandle' in data) {
      userHandle = new Uint8Array(Buffer.from(data['userHandle'], 'base64url'))
    } else {
      userHandle = null
    }
    return new Credential(id, isResidentCredential, rpId, userHandle, privateKey, signCount)
  }
}

// PUBLIC API

module.exports = {
  Credential,
  VirtualAuthenticatorOptions,
  Transport,
  Protocol,
}
