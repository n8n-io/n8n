"use strict";
/*
 * Copyright 2022 gRPC authors.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.msToDuration = msToDuration;
exports.durationToMs = durationToMs;
exports.isDuration = isDuration;
exports.parseDuration = parseDuration;
function msToDuration(millis) {
    return {
        seconds: (millis / 1000) | 0,
        nanos: ((millis % 1000) * 1000000) | 0,
    };
}
function durationToMs(duration) {
    return (duration.seconds * 1000 + duration.nanos / 1000000) | 0;
}
function isDuration(value) {
    return typeof value.seconds === 'number' && typeof value.nanos === 'number';
}
const durationRegex = /^(\d+)(?:\.(\d+))?s$/;
function parseDuration(value) {
    const match = value.match(durationRegex);
    if (!match) {
        return null;
    }
    return {
        seconds: Number.parseInt(match[1], 10),
        nanos: match[2] ? Number.parseInt(match[2].padEnd(9, '0'), 10) : 0
    };
}
//# sourceMappingURL=duration.js.map