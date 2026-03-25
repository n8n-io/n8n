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
exports.googleProtobufTimestampFromProto3JSON = exports.googleProtobufTimestampToProto3JSON = void 0;
function googleProtobufTimestampToProto3JSON(obj) {
    var _a;
    // seconds is an instance of Long so it won't be undefined
    const durationSeconds = obj.seconds;
    const date = new Date(durationSeconds * 1000).toISOString();
    // Pad leading zeros if nano string length is less than 9.
    let nanos = (_a = obj.nanos) === null || _a === void 0 ? void 0 : _a.toString().padStart(9, '0');
    // Trim the unsignificant zeros and keep 3, 6, or 9 decimal digits.
    while (nanos && nanos.length > 3 && nanos.endsWith('000')) {
        nanos = nanos.slice(0, -3);
    }
    return date.replace(/(?:\.\d{0,9})/, '.' + nanos);
}
exports.googleProtobufTimestampToProto3JSON = googleProtobufTimestampToProto3JSON;
function googleProtobufTimestampFromProto3JSON(json) {
    const match = json.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?/);
    if (!match) {
        throw new Error(`googleProtobufDurationFromProto3JSON: incorrect value ${json} passed as google.protobuf.Duration`);
    }
    const date = new Date(json);
    const millisecondsSinceEpoch = date.getTime();
    const seconds = Math.floor(millisecondsSinceEpoch / 1000);
    // The fractional seconds in the JSON timestamps can go up to 9 digits (i.e. up to 1 nanosecond resolution).
    // However, Javascript Date object represent any date and time to millisecond precision.
    // To keep the precision, we extract the fractional seconds and append 0 until the length is equal to 9.
    let nanos = 0;
    const secondsFromDate = json.split('.')[1];
    if (secondsFromDate) {
        nanos = parseInt(secondsFromDate.slice(0, -1).padEnd(9, '0'));
    }
    const result = {};
    if (seconds !== 0) {
        result.seconds = seconds;
    }
    if (nanos !== 0) {
        result.nanos = nanos;
    }
    return result;
}
exports.googleProtobufTimestampFromProto3JSON = googleProtobufTimestampFromProto3JSON;
//# sourceMappingURL=timestamp.js.map