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
exports.encodeRequest = encodeRequest;
exports.decodeResponse = decodeResponse;
// proto-over-HTTP request encoding and decoding
const serializer = require("proto3-json-serializer");
const fallback_1 = require("./fallback");
const googleError_1 = require("./googleError");
const transcoding_1 = require("./transcoding");
function encodeRequest(rpc, protocol, servicePath, servicePort, request, numericEnums) {
    const headers = {
        'Content-Type': 'application/json',
    };
    const message = rpc.resolvedRequestType.fromObject(request);
    const json = serializer.toProto3JSON(message, {
        numericEnums,
    });
    if (!json) {
        throw new Error(`Cannot send null request to RPC ${rpc.name}.`);
    }
    if (typeof json !== 'object' || Array.isArray(json)) {
        throw new Error(`Request to RPC ${rpc.name} must be an object.`);
    }
    const transcoded = (0, transcoding_1.transcode)(json, rpc.parsedOptions);
    if (!transcoded) {
        throw new Error(`Cannot build HTTP request for ${JSON.stringify(json)}, method: ${rpc.name}`);
    }
    // If numeric enums feature is requested, add extra parameter to the query string
    if (numericEnums) {
        transcoded.queryString =
            (transcoded.queryString ? `${transcoded.queryString}&` : '') +
                '$alt=json%3Benum-encoding=int';
    }
    // Converts httpMethod to method that permitted in standard Fetch API spec
    // https://fetch.spec.whatwg.org/#methods
    const method = transcoded.httpMethod.toUpperCase();
    const body = JSON.stringify(transcoded.data);
    const url = `${protocol}://${servicePath}:${servicePort}/${transcoded.url.replace(/^\//, '')}?${transcoded.queryString}`;
    return {
        method,
        url,
        headers,
        body,
    };
}
function decodeResponse(rpc, ok, response) {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    const decodedString = new TextDecoder().decode(response);
    if (!decodedString) {
        throw new Error(`Received null response from RPC ${rpc.name}`);
    }
    const json = JSON.parse(decodedString);
    if (!ok) {
        const error = googleError_1.GoogleError.parseHttpError(json);
        throw error;
    }
    const message = serializer.fromProto3JSON(rpc.resolvedResponseType, json);
    if (!message) {
        throw new Error(`Received null or malformed response from JSON serializer from RPC ${rpc.name}`);
    }
    return rpc.resolvedResponseType.toObject(message, fallback_1.defaultToObjectOptions);
}
//# sourceMappingURL=fallbackRest.js.map