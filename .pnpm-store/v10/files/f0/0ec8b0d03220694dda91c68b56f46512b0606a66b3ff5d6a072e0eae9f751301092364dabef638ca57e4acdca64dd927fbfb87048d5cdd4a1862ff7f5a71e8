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
import { DiagLogLevel } from '../types';
export function createLogLevelDiagLogger(maxLevel, logger) {
    if (maxLevel < DiagLogLevel.NONE) {
        maxLevel = DiagLogLevel.NONE;
    }
    else if (maxLevel > DiagLogLevel.ALL) {
        maxLevel = DiagLogLevel.ALL;
    }
    // In case the logger is null or undefined
    logger = logger || {};
    function _filterFunc(funcName, theLevel) {
        const theFunc = logger[funcName];
        if (typeof theFunc === 'function' && maxLevel >= theLevel) {
            return theFunc.bind(logger);
        }
        return function () { };
    }
    return {
        error: _filterFunc('error', DiagLogLevel.ERROR),
        warn: _filterFunc('warn', DiagLogLevel.WARN),
        info: _filterFunc('info', DiagLogLevel.INFO),
        debug: _filterFunc('debug', DiagLogLevel.DEBUG),
        verbose: _filterFunc('verbose', DiagLogLevel.VERBOSE),
    };
}
//# sourceMappingURL=logLevelLogger.js.map