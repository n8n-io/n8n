"use strict";
/**
 * Copyright 2020 Google LLC
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
exports.warn = warn;
const featureDetection_1 = require("./featureDetection");
const emittedWarnings = new Set();
// warnType is the type of warning (e.g. 'DeprecationWarning', 'ExperimentalWarning', etc.)
function warn(code, message, warnType) {
    // Only show a given warning once
    if (emittedWarnings.has(code)) {
        return;
    }
    emittedWarnings.add(code);
    if (!(0, featureDetection_1.isNodeJS)()) {
        console.warn(message);
    }
    else if (typeof warnType !== 'undefined') {
        process.emitWarning(message, {
            type: warnType,
        });
    }
    else {
        process.emitWarning(message);
    }
}
//# sourceMappingURL=warnings.js.map