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
 * Represents a primitive type.
 * @enum
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-PrimitiveProtocolValue.
 */
const PrimitiveType = {
  UNDEFINED: 'undefined',
  NULL: 'null',
  STRING: 'string',
  NUMBER: 'number',
  SPECIAL_NUMBER: 'number',
  BOOLEAN: 'boolean',
  BIGINT: 'bigint',

  findByName(name) {
    return (
      Object.values(this).find((type) => {
        return typeof type === 'string' && name.toLowerCase() === type.toLowerCase()
      }) || null
    )
  },
}

/**
 * Represents a non-primitive type.
 * @enum
 * Described inhttps://w3c.github.io/webdriver-bidi/#type-script-RemoteValue.
 */
const NonPrimitiveType = {
  ARRAY: 'array',
  DATE: 'date',
  MAP: 'map',
  OBJECT: 'object',
  REGULAR_EXPRESSION: 'regexp',
  SET: 'set',
  CHANNEL: 'channel',

  findByName(name) {
    return (
      Object.values(this).find((type) => {
        return typeof type === 'string' && name.toLowerCase() === type.toLowerCase()
      }) || null
    )
  },
}

/**
 * Represents a remote value type.
 * @enum
 * Described inhttps://w3c.github.io/webdriver-bidi/#type-script-RemoteValue.
 */
const RemoteType = {
  SYMBOL: 'symbol',
  FUNCTION: 'function',
  WEAK_MAP: 'weakmap',
  WEAK_SET: 'weakset',
  ITERATOR: 'iterator',
  GENERATOR: 'generator',
  ERROR: 'error',
  PROXY: 'proxy',
  PROMISE: 'promise',
  TYPED_ARRAY: 'typedarray',
  ARRAY_BUFFER: 'arraybuffer',
  NODE_LIST: 'nodelist',
  HTML_COLLECTION: 'htmlcollection',
  NODE: 'node',
  WINDOW: 'window',

  findByName(name) {
    return (
      Object.values(this).find((type) => {
        return typeof type === 'string' && name.toLowerCase() === type.toLowerCase()
      }) || null
    )
  },
}

/**
 * Represents a special number type.
 * @enum
 * Described in https://w3c.github.io/webdriver-bidi/#type-script-PrimitiveProtocolValue.
 */
const SpecialNumberType = {
  NAN: 'NaN',
  MINUS_ZERO: '-0',
  INFINITY: 'Infinity',
  MINUS_INFINITY: '-Infinity',
}

module.exports = {
  PrimitiveType,
  NonPrimitiveType,
  RemoteType,
  SpecialNumberType,
}
