"use strict";
// Copyright 2022-2024 Google LLC
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
exports.Duration = void 0;
/**
 * Duration class with an interface similar to the tc39 Temporal
 * proposal. Since it's not fully finalized, and polyfills have
 * inconsistent compatibility, for now this shim class will be
 * used to set durations in Pub/Sub.
 *
 * This class will remain here for at least the next major version,
 * eventually to be replaced by the tc39 Temporal built-in.
 *
 * https://tc39.es/proposal-temporal/docs/duration.html
 */
class Duration {
    constructor(millis) {
        this.millis = millis;
    }
    /**
     * Calculates the total number of units of type 'totalOf' that would
     * fit inside this duration.
     */
    totalOf(totalOf) {
        switch (totalOf) {
            case 'hour':
                return this.millis / Duration.hourInMillis;
            case 'minute':
                return this.millis / Duration.minuteInMillis;
            case 'second':
                return this.millis / Duration.secondInMillis;
            case 'millisecond':
                return this.millis;
            default:
                throw new Error(`Invalid unit in call to totalOf(): ${totalOf}`);
        }
    }
    /**
     * Creates a Duration from a DurationLike, which is an object
     * containing zero or more of the following: hours, seconds,
     * minutes, millis.
     */
    static from(durationLike) {
        var _a, _b, _c, _d;
        let millis = (_a = durationLike.millis) !== null && _a !== void 0 ? _a : 0;
        millis += ((_b = durationLike.seconds) !== null && _b !== void 0 ? _b : 0) * Duration.secondInMillis;
        millis += ((_c = durationLike.minutes) !== null && _c !== void 0 ? _c : 0) * Duration.minuteInMillis;
        millis += ((_d = durationLike.hours) !== null && _d !== void 0 ? _d : 0) * Duration.hourInMillis;
        return new Duration(millis);
    }
}
exports.Duration = Duration;
Duration.secondInMillis = 1000;
Duration.minuteInMillis = Duration.secondInMillis * 60;
Duration.hourInMillis = Duration.minuteInMillis * 60;
//# sourceMappingURL=temporal.js.map