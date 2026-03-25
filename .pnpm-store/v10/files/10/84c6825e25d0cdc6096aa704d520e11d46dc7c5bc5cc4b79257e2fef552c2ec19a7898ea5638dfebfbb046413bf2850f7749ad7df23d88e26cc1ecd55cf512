"use strict";
// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapperFromProto3JSON = exports.wrapperToProto3JSON = void 0;
const bytes_1 = require("./bytes");
const util_1 = require("./util");
function wrapperToProto3JSON(obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, 'value')) {
        return null;
    }
    if (Buffer.isBuffer(obj.value) || obj.value instanceof Uint8Array) {
        return (0, bytes_1.bytesToProto3JSON)(obj.value);
    }
    if (typeof obj.value === 'object') {
        (0, util_1.assert)(obj.value.constructor.name === 'Long', `wrapperToProto3JSON: expected to see a number, a string, a boolean, or a Long, but got ${obj.value}`);
        return obj.value.toString();
    }
    // JSON accept special string values "NaN", "Infinity", and "-Infinity".
    if (typeof obj.value === 'number' && !Number.isFinite(obj.value)) {
        return obj.value.toString();
    }
    return obj.value;
}
exports.wrapperToProto3JSON = wrapperToProto3JSON;
function wrapperFromProto3JSON(typeName, json) {
    if (json === null) {
        return {
            value: null,
        };
    }
    if (typeName === '.google.protobuf.BytesValue') {
        if (typeof json !== 'string') {
            throw new Error(`numberWrapperFromProto3JSON: expected to get a string for google.protobuf.BytesValue but got ${typeof json}`);
        }
        return {
            value: (0, bytes_1.bytesFromProto3JSON)(json),
        };
    }
    return {
        value: json,
    };
}
exports.wrapperFromProto3JSON = wrapperFromProto3JSON;
//# sourceMappingURL=wrappers.js.map