"use strict";
// This file is meant to be a shared place for default configs.
// It's read by the flow controllers, the executable, etc.
// Refer to tests for the meaning of the different possible values.
Object.defineProperty(exports, "__esModule", { value: true });
exports.killSignal = exports.passthroughArguments = exports.timings = exports.cwd = exports.timestampFormat = exports.success = exports.restartDelay = exports.restartTries = exports.raw = exports.prefixLength = exports.prefixColors = exports.prefix = exports.nameSeparator = exports.hide = exports.maxProcesses = exports.handleInput = exports.defaultInputTarget = void 0;
exports.defaultInputTarget = 0;
/**
 * Whether process.stdin should be forwarded to child processes.
 */
exports.handleInput = false;
/**
 * How many processes to run at once.
 */
exports.maxProcesses = 0;
/**
 * Indices and names of commands whose output are not to be logged.
 */
exports.hide = '';
/**
 * The character to split <names> on.
 */
exports.nameSeparator = ',';
/**
 * Which prefix style to use when logging processes output.
 */
exports.prefix = '';
/**
 * Default prefix color.
 * @see https://www.npmjs.com/package/chalk
 */
exports.prefixColors = 'reset';
/**
 * How many bytes we'll show on the command prefix.
 */
exports.prefixLength = 10;
exports.raw = false;
/**
 * Number of attempts of restarting a process, if it exits with non-0 code.
 */
exports.restartTries = 0;
/**
 * How many milliseconds concurrently should wait before restarting a process.
 */
exports.restartDelay = 0;
/**
 * Condition of success for concurrently itself.
 */
exports.success = 'all';
/**
 * Date format used when logging date/time.
 * @see https://date-fns.org/v2.0.1/docs/format
 */
exports.timestampFormat = 'yyyy-MM-dd HH:mm:ss.SSS';
/**
 * Current working dir passed as option to spawn command.
 * Defaults to process.cwd()
 */
exports.cwd = undefined;
/**
 * Whether to show timing information for processes in console output.
 */
exports.timings = false;
/**
 * Passthrough additional arguments to commands (accessible via placeholders) instead of treating them as commands.
 */
exports.passthroughArguments = false;
/**
 * Signal to send to other processes if one exits or dies.
 *
 * Defaults to OS specific signal. (SIGTERM on Linux/MacOS)
 */
exports.killSignal = undefined;
