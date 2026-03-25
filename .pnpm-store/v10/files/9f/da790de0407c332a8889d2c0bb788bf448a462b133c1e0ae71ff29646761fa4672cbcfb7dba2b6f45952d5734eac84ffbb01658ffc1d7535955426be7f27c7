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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
const index_js_1 = require("./nodejs-common/index.js");
const promisify_1 = require("@google-cloud/promisify");
/**
 * Create a channel object to interact with a Cloud Storage channel.
 *
 * See {@link https://cloud.google.com/storage/docs/object-change-notification| Object Change Notification}
 *
 * @class
 *
 * @param {string} id The ID of the channel.
 * @param {string} resourceId The resource ID of the channel.
 *
 * @example
 * ```
 * const {Storage} = require('@google-cloud/storage');
 * const storage = new Storage();
 * const channel = storage.channel('id', 'resource-id');
 * ```
 */
class Channel extends index_js_1.ServiceObject {
    constructor(storage, id, resourceId) {
        const config = {
            parent: storage,
            baseUrl: '/channels',
            // An ID shouldn't be included in the API requests.
            // RE:
            // https://github.com/GoogleCloudPlatform/google-cloud-node/issues/1145
            id: '',
            methods: {
            // Only need `request`.
            },
        };
        super(config);
        this.metadata.id = id;
        this.metadata.resourceId = resourceId;
    }
    /**
     * @typedef {array} StopResponse
     * @property {object} 0 The full API response.
     */
    /**
     * @callback StopCallback
     * @param {?Error} err Request error, if any.
     * @param {object} apiResponse The full API response.
     */
    /**
     * Stop this channel.
     *
     * @param {StopCallback} [callback] Callback function.
     * @returns {Promise<StopResponse>}
     *
     * @example
     * ```
     * const {Storage} = require('@google-cloud/storage');
     * const storage = new Storage();
     * const channel = storage.channel('id', 'resource-id');
     * channel.stop(function(err, apiResponse) {
     *   if (!err) {
     *     // Channel stopped successfully.
     *   }
     * });
     *
     * //-
     * // If the callback is omitted, we'll return a Promise.
     * //-
     * channel.stop().then(function(data) {
     *   const apiResponse = data[0];
     * });
     * ```
     */
    stop(callback) {
        callback = callback || index_js_1.util.noop;
        this.request({
            method: 'POST',
            uri: '/stop',
            json: this.metadata,
        }, (err, apiResponse) => {
            callback(err, apiResponse);
        });
    }
}
exports.Channel = Channel;
/*! Developer Documentation
 *
 * All async methods (except for streams) will return a Promise in the event
 * that a callback is omitted.
 */
(0, promisify_1.promisifyAll)(Channel);
