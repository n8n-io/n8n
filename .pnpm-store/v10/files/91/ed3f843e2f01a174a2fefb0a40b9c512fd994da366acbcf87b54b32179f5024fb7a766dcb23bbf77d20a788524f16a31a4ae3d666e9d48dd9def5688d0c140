import { CLIError } from '../errors';
import { Arg, ArgInput, CLIParseErrorOptions, OptionFlag } from '../interfaces/parser';
export { CLIError } from '../errors';
export type Validation = {
    name: string;
    reason?: string | undefined;
    status: 'failed' | 'success';
    validationFn: string;
};
export declare class CLIParseError extends CLIError {
    parse: CLIParseErrorOptions['parse'];
    showHelp: boolean;
    constructor(options: CLIParseErrorOptions & {
        message: string;
    });
}
export declare class InvalidArgsSpecError extends CLIParseError {
    args: ArgInput;
    constructor({ args, exit, parse }: CLIParseErrorOptions & {
        args: ArgInput;
    });
}
export declare class RequiredArgsError extends CLIParseError {
    args: Arg<any>[];
    constructor({ args, exit, flagsWithMultiple, parse, }: CLIParseErrorOptions & {
        args: Arg<any>[];
        flagsWithMultiple?: string[];
    });
}
export declare class UnexpectedArgsError extends CLIParseError {
    args: unknown[];
    constructor({ args, exit, parse }: CLIParseErrorOptions & {
        args: unknown[];
    });
}
export declare class NonExistentFlagsError extends CLIParseError {
    flags: string[];
    constructor({ exit, flags, parse }: CLIParseErrorOptions & {
        flags: string[];
    });
}
export declare class FlagInvalidOptionError extends CLIParseError {
    constructor(flag: OptionFlag<any>, input: string);
}
export declare class ArgInvalidOptionError extends CLIParseError {
    constructor(arg: Arg<any>, input: string);
}
export declare class FailedFlagValidationError extends CLIParseError {
    constructor({ exit, failed, parse }: CLIParseErrorOptions & {
        failed: Validation[];
    });
}
