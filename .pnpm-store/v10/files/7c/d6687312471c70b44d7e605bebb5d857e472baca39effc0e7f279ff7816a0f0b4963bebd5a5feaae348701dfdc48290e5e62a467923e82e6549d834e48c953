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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = exports.Iam = exports.HmacKey = exports.File = exports.Channel = exports.Bucket = exports.Storage = exports.RETRYABLE_ERR_FN_DEFAULT = exports.IdempotencyStrategy = exports.ApiError = void 0;
/**
 * The `@google-cloud/storage` package has a single named export which is the
 * {@link Storage} (ES6) class, which should be instantiated with `new`.
 *
 * See {@link Storage} and {@link ClientConfig} for client methods and
 * configuration options.
 *
 * @module {Storage} @google-cloud/storage
 * @alias nodejs-storage
 *
 * @example
 * Install the client library with <a href="https://www.npmjs.com/">npm</a>:
 * ```
 * npm install --save @google-cloud/storage
 * ```
 *
 * @example
 * Import the client library
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * ```
 *
 * @example
 * Create a client that uses <a
 * href="https://cloud.google.com/docs/authentication/production#providing_credentials_to_your_application">Application
 * Default Credentials (ADC)</a>:
 * ```
 * const storage = new Storage();
 * ```
 *
 * @example
 * Create a client with <a
 * href="https://cloud.google.com/docs/authentication/production#obtaining_and_providing_service_account_credentials_manually">explicit
 * credentials</a>:
 * ```
 * const storage = new Storage({ projectId:
 * 'your-project-id', keyFilename: '/path/to/keyfile.json'
 * });
 * ```
 *
 * @example <caption>include:samples/quickstart.js</caption>
 * region_tag:storage_quickstart
 * Full quickstart example:
 */
var index_js_1 = require("./nodejs-common/index.js");
Object.defineProperty(exports, "ApiError", { enumerable: true, get: function () { return index_js_1.ApiError; } });
var storage_js_1 = require("./storage.js");
Object.defineProperty(exports, "IdempotencyStrategy", { enumerable: true, get: function () { return storage_js_1.IdempotencyStrategy; } });
Object.defineProperty(exports, "RETRYABLE_ERR_FN_DEFAULT", { enumerable: true, get: function () { return storage_js_1.RETRYABLE_ERR_FN_DEFAULT; } });
Object.defineProperty(exports, "Storage", { enumerable: true, get: function () { return storage_js_1.Storage; } });
var bucket_js_1 = require("./bucket.js");
Object.defineProperty(exports, "Bucket", { enumerable: true, get: function () { return bucket_js_1.Bucket; } });
__exportStar(require("./crc32c.js"), exports);
var channel_js_1 = require("./channel.js");
Object.defineProperty(exports, "Channel", { enumerable: true, get: function () { return channel_js_1.Channel; } });
var file_js_1 = require("./file.js");
Object.defineProperty(exports, "File", { enumerable: true, get: function () { return file_js_1.File; } });
__exportStar(require("./hash-stream-validator.js"), exports);
var hmacKey_js_1 = require("./hmacKey.js");
Object.defineProperty(exports, "HmacKey", { enumerable: true, get: function () { return hmacKey_js_1.HmacKey; } });
var iam_js_1 = require("./iam.js");
Object.defineProperty(exports, "Iam", { enumerable: true, get: function () { return iam_js_1.Iam; } });
var notification_js_1 = require("./notification.js");
Object.defineProperty(exports, "Notification", { enumerable: true, get: function () { return notification_js_1.Notification; } });
__exportStar(require("./transfer-manager.js"), exports);
