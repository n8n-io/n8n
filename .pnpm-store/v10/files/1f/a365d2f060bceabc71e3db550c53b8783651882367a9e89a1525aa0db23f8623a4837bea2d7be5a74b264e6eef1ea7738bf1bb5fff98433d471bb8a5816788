"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnsiEscape = void 0;
const Colorize_1 = require("./Colorize");
/**
 * Operations for working with text strings that contain
 * {@link https://en.wikipedia.org/wiki/ANSI_escape_code | ANSI escape codes}.
 * The most commonly used escape codes set the foreground/background color for console output.
 * @public
 */
class AnsiEscape {
    static getEscapeSequenceForAnsiCode(code) {
        return `\u001b[${code}m`;
    }
    /**
     * Returns the input text with all ANSI escape codes removed.  For example, this is useful when saving
     * colorized console output to a log file.
     */
    static removeCodes(text) {
        return text.replace(AnsiEscape._csiRegExp, '');
    }
    /**
     * Replaces ANSI escape codes with human-readable tokens.  This is useful for unit tests
     * that compare text strings in test assertions or snapshot files.
     */
    static formatForTests(text, options) {
        if (!options) {
            options = {};
        }
        let result = text.replace(AnsiEscape._csiRegExp, (capture, csiCode) => {
            // If it is an SGR code, then try to show a friendly token
            const match = csiCode.match(AnsiEscape._sgrRegExp);
            if (match) {
                const sgrParameter = parseInt(match[1], 10);
                const sgrParameterName = AnsiEscape._tryGetSgrFriendlyName(sgrParameter);
                if (sgrParameterName) {
                    // Example: "[black-bg]"
                    return `[${sgrParameterName}]`;
                }
            }
            // Otherwise show the raw code, but without the "[" from the CSI prefix
            // Example: "[31m]"
            return `[${csiCode}]`;
        });
        if (options.encodeNewlines) {
            result = result
                .replace(AnsiEscape._backslashNRegExp, '[n]')
                .replace(AnsiEscape._backslashRRegExp, `[r]`);
        }
        return result;
    }
    // Returns a human-readable token representing an SGR parameter, or undefined for parameter that is not well-known.
    // The SGR parameter numbers are documented in this table:
    // https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_parameters
    static _tryGetSgrFriendlyName(sgiParameter) {
        switch (sgiParameter) {
            case Colorize_1.SgrParameterAttribute.BlackForeground:
                return 'black';
            case Colorize_1.SgrParameterAttribute.RedForeground:
                return 'red';
            case Colorize_1.SgrParameterAttribute.GreenForeground:
                return 'green';
            case Colorize_1.SgrParameterAttribute.YellowForeground:
                return 'yellow';
            case Colorize_1.SgrParameterAttribute.BlueForeground:
                return 'blue';
            case Colorize_1.SgrParameterAttribute.MagentaForeground:
                return 'magenta';
            case Colorize_1.SgrParameterAttribute.CyanForeground:
                return 'cyan';
            case Colorize_1.SgrParameterAttribute.WhiteForeground:
                return 'white';
            case Colorize_1.SgrParameterAttribute.GrayForeground:
                return 'gray';
            case Colorize_1.SgrParameterAttribute.DefaultForeground:
                return 'default';
            case Colorize_1.SgrParameterAttribute.BlackBackground:
                return 'black-bg';
            case Colorize_1.SgrParameterAttribute.RedBackground:
                return 'red-bg';
            case Colorize_1.SgrParameterAttribute.GreenBackground:
                return 'green-bg';
            case Colorize_1.SgrParameterAttribute.YellowBackground:
                return 'yellow-bg';
            case Colorize_1.SgrParameterAttribute.BlueBackground:
                return 'blue-bg';
            case Colorize_1.SgrParameterAttribute.MagentaBackground:
                return 'magenta-bg';
            case Colorize_1.SgrParameterAttribute.CyanBackground:
                return 'cyan-bg';
            case Colorize_1.SgrParameterAttribute.WhiteBackground:
                return 'white-bg';
            case Colorize_1.SgrParameterAttribute.GrayBackground:
                return 'gray-bg';
            case Colorize_1.SgrParameterAttribute.DefaultBackground:
                return 'default-bg';
            case Colorize_1.SgrParameterAttribute.Bold:
                return 'bold';
            case Colorize_1.SgrParameterAttribute.Dim:
                return 'dim';
            case Colorize_1.SgrParameterAttribute.NormalColorOrIntensity:
                return 'normal';
            case Colorize_1.SgrParameterAttribute.Underline:
                return 'underline';
            case Colorize_1.SgrParameterAttribute.UnderlineOff:
                return 'underline-off';
            case Colorize_1.SgrParameterAttribute.Blink:
                return 'blink';
            case Colorize_1.SgrParameterAttribute.BlinkOff:
                return 'blink-off';
            case Colorize_1.SgrParameterAttribute.InvertColor:
                return 'invert';
            case Colorize_1.SgrParameterAttribute.InvertColorOff:
                return 'invert-off';
            case Colorize_1.SgrParameterAttribute.Hidden:
                return 'hidden';
            case Colorize_1.SgrParameterAttribute.HiddenOff:
                return 'hidden-off';
            default:
                return undefined;
        }
    }
}
exports.AnsiEscape = AnsiEscape;
// For now, we only care about the Control Sequence Introducer (CSI) commands which always start with "[".
// eslint-disable-next-line no-control-regex
AnsiEscape._csiRegExp = /\x1b\[([\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e])/gu;
// Text coloring is performed using Select Graphic Rendition (SGR) codes, which come after the
// CSI introducer "ESC [".  The SGR sequence is a number followed by "m".
AnsiEscape._sgrRegExp = /([0-9]+)m/u;
AnsiEscape._backslashNRegExp = /\n/g;
AnsiEscape._backslashRRegExp = /\r/g;
//# sourceMappingURL=AnsiEscape.js.map