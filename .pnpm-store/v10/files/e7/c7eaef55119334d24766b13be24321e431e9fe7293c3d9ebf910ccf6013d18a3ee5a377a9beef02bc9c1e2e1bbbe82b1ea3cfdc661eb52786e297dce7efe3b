"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailedFlagValidationError = exports.ArgInvalidOptionError = exports.FlagInvalidOptionError = exports.NonExistentFlagsError = exports.UnexpectedArgsError = exports.RequiredArgsError = exports.InvalidArgsSpecError = exports.CLIParseError = exports.CLIError = void 0;
const cache_1 = __importDefault(require("../cache"));
const errors_1 = require("../errors");
const util_1 = require("../util/util");
const list_1 = __importDefault(require("../ux/list"));
const theme_1 = require("../ux/theme");
var errors_2 = require("../errors");
Object.defineProperty(exports, "CLIError", { enumerable: true, get: function () { return errors_2.CLIError; } });
class CLIParseError extends errors_1.CLIError {
    parse;
    showHelp = false;
    constructor(options) {
        options.message += '\nSee more help with --help';
        super(options.message, { exit: options.exit });
        this.parse = options.parse;
    }
}
exports.CLIParseError = CLIParseError;
class InvalidArgsSpecError extends CLIParseError {
    args;
    constructor({ args, exit, parse }) {
        let message = 'Invalid argument spec';
        const namedArgs = Object.values(args).filter((a) => a.name);
        if (namedArgs.length > 0) {
            const list = (0, list_1.default)(namedArgs.map((a) => [`${a.name} (${a.required ? 'required' : 'optional'})`, a.description]));
            message += `:\n${list}`;
        }
        super({ exit: cache_1.default.getInstance().get('exitCodes')?.invalidArgsSpec ?? exit, message, parse });
        this.args = args;
    }
}
exports.InvalidArgsSpecError = InvalidArgsSpecError;
class RequiredArgsError extends CLIParseError {
    args;
    constructor({ args, exit, flagsWithMultiple, parse, }) {
        let message = `Missing ${args.length} required arg${args.length === 1 ? '' : 's'}`;
        const namedArgs = args.filter((a) => a.name);
        if (namedArgs.length > 0) {
            const list = (0, list_1.default)(namedArgs.map((a) => {
                const description = a.options ? `(${a.options.join('|')}) ${a.description}` : a.description;
                return [a.name, description];
            }));
            message += `:\n${list}`;
        }
        if (flagsWithMultiple?.length) {
            const flags = flagsWithMultiple.map((f) => `--${f}`).join(', ');
            message += `\n\nNote: ${flags} allow${flagsWithMultiple.length === 1 ? 's' : ''} multiple values. Because of this you need to provide all arguments before providing ${flagsWithMultiple.length === 1 ? 'that flag' : 'those flags'}.`;
            message += '\nAlternatively, you can use "--" to signify the end of the flags and the beginning of arguments.';
        }
        super({ exit: cache_1.default.getInstance().get('exitCodes')?.requiredArgs ?? exit, message, parse });
        this.args = args;
        this.showHelp = true;
    }
}
exports.RequiredArgsError = RequiredArgsError;
class UnexpectedArgsError extends CLIParseError {
    args;
    constructor({ args, exit, parse }) {
        const message = `Unexpected argument${args.length === 1 ? '' : 's'}: ${args.join(', ')}`;
        super({ exit: cache_1.default.getInstance().get('exitCodes')?.unexpectedArgs ?? exit, message, parse });
        this.args = args;
        this.showHelp = true;
    }
}
exports.UnexpectedArgsError = UnexpectedArgsError;
class NonExistentFlagsError extends CLIParseError {
    flags;
    constructor({ exit, flags, parse }) {
        const message = `Nonexistent flag${flags.length === 1 ? '' : 's'}: ${flags.join(', ')}`;
        super({ exit: cache_1.default.getInstance().get('exitCodes')?.nonExistentFlag ?? exit, message, parse });
        this.flags = flags;
        this.showHelp = true;
    }
}
exports.NonExistentFlagsError = NonExistentFlagsError;
class FlagInvalidOptionError extends CLIParseError {
    constructor(flag, input) {
        const message = `Expected --${flag.name}=${input} to be one of: ${flag.options.join(', ')}`;
        super({ message, parse: {} });
    }
}
exports.FlagInvalidOptionError = FlagInvalidOptionError;
class ArgInvalidOptionError extends CLIParseError {
    constructor(arg, input) {
        const message = `Expected ${input} to be one of: ${arg.options.join(', ')}`;
        super({ message, parse: {} });
    }
}
exports.ArgInvalidOptionError = ArgInvalidOptionError;
class FailedFlagValidationError extends CLIParseError {
    constructor({ exit, failed, parse }) {
        const reasons = failed.map((r) => r.reason);
        const deduped = (0, util_1.uniq)(reasons);
        const errString = deduped.length === 1 ? 'error' : 'errors';
        const message = `The following ${errString} occurred:\n  ${(0, theme_1.colorize)('dim', deduped.join('\n  '))}`;
        super({ exit: cache_1.default.getInstance().get('exitCodes')?.failedFlagValidation ?? exit, message, parse });
    }
}
exports.FailedFlagValidationError = FailedFlagValidationError;
