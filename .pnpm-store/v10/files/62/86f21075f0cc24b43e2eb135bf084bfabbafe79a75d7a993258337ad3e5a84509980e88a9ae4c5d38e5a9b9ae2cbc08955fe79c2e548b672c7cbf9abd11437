"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COLOR_MAP = void 0;
exports.DEFAULT_COLOR_MAP = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    white_bold: '\x1b[01m',
    reset: '\x1b[0m',
};
class ColoredConsoleLine {
    constructor(colorMap = exports.DEFAULT_COLOR_MAP) {
        this.text = '';
        this.colorMap = colorMap;
    }
    addCharsWithColor(color, text) {
        const colorAnsi = this.colorMap[color];
        this.text +=
            colorAnsi !== undefined
                ? `${colorAnsi}${text}${this.colorMap.reset}`
                : text;
    }
    renderConsole() {
        return this.text;
    }
}
exports.default = ColoredConsoleLine;
