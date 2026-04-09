"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ansiStyles = exports.codes = exports.colorNames = exports.backgroundColorNames = exports.foregroundColorNames = exports.modifierNames = void 0;
const styles = {
    modifier: {
        reset: [0, 0],
        // 21 isn't widely supported and 22 does the same thing
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        overline: [53, 55],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29],
    },
    color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        // Bright color
        blackBright: [90, 39],
        gray: [90, 39], // Alias of `blackBright`
        grey: [90, 39], // Alias of `blackBright`
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39],
    },
    bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        // Bright color
        bgBlackBright: [100, 49],
        bgGray: [100, 49], // Alias of `bgBlackBright`
        bgGrey: [100, 49], // Alias of `bgBlackBright`
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49],
    },
};
exports.modifierNames = Object.keys(styles.modifier);
exports.foregroundColorNames = Object.keys(styles.color);
exports.backgroundColorNames = Object.keys(styles.bgColor);
exports.colorNames = [...exports.foregroundColorNames, ...exports.backgroundColorNames];
class AnsiStyles {
}
exports.codes = new Map();
const ingest = (set) => Object.fromEntries(Object.entries(set).map(([key, [open, close]]) => {
    exports.codes.set(open, close);
    return [
        key,
        (AnsiStyles.prototype[key] = {
            open: `\u001B[${open}m`,
            close: `\u001B[${close}m`,
        }),
    ];
}));
exports.ansiStyles = new (class extends AnsiStyles {
    codes = exports.codes;
    modifier = ingest(styles.modifier);
    color = {
        ...ingest(styles.color),
        close: "\x1B[39m",
        ansi: (code) => `\u001B[${code}m`,
        ansi256: (code) => `\u001B[${38};5;${code}m`,
        ansi16m: (red, green, blue) => `\u001B[${38};2;${red};${green};${blue}m`,
    };
    bgColor = {
        ...ingest(styles.bgColor),
        close: "\u001B[49m",
        ansi: (code) => `\u001B[${code + 10}m`,
        ansi256: (code) => `\u001B[${48};5;${code}m`,
        ansi16m: (red, green, blue) => `\u001B[${48};2;${red};${green};${blue}m`,
    };
    rgbToAnsi256(red, green, blue) {
        // We use the extended greyscale palette here, with the exception of
        // black and white. normal palette only has 4 greyscale shades.
        if (red === green && green === blue) {
            if (red < 8)
                return 16;
            if (red > 248)
                return 231;
            return Math.round(((red - 8) / 247) * 24) + 232;
        }
        return (16 +
            36 * Math.round((red / 255) * 5) +
            6 * Math.round((green / 255) * 5) +
            Math.round((blue / 255) * 5));
    }
    hexToRgb(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
            return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
            colorString = [...colorString]
                .map((character) => character + character)
                .join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
            (integer >> 16) & 0xff,
            (integer >> 8) & 0xff,
            integer & 0xff,
        ];
    }
    hexToAnsi256(hex) {
        return this.rgbToAnsi256(...this.hexToRgb(hex));
    }
    ansi256ToAnsi(code) {
        if (code < 8) {
            return 30 + code;
        }
        if (code < 16) {
            return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
            red = ((code - 232) * 10 + 8) / 255;
            green = red;
            blue = red;
        }
        else {
            code -= 16;
            const remainder = code % 36;
            red = Math.floor(code / 36) / 5;
            green = Math.floor(remainder / 6) / 5;
            blue = (remainder % 6) / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
            return 30;
        }
        let result = 30 +
            ((Math.round(blue) << 2) | (Math.round(green) << 1) | Math.round(red));
        if (value === 2) {
            result += 60;
        }
        return result;
    }
    rgbToAnsi(red, green, blue) {
        return this.ansi256ToAnsi(this.rgbToAnsi256(red, green, blue));
    }
    hexToAnsi(hex) {
        return this.ansi256ToAnsi(this.hexToAnsi256(hex));
    }
})();
//# sourceMappingURL=index.js.map