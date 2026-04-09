"use strict";

// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var __createBinding = this && this.__createBinding || (Object.create ? function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  var desc = Object.getOwnPropertyDescriptor(m, k);
  if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = {
      enumerable: true,
      get: function () {
        return m[k];
      }
    };
  }
  Object.defineProperty(o, k2, desc);
} : function (o, m, k, k2) {
  if (k2 === undefined) k2 = k;
  o[k2] = m[k];
});
var __setModuleDefault = this && this.__setModuleDefault || (Object.create ? function (o, v) {
  Object.defineProperty(o, "default", {
    enumerable: true,
    value: v
  });
} : function (o, v) {
  o["default"] = v;
});
var __importStar = this && this.__importStar || function () {
  var ownKeys = function (o) {
    ownKeys = Object.getOwnPropertyNames || function (o) {
      var ar = [];
      for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
      return ar;
    };
    return ownKeys(o);
  };
  return function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
  };
}();
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PassThroughShim = void 0;
exports.normalize = normalize;
exports.objectEntries = objectEntries;
exports.fixedEncodeURIComponent = fixedEncodeURIComponent;
exports.encodeURI = encodeURI;
exports.qsStringify = qsStringify;
exports.objectKeyToLowercase = objectKeyToLowercase;
exports.unicodeJSONStringify = unicodeJSONStringify;
exports.convertObjKeysToSnakeCase = convertObjKeysToSnakeCase;
exports.formatAsUTCISO = formatAsUTCISO;
exports.getRuntimeTrackingString = getRuntimeTrackingString;
exports.getUserAgentString = getUserAgentString;
exports.getDirName = getDirName;
exports.getModuleFormat = getModuleFormat;
const path = __importStar(require("path"));
const querystring = __importStar(require("querystring"));
const stream_1 = require("stream");
const url = __importStar(require("url"));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const package_json_helper_cjs_1 = require("./package-json-helper.cjs");
// Done to avoid a problem with mangling of identifiers when using esModuleInterop
const fileURLToPath = url.fileURLToPath;
const isEsm = false;
function normalize(optionsOrCallback, cb) {
  const options = typeof optionsOrCallback === 'object' ? optionsOrCallback : {};
  const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : cb;
  return {
    options,
    callback
  };
}
/**
 * Flatten an object into an Array of arrays, [[key, value], ..].
 * Implements Object.entries() for Node.js <8
 * @internal
 */
function objectEntries(obj) {
  return Object.keys(obj).map(key => [key, obj[key]]);
}
/**
 * Encode `str` with encodeURIComponent, plus these
 * reserved characters: `! * ' ( )`.
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent| MDN: fixedEncodeURIComponent}
 *
 * @param {string} str The URI component to encode.
 * @return {string} The encoded string.
 */
function fixedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}
/**
 * URI encode `uri` for generating signed URLs, using fixedEncodeURIComponent.
 *
 * Encode every byte except `A-Z a-Z 0-9 ~ - . _`.
 *
 * @param {string} uri The URI to encode.
 * @param [boolean=false] encodeSlash If `true`, the "/" character is not encoded.
 * @return {string} The encoded string.
 */
function encodeURI(uri, encodeSlash) {
  // Split the string by `/`, and conditionally rejoin them with either
  // %2F if encodeSlash is `true`, or '/' if `false`.
  return uri.split('/').map(fixedEncodeURIComponent).join(encodeSlash ? '%2F' : '/');
}
/**
 * Serialize an object to a URL query string using util.encodeURI(uri, true).
 * @param {string} url The object to serialize.
 * @return {string} Serialized string.
 */
function qsStringify(qs) {
  return querystring.stringify(qs, '&', '=', {
    encodeURIComponent: component => encodeURI(component, true)
  });
}
function objectKeyToLowercase(object) {
  const newObj = {};
  for (let key of Object.keys(object)) {
    const value = object[key];
    key = key.toLowerCase();
    newObj[key] = value;
  }
  return newObj;
}
/**
 * JSON encode str, with unicode \u+ representation.
 * @param {object} obj The object to encode.
 * @return {string} Serialized string.
 */
function unicodeJSONStringify(obj) {
  return JSON.stringify(obj).replace(/[\u0080-\uFFFF]/g, char => '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4));
}
/**
 * Converts the given objects keys to snake_case
 * @param {object} obj object to convert keys to snake case.
 * @returns {object} object with keys converted to snake case.
 */
function convertObjKeysToSnakeCase(obj) {
  if (obj instanceof Date || obj instanceof RegExp) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(convertObjKeysToSnakeCase);
  }
  if (obj instanceof Object) {
    return Object.keys(obj).reduce((acc, cur) => {
      const s = cur[0].toLocaleLowerCase() + cur.slice(1).replace(/([A-Z]+)/g, (match, p1) => {
        return `_${p1.toLowerCase()}`;
      });
      acc[s] = convertObjKeysToSnakeCase(obj[cur]);
      return acc;
    }, Object());
  }
  return obj;
}
/**
 * Formats the provided date object as a UTC ISO string.
 * @param {Date} dateTimeToFormat date object to be formatted.
 * @param {boolean} includeTime flag to include hours, minutes, seconds in output.
 * @param {string} dateDelimiter delimiter between date components.
 * @param {string} timeDelimiter delimiter between time components.
 * @returns {string} UTC ISO format of provided date object.
 */
function formatAsUTCISO(dateTimeToFormat, includeTime = false, dateDelimiter = '', timeDelimiter = '') {
  const year = dateTimeToFormat.getUTCFullYear();
  const month = dateTimeToFormat.getUTCMonth() + 1;
  const day = dateTimeToFormat.getUTCDate();
  const hour = dateTimeToFormat.getUTCHours();
  const minute = dateTimeToFormat.getUTCMinutes();
  const second = dateTimeToFormat.getUTCSeconds();
  let resultString = `${year.toString().padStart(4, '0')}${dateDelimiter}${month.toString().padStart(2, '0')}${dateDelimiter}${day.toString().padStart(2, '0')}`;
  if (includeTime) {
    resultString = `${resultString}T${hour.toString().padStart(2, '0')}${timeDelimiter}${minute.toString().padStart(2, '0')}${timeDelimiter}${second.toString().padStart(2, '0')}Z`;
  }
  return resultString;
}
/**
 * Examines the runtime environment and returns the appropriate tracking string.
 * @returns {string} metrics tracking string based on the current runtime environment.
 */
function getRuntimeTrackingString() {
  if (
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.Deno &&
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.Deno.version &&
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  globalThis.Deno.version.deno) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return `gl-deno/${globalThis.Deno.version.deno}`;
  } else {
    return `gl-node/${process.versions.node}`;
  }
}
/**
 * Looks at package.json and creates the user-agent string to be applied to request headers.
 * @returns {string} user agent string.
 */
function getUserAgentString() {
  const pkg = (0, package_json_helper_cjs_1.getPackageJSON)();
  const hyphenatedPackageName = pkg.name.replace('@google-cloud', 'gcloud-node') // For legacy purposes.
  .replace('/', '-'); // For UA spec-compliance purposes.
  return hyphenatedPackageName + '/' + pkg.version;
}
function getDirName() {
  let dirToUse = '';
  try {
    dirToUse = __dirname;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dirToUse = __dirname;
  }
  return dirToUse;
}
function getModuleFormat() {
  return isEsm ? 'ESM' : 'CJS';
}
class PassThroughShim extends stream_1.PassThrough {
  constructor() {
    super(...arguments);
    this.shouldEmitReading = true;
    this.shouldEmitWriting = true;
  }
  _read(size) {
    if (this.shouldEmitReading) {
      this.emit('reading');
      this.shouldEmitReading = false;
    }
    super._read(size);
  }
  _write(chunk, encoding, callback) {
    if (this.shouldEmitWriting) {
      this.emit('writing');
      this.shouldEmitWriting = false;
    }
    // Per the nodejs documentation, callback must be invoked on the next tick
    process.nextTick(() => {
      super._write(chunk, encoding, callback);
    });
  }
  _final(callback) {
    // If the stream is empty (i.e. empty file) final will be invoked before _read / _write
    // and we should still emit the proper events.
    if (this.shouldEmitReading) {
      this.emit('reading');
      this.shouldEmitReading = false;
    }
    if (this.shouldEmitWriting) {
      this.emit('writing');
      this.shouldEmitWriting = false;
    }
    callback(null);
  }
}
exports.PassThroughShim = PassThroughShim;
