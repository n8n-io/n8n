import { OclifError, PrettyPrintableError } from '../interfaces';
import { CLIParseError } from '../parser/errors';
import { CLIError } from './errors/cli';
/**
 * This is an odd abstraction for process.exit, but it allows us to stub it in tests.
 *
 * https://github.com/sinonjs/sinon/issues/562
 */
export declare const Exit: {
    exit(code?: number): never;
};
type ErrorToHandle = Error & Partial<PrettyPrintableError> & Partial<OclifError> & Partial<CLIError> & Partial<CLIParseError>;
export declare function handle(err: ErrorToHandle): Promise<void>;
export {};
