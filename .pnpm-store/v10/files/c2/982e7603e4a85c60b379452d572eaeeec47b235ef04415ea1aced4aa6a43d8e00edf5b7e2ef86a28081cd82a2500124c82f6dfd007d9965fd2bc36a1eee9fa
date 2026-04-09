// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { EOL } from 'node:os';
import supportsColor from 'supports-color';
import { TerminalProviderSeverity } from './ITerminalProvider';
/**
 * Terminal provider that prints to STDOUT (for log- and verbose-level messages) and
 * STDERR (for warning- and error-level messages).
 *
 * @beta
 */
export class ConsoleTerminalProvider {
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
            case TerminalProviderSeverity.warning:
            case TerminalProviderSeverity.error: {
                process.stderr.write(data);
                break;
            }
            case TerminalProviderSeverity.verbose: {
                if (this.verboseEnabled) {
                    process.stdout.write(data);
                }
                break;
            }
            case TerminalProviderSeverity.debug: {
                if (this.debugEnabled) {
                    process.stdout.write(data);
                }
                break;
            }
            case TerminalProviderSeverity.log:
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
        return EOL;
    }
}
ConsoleTerminalProvider.supportsColor = !!supportsColor.stdout && !!supportsColor.stderr;
//# sourceMappingURL=ConsoleTerminalProvider.js.map