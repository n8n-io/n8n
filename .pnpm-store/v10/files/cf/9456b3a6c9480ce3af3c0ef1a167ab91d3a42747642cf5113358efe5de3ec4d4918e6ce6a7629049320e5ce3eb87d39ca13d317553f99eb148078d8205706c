"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureOutput = captureOutput;
exports.runCommand = runCommand;
exports.runHook = runHook;
const core_1 = require("@oclif/core");
const ansis_1 = __importDefault(require("ansis"));
const debug_1 = __importDefault(require("debug"));
const node_path_1 = require("node:path");
const debug = (0, debug_1.default)('oclif-test');
function traverseFilePathUntil(filename, predicate) {
    let current = filename;
    while (!predicate(current)) {
        current = (0, node_path_1.dirname)(current);
    }
    return current;
}
function findRoot() {
    return (process.env.OCLIF_TEST_ROOT ??
        // eslint-disable-next-line unicorn/prefer-module
        Object.values(require.cache).find((m) => m?.children?.includes(module))?.filename ??
        traverseFilePathUntil(
        // eslint-disable-next-line unicorn/prefer-module
        require.main?.path ?? module.path, (p) => !(p.includes('node_modules') || p.includes('.pnpm') || p.includes('.yarn'))));
}
function makeLoadOptions(loadOpts) {
    return loadOpts ?? { root: findRoot() };
}
/**
 * Split a string into an array of strings, preserving quoted substrings
 *
 * @example
 * splitString('foo bar --name "foo"') // ['foo bar', '--name', 'foo']
 * splitString('foo bar --name "foo bar"') // ['foo bar', '--name', 'foo bar']
 * splitString('foo bar --name="foo bar"') // ['foo bar', '--name=foo bar']
 * splitString('foo bar --name=foo bar') // ['foo bar', '--name=foo', 'bar']
 *
 * @param str input string
 * @returns array of strings with quotes removed
 */
function splitString(str) {
    return (str.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []).map((s) => s.replaceAll(/^"|"$|(?<==)"/g, ''));
}
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
async function captureOutput(fn, opts) {
    const print = opts?.print ?? false;
    const stripAnsi = opts?.stripAnsi ?? true;
    const testNodeEnv = opts?.testNodeEnv || 'test';
    const originals = {
        NODE_ENV: process.env.NODE_ENV,
        stderr: process.stderr.write,
        stdout: process.stdout.write,
    };
    const output = {
        stderr: [],
        stdout: [],
    };
    const toString = (str) => (stripAnsi ? ansis_1.default.strip(str.toString()) : str.toString());
    const getStderr = () => output.stderr.map((b) => toString(b)).join('');
    const getStdout = () => output.stdout.map((b) => toString(b)).join('');
    const mock = (std) => (str, encoding, cb) => {
        output[std].push(str);
        if (print) {
            if (encoding !== null && typeof encoding === 'function') {
                cb = encoding;
                encoding = undefined;
            }
            originals[std].apply(process[std], [str, encoding, cb]);
        }
        else if (typeof cb === 'function')
            cb();
        return true;
    };
    process.stdout.write = mock('stdout');
    process.stderr.write = mock('stderr');
    process.env.NODE_ENV = testNodeEnv;
    try {
        const result = await fn();
        return {
            result: result,
            stderr: getStderr(),
            stdout: getStdout(),
        };
    }
    catch (error) {
        return {
            ...(error instanceof core_1.Errors.CLIError && { error: Object.assign(error, { message: toString(error.message) }) }),
            ...(error instanceof Error && { error: Object.assign(error, { message: toString(error.message) }) }),
            stderr: getStderr(),
            stdout: getStdout(),
        };
    }
    finally {
        process.stderr.write = originals.stderr;
        process.stdout.write = originals.stdout;
        process.env.NODE_ENV = originals.NODE_ENV;
    }
}
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
async function runCommand(args, loadOpts, captureOpts) {
    const loadOptions = makeLoadOptions(loadOpts);
    const argsArray = splitString((Array.isArray(args) ? args : [args]).join(' '));
    const [id, ...rest] = argsArray;
    const finalArgs = id === '.' ? rest : argsArray;
    debug('loadOpts: %O', loadOptions);
    debug('args: %O', finalArgs);
    return captureOutput(async () => (0, core_1.run)(finalArgs, loadOptions), captureOpts);
}
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
async function runHook(hook, options, loadOpts, captureOpts) {
    const loadOptions = makeLoadOptions(loadOpts);
    debug('loadOpts: %O', loadOptions);
    return captureOutput(async () => {
        const config = await core_1.Config.load(loadOptions);
        return config.runHook(hook, options);
    }, captureOpts);
}
