const util = require('util');

class ColorConsole {

    static log() {
        ColorConsole.writeNormal([...arguments], 39); // white
    }

    static info() {
        ColorConsole.writeNormal([...arguments], 36); // cyan
    }

    static success() {
        ColorConsole.writeNormal([...arguments], 32); // green
    }

    static warn() {
        ColorConsole.writeNormal([...arguments], 33); // yellow
    }

    static error() {
        ColorConsole.writeError([...arguments], 31); // red
    }

    static writeNormal(params, color) {
        // istanbul ignore else
        if (process.stdout.isTTY) {
            console.log.apply(null, ColorConsole.formatColor(params, color)); // eslint-disable-line no-console
        } else {
            console.log.apply(null, params); // eslint-disable-line no-console
        }
    }

    static writeError(params, color) {
        // istanbul ignore else
        if (process.stderr.isTTY) {
            console.error.apply(null, ColorConsole.formatColor(params, color)); // eslint-disable-line no-console
        } else {
            console.error.apply(null, params); // eslint-disable-line no-console
        }
    }

    static formatColor(args, color) {
        return args.map(a => `\x1b[${color}m${util.format(a)}\x1b[0m`);
    }
}

ColorConsole.log.bright = function () {
    ColorConsole.writeNormal([...arguments], 97); // light white
};

ColorConsole.info.bright = function () {
    ColorConsole.writeNormal([...arguments], 93); // light cyan
};

ColorConsole.success.bright = function () {
    ColorConsole.writeNormal([...arguments], 92); // light green
};

ColorConsole.warn.bright = function () {
    ColorConsole.writeNormal([...arguments], 93); // light yellow
};

ColorConsole.error.bright = function () {
    ColorConsole.writeError([...arguments], 91); // light red
};

module.exports = {ColorConsole};
