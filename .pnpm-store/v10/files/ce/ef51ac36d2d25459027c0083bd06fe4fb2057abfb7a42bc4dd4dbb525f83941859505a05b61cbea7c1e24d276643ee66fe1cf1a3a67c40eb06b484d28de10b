import { OclifError, PrettyPrintableError } from '../../interfaces/errors';
/**
 * properties specific to internal oclif error handling
 */
export declare function addOclifExitCode(error: Record<string, any>, options?: {
    exit?: false | number | undefined;
}): OclifError;
export declare class CLIError extends Error implements OclifError {
    code?: string | undefined;
    oclif: OclifError['oclif'];
    skipOclifErrorHandling?: boolean | undefined;
    suggestions?: string[] | undefined;
    constructor(error: Error | string, options?: {
        exit?: false | number | undefined;
    } & PrettyPrintableError);
    get bang(): string | undefined;
    get stack(): string;
    /**
     * @deprecated `render` Errors display should be handled by display function, like pretty-print
     * @returns {string} returns a string representing the display of the error
     */
    render(): string;
}
export declare namespace CLIError {
    class Warn extends CLIError {
        constructor(err: Error | string);
        get bang(): string | undefined;
    }
}
