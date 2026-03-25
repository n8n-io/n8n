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
exports.googleProtobufDurationFromProto3JSON = exports.googleProtobufDurationToProto3JSON = void 0;
function googleProtobufDurationToProto3JSON(obj) {
    // seconds is an instance of Long so it won't be undefined
    let durationSeconds = obj.seconds.toString();
    if (typeof obj.nanos === 'number' && obj.nanos > 0) {
        // nanosStr should contain 3, 6, or 9 fractional digits.
        const nanosStr = obj.nanos
            .toString()
            .padStart(9, '0')
            .replace(/^((?:\d\d\d)+?)(?:0*)$/, '$1');
        durationSeconds += '.' + nanosStr;
    }
    durationSeconds += 's';
    return durationSeconds;
}
exports.googleProtobufDurationToProto3JSON = googleProtobufDurationToProto3JSON;
function googleProtobufDurationFromProto3JSON(json) {
    const match = json.match(/^(\d*)(?:\.(\d*))?s$/);
    if (!match) {
        throw new Error(`googleProtobufDurationFromProto3JSON: incorrect value ${json} passed as google.protobuf.Duration`);
    }
    let seconds = 0;
    let nanos = 0;
    if (typeof match[1] === 'string' && match[1].length > 0) {
        seconds = parseInt(match[1]);
    }
    if (typeof match[2] === 'string' && match[2].length > 0) {
        nanos = parseInt(match[2].padEnd(9, '0'));
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
exports.googleProtobufDurationFromProto3JSON = googleProtobufDurationFromProto3JSON;
//# sourceMappingURL=duration.js.map