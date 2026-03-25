"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.link = exports.trueColorBg = exports.trueColor = exports.ansi256Bg = exports.ansi256 = exports.bgLightGray = exports.bgLightCyan = exports.bgLightMagenta = exports.bgLightBlue = exports.bgLightYellow = exports.bgLightGreen = exports.bgLightRed = exports.bgGray = exports.bgWhite = exports.bgCyan = exports.bgMagenta = exports.bgBlue = exports.bgYellow = exports.bgGreen = exports.bgRed = exports.bgBlack = exports.lightCyan = exports.lightMagenta = exports.lightBlue = exports.lightYellow = exports.lightGreen = exports.lightRed = exports.lightGray = exports.gray = exports.white = exports.cyan = exports.magenta = exports.blue = exports.yellow = exports.green = exports.red = exports.black = exports.strikethrough = exports.hidden = exports.inverse = exports.underline = exports.italic = exports.dim = exports.bold = exports.reset = exports.stripColors = exports.options = void 0;
let enabled = true;
// Support both browser and node environments
const globalVar = typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
            ? global
            : {};
/**
 * Detect how much colors the current terminal supports
 */
let supportLevel = 0 /* none */;
if (globalVar.process && globalVar.process.env && globalVar.process.stdout) {
    const { FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM, COLORTERM } = globalVar.process.env;
    if (NODE_DISABLE_COLORS || NO_COLOR || FORCE_COLOR === '0') {
        enabled = false;
    }
    else if (FORCE_COLOR === '1' ||
        FORCE_COLOR === '2' ||
        FORCE_COLOR === '3') {
        enabled = true;
    }
    else if (TERM === 'dumb') {
        enabled = false;
    }
    else if ('CI' in globalVar.process.env &&
        [
            'TRAVIS',
            'CIRCLECI',
            'APPVEYOR',
            'GITLAB_CI',
            'GITHUB_ACTIONS',
            'BUILDKITE',
            'DRONE',
        ].some(vendor => vendor in globalVar.process.env)) {
        enabled = true;
    }
    else {
        enabled = process.stdout.isTTY;
    }
    if (enabled) {
        // Windows supports 24bit True Colors since Windows 10 revision #14931,
        // see https://devblogs.microsoft.com/commandline/24-bit-color-in-the-windows-console/
        if (process.platform === 'win32') {
            supportLevel = 3 /* trueColor */;
        }
        else {
            if (COLORTERM && (COLORTERM === 'truecolor' || COLORTERM === '24bit')) {
                supportLevel = 3 /* trueColor */;
            }
            else if (TERM && (TERM.endsWith('-256color') || TERM.endsWith('256'))) {
                supportLevel = 2 /* ansi256 */;
            }
            else {
                supportLevel = 1 /* ansi */;
            }
        }
    }
}
exports.options = {
    enabled,
    supportLevel,
};
function kolorist(start, end, level = 1 /* ansi */) {
    const open = `\x1b[${start}m`;
    const close = `\x1b[${end}m`;
    const regex = new RegExp(`\\x1b\\[${end}m`, 'g');
    return (str) => {
        return exports.options.enabled && exports.options.supportLevel >= level
            ? open + ('' + str).replace(regex, open) + close
            : '' + str;
    };
}
// Lower colors into 256 color space
// Taken from https://github.com/Qix-/color-convert/blob/3f0e0d4e92e235796ccb17f6e85c72094a651f49/conversions.js
// which is MIT licensed and copyright by Heather Arthur and Josh Junon
function rgbToAnsi256(r, g, b) {
    // We use the extended greyscale palette here, with the exception of
    // black and white. normal palette only has 4 greyscale shades.
    if (r >> 4 === g >> 4 && g >> 4 === b >> 4) {
        if (r < 8) {
            return 16;
        }
        if (r > 248) {
            return 231;
        }
        return Math.round(((r - 8) / 247) * 24) + 232;
    }
    const ansi = 16 +
        36 * Math.round((r / 255) * 5) +
        6 * Math.round((g / 255) * 5) +
        Math.round((b / 255) * 5);
    return ansi;
}
function stripColors(str) {
    return ('' + str)
        .replace(/\x1b\[[0-9;]+m/g, '')
        .replace(/\x1b\]8;;.*?\x07(.*?)\x1b\]8;;\x07/g, (_, group) => group);
}
exports.stripColors = stripColors;
// modifiers
exports.reset = kolorist(0, 0);
exports.bold = kolorist(1, 22);
exports.dim = kolorist(2, 22);
exports.italic = kolorist(3, 23);
exports.underline = kolorist(4, 24);
exports.inverse = kolorist(7, 27);
exports.hidden = kolorist(8, 28);
exports.strikethrough = kolorist(9, 29);
// colors
exports.black = kolorist(30, 39);
exports.red = kolorist(31, 39);
exports.green = kolorist(32, 39);
exports.yellow = kolorist(33, 39);
exports.blue = kolorist(34, 39);
exports.magenta = kolorist(35, 39);
exports.cyan = kolorist(36, 39);
exports.white = kolorist(97, 39);
exports.gray = kolorist(90, 39);
exports.lightGray = kolorist(37, 39);
exports.lightRed = kolorist(91, 39);
exports.lightGreen = kolorist(92, 39);
exports.lightYellow = kolorist(93, 39);
exports.lightBlue = kolorist(94, 39);
exports.lightMagenta = kolorist(95, 39);
exports.lightCyan = kolorist(96, 39);
// background colors
exports.bgBlack = kolorist(40, 49);
exports.bgRed = kolorist(41, 49);
exports.bgGreen = kolorist(42, 49);
exports.bgYellow = kolorist(43, 49);
exports.bgBlue = kolorist(44, 49);
exports.bgMagenta = kolorist(45, 49);
exports.bgCyan = kolorist(46, 49);
exports.bgWhite = kolorist(107, 49);
exports.bgGray = kolorist(100, 49);
exports.bgLightRed = kolorist(101, 49);
exports.bgLightGreen = kolorist(102, 49);
exports.bgLightYellow = kolorist(103, 49);
exports.bgLightBlue = kolorist(104, 49);
exports.bgLightMagenta = kolorist(105, 49);
exports.bgLightCyan = kolorist(106, 49);
exports.bgLightGray = kolorist(47, 49);
// 256 support
const ansi256 = (n) => kolorist('38;5;' + n, 0, 2 /* ansi256 */);
exports.ansi256 = ansi256;
const ansi256Bg = (n) => kolorist('48;5;' + n, 0, 2 /* ansi256 */);
exports.ansi256Bg = ansi256Bg;
// TrueColor 24bit support
const trueColor = (r, g, b) => {
    return exports.options.supportLevel === 2 /* ansi256 */
        ? exports.ansi256(rgbToAnsi256(r, g, b))
        : kolorist(`38;2;${r};${g};${b}`, 0, 3 /* trueColor */);
};
exports.trueColor = trueColor;
const trueColorBg = (r, g, b) => {
    return exports.options.supportLevel === 2 /* ansi256 */
        ? exports.ansi256Bg(rgbToAnsi256(r, g, b))
        : kolorist(`48;2;${r};${g};${b}`, 0, 3 /* trueColor */);
};
exports.trueColorBg = trueColorBg;
// Links
const OSC = '\u001B]';
const BEL = '\u0007';
const SEP = ';';
function link(text, url) {
    return exports.options.enabled
        ? OSC + '8' + SEP + SEP + url + BEL + text + OSC + '8' + SEP + SEP + BEL
        : `${text} (\u200B${url}\u200B)`;
}
exports.link = link;
//# sourceMappingURL=index.js.map