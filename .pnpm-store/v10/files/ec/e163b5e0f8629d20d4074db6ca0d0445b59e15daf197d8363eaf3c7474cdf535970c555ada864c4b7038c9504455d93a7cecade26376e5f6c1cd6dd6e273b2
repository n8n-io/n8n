"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Terminal = void 0;
const ITerminalProvider_1 = require("./ITerminalProvider");
const Colorize_1 = require("./Colorize");
const AnsiEscape_1 = require("./AnsiEscape");
/**
 * Colors used with {@link ILegacyColorableSequence}.
 */
var ColorValue;
(function (ColorValue) {
    ColorValue[ColorValue["Black"] = 0] = "Black";
    ColorValue[ColorValue["Red"] = 1] = "Red";
    ColorValue[ColorValue["Green"] = 2] = "Green";
    ColorValue[ColorValue["Yellow"] = 3] = "Yellow";
    ColorValue[ColorValue["Blue"] = 4] = "Blue";
    ColorValue[ColorValue["Magenta"] = 5] = "Magenta";
    ColorValue[ColorValue["Cyan"] = 6] = "Cyan";
    ColorValue[ColorValue["White"] = 7] = "White";
    ColorValue[ColorValue["Gray"] = 8] = "Gray";
})(ColorValue || (ColorValue = {}));
/**
 * Text styles used with {@link ILegacyColorableSequence}.
 */
var TextAttribute;
(function (TextAttribute) {
    TextAttribute[TextAttribute["Bold"] = 0] = "Bold";
    TextAttribute[TextAttribute["Dim"] = 1] = "Dim";
    TextAttribute[TextAttribute["Underline"] = 2] = "Underline";
    TextAttribute[TextAttribute["Blink"] = 3] = "Blink";
    TextAttribute[TextAttribute["InvertColor"] = 4] = "InvertColor";
    TextAttribute[TextAttribute["Hidden"] = 5] = "Hidden";
})(TextAttribute || (TextAttribute = {}));
/**
 * This class facilitates writing to a console.
 *
 * @beta
 */
class Terminal {
    constructor(provider) {
        this._providers = new Set();
        this._providers.add(provider);
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
        if (this._providers.has(provider)) {
            this._providers.delete(provider);
        }
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
        const linesSegments = [[]];
        let currentLineSegments = linesSegments[0];
        for (const segment of segments) {
            if (typeof segment === 'string') {
                currentLineSegments.push(segment);
            }
            else {
                if (segment.isEol) {
                    linesSegments.push([]);
                    currentLineSegments = linesSegments[linesSegments.length - 1];
                }
                else {
                    currentLineSegments.push(this._serializeLegacyColorableSequence(segment));
                }
            }
        }
        const lines = [];
        for (const lineSegments of linesSegments) {
            lines.push(lineSegments.join(''));
        }
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
    _serializeLegacyColorableSequence(segment) {
        const startColorCodes = [];
        const endColorCodes = [];
        switch (segment.foregroundColor) {
            case ColorValue.Black: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.BlackForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Red: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.RedForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Green: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.GreenForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Yellow: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.YellowForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Blue: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.BlueForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Magenta: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.MagentaForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Cyan: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.CyanForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.White: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.WhiteForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
            case ColorValue.Gray: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.GrayForeground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultForeground);
                break;
            }
        }
        switch (segment.backgroundColor) {
            case ColorValue.Black: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.BlackBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Red: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.RedBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Green: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.GreenBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Yellow: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.YellowBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Blue: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.BlueBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Magenta: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.MagentaBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Cyan: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.CyanBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.White: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.WhiteBackground);
                endColorCodes.push(Colorize_1.SgrParameterAttribute.DefaultBackground);
                break;
            }
            case ColorValue.Gray: {
                startColorCodes.push(Colorize_1.SgrParameterAttribute.GrayBackground);
                endColorCodes.push(49);
                break;
            }
        }
        if (segment.textAttributes) {
            for (const textAttribute of segment.textAttributes) {
                switch (textAttribute) {
                    case TextAttribute.Bold: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.Bold);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.NormalColorOrIntensity);
                        break;
                    }
                    case TextAttribute.Dim: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.Dim);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.NormalColorOrIntensity);
                        break;
                    }
                    case TextAttribute.Underline: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.Underline);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.UnderlineOff);
                        break;
                    }
                    case TextAttribute.Blink: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.Blink);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.BlinkOff);
                        break;
                    }
                    case TextAttribute.InvertColor: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.InvertColor);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.InvertColorOff);
                        break;
                    }
                    case TextAttribute.Hidden: {
                        startColorCodes.push(Colorize_1.SgrParameterAttribute.Hidden);
                        endColorCodes.push(Colorize_1.SgrParameterAttribute.HiddenOff);
                        break;
                    }
                }
            }
        }
        const resultSegments = [];
        for (let j = 0; j < startColorCodes.length; j++) {
            const code = startColorCodes[j];
            resultSegments.push(AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(code));
        }
        resultSegments.push(segment.text);
        for (let j = endColorCodes.length - 1; j >= 0; j--) {
            const code = endColorCodes[j];
            resultSegments.push(AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(code));
        }
        return resultSegments.join('');
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