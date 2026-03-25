"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorize = colorize;
exports.parseTheme = parseTheme;
const ansis_1 = __importDefault(require("ansis"));
const theme_1 = require("../interfaces/theme");
const supports_color_1 = require("./supports-color");
function isStandardAnsi(color) {
    return theme_1.STANDARD_ANSI.includes(color);
}
/**
 * Add color to text.
 * @param color color to use. Can be hex code (e.g. `#ff0000`), rgb (e.g. `rgb(255, 255, 255)`) or a standard ansi color (e.g. `red`)
 * @param text string to colorize
 * @returns colorized string
 */
function colorize(color, text) {
    if (!color)
        return text;
    if (!(0, supports_color_1.supportsColor)())
        return text;
    if (isStandardAnsi(color))
        return ansis_1.default[color](text);
    if (color.startsWith('#'))
        return ansis_1.default.hex(color)(text);
    if (color.startsWith('rgb')) {
        const [red, green, blue] = color
            .slice(4, -1)
            .split(',')
            .map((c) => Number.parseInt(c.trim(), 10));
        return ansis_1.default.rgb(red, green, blue)(text);
    }
    return text;
}
function parseTheme(theme) {
    return Object.fromEntries(Object.entries(theme)
        .map(([key, value]) => [key, typeof value === 'string' ? isValid(value) : parseTheme(value)])
        .filter(([_, value]) => value));
}
function isValid(color) {
    return color.startsWith('#') || color.startsWith('rgb') || isStandardAnsi(color) ? color : undefined;
}
