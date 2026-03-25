"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ux = exports.action = exports.stdout = exports.stderr = exports.colorize = exports.colorizeJson = exports.warn = exports.exit = exports.error = void 0;
const error_1 = require("../errors/error");
const exit_1 = require("../errors/exit");
const warn_1 = require("../errors/warn");
const simple_1 = __importDefault(require("./action/simple"));
const spinner_1 = __importDefault(require("./action/spinner"));
const colorize_json_1 = __importDefault(require("./colorize-json"));
const theme_1 = require("./theme");
const write_1 = require("./write");
var error_2 = require("../errors/error");
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return error_2.error; } });
var exit_2 = require("../errors/exit");
Object.defineProperty(exports, "exit", { enumerable: true, get: function () { return exit_2.exit; } });
var warn_2 = require("../errors/warn");
Object.defineProperty(exports, "warn", { enumerable: true, get: function () { return warn_2.warn; } });
var colorize_json_2 = require("./colorize-json");
Object.defineProperty(exports, "colorizeJson", { enumerable: true, get: function () { return __importDefault(colorize_json_2).default; } });
var theme_2 = require("./theme");
Object.defineProperty(exports, "colorize", { enumerable: true, get: function () { return theme_2.colorize; } });
var write_2 = require("./write");
Object.defineProperty(exports, "stderr", { enumerable: true, get: function () { return write_2.stderr; } });
Object.defineProperty(exports, "stdout", { enumerable: true, get: function () { return write_2.stdout; } });
const ACTION_TYPE = (Boolean(process.stderr.isTTY) &&
    !process.env.CI &&
    !['dumb', 'emacs-color'].includes(process.env.TERM) &&
    'spinner') ||
    'simple';
exports.action = ACTION_TYPE === 'spinner' ? new spinner_1.default() : new simple_1.default();
exports.ux = {
    action: exports.action,
    /**
     * Add color to text.
     * @param color color to use. Can be hex code (e.g. `#ff0000`), rgb (e.g. `rgb(255, 255, 255)`) or a standard ansi color (e.g. `red`)
     * @param text string to colorize
     * @returns colorized string
     */
    colorize: theme_1.colorize,
    /**
     * Add color to JSON.
     *
     * options
     *  pretty: set to true to pretty print the JSON (defaults to true)
     *  theme: theme to use for colorizing. See keys below for available options. All keys are optional and must be valid colors (e.g. hex code, rgb, or standard ansi color).
     *
     * Available theme keys:
     * - brace
     * - bracket
     * - colon
     * - comma
     * - key
     * - string
     * - number
     * - boolean
     * - null
     */
    colorizeJson: colorize_json_1.default,
    /**
     * Throw an error.
     *
     * If `exit` option is `false`, the error will be logged to stderr but not exit the process.
     * If `exit` is set to a number, the process will exit with that code.
     */
    error: error_1.error,
    /**
     * Exit the process with provided exit code (defaults to 0).
     */
    exit: exit_1.exit,
    /**
     * Log a formatted string to stderr.
     *
     * See node's util.format() for formatting options.
     */
    stderr: write_1.stderr,
    /**
     * Log a formatted string to stdout.
     *
     * See node's util.format() for formatting options.
     */
    stdout: write_1.stdout,
    /**
     * Prints a pretty warning message to stderr.
     */
    warn: warn_1.warn,
};
