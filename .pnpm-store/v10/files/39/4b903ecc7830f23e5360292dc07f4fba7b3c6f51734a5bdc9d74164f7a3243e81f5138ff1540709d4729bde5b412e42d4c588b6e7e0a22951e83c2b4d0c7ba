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
exports.DiagComponentLogger = void 0;
const global_utils_1 = require("../internal/global-utils");
/**
 * Component Logger which is meant to be used as part of any component which
 * will add automatically additional namespace in front of the log message.
 * It will then forward all message to global diag logger
 * @example
 * const cLogger = diag.createComponentLogger({ namespace: '@opentelemetry/instrumentation-http' });
 * cLogger.debug('test');
 * // @opentelemetry/instrumentation-http test
 */
class DiagComponentLogger {
    constructor(props) {
        this._namespace = props.namespace || 'DiagComponentLogger';
    }
    debug(...args) {
        return logProxy('debug', this._namespace, args);
    }
    error(...args) {
        return logProxy('error', this._namespace, args);
    }
    info(...args) {
        return logProxy('info', this._namespace, args);
    }
    warn(...args) {
        return logProxy('warn', this._namespace, args);
    }
    verbose(...args) {
        return logProxy('verbose', this._namespace, args);
    }
}
exports.DiagComponentLogger = DiagComponentLogger;
function logProxy(funcName, namespace, args) {
    const logger = (0, global_utils_1.getGlobal)('diag');
    // shortcut if logger not set
    if (!logger) {
        return;
    }
    args.unshift(namespace);
    return logger[funcName](...args);
}
//# sourceMappingURL=ComponentLogger.js.map