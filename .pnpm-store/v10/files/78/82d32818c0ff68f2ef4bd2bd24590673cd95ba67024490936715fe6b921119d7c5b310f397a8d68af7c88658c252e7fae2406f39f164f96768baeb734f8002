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
export let options = {
    enabled,
    supportLevel,
};
function kolorist(start, end, level = 1 /* ansi */) {
    const open = `\x1b[${start}m`;
    const close = `\x1b[${end}m`;
    const regex = new RegExp(`\\x1b\\[${end}m`, 'g');
    return (str) => {
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
    const ansi = 16 +
        36 * Math.round((r / 255) * 5) +
        6 * Math.round((g / 255) * 5) +
        Math.round((b / 255) * 5);
    return ansi;
}
export function stripColors(str) {
    return ('' + str)
        .replace(/\x1b\[[0-9;]+m/g, '')
        .replace(/\x1b\]8;;.*?\x07(.*?)\x1b\]8;;\x07/g, (_, group) => group);
}
// modifiers
export const reset = kolorist(0, 0);
export const bold = kolorist(1, 22);
export const dim = kolorist(2, 22);
export const italic = kolorist(3, 23);
export const underline = kolorist(4, 24);
export const inverse = kolorist(7, 27);
export const hidden = kolorist(8, 28);
export const strikethrough = kolorist(9, 29);
// colors
export const black = kolorist(30, 39);
export const red = kolorist(31, 39);
export const green = kolorist(32, 39);
export const yellow = kolorist(33, 39);
export const blue = kolorist(34, 39);
export const magenta = kolorist(35, 39);
export const cyan = kolorist(36, 39);
export const white = kolorist(97, 39);
export const gray = kolorist(90, 39);
export const lightGray = kolorist(37, 39);
export const lightRed = kolorist(91, 39);
export const lightGreen = kolorist(92, 39);
export const lightYellow = kolorist(93, 39);
export const lightBlue = kolorist(94, 39);
export const lightMagenta = kolorist(95, 39);
export const lightCyan = kolorist(96, 39);
// background colors
export const bgBlack = kolorist(40, 49);
export const bgRed = kolorist(41, 49);
export const bgGreen = kolorist(42, 49);
export const bgYellow = kolorist(43, 49);
export const bgBlue = kolorist(44, 49);
export const bgMagenta = kolorist(45, 49);
export const bgCyan = kolorist(46, 49);
export const bgWhite = kolorist(107, 49);
export const bgGray = kolorist(100, 49);
export const bgLightRed = kolorist(101, 49);
export const bgLightGreen = kolorist(102, 49);
export const bgLightYellow = kolorist(103, 49);
export const bgLightBlue = kolorist(104, 49);
export const bgLightMagenta = kolorist(105, 49);
export const bgLightCyan = kolorist(106, 49);
export const bgLightGray = kolorist(47, 49);
// 256 support
export const ansi256 = (n) => kolorist('38;5;' + n, 0, 2 /* ansi256 */);
export const ansi256Bg = (n) => kolorist('48;5;' + n, 0, 2 /* ansi256 */);
// TrueColor 24bit support
export const trueColor = (r, g, b) => {
    return options.supportLevel === 2 /* ansi256 */
        ? ansi256(rgbToAnsi256(r, g, b))
        : kolorist(`38;2;${r};${g};${b}`, 0, 3 /* trueColor */);
};
export const trueColorBg = (r, g, b) => {
    return options.supportLevel === 2 /* ansi256 */
        ? ansi256Bg(rgbToAnsi256(r, g, b))
        : kolorist(`48;2;${r};${g};${b}`, 0, 3 /* trueColor */);
};
// Links
const OSC = '\u001B]';
const BEL = '\u0007';
const SEP = ';';
export function link(text, url) {
    return options.enabled
        ? OSC + '8' + SEP + SEP + url + BEL + text + OSC + '8' + SEP + SEP + BEL
        : `${text} (\u200B${url}\u200B)`;
}
//# sourceMappingURL=index.js.map