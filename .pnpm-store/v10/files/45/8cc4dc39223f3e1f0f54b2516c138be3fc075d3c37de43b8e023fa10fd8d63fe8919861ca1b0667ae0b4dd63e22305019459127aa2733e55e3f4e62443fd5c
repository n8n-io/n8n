"use strict";
// Copyright 2018 Google LLC
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
exports.WarningTypes = void 0;
exports.warn = warn;
var WarningTypes;
(function (WarningTypes) {
    WarningTypes["WARNING"] = "Warning";
    WarningTypes["DEPRECATION"] = "DeprecationWarning";
})(WarningTypes || (exports.WarningTypes = WarningTypes = {}));
function warn(warning) {
    // Only show a given warning once
    if (warning.warned) {
        return;
    }
    warning.warned = true;
    if (typeof process !== 'undefined' && process.emitWarning) {
        // @types/node doesn't recognize the emitWarning syntax which
        // accepts a config object, so `as any` it is
        // https://nodejs.org/docs/latest-v8.x/api/process.html#process_process_emitwarning_warning_options
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        process.emitWarning(warning.message, warning);
    }
    else {
        console.warn(warning.message);
    }
}
