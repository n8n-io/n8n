"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalProviderSeverity = void 0;
/**
 * Similar to many popular logging packages, terminal providers support a range of message
 * severities. These severities have built-in formatting defaults in the Terminal object
 * (warnings are yellow, errors are red, etc.).
 *
 * Terminal providers may choose to suppress certain messages based on their severity,
 * or to route some messages to other providers or not based on severity.
 *
 *   Severity  | Purpose
 *   --------- | -------
 *   error     | Build errors and fatal issues
 *   warning   | Not necessarily fatal, but indicate a problem the user should fix
 *   log       | Informational messages
 *   verbose   | Additional information that may not always be necessary
 *   debug     | Highest detail level, best used for troubleshooting information
 *
 * @beta
 */
var TerminalProviderSeverity;
(function (TerminalProviderSeverity) {
    TerminalProviderSeverity[TerminalProviderSeverity["log"] = 0] = "log";
    TerminalProviderSeverity[TerminalProviderSeverity["warning"] = 1] = "warning";
    TerminalProviderSeverity[TerminalProviderSeverity["error"] = 2] = "error";
    TerminalProviderSeverity[TerminalProviderSeverity["verbose"] = 3] = "verbose";
    TerminalProviderSeverity[TerminalProviderSeverity["debug"] = 4] = "debug";
})(TerminalProviderSeverity || (exports.TerminalProviderSeverity = TerminalProviderSeverity = {}));
//# sourceMappingURL=ITerminalProvider.js.map