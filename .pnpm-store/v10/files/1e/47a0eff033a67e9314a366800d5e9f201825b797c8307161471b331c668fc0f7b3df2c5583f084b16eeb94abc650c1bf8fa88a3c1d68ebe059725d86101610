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
exports.getEnvWithoutDefaults = exports.getEnv = void 0;
const environment_1 = require("../../utils/environment");
const globalThis_1 = require("./globalThis");
/**
 * Gets the environment variables
 */
function getEnv() {
    const globalEnv = (0, environment_1.parseEnvironment)(globalThis_1._globalThis);
    return Object.assign({}, environment_1.DEFAULT_ENVIRONMENT, globalEnv);
}
exports.getEnv = getEnv;
function getEnvWithoutDefaults() {
    return (0, environment_1.parseEnvironment)(globalThis_1._globalThis);
}
exports.getEnvWithoutDefaults = getEnvWithoutDefaults;
//# sourceMappingURL=environment.js.map