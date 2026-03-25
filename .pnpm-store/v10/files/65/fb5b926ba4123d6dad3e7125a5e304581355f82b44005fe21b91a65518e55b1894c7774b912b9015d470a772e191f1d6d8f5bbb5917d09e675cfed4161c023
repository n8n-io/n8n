"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLIError = exports.addOclifExitCode = void 0;
const ansis_1 = __importDefault(require("ansis"));
const clean_stack_1 = __importDefault(require("clean-stack"));
const indent_string_1 = __importDefault(require("indent-string"));
const wrap_ansi_1 = __importDefault(require("wrap-ansi"));
const cache_1 = __importDefault(require("../../cache"));
const screen_1 = require("../../screen");
const settings_1 = require("../../settings");
/**
 * properties specific to internal oclif error handling
 */
function addOclifExitCode(error, options) {
    if (!('oclif' in error)) {
        ;
        error.oclif = {};
    }
    error.oclif.exit = options?.exit === undefined ? cache_1.default.getInstance().get('exitCodes')?.default ?? 2 : options.exit;
    return error;
}
exports.addOclifExitCode = addOclifExitCode;
class CLIError extends Error {
    code;
    oclif = {};
    skipOclifErrorHandling;
    suggestions;
    constructor(error, options = {}) {
        super(error instanceof Error ? error.message : error);
        addOclifExitCode(this, options);
        this.code = options.code;
        this.suggestions = options.suggestions;
    }
    get bang() {
        try {
            return ansis_1.default.red(process.platform === 'win32' ? '»' : '›');
        }
        catch { }
    }
    get stack() {
        return (0, clean_stack_1.default)(super.stack, { pretty: true });
    }
    /**
     * @deprecated `render` Errors display should be handled by display function, like pretty-print
     * @return {string} returns a string representing the dispay of the error
     */
    render() {
        if (settings_1.settings.debug) {
            return this.stack;
        }
        let output = `${this.name}: ${this.message}`;
        output = (0, wrap_ansi_1.default)(output, screen_1.errtermwidth - 6, { hard: true, trim: false });
        output = (0, indent_string_1.default)(output, 3);
        output = (0, indent_string_1.default)(output, 1, { includeEmptyLines: true, indent: this.bang });
        output = (0, indent_string_1.default)(output, 1);
        return output;
    }
}
exports.CLIError = CLIError;
(function (CLIError) {
    class Warn extends CLIError {
        constructor(err) {
            super(err instanceof Error ? err.message : err);
            this.name = 'Warning';
        }
        get bang() {
            try {
                return ansis_1.default.yellow(process.platform === 'win32' ? '»' : '›');
            }
            catch { }
        }
    }
    CLIError.Warn = Warn;
})(CLIError || (exports.CLIError = CLIError = {}));
