"use strict";
/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.setLoggerVerbosity = exports.setLogger = exports.getLogger = void 0;
exports.trace = trace;
exports.isTracerEnabled = isTracerEnabled;
const constants_1 = require("./constants");
const process_1 = require("process");
const clientVersion = require('../../package.json').version;
const DEFAULT_LOGGER = {
    error: (message, ...optionalParams) => {
        console.error('E ' + message, ...optionalParams);
    },
    info: (message, ...optionalParams) => {
        console.error('I ' + message, ...optionalParams);
    },
    debug: (message, ...optionalParams) => {
        console.error('D ' + message, ...optionalParams);
    },
};
let _logger = DEFAULT_LOGGER;
let _logVerbosity = constants_1.LogVerbosity.ERROR;
const verbosityString = (_b = (_a = process.env.GRPC_NODE_VERBOSITY) !== null && _a !== void 0 ? _a : process.env.GRPC_VERBOSITY) !== null && _b !== void 0 ? _b : '';
switch (verbosityString.toUpperCase()) {
    case 'DEBUG':
        _logVerbosity = constants_1.LogVerbosity.DEBUG;
        break;
    case 'INFO':
        _logVerbosity = constants_1.LogVerbosity.INFO;
        break;
    case 'ERROR':
        _logVerbosity = constants_1.LogVerbosity.ERROR;
        break;
    case 'NONE':
        _logVerbosity = constants_1.LogVerbosity.NONE;
        break;
    default:
    // Ignore any other values
}
const getLogger = () => {
    return _logger;
};
exports.getLogger = getLogger;
const setLogger = (logger) => {
    _logger = logger;
};
exports.setLogger = setLogger;
const setLoggerVerbosity = (verbosity) => {
    _logVerbosity = verbosity;
};
exports.setLoggerVerbosity = setLoggerVerbosity;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (severity, ...args) => {
    let logFunction;
    if (severity >= _logVerbosity) {
        switch (severity) {
            case constants_1.LogVerbosity.DEBUG:
                logFunction = _logger.debug;
                break;
            case constants_1.LogVerbosity.INFO:
                logFunction = _logger.info;
                break;
            case constants_1.LogVerbosity.ERROR:
                logFunction = _logger.error;
                break;
        }
        /* Fall back to _logger.error when other methods are not available for
         * compatiblity with older behavior that always logged to _logger.error */
        if (!logFunction) {
            logFunction = _logger.error;
        }
        if (logFunction) {
            logFunction.bind(_logger)(...args);
        }
    }
};
exports.log = log;
const tracersString = (_d = (_c = process.env.GRPC_NODE_TRACE) !== null && _c !== void 0 ? _c : process.env.GRPC_TRACE) !== null && _d !== void 0 ? _d : '';
const enabledTracers = new Set();
const disabledTracers = new Set();
for (const tracerName of tracersString.split(',')) {
    if (tracerName.startsWith('-')) {
        disabledTracers.add(tracerName.substring(1));
    }
    else {
        enabledTracers.add(tracerName);
    }
}
const allEnabled = enabledTracers.has('all');
function trace(severity, tracer, text) {
    if (isTracerEnabled(tracer)) {
        (0, exports.log)(severity, new Date().toISOString() +
            ' | v' +
            clientVersion +
            ' ' +
            process_1.pid +
            ' | ' +
            tracer +
            ' | ' +
            text);
    }
}
function isTracerEnabled(tracer) {
    return (!disabledTracers.has(tracer) && (allEnabled || enabledTracers.has(tracer)));
}
//# sourceMappingURL=logging.js.map