"use strict";
/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateServiceStub = generateServiceStub;
/* global window */
/* global AbortController */
const node_fetch_1 = require("node-fetch");
const abort_controller_1 = require("abort-controller");
const featureDetection_1 = require("./featureDetection");
const streamArrayParser_1 = require("./streamArrayParser");
const stream_1 = require("stream");
function generateServiceStub(rpcs, protocol, servicePath, servicePort, authClient, requestEncoder, responseDecoder, numericEnums) {
    const fetch = (0, featureDetection_1.hasWindowFetch)()
        ? window.fetch
        : node_fetch_1.default;
    const serviceStub = {
        // close method should close all cancel controllers. If this feature request in the future, we can have a cancelControllerFactory that tracks created cancel controllers, and abort them all in close method.
        close: () => {
            return { cancel: () => { } };
        },
    };
    for (const [rpcName, rpc] of Object.entries(rpcs)) {
        serviceStub[rpcName] = (request, options, _metadata, callback) => {
            options !== null && options !== void 0 ? options : (options = {});
            // We cannot use async-await in this function because we need to return the canceller object as soon as possible.
            // Using plain old promises instead.
            let fetchParameters;
            try {
                fetchParameters = requestEncoder(rpc, protocol, servicePath, servicePort, request, numericEnums);
            }
            catch (err) {
                // we could not encode parameters; pass error to the callback
                // and return a no-op canceler object.
                if (callback) {
                    callback(err);
                }
                return {
                    cancel() { },
                };
            }
            const cancelController = (0, featureDetection_1.hasAbortController)()
                ? new AbortController()
                : new abort_controller_1.AbortController();
            const cancelSignal = cancelController.signal;
            let cancelRequested = false;
            const url = fetchParameters.url;
            const headers = fetchParameters.headers;
            for (const key of Object.keys(options)) {
                headers[key] = options[key][0];
            }
            const streamArrayParser = new streamArrayParser_1.StreamArrayParser(rpc);
            authClient
                .getRequestHeaders()
                .then(authHeader => {
                const fetchRequest = {
                    headers: {
                        ...authHeader,
                        ...headers,
                    },
                    body: fetchParameters.body,
                    method: fetchParameters.method,
                    signal: cancelSignal,
                };
                if (fetchParameters.method === 'GET' ||
                    fetchParameters.method === 'DELETE') {
                    delete fetchRequest['body'];
                }
                return fetch(url, fetchRequest);
            })
                .then((response) => {
                if (response.ok && rpc.responseStream) {
                    (0, stream_1.pipeline)(response.body, streamArrayParser, (err) => {
                        if (err &&
                            (!cancelRequested ||
                                (err instanceof Error && err.name !== 'AbortError'))) {
                            if (callback) {
                                callback(err);
                            }
                            streamArrayParser.emit('error', err);
                        }
                    });
                    return;
                }
                else {
                    return Promise.all([
                        Promise.resolve(response.ok),
                        response.arrayBuffer(),
                    ])
                        .then(([ok, buffer]) => {
                        const response = responseDecoder(rpc, ok, buffer);
                        callback(null, response);
                    })
                        .catch((err) => {
                        if (!cancelRequested || err.name !== 'AbortError') {
                            if (rpc.responseStream) {
                                if (callback) {
                                    callback(err);
                                }
                                streamArrayParser.emit('error', err);
                            }
                            else if (callback) {
                                callback(err);
                            }
                            else {
                                throw err;
                            }
                        }
                    });
                }
            })
                .catch((err) => {
                if (rpc.responseStream) {
                    if (callback) {
                        callback(err);
                    }
                    streamArrayParser.emit('error', err);
                }
                else if (callback) {
                    callback(err);
                }
                else {
                    throw err;
                }
            });
            if (rpc.responseStream) {
                return streamArrayParser;
            }
            return {
                cancel: () => {
                    cancelRequested = true;
                    cancelController.abort();
                },
            };
        };
    }
    return serviceStub;
}
//# sourceMappingURL=fallbackServiceStub.js.map