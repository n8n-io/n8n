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
 * Represents the types of realms.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-RealmType.
 * @enum
 */
const RealmType = {
  AUDIO_WORKLET: 'audio-worklet',
  DEDICATED_WORKER: 'dedicated-worker',
  PAINT_WORKLET: 'paint-worklet',
  SERVICE_WORKED: 'service-worker',
  SHARED_WORKED: 'shared-worker',
  WINDOW: 'window',
  WORKER: 'worker',
  WORKLET: 'worklet',

  findByName(name) {
    return (
      Object.values(this).find((type) => {
        return typeof type === 'string' && name.toLowerCase() === type.toLowerCase()
      }) || null
    )
  },
}

/**
 * Represents information about a realm.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-RealmInfo.
 */
class RealmInfo {
  /**
   * Constructs a new RealmInfo object.
   * @param {string} realmId - The ID of the realm.
   * @param {string} origin - The origin of the realm.
   * @param {string} realmType - The type of the realm.
   */
  constructor(realmId, origin, realmType) {
    this.realmId = realmId
    this.origin = origin
    this.realmType = realmType
  }

  static fromJson(input) {
    let realmId = null
    let origin = null
    let realmType = null
    let browsingContext = null
    let sandbox = null

    if ('type' in input) {
      let typeString = input['type']
      realmType = RealmType.findByName(typeString)
    }

    if ('realm' in input) {
      realmId = input['realm']
    }

    if ('origin' in input) {
      origin = input['origin']
    }

    if ('context' in input) {
      browsingContext = input['context']
    }

    if ('sandbox' in input) {
      sandbox = input['sandbox']
    }

    if (realmType === RealmType.WINDOW) {
      return new WindowRealmInfo(realmId, origin, realmType, browsingContext, sandbox)
    }

    return new RealmInfo(realmId, origin, realmType)
  }
}

/**
 * Represents information about a window realm.
 * @extends RealmInfo
 */
class WindowRealmInfo extends RealmInfo {
  /**
   * Constructs a new instance of the WindowRealmInfo class.
   * @param {string} realmId - The ID of the realm.
   * @param {string} origin - The origin of the realm.
   * @param {string} realmType - The type of the realm.
   * @param {string} browsingContext - The browsing context of the realm.
   * @param {string|null} sandbox - The sandbox of the realm (optional).
   */
  constructor(realmId, origin, realmType, browsingContext, sandbox = null) {
    super(realmId, origin, realmType)
    this.browsingContext = browsingContext
    this.sandbox = sandbox
  }
}

module.exports = {
  RealmInfo,
  RealmType,
  WindowRealmInfo,
}
