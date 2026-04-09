"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Terminal = void 0;
const ITerminalProvider_1 = require("./ITerminalProvider");
const Colorize_1 = require("./Colorize");
const AnsiEscape_1 = require("./AnsiEscape");
/**
 * This class facilitates writing to a console.
 *
 * @beta
 */
class Terminal {
    constructor(provider) {
        this._providers = new Set([provider]);
    }
    /**
     * {@inheritdoc ITerminal.registerProvider}
     */
    registerProvider(provider) {
        this._providers.add(provider);
    }
    /**
     * {@inheritdoc ITerminal.unregisterProvider}
     */
    unregisterProvider(provider) {
        this._providers.delete(provider);
    }
    /**
     * {@inheritdoc ITerminal.write}
     */
    write(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.log, false);
    }
    /**
     * {@inheritdoc ITerminal.writeLine}
     */
    writeLine(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.log, true);
    }
    /**
     * {@inheritdoc ITerminal.writeWarning}
     */
    writeWarning(...messageParts) {
        const { parts, options: { doNotOverrideSgrCodes } } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(doNotOverrideSgrCodes
            ? parts
            : parts.map((part) => Colorize_1.Colorize.yellow(AnsiEscape_1.AnsiEscape.removeCodes(part))), ITerminalProvider_1.TerminalProviderSeverity.warning, false);
    }
    /**
     * {@inheritdoc ITerminal.writeWarningLine}
     */
    writeWarningLine(...messageParts) {
        const { parts, options: { doNotOverrideSgrCodes } } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(doNotOverrideSgrCodes
            ? parts
            : parts.map((part) => Colorize_1.Colorize.yellow(AnsiEscape_1.AnsiEscape.removeCodes(part))), ITerminalProvider_1.TerminalProviderSeverity.warning, true);
    }
    /**
     * {@inheritdoc ITerminal.writeError}
     */
    writeError(...messageParts) {
        const { parts, options: { doNotOverrideSgrCodes } } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(doNotOverrideSgrCodes ? parts : parts.map((part) => Colorize_1.Colorize.red(AnsiEscape_1.AnsiEscape.removeCodes(part))), ITerminalProvider_1.TerminalProviderSeverity.error, false);
    }
    /**
     * {@inheritdoc ITerminal.writeErrorLine}
     */
    writeErrorLine(...messageParts) {
        const { parts, options: { doNotOverrideSgrCodes } } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(doNotOverrideSgrCodes ? parts : parts.map((part) => Colorize_1.Colorize.red(AnsiEscape_1.AnsiEscape.removeCodes(part))), ITerminalProvider_1.TerminalProviderSeverity.error, true);
    }
    /**
     * {@inheritdoc ITerminal.writeVerbose}
     */
    writeVerbose(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.verbose, false);
    }
    /**
     * {@inheritdoc ITerminal.writeVerboseLine}
     */
    writeVerboseLine(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.verbose, true);
    }
    /**
     * {@inheritdoc ITerminal.writeDebug}
     */
    writeDebug(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.debug, false);
    }
    /**
     * {@inheritdoc ITerminal.writeDebugLine}
     */
    writeDebugLine(...messageParts) {
        const { parts } = this._normalizeWriteParameters(messageParts);
        this._writeSegmentsToProviders(parts, ITerminalProvider_1.TerminalProviderSeverity.debug, true);
    }
    _writeSegmentsToProviders(segments, severity, followedByEol) {
        const lines = [segments.join('')];
        if (followedByEol) {
            lines.push('');
        }
        let linesWithoutColor;
        const concatenatedLinesWithColorByNewlineChar = new Map();
        const concatenatedLinesWithoutColorByNewlineChar = new Map();
        for (const provider of this._providers) {
            let textToWrite;
            const eol = provider.eolCharacter;
            if (provider.supportsColor) {
                textToWrite = concatenatedLinesWithColorByNewlineChar.get(eol);
                if (!textToWrite) {
                    textToWrite = lines.join(eol);
                    concatenatedLinesWithColorByNewlineChar.set(eol, textToWrite);
                }
            }
            else {
                textToWrite = concatenatedLinesWithoutColorByNewlineChar.get(eol);
                if (!textToWrite) {
                    if (!linesWithoutColor) {
                        linesWithoutColor = [];
                        for (const line of lines) {
                            linesWithoutColor.push(AnsiEscape_1.AnsiEscape.removeCodes(line));
                        }
                    }
                    textToWrite = linesWithoutColor.join(eol);
                    concatenatedLinesWithoutColorByNewlineChar.set(eol, textToWrite);
                }
            }
            provider.write(textToWrite, severity);
        }
    }
    _normalizeWriteParameters(parameters) {
        if (parameters.length === 0) {
            return { parts: [], options: {} };
        }
        else {
            const lastParameter = parameters[parameters.length - 1];
            if (typeof lastParameter === 'string') {
                return { parts: parameters, options: {} };
            }
            else {
                return { parts: parameters.slice(0, -1), options: lastParameter };
            }
        }
    }
}
exports.Terminal = Terminal;
//# sourceMappingURL=Terminal.js.map