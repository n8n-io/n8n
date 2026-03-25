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
exports.createAPICaller = createAPICaller;
const normalApiCaller_1 = require("./normalCalls/normalApiCaller");
function createAPICaller(settings, descriptor) {
    if (!descriptor) {
        return new normalApiCaller_1.NormalApiCaller();
    }
    return descriptor.getApiCaller(settings);
}
//# sourceMappingURL=apiCaller.js.map