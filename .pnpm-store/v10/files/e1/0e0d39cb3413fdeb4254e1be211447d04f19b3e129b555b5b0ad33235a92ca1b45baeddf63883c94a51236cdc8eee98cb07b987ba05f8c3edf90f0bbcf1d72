"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleTerminalProvider = void 0;
const os_1 = require("os");
const supports_color_1 = __importDefault(require("supports-color"));
const ITerminalProvider_1 = require("./ITerminalProvider");
/**
 * Terminal provider that prints to STDOUT (for log- and verbose-level messages) and
 * STDERR (for warning- and error-level messages).
 *
 * @beta
 */
class ConsoleTerminalProvider {
    constructor(options = {}) {
        /**
         * {@inheritDoc ITerminalProvider.supportsColor}
         */
        this.supportsColor = ConsoleTerminalProvider.supportsColor;
        this.verboseEnabled = !!options.verboseEnabled;
        this.debugEnabled = !!options.debugEnabled;
    }
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(data, severity) {
        switch (severity) {
            case ITerminalProvider_1.TerminalProviderSeverity.warning:
            case ITerminalProvider_1.TerminalProviderSeverity.error: {
                process.stderr.write(data);
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.verbose: {
                if (this.verboseEnabled) {
                    process.stdout.write(data);
                }
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.debug: {
                if (this.debugEnabled) {
                    process.stdout.write(data);
                }
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.log:
            default: {
                process.stdout.write(data);
                break;
            }
        }
    }
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter() {
        return os_1.EOL;
    }
}
exports.ConsoleTerminalProvider = ConsoleTerminalProvider;
ConsoleTerminalProvider.supportsColor = !!supports_color_1.default.stdout && !!supports_color_1.default.stderr;
//# sourceMappingURL=ConsoleTerminalProvider.js.map