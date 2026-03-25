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
exports.serviceInstanceIdDetector = void 0;
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const crypto_1 = require("crypto");
/**
 * ServiceInstanceIdDetector detects the resources related to the service instance ID.
 */
class ServiceInstanceIdDetector {
    detect(_config) {
        return {
            attributes: {
                [semantic_conventions_1.SEMRESATTRS_SERVICE_INSTANCE_ID]: (0, crypto_1.randomUUID)(),
            },
        };
    }
}
/**
 * @experimental
 */
exports.serviceInstanceIdDetector = new ServiceInstanceIdDetector();
//# sourceMappingURL=ServiceInstanceIdDetector.js.map