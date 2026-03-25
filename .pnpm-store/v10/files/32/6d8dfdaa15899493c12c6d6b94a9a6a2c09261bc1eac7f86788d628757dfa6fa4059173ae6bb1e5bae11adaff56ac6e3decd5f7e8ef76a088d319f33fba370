"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMapping = void 0;
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
const ExponentMapping_1 = require("./ExponentMapping");
const LogarithmMapping_1 = require("./LogarithmMapping");
const types_1 = require("./types");
const MIN_SCALE = -10;
const MAX_SCALE = 20;
const PREBUILT_MAPPINGS = Array.from({ length: 31 }, (_, i) => {
    if (i > 10) {
        return new LogarithmMapping_1.LogarithmMapping(i - 10);
    }
    return new ExponentMapping_1.ExponentMapping(i - 10);
});
/**
 * getMapping returns an appropriate mapping for the given scale. For scales -10
 * to 0 the underlying type will be ExponentMapping. For scales 1 to 20 the
 * underlying type will be LogarithmMapping.
 * @param scale a number in the range [-10, 20]
 * @returns {Mapping}
 */
function getMapping(scale) {
    if (scale > MAX_SCALE || scale < MIN_SCALE) {
        throw new types_1.MappingError(`expected scale >= ${MIN_SCALE} && <= ${MAX_SCALE}, got: ${scale}`);
    }
    // mappings are offset by 10. scale -10 is at position 0 and scale 20 is at 30
    return PREBUILT_MAPPINGS[scale + 10];
}
exports.getMapping = getMapping;
//# sourceMappingURL=getMapping.js.map