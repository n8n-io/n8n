"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoizedWarn = exports.warn = void 0;
const logger_1 = require("../logger");
const write_1 = require("../ux/write");
const cli_1 = require("./errors/cli");
const pretty_print_1 = __importDefault(require("./errors/pretty-print"));
/**
 * Prints a pretty warning message to stderr.
 *
 * @param input The error or string to print.
 */
function warn(input) {
    let err;
    if (typeof input === 'string') {
        err = new cli_1.CLIError.Warn(input);
    }
    else if (input instanceof Error) {
        err = (0, cli_1.addOclifExitCode)(input);
    }
    else {
        throw new TypeError('first argument must be a string or instance of Error');
    }
    const message = (0, pretty_print_1.default)(err);
    if (message)
        (0, write_1.stderr)(message);
    if (err?.stack)
        (0, logger_1.getLogger)().error(err.stack);
}
exports.warn = warn;
const WARNINGS = new Set();
function memoizedWarn(input) {
    if (!WARNINGS.has(input))
        warn(input);
    WARNINGS.add(input);
}
exports.memoizedWarn = memoizedWarn;
exports.default = warn;
