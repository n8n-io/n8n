import { Errors, Interfaces } from '@oclif/core';
type CaptureOptions = {
    print?: boolean;
    stripAnsi?: boolean;
    testNodeEnv?: string;
};
type CaptureResult<T> = {
    error?: Error & Partial<Errors.CLIError>;
    result?: T;
    stderr: string;
    stdout: string;
};
/**
 * Capture the stderr and stdout output of a function
 * @param fn async function to run
 * @param opts options
 *  - print: Whether to print the output to the console
 *  - stripAnsi: Whether to strip ANSI codes from the output
 * @returns {Promise<CaptureResult<T>>} Captured output
 *   - error: Error object if the function throws an error
 *   - result: Result of the function if it returns a value and succeeds
 *   - stderr: Captured stderr output
 *   - stdout: Captured stdout output
 */
export declare function captureOutput<T>(fn: () => Promise<unknown>, opts?: CaptureOptions): Promise<CaptureResult<T>>;
/**
 * Capture the stderr and stdout output of a command in your CLI
 * @param args Command arguments, e.g. `['my:command', '--flag']` or `'my:command --flag'`
 * @param loadOpts options for loading oclif `Config`
 * @param captureOpts options for capturing the output
 *  - print: Whether to print the output to the console
 *  - stripAnsi: Whether to strip ANSI codes from the output
 * @returns {Promise<CaptureResult<T>>} Captured output
 *   - error: Error object if the command throws an error
 *   - result: Result of the command if it returns a value and succeeds
 *   - stderr: Captured stderr output
 *   - stdout: Captured stdout output
 */
export declare function runCommand<T>(args: string | string[], loadOpts?: Interfaces.LoadOptions, captureOpts?: CaptureOptions): Promise<CaptureResult<T>>;
/**
 * Capture the stderr and stdout output of a hook in your CLI
 * @param hook Hook name
 * @param options options to pass to the hook
 * @param loadOpts options for loading oclif `Config`
 * @param captureOpts options for capturing the output
 *  - print: Whether to print the output to the console
 *  - stripAnsi: Whether to strip ANSI codes from the output
 * @returns {Promise<CaptureResult<T>>} Captured output
 *   - error: Error object if the hook throws an error
 *   - result: Result of the hook if it returns a value and succeeds
 *   - stderr: Captured stderr output
 *   - stdout: Captured stdout output
 */
export declare function runHook<T>(hook: string, options: Record<string, unknown>, loadOpts?: Interfaces.LoadOptions, captureOpts?: CaptureOptions): Promise<CaptureResult<T>>;
export {};
