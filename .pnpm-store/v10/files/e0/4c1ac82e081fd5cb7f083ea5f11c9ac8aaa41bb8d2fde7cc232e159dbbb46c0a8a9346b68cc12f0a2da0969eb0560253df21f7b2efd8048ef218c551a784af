"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConstMap = void 0;
/**
 * Creates a const map from the given values
 * @param values - An array of values to be used as keys and values in the map.
 * @returns A populated version of the map with the values and keys derived from the values.
 */
/*#__NO_SIDE_EFFECTS__*/
function createConstMap(values) {
    // eslint-disable-next-line prefer-const, @typescript-eslint/no-explicit-any
    let res = {};
    const len = values.length;
    for (let lp = 0; lp < len; lp++) {
        const val = values[lp];
        if (val) {
            res[String(val).toUpperCase().replace(/[-.]/g, '_')] = val;
        }
    }
    return res;
}
exports.createConstMap = createConstMap;
//# sourceMappingURL=utils.js.map