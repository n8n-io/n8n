"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringBufferTerminalProvider = void 0;
const node_core_library_1 = require("@rushstack/node-core-library");
const ITerminalProvider_1 = require("./ITerminalProvider");
const AnsiEscape_1 = require("./AnsiEscape");
function _normalizeOptions(options) {
    return {
        normalizeSpecialCharacters: true,
        ...options
    };
}
function _normalizeOutput(s, options) {
    const { normalizeSpecialCharacters } = _normalizeOptions(options !== null && options !== void 0 ? options : {});
    return _normalizeOutputInner(s, normalizeSpecialCharacters);
}
function _normalizeOutputInner(s, normalizeSpecialCharacters) {
    s = node_core_library_1.Text.convertToLf(s);
    if (normalizeSpecialCharacters) {
        return AnsiEscape_1.AnsiEscape.formatForTests(s, { encodeNewlines: true });
    }
    else {
        return s;
    }
}
const LONGEST_SEVERITY_NAME_LENGTH = Object.keys(ITerminalProvider_1.TerminalProviderSeverity).reduce((max, k) => Math.max(max, k.length), 0);
/**
 * Terminal provider that stores written data in buffers separated by severity.
 * This terminal provider is designed to be used when code that prints to a terminal
 * is being unit tested.
 *
 * @beta
 */
class StringBufferTerminalProvider {
    constructor(supportsColor = false) {
        this._standardBuffer = new node_core_library_1.StringBuilder();
        this._verboseBuffer = new node_core_library_1.StringBuilder();
        this._debugBuffer = new node_core_library_1.StringBuilder();
        this._warningBuffer = new node_core_library_1.StringBuilder();
        this._errorBuffer = new node_core_library_1.StringBuilder();
        this._allOutputChunks = [];
        this.supportsColor = supportsColor;
    }
    /**
     * {@inheritDoc ITerminalProvider.write}
     */
    write(text, severity) {
        const severityName = ITerminalProvider_1.TerminalProviderSeverity[severity];
        const lastChunk = this._allOutputChunks[this._allOutputChunks.length - 1];
        if (lastChunk && lastChunk.severity === severityName) {
            lastChunk.text += text;
        }
        else {
            this._allOutputChunks.push({
                text,
                severity: severityName
            });
        }
        switch (severity) {
            case ITerminalProvider_1.TerminalProviderSeverity.warning: {
                this._warningBuffer.append(text);
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.error: {
                this._errorBuffer.append(text);
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.verbose: {
                this._verboseBuffer.append(text);
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.debug: {
                this._debugBuffer.append(text);
                break;
            }
            case ITerminalProvider_1.TerminalProviderSeverity.log:
            default: {
                this._standardBuffer.append(text);
                break;
            }
        }
    }
    /**
     * {@inheritDoc ITerminalProvider.eolCharacter}
     */
    get eolCharacter() {
        return '\n';
    }
    /**
     * Get everything that has been written at log-level severity.
     */
    getOutput(options) {
        return _normalizeOutput(this._standardBuffer.toString(), options);
    }
    /**
     * @deprecated - use {@link StringBufferTerminalProvider.getVerboseOutput}
     */
    getVerbose(options) {
        return this.getVerboseOutput(options);
    }
    /**
     * Get everything that has been written at verbose-level severity.
     */
    getVerboseOutput(options) {
        return _normalizeOutput(this._verboseBuffer.toString(), options);
    }
    /**
     * Get everything that has been written at debug-level severity.
     */
    getDebugOutput(options) {
        return _normalizeOutput(this._debugBuffer.toString(), options);
    }
    /**
     * Get everything that has been written at error-level severity.
     */
    getErrorOutput(options) {
        return _normalizeOutput(this._errorBuffer.toString(), options);
    }
    /**
     * Get everything that has been written at warning-level severity.
     */
    getWarningOutput(options) {
        return _normalizeOutput(this._warningBuffer.toString(), options);
    }
    getAllOutput(sparse, options) {
        const result = {};
        const log = this.getOutput(options);
        if (!sparse || log) {
            result.log = log;
        }
        const warning = this.getWarningOutput(options);
        if (!sparse || warning) {
            result.warning = warning;
        }
        const error = this.getErrorOutput(options);
        if (!sparse || error) {
            result.error = error;
        }
        const verbose = this.getVerboseOutput(options);
        if (!sparse || verbose) {
            result.verbose = verbose;
        }
        const debug = this.getDebugOutput(options);
        if (!sparse || debug) {
            result.debug = debug;
        }
        return result;
    }
    getAllOutputAsChunks(options = {}) {
        const { asLines, normalizeSpecialCharacters } = _normalizeOptions(options);
        if (asLines) {
            const lines = [];
            for (const { text: rawText, severity: rawSeverity } of this._allOutputChunks) {
                const severity = rawSeverity.padStart(LONGEST_SEVERITY_NAME_LENGTH, ' ');
                const lfText = node_core_library_1.Text.convertToLf(rawText);
                const rawLines = lfText.split('\n');
                // Emit one entry per logical line.
                for (let i = 0; i < rawLines.length; i++) {
                    const isLast = i === rawLines.length - 1;
                    const isFinalTrailingEmpty = isLast && rawLines[i] === '';
                    if (isFinalTrailingEmpty) {
                        continue;
                    }
                    const hasNewlineAfter = i < rawLines.length - 1;
                    // If the original output had a newline after this line, preserve it as the special token
                    // (e.g. "[n]") when normalization is enabled.
                    const shouldIncludeNewlineToken = normalizeSpecialCharacters && hasNewlineAfter;
                    const lineText = shouldIncludeNewlineToken ? `${rawLines[i]}\n` : rawLines[i];
                    const text = _normalizeOutputInner(lineText, normalizeSpecialCharacters);
                    lines.push(`[${severity}] ${text}`);
                }
            }
            return lines;
        }
        else {
            return this._allOutputChunks.map(({ text: rawText, severity }) => {
                const text = _normalizeOutputInner(rawText, normalizeSpecialCharacters);
                return {
                    text,
                    severity
                };
            });
        }
    }
}
exports.StringBufferTerminalProvider = StringBufferTerminalProvider;
//# sourceMappingURL=StringBufferTerminalProvider.js.map