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

const { PrimitiveType, NonPrimitiveType, RemoteType, SpecialNumberType } = require('./protocolType')

const TYPE_CONSTANT = 'type'
const VALUE_CONSTANT = 'value'
/**
 * Represents the types of remote reference.
 * @enum {string}
 */
const RemoteReferenceType = {
  HANDLE: 'handle',
  SHARED_ID: 'sharedId',
}

/**
 * Represents a local value with a specified type and optional value.
 * @class
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-LocalValue
 */
class LocalValue {
  constructor(type, value = null) {
    if (type === PrimitiveType.UNDEFINED || type === PrimitiveType.NULL) {
      this.type = type
    } else {
      this.type = type
      this.value = value
    }
  }

  /**
   * Creates a new LocalValue object with a string value.
   *
   * @param {string} value - The string value to be stored in the LocalValue object.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createStringValue(value) {
    return new LocalValue(PrimitiveType.STRING, value)
  }

  /**
   * Creates a new LocalValue object with a number value.
   *
   * @param {number} value - The number value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createNumberValue(value) {
    return new LocalValue(PrimitiveType.NUMBER, value)
  }

  /**
   * Creates a new LocalValue object with a special number value.
   *
   * @param {number} value - The value of the special number.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createSpecialNumberValue(value) {
    return new LocalValue(PrimitiveType.SPECIAL_NUMBER, value)
  }

  /**
   * Creates a new LocalValue object with an undefined value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createUndefinedValue() {
    return new LocalValue(PrimitiveType.UNDEFINED)
  }

  /**
   * Creates a new LocalValue object with a null value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createNullValue() {
    return new LocalValue(PrimitiveType.NULL)
  }

  /**
   * Creates a new LocalValue object with a boolean value.
   *
   * @param {boolean} value - The boolean value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createBooleanValue(value) {
    return new LocalValue(PrimitiveType.BOOLEAN, value)
  }

  /**
   * Creates a new LocalValue object with a BigInt value.
   *
   * @param {BigInt} value - The BigInt value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createBigIntValue(value) {
    return new LocalValue(PrimitiveType.BIGINT, value)
  }

  /**
   * Creates a new LocalValue object with an array.
   *
   * @param {Array} value - The array.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createArrayValue(value) {
    return new LocalValue(NonPrimitiveType.ARRAY, value)
  }

  /**
   * Creates a new LocalValue object with date value.
   *
   * @param {string} value - The date.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createDateValue(value) {
    return new LocalValue(NonPrimitiveType.DATE, value)
  }

  /**
   * Creates a new LocalValue object of map value.
   * @param {Map} map - The map.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createMapValue(map) {
    let value = []
    Object.entries(map).forEach((entry) => {
      value.push(entry)
    })
    return new LocalValue(NonPrimitiveType.MAP, value)
  }

  /**
   * Creates a new LocalValue object from the passed object.
   *
   * @param {Object} object - The object.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createObjectValue(object) {
    let value = []
    Object.entries(object).forEach((entry) => {
      value.push(entry)
    })
    return new LocalValue(NonPrimitiveType.OBJECT, value)
  }

  /**
   * Creates a new LocalValue object of regular expression value.
   *
   * @param {string} value - The value of the regular expression.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createRegularExpressionValue(value) {
    return new LocalValue(NonPrimitiveType.REGULAR_EXPRESSION, value)
  }

  /**
   * Creates a new LocalValue object with the specified value.
   * @param {Set} value - The value to be set.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createSetValue(value) {
    return new LocalValue(NonPrimitiveType.SET, value)
  }

  /**
   * Creates a new LocalValue object with the given channel value
   *
   * @param {ChannelValue} value - The channel value.
   * @returns {LocalValue} - The created LocalValue object.
   */
  static createChannelValue(value) {
    return new LocalValue(NonPrimitiveType.CHANNEL, value)
  }

  static createReferenceValue(handle, sharedId) {
    return new ReferenceValue(handle, sharedId)
  }

  static getArgument(argument) {
    let localValue = null

    if (
      argument === SpecialNumberType.NAN ||
      argument === SpecialNumberType.MINUS_ZERO ||
      argument === SpecialNumberType.INFINITY ||
      argument === SpecialNumberType.MINUS_INFINITY
    ) {
      localValue = LocalValue.createSpecialNumberValue(argument)
      return localValue
    }

    const type = typeof argument

    switch (type) {
      case PrimitiveType.STRING:
        localValue = LocalValue.createStringValue(argument)
        break
      case PrimitiveType.NUMBER:
        localValue = LocalValue.createNumberValue(argument)
        break
      case PrimitiveType.BOOLEAN:
        localValue = LocalValue.createBooleanValue(argument)
        break
      case PrimitiveType.BIGINT:
        localValue = LocalValue.createBigIntValue(argument.toString())
        break
      case PrimitiveType.UNDEFINED:
        localValue = LocalValue.createUndefinedValue()
        break
      case NonPrimitiveType.OBJECT:
        if (argument === null) {
          localValue = LocalValue.createNullValue()
          break
        }
        if (argument instanceof Date) {
          localValue = LocalValue.createDateValue(argument)
        } else if (argument instanceof Map) {
          const map = []

          argument.forEach((value, key) => {
            let objectKey
            if (typeof key === 'string') {
              objectKey = key
            } else {
              objectKey = LocalValue.getArgument(key)
            }
            const objectValue = LocalValue.getArgument(value)
            map.push([objectKey, objectValue])
          })
          localValue = new LocalValue(NonPrimitiveType.MAP, map)
        } else if (argument instanceof Set) {
          const set = []
          argument.forEach((value) => {
            set.push(LocalValue.getArgument(value))
          })
          localValue = LocalValue.createSetValue(set)
        } else if (argument instanceof Array) {
          const arr = []
          argument.forEach((value) => {
            arr.push(LocalValue.getArgument(value))
          })
          localValue = LocalValue.createArrayValue(arr)
        } else if (argument instanceof RegExp) {
          localValue = LocalValue.createRegularExpressionValue({
            pattern: argument.source,
            flags: argument.flags,
          })
        } else {
          let value = []
          Object.entries(argument).forEach((entry) => {
            value.push([LocalValue.getArgument(entry[0]), LocalValue.getArgument(entry[1])])
          })
          localValue = new LocalValue(NonPrimitiveType.OBJECT, value)
        }
        break
    }

    return localValue
  }

  asMap() {
    let toReturn = {}
    toReturn[TYPE_CONSTANT] = this.type

    if (!(this.type === PrimitiveType.NULL || this.type === PrimitiveType.UNDEFINED)) {
      toReturn[VALUE_CONSTANT] = this.value
    }
    return toReturn
  }
}

/**
 * Represents a remote value.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-RemoteValue.
 * @class
 */
class RemoteValue {
  constructor(remoteValue) {
    this.type = null
    this.handle = null
    this.internalId = null
    this.value = null
    this.sharedId = null

    if ('type' in remoteValue) {
      const typeString = remoteValue['type']
      if (PrimitiveType.findByName(typeString) != null) {
        this.type = PrimitiveType.findByName(typeString)
      } else if (NonPrimitiveType.findByName(typeString) != null) {
        this.type = NonPrimitiveType.findByName(typeString)
      } else {
        this.type = RemoteType.findByName(typeString)
      }
    }

    if ('handle' in remoteValue) {
      this.handle = remoteValue['handle']
    }

    if ('internalId' in remoteValue) {
      this.internalId = remoteValue['internalId']
    }

    if ('value' in remoteValue) {
      this.value = remoteValue['value']
    }

    if ('sharedId' in remoteValue) {
      this.sharedId = remoteValue['sharedId']
    }

    if (this.value != null) {
      this.value = this.deserializeValue(this.value, this.type)
    }
  }

  deserializeValue(value, type) {
    if (type === NonPrimitiveType.OBJECT) {
      return Object.fromEntries(value)
    } else if (type === NonPrimitiveType.REGULAR_EXPRESSION) {
      return new RegExpValue(value.pattern, value.flags)
    }
    return value
  }
}

/**
 * Represents a reference value in the protocol.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-RemoteReference.
 */
class ReferenceValue {
  #handle
  #sharedId

  /**
   * Constructs a new ReferenceValue object.
   * @param {string} handle - The handle value.
   * @param {string} sharedId - The shared ID value.
   */
  constructor(handle, sharedId) {
    if (handle === RemoteReferenceType.HANDLE) {
      this.#handle = sharedId
    } else if (handle === RemoteReferenceType.SHARED_ID) {
      this.#sharedId = sharedId
    } else {
      this.#handle = handle
      this.#sharedId = sharedId
    }
  }

  asMap() {
    const toReturn = {}
    if (this.#handle != null) {
      toReturn[RemoteReferenceType.HANDLE] = this.#handle
    }

    if (this.#sharedId != null) {
      toReturn[RemoteReferenceType.SHARED_ID] = this.#sharedId
    }

    return toReturn
  }
}

/**
 * Represents a regular expression value.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-LocalValue.
 */
class RegExpValue {
  /**
   * Constructs a new RegExpValue object.
   * @param {string} pattern - The pattern of the regular expression.
   * @param {string|null} [flags=null] - The flags of the regular expression.
   */
  constructor(pattern, flags = null) {
    this.pattern = pattern
    this.flags = flags
  }
}

/**
 * Represents serialization options.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-SerializationOptions.
 */
class SerializationOptions {
  /**
   * Constructs a new instance of SerializationOptions.
   * @param {number} [maxDomDepth=0] - The maximum depth to serialize the DOM.
   * @param {number|null} [maxObjectDepth=null] - The maximum depth to serialize objects.
   * @param {'none'|'open'|'all'} [includeShadowTree='none'] - The inclusion level of the shadow tree.
   * @throws {Error} If the `includeShadowTree` value is not one of 'none', 'open', or 'all'.
   */
  constructor(maxDomDepth = 0, maxObjectDepth = null, includeShadowTree = 'none') {
    this._maxDomDepth = maxDomDepth
    this._maxObjectDepth = maxObjectDepth

    if (['none', 'open', 'all'].includes(includeShadowTree)) {
      throw Error(`Valid types are 'none', 'open', and 'all'. Received: ${includeShadowTree}`)
    }
    this._includeShadowTree = includeShadowTree
  }
}

/**
 * Represents a channel value.
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-ChannelValue.
 * @class
 */
class ChannelValue {
  constructor(channel, options = undefined, resultOwnership = undefined) {
    this.channel = channel

    if (options !== undefined) {
      if (options instanceof SerializationOptions) {
        this.options = options
      } else {
        throw Error(`Pass in SerializationOptions object. Received: ${options} `)
      }
    }

    if (resultOwnership !== undefined) {
      if (['root', 'none'].includes(resultOwnership)) {
        this.resultOwnership = resultOwnership
      } else {
        throw Error(`Valid types are 'root' and 'none. Received: ${resultOwnership}`)
      }
    }
  }
}

module.exports = {
  ChannelValue,
  LocalValue,
  RemoteValue,
  ReferenceValue,
  RemoteReferenceType,
  RegExpValue,
  SerializationOptions,
}
