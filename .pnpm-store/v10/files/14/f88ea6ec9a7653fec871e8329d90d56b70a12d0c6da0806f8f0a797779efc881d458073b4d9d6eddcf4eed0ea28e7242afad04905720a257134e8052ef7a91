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
import { processDetectorSync } from './ProcessDetectorSync';
/**
 * ProcessDetector will be used to detect the resources related current process running
 * and being instrumented from the NodeJS Process module.
 */
var ProcessDetector = /** @class */ (function () {
    function ProcessDetector() {
    }
    ProcessDetector.prototype.detect = function (config) {
        return Promise.resolve(processDetectorSync.detect(config));
    };
    return ProcessDetector;
}());
export var processDetector = new ProcessDetector();
//# sourceMappingURL=ProcessDetector.js.map