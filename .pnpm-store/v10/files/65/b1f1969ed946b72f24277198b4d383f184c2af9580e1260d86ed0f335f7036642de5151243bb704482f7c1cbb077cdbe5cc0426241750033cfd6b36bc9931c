/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as http2 from 'http2';
import { log } from './logging';
import { LogVerbosity } from './constants';
import { getErrorMessage } from './error';
const LEGAL_KEY_REGEX = /^[0-9a-z_.-]+$/;
const LEGAL_NON_BINARY_VALUE_REGEX = /^[ -~]*$/;

export type MetadataValue = string | Buffer;
export type MetadataObject = Map<string, MetadataValue[]>;

function isLegalKey(key: string): boolean {
  return LEGAL_KEY_REGEX.test(key);
}

function isLegalNonBinaryValue(value: string): boolean {
  return LEGAL_NON_BINARY_VALUE_REGEX.test(value);
}

function isBinaryKey(key: string): boolean {
  return key.endsWith('-bin');
}

function isCustomMetadata(key: string): boolean {
  return !key.startsWith('grpc-');
}

function normalizeKey(key: string): string {
  return key.toLowerCase();
}

function validate(key: string, value?: MetadataValue): void {
  if (!isLegalKey(key)) {
    throw new Error('Metadata key "' + key + '" contains illegal characters');
  }

  if (value !== null && value !== undefined) {
    if (isBinaryKey(key)) {
      if (!Buffer.isBuffer(value)) {
        throw new Error("keys that end with '-bin' must have Buffer values");
      }
    } else {
      if (Buffer.isBuffer(value)) {
        throw new Error(
          "keys that don't end with '-bin' must have String values"
        );
      }
      if (!isLegalNonBinaryValue(value)) {
        throw new Error(
          'Metadata string value "' + value + '" contains illegal characters'
        );
      }
    }
  }
}

export interface MetadataOptions {
  /* Signal that the request is idempotent. Defaults to false */
  idempotentRequest?: boolean;
  /* Signal that the call should not return UNAVAILABLE before it has
   * started. Defaults to false. */
  waitForReady?: boolean;
  /* Signal that the call is cacheable. GRPC is free to use GET verb.
   * Defaults to false */
  cacheableRequest?: boolean;
  /* Signal that the initial metadata should be corked. Defaults to false. */
  corked?: boolean;
}

/**
 * A class for storing metadata. Keys are normalized to lowercase ASCII.
 */
export class Metadata {
  protected internalRepr: MetadataObject = new Map<string, MetadataValue[]>();
  private options: MetadataOptions;

  constructor(options: MetadataOptions = {}) {
    this.options = options;
  }

  /**
   * Sets the given value for the given key by replacing any other values
   * associated with that key. Normalizes the key.
   * @param key The key to whose value should be set.
   * @param value The value to set. Must be a buffer if and only
   *   if the normalized key ends with '-bin'.
   */
  set(key: string, value: MetadataValue): void {
    key = normalizeKey(key);
    validate(key, value);
    this.internalRepr.set(key, [value]);
  }

  /**
   * Adds the given value for the given key by appending to a list of previous
   * values associated with that key. Normalizes the key.
   * @param key The key for which a new value should be appended.
   * @param value The value to add. Must be a buffer if and only
   *   if the normalized key ends with '-bin'.
   */
  add(key: string, value: MetadataValue): void {
    key = normalizeKey(key);
    validate(key, value);

    const existingValue: MetadataValue[] | undefined =
      this.internalRepr.get(key);

    if (existingValue === undefined) {
      this.internalRepr.set(key, [value]);
    } else {
      existingValue.push(value);
    }
  }

  /**
   * Removes the given key and any associated values. Normalizes the key.
   * @param key The key whose values should be removed.
   */
  remove(key: string): void {
    key = normalizeKey(key);
    // validate(key);
    this.internalRepr.delete(key);
  }

  /**
   * Gets a list of all values associated with the key. Normalizes the key.
   * @param key The key whose value should be retrieved.
   * @return A list of values associated with the given key.
   */
  get(key: string): MetadataValue[] {
    key = normalizeKey(key);
    // validate(key);
    return this.internalRepr.get(key) || [];
  }

  /**
   * Gets a plain object mapping each key to the first value associated with it.
   * This reflects the most common way that people will want to see metadata.
   * @return A key/value mapping of the metadata.
   */
  getMap(): { [key: string]: MetadataValue } {
    const result: { [key: string]: MetadataValue } = {};

    for (const [key, values] of this.internalRepr) {
      if (values.length > 0) {
        const v = values[0];
        result[key] = Buffer.isBuffer(v) ? Buffer.from(v) : v;
      }
    }
    return result;
  }

  /**
   * Clones the metadata object.
   * @return The newly cloned object.
   */
  clone(): Metadata {
    const newMetadata = new Metadata(this.options);
    const newInternalRepr = newMetadata.internalRepr;

    for (const [key, value] of this.internalRepr) {
      const clonedValue: MetadataValue[] = value.map(v => {
        if (Buffer.isBuffer(v)) {
          return Buffer.from(v);
        } else {
          return v;
        }
      });

      newInternalRepr.set(key, clonedValue);
    }

    return newMetadata;
  }

  /**
   * Merges all key-value pairs from a given Metadata object into this one.
   * If both this object and the given object have values in the same key,
   * values from the other Metadata object will be appended to this object's
   * values.
   * @param other A Metadata object.
   */
  merge(other: Metadata): void {
    for (const [key, values] of other.internalRepr) {
      const mergedValue: MetadataValue[] = (
        this.internalRepr.get(key) || []
      ).concat(values);

      this.internalRepr.set(key, mergedValue);
    }
  }

  setOptions(options: MetadataOptions) {
    this.options = options;
  }

  getOptions(): MetadataOptions {
    return this.options;
  }

  /**
   * Creates an OutgoingHttpHeaders object that can be used with the http2 API.
   */
  toHttp2Headers(): http2.OutgoingHttpHeaders {
    // NOTE: Node <8.9 formats http2 headers incorrectly.
    const result: http2.OutgoingHttpHeaders = {};

    for (const [key, values] of this.internalRepr) {
      // We assume that the user's interaction with this object is limited to
      // through its public API (i.e. keys and values are already validated).
      result[key] = values.map(bufToString);
    }

    return result;
  }

  /**
   * This modifies the behavior of JSON.stringify to show an object
   * representation of the metadata map.
   */
  toJSON() {
    const result: { [key: string]: MetadataValue[] } = {};
    for (const [key, values] of this.internalRepr) {
      result[key] = values;
    }
    return result;
  }

  /**
   * Returns a new Metadata object based fields in a given IncomingHttpHeaders
   * object.
   * @param headers An IncomingHttpHeaders object.
   */
  static fromHttp2Headers(headers: http2.IncomingHttpHeaders): Metadata {
    const result = new Metadata();
    for (const key of Object.keys(headers)) {
      // Reserved headers (beginning with `:`) are not valid keys.
      if (key.charAt(0) === ':') {
        continue;
      }

      const values = headers[key];

      try {
        if (isBinaryKey(key)) {
          if (Array.isArray(values)) {
            values.forEach(value => {
              result.add(key, Buffer.from(value, 'base64'));
            });
          } else if (values !== undefined) {
            if (isCustomMetadata(key)) {
              values.split(',').forEach(v => {
                result.add(key, Buffer.from(v.trim(), 'base64'));
              });
            } else {
              result.add(key, Buffer.from(values, 'base64'));
            }
          }
        } else {
          if (Array.isArray(values)) {
            values.forEach(value => {
              result.add(key, value);
            });
          } else if (values !== undefined) {
            result.add(key, values);
          }
        }
      } catch (error) {
        const message = `Failed to add metadata entry ${key}: ${values}. ${getErrorMessage(
          error
        )}. For more information see https://github.com/grpc/grpc-node/issues/1173`;
        log(LogVerbosity.ERROR, message);
      }
    }

    return result;
  }
}

const bufToString = (val: string | Buffer): string => {
  return Buffer.isBuffer(val) ? val.toString('base64') : val;
};
