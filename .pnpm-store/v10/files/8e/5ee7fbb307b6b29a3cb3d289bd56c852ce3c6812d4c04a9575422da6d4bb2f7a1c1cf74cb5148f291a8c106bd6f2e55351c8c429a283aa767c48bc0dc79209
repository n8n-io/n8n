// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { SgrParameterAttribute } from './Colorize';
/**
 * Operations for working with text strings that contain
 * {@link https://en.wikipedia.org/wiki/ANSI_escape_code | ANSI escape codes}.
 * The most commonly used escape codes set the foreground/background color for console output.
 * @public
 */
export class AnsiEscape {
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
            case SgrParameterAttribute.BlackForeground:
                return 'black';
            case SgrParameterAttribute.RedForeground:
                return 'red';
            case SgrParameterAttribute.GreenForeground:
                return 'green';
            case SgrParameterAttribute.YellowForeground:
                return 'yellow';
            case SgrParameterAttribute.BlueForeground:
                return 'blue';
            case SgrParameterAttribute.MagentaForeground:
                return 'magenta';
            case SgrParameterAttribute.CyanForeground:
                return 'cyan';
            case SgrParameterAttribute.WhiteForeground:
                return 'white';
            case SgrParameterAttribute.GrayForeground:
                return 'gray';
            case SgrParameterAttribute.DefaultForeground:
                return 'default';
            case SgrParameterAttribute.BlackBackground:
                return 'black-bg';
            case SgrParameterAttribute.RedBackground:
                return 'red-bg';
            case SgrParameterAttribute.GreenBackground:
                return 'green-bg';
            case SgrParameterAttribute.YellowBackground:
                return 'yellow-bg';
            case SgrParameterAttribute.BlueBackground:
                return 'blue-bg';
            case SgrParameterAttribute.MagentaBackground:
                return 'magenta-bg';
            case SgrParameterAttribute.CyanBackground:
                return 'cyan-bg';
            case SgrParameterAttribute.WhiteBackground:
                return 'white-bg';
            case SgrParameterAttribute.GrayBackground:
                return 'gray-bg';
            case SgrParameterAttribute.DefaultBackground:
                return 'default-bg';
            case SgrParameterAttribute.Bold:
                return 'bold';
            case SgrParameterAttribute.Dim:
                return 'dim';
            case SgrParameterAttribute.NormalColorOrIntensity:
                return 'normal';
            case SgrParameterAttribute.Underline:
                return 'underline';
            case SgrParameterAttribute.UnderlineOff:
                return 'underline-off';
            case SgrParameterAttribute.Blink:
                return 'blink';
            case SgrParameterAttribute.BlinkOff:
                return 'blink-off';
            case SgrParameterAttribute.InvertColor:
                return 'invert';
            case SgrParameterAttribute.InvertColorOff:
                return 'invert-off';
            case SgrParameterAttribute.Hidden:
                return 'hidden';
            case SgrParameterAttribute.HiddenOff:
                return 'hidden-off';
            default:
                return undefined;
        }
    }
}
// For now, we only care about the Control Sequence Introducer (CSI) commands which always start with "[".
// eslint-disable-next-line no-control-regex
AnsiEscape._csiRegExp = /\x1b\[([\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e])/gu;
// Text coloring is performed using Select Graphic Rendition (SGR) codes, which come after the
// CSI introducer "ESC [".  The SGR sequence is a number followed by "m".
AnsiEscape._sgrRegExp = /([0-9]+)m/u;
AnsiEscape._backslashNRegExp = /\n/g;
AnsiEscape._backslashRRegExp = /\r/g;
//# sourceMappingURL=AnsiEscape.js.map