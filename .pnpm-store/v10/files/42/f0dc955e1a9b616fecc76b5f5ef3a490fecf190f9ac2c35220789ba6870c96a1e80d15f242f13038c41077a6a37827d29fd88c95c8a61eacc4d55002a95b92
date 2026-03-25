var enabled = true;
// Support both browser and node environments
var globalVar = typeof self !== 'undefined'
    ? self
    : typeof window !== 'undefined'
        ? window
        : typeof global !== 'undefined'
            ? global
            : {};
/**
 * Detect how much colors the current terminal supports
 */
var supportLevel = 0 /* none */;
if (globalVar.process && globalVar.process.env && globalVar.process.stdout) {
    var _a = globalVar.process.env, FORCE_COLOR = _a.FORCE_COLOR, NODE_DISABLE_COLORS = _a.NODE_DISABLE_COLORS, NO_COLOR = _a.NO_COLOR, TERM = _a.TERM, COLORTERM = _a.COLORTERM;
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
        ].some(function (vendor) { return vendor in globalVar.process.env; })) {
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
export var options = {
    enabled: enabled,
    supportLevel: supportLevel,
};
function kolorist(start, end, level) {
    if (level === void 0) { level = 1 /* ansi */; }
    var open = "\u001B[" + start + "m";
    var close = "\u001B[" + end + "m";
    var regex = new RegExp("\\x1b\\[" + end + "m", 'g');
    return function (str) {
        return options.enabled && options.supportLevel >= level
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
    var ansi = 16 +
        36 * Math.round((r / 255) * 5) +
        6 * Math.round((g / 255) * 5) +
        Math.round((b / 255) * 5);
    return ansi;
}
export function stripColors(str) {
    return ('' + str)
        .replace(/\x1b\[[0-9;]+m/g, '')
        .replace(/\x1b\]8;;.*?\x07(.*?)\x1b\]8;;\x07/g, function (_, group) { return group; });
}
// modifiers
export var reset = kolorist(0, 0);
export var bold = kolorist(1, 22);
export var dim = kolorist(2, 22);
export var italic = kolorist(3, 23);
export var underline = kolorist(4, 24);
export var inverse = kolorist(7, 27);
export var hidden = kolorist(8, 28);
export var strikethrough = kolorist(9, 29);
// colors
export var black = kolorist(30, 39);
export var red = kolorist(31, 39);
export var green = kolorist(32, 39);
export var yellow = kolorist(33, 39);
export var blue = kolorist(34, 39);
export var magenta = kolorist(35, 39);
export var cyan = kolorist(36, 39);
export var white = kolorist(97, 39);
export var gray = kolorist(90, 39);
export var lightGray = kolorist(37, 39);
export var lightRed = kolorist(91, 39);
export var lightGreen = kolorist(92, 39);
export var lightYellow = kolorist(93, 39);
export var lightBlue = kolorist(94, 39);
export var lightMagenta = kolorist(95, 39);
export var lightCyan = kolorist(96, 39);
// background colors
export var bgBlack = kolorist(40, 49);
export var bgRed = kolorist(41, 49);
export var bgGreen = kolorist(42, 49);
export var bgYellow = kolorist(43, 49);
export var bgBlue = kolorist(44, 49);
export var bgMagenta = kolorist(45, 49);
export var bgCyan = kolorist(46, 49);
export var bgWhite = kolorist(107, 49);
export var bgGray = kolorist(100, 49);
export var bgLightRed = kolorist(101, 49);
export var bgLightGreen = kolorist(102, 49);
export var bgLightYellow = kolorist(103, 49);
export var bgLightBlue = kolorist(104, 49);
export var bgLightMagenta = kolorist(105, 49);
export var bgLightCyan = kolorist(106, 49);
export var bgLightGray = kolorist(47, 49);
// 256 support
export var ansi256 = function (n) {
    return kolorist('38;5;' + n, 0, 2 /* ansi256 */);
};
export var ansi256Bg = function (n) {
    return kolorist('48;5;' + n, 0, 2 /* ansi256 */);
};
// TrueColor 24bit support
export var trueColor = function (r, g, b) {
    return options.supportLevel === 2 /* ansi256 */
        ? ansi256(rgbToAnsi256(r, g, b))
        : kolorist("38;2;" + r + ";" + g + ";" + b, 0, 3 /* trueColor */);
};
export var trueColorBg = function (r, g, b) {
    return options.supportLevel === 2 /* ansi256 */
        ? ansi256Bg(rgbToAnsi256(r, g, b))
        : kolorist("48;2;" + r + ";" + g + ";" + b, 0, 3 /* trueColor */);
};
// Links
var OSC = '\u001B]';
var BEL = '\u0007';
var SEP = ';';
export function link(text, url) {
    return options.enabled
        ? OSC + '8' + SEP + SEP + url + BEL + text + OSC + '8' + SEP + SEP + BEL
        : text + " (\u200B" + url + "\u200B)";
}
//# sourceMappingURL=index.js.map