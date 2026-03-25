"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colorize = exports.SgrParameterAttribute = void 0;
const AnsiEscape_1 = require("./AnsiEscape");
var SgrParameterAttribute;
(function (SgrParameterAttribute) {
    SgrParameterAttribute[SgrParameterAttribute["BlackForeground"] = 30] = "BlackForeground";
    SgrParameterAttribute[SgrParameterAttribute["RedForeground"] = 31] = "RedForeground";
    SgrParameterAttribute[SgrParameterAttribute["GreenForeground"] = 32] = "GreenForeground";
    SgrParameterAttribute[SgrParameterAttribute["YellowForeground"] = 33] = "YellowForeground";
    SgrParameterAttribute[SgrParameterAttribute["BlueForeground"] = 34] = "BlueForeground";
    SgrParameterAttribute[SgrParameterAttribute["MagentaForeground"] = 35] = "MagentaForeground";
    SgrParameterAttribute[SgrParameterAttribute["CyanForeground"] = 36] = "CyanForeground";
    SgrParameterAttribute[SgrParameterAttribute["WhiteForeground"] = 37] = "WhiteForeground";
    SgrParameterAttribute[SgrParameterAttribute["GrayForeground"] = 90] = "GrayForeground";
    SgrParameterAttribute[SgrParameterAttribute["DefaultForeground"] = 39] = "DefaultForeground";
    SgrParameterAttribute[SgrParameterAttribute["BlackBackground"] = 40] = "BlackBackground";
    SgrParameterAttribute[SgrParameterAttribute["RedBackground"] = 41] = "RedBackground";
    SgrParameterAttribute[SgrParameterAttribute["GreenBackground"] = 42] = "GreenBackground";
    SgrParameterAttribute[SgrParameterAttribute["YellowBackground"] = 43] = "YellowBackground";
    SgrParameterAttribute[SgrParameterAttribute["BlueBackground"] = 44] = "BlueBackground";
    SgrParameterAttribute[SgrParameterAttribute["MagentaBackground"] = 45] = "MagentaBackground";
    SgrParameterAttribute[SgrParameterAttribute["CyanBackground"] = 46] = "CyanBackground";
    SgrParameterAttribute[SgrParameterAttribute["WhiteBackground"] = 47] = "WhiteBackground";
    SgrParameterAttribute[SgrParameterAttribute["GrayBackground"] = 100] = "GrayBackground";
    SgrParameterAttribute[SgrParameterAttribute["DefaultBackground"] = 49] = "DefaultBackground";
    SgrParameterAttribute[SgrParameterAttribute["Bold"] = 1] = "Bold";
    // On Linux, the "BoldOff" code instead causes the text to be double-underlined:
    // https://en.wikipedia.org/wiki/Talk:ANSI_escape_code#SGR_21%E2%80%94%60Bold_off%60_not_widely_supported
    // Use "NormalColorOrIntensity" instead
    // BoldOff = 21,
    SgrParameterAttribute[SgrParameterAttribute["Dim"] = 2] = "Dim";
    SgrParameterAttribute[SgrParameterAttribute["NormalColorOrIntensity"] = 22] = "NormalColorOrIntensity";
    SgrParameterAttribute[SgrParameterAttribute["Underline"] = 4] = "Underline";
    SgrParameterAttribute[SgrParameterAttribute["UnderlineOff"] = 24] = "UnderlineOff";
    SgrParameterAttribute[SgrParameterAttribute["Blink"] = 5] = "Blink";
    SgrParameterAttribute[SgrParameterAttribute["BlinkOff"] = 25] = "BlinkOff";
    SgrParameterAttribute[SgrParameterAttribute["InvertColor"] = 7] = "InvertColor";
    SgrParameterAttribute[SgrParameterAttribute["InvertColorOff"] = 27] = "InvertColorOff";
    SgrParameterAttribute[SgrParameterAttribute["Hidden"] = 8] = "Hidden";
    SgrParameterAttribute[SgrParameterAttribute["HiddenOff"] = 28] = "HiddenOff";
})(SgrParameterAttribute || (exports.SgrParameterAttribute = SgrParameterAttribute = {}));
const RAINBOW_SEQUENCE = [
    SgrParameterAttribute.RedForeground,
    SgrParameterAttribute.YellowForeground,
    SgrParameterAttribute.GreenForeground,
    SgrParameterAttribute.CyanForeground,
    SgrParameterAttribute.BlueForeground,
    SgrParameterAttribute.MagentaForeground
];
/**
 * The static functions on this class are used to produce colored text
 * for use with a terminal that supports ANSI escape codes.
 *
 * Note that this API always generates color codes, regardless of whether
 * the process's stdout is a TTY. The reason is that, in a complex program, the
 * code that is generating strings often does not know were those strings will end
 * up. In some cases, the same log message may get printed both to a shell
 * that supports color AND to a log file that does not.
 *
 * @example
 * ```ts
 * console.log(Colorize.red('Red Text!'))
 * terminal.writeLine(Colorize.green('Green Text!'), ' ', Colorize.blue('Blue Text!'));
 *```
 *
 * @public
 */
class Colorize {
    static black(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.BlackForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static red(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.RedForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static green(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.GreenForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static yellow(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.YellowForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static blue(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.BlueForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static magenta(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.MagentaForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static cyan(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.CyanForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static white(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.WhiteForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static gray(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.GrayForeground, SgrParameterAttribute.DefaultForeground, text);
    }
    static blackBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.BlackBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static redBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.RedBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static greenBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.GreenBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static yellowBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.YellowBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static blueBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.BlueBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static magentaBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.MagentaBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static cyanBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.CyanBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static whiteBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.WhiteBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static grayBackground(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.GrayBackground, SgrParameterAttribute.DefaultBackground, text);
    }
    static bold(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.Bold, SgrParameterAttribute.NormalColorOrIntensity, text);
    }
    static dim(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.Dim, SgrParameterAttribute.NormalColorOrIntensity, text);
    }
    static underline(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.Underline, SgrParameterAttribute.UnderlineOff, text);
    }
    static blink(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.Blink, SgrParameterAttribute.BlinkOff, text);
    }
    static invertColor(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.InvertColor, SgrParameterAttribute.InvertColorOff, text);
    }
    static hidden(text) {
        return Colorize._wrapTextInAnsiEscapeCodes(SgrParameterAttribute.Hidden, SgrParameterAttribute.HiddenOff, text);
    }
    static rainbow(text) {
        return Colorize._applyColorSequence(text, RAINBOW_SEQUENCE);
    }
    static _applyColorSequence(text, sequence) {
        let result = '';
        const sequenceLength = sequence.length;
        for (let i = 0; i < text.length; i++) {
            result += AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(sequence[i % sequenceLength]) + text[i];
        }
        return result + AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(SgrParameterAttribute.DefaultForeground);
    }
    static _wrapTextInAnsiEscapeCodes(startCode, endCode, text) {
        return (AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(startCode) +
            text +
            AnsiEscape_1.AnsiEscape.getEscapeSequenceForAnsiCode(endCode));
    }
}
exports.Colorize = Colorize;
//# sourceMappingURL=Colorize.js.map