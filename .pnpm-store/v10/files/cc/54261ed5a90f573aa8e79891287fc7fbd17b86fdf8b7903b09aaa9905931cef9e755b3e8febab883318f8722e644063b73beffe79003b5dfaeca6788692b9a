"use strict";
/**
 * (C) Copyright IBM Corp. 2022.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewLogger = void 0;
var debug_1 = __importDefault(require("debug"));
/**
 * Return a new logger, formatted with a particular name. The logging functions, in
 * order of increasing verbosity, are: `error`, `warn`, `info`, `verbose`, and `debug`.
 *
 * The logger will be an instance of the `debug` package and utilizes its support for
 * configuration with environment variables.
 *
 * Additionally, the logger will be turned on automatically if the "NODE_DEBUG"
 * environment variable is set to "axios".
 *
 * @param moduleName - the namespace for the logger. The name will appear in
 * the logs and it will be the name used for configuring the log level.
 *
 * @returns the new logger
 */
function getNewLogger(moduleName) {
    var debug = (0, debug_1.default)("".concat(moduleName, ":debug"));
    var error = (0, debug_1.default)("".concat(moduleName, ":error"));
    var info = (0, debug_1.default)("".concat(moduleName, ":info"));
    var verbose = (0, debug_1.default)("".concat(moduleName, ":verbose"));
    var warn = (0, debug_1.default)("".concat(moduleName, ":warning"));
    // enable loggers if axios flag is set & mimic log levels severity
    if (process.env.NODE_DEBUG === 'axios') {
        debug.enabled = true;
    }
    if (debug.enabled) {
        verbose.enabled = true;
    }
    if (verbose.enabled) {
        info.enabled = true;
    }
    if (info.enabled) {
        warn.enabled = true;
    }
    if (warn.enabled) {
        error.enabled = true;
    }
    var newLogger = {
        debug: debug,
        error: error,
        info: info,
        verbose: verbose,
        warn: warn,
    };
    return newLogger;
}
exports.getNewLogger = getNewLogger;
