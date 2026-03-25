/// <reference types="node" />
import { Readable, Writable } from 'node:stream';
import { EventEmitter } from 'events';
import { Buffer } from 'node:buffer';
import { ChildProcess } from 'node:child_process';

interface CommonOptions {
    input?: Readable;
    output?: Writable;
    signal?: AbortSignal;
    withGuide?: boolean;
}

type BoxAlignment = 'left' | 'center' | 'right';
interface BoxOptions extends CommonOptions {
    contentAlign?: BoxAlignment;
    titleAlign?: BoxAlignment;
    width?: number | 'auto';
    titlePadding?: number;
    contentPadding?: number;
    rounded?: boolean;
    formatBorder?: (text: string) => string;
}

interface LogMessageOptions extends CommonOptions {
    symbol?: string;
    spacing?: number;
    secondarySymbol?: string;
}

declare namespace npmlog {
    // TODO: newStream, newGroup, setGaugeTemplate and setGaugeTemplateSet need to be added
    interface Logger extends EventEmitter {
        (): any;

        level: string;
        record: MessageObject[];
        maxRecordSize: number;
        prefixStyle: StyleObject;
        headingStyle: StyleObject;
        heading: string;
        stream: any; // Defaults to process.stderr

        /**
         * Creates a log message
         * @param level
         * @param prefix
         * @param message message of the log which will be formatted using utils.format()
         * @param args additional arguments appended to the log message also formatted using utils.format()
         */
        log(level: LogLevels | string, prefix: string, message: any, ...args: any[]): void;

        /**
         * @param prefix
         * @param message message of the log which will be formatted using utils.format()
         * @param args additional arguments appended to the log message also formatted using utils.format()
         */
        silly(prefix: string, message: any, ...args: any[]): void;
        verbose(prefix: string, message: any, ...args: any[]): void;
        info(prefix: string, message: any, ...args: any[]): void;
        timing(prefix: string, message: any, ...args: any[]): void;
        http(prefix: string, message: any, ...args: any[]): void;
        notice(prefix: string, message: any, ...args: any[]): void;
        warn(prefix: string, message: any, ...args: any[]): void;
        error(prefix: string, message: any, ...args: any[]): void;
        silent(prefix: string, message: any, ...args: any[]): void;

        enableColor(): void;
        disableColor(): void;

        enableProgress(): void;
        disableProgress(): void;
        progressEnabled(): boolean;

        enableUnicode(): void;
        disableUnicode(): void;

        pause(): void;
        resume(): void;

        addLevel(level: string, n: number, style?: StyleObject, disp?: string): void;

        // Allows for custom log levels
        // npmlog.addLevel("custom", level)
        // npmlog.custom(prefix, message)
        [key: string]: any;
    }

    type LogLevels = "silly" | "verbose" | "info" | "timing" | "http" | "notice" | "warn" | "error" | "silent";

    interface StyleObject {
        fg?: string | undefined;
        bg?: string | undefined;
        bold?: boolean | undefined;
        inverse?: boolean | undefined;
        underline?: boolean | undefined;
        bell?: boolean | undefined;
    }

    interface MessageObject {
        id: number;
        level: string;
        prefix: string;
        message: string;
        messageRaw: string;
    }
}

declare var npmlog: npmlog.Logger;

/** Detects URLs in text and prevents them from being broken across lines */
declare function protectUrls(text: string, options?: {
    maxUrlLength?: number;
    maxLineWidth?: number;
}): string;
/**
 * Creates a hyperlink with custom title text if supported, otherwise falls back to "title: url"
 * format
 */
declare function createHyperlink(title: string, url: string): string;
declare function wrapTextForClack(text: string, width?: number): string;

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

type Primitive = Readonly<string | boolean | number>;
type Option<T> = T extends Primitive ? {
    value: T;
    label?: string;
    hint?: string;
} : {
    value: T;
    label: string;
    hint?: string;
};
interface BasePromptOptions {
    message: string;
}
interface TextPromptOptions extends BasePromptOptions {
    placeholder?: string;
    initialValue?: string;
    validate?: (value: string | undefined) => string | Error | undefined;
}
interface ConfirmPromptOptions extends BasePromptOptions {
    initialValue?: boolean;
    active?: string;
    inactive?: string;
}
interface SelectPromptOptions<T> extends BasePromptOptions {
    options: Option<T>[];
    initialValue?: T;
}
interface MultiSelectPromptOptions<T> extends BasePromptOptions {
    options: Option<T>[];
    initialValues?: T[];
    required?: boolean;
}
interface PromptOptions {
    onCancel?: () => void;
}
interface SpinnerInstance {
    start: (message?: string) => void;
    stop: (message?: string) => void;
    cancel: (message?: string) => void;
    error: (message?: string) => void;
    message: (text: string) => void;
}
interface TaskLogInstance {
    message: (text: string) => void;
    success: (message: string, options?: {
        showLog?: boolean;
    }) => void;
    error: (message: string) => void;
    group: (title: string) => {
        message: (text: string, options?: any) => void;
        success: (message: string) => void;
        error: (message: string) => void;
    };
}
interface SpinnerOptions {
    /** The id of the task, to be used by the log tracker. */
    id: string;
}
interface TaskLogOptions {
    /** The id of the task, to be used by the log tracker. */
    id: string;
    title: string;
    retainLog?: boolean;
    limit?: number;
}
declare abstract class PromptProvider {
    abstract text(options: TextPromptOptions, promptOptions?: PromptOptions): Promise<string>;
    abstract confirm(options: ConfirmPromptOptions, promptOptions?: PromptOptions): Promise<boolean>;
    abstract select<T>(options: SelectPromptOptions<T>, promptOptions?: PromptOptions): Promise<T>;
    abstract multiselect<T>(options: MultiSelectPromptOptions<T>, promptOptions?: PromptOptions): Promise<T[]>;
    abstract spinner(options: SpinnerOptions): SpinnerInstance;
    abstract taskLog(options: TaskLogOptions): TaskLogInstance;
}

type StdoutStderrAll = string | Buffer | undefined;

type ExecaReturnBase<StdoutStderrType extends StdoutStderrAll> = {
	/**
	The file and arguments that were run, for logging purposes.

	This is not escaped and should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	command: string;

	/**
	Same as `command` but escaped.

	This is meant to be copy and pasted into a shell, for debugging purposes.
	Since the escaping is fairly basic, this should not be executed directly as a process, including using `execa()` or `execaCommand()`.
	*/
	escapedCommand: string;

	/**
	The numeric exit code of the process that was run.
	*/
	exitCode: number;

	/**
	The output of the process on stdout.
	*/
	stdout: StdoutStderrType;

	/**
	The output of the process on stderr.
	*/
	stderr: StdoutStderrType;

	/**
	Whether the process failed to run.
	*/
	failed: boolean;

	/**
	Whether the process timed out.
	*/
	timedOut: boolean;

	/**
	Whether the process was killed.
	*/
	killed: boolean;

	/**
	The name of the signal that was used to terminate the process. For example, `SIGFPE`.

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`.
	*/
	signal?: string;

	/**
	A human-friendly description of the signal that was used to terminate the process. For example, `Floating point arithmetic error`.

	If a signal terminated the process, this property is defined and included in the error message. Otherwise it is `undefined`. It is also `undefined` when the signal is very uncommon which should seldomly happen.
	*/
	signalDescription?: string;

	/**
	The `cwd` of the command if provided in the command options. Otherwise it is `process.cwd()`.
	*/
	cwd: string;
};

type ExecaSyncReturnValue<StdoutStderrType extends StdoutStderrAll = string> = {
} & ExecaReturnBase<StdoutStderrType>;

/**
Result of a child process execution. On success this is a plain object. On failure this is also an `Error` instance.

The child process fails when:
- its exit code is not `0`
- it was killed with a signal
- timing out
- being canceled
- there's not enough memory or there are already too many child processes
*/
type ExecaReturnValue<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	The output of the process with `stdout` and `stderr` interleaved.

	This is `undefined` if either:
	- the `all` option is `false` (default value)
	- `execaSync()` was used
	*/
	all?: StdoutStderrType;

	/**
	Whether the process was canceled.

	You can cancel the spawned process using the [`signal`](https://github.com/sindresorhus/execa#signal-1) option.
	*/
	isCanceled: boolean;
} & ExecaSyncReturnValue<StdoutStderrType>;

type ExecaSyncError<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	Error message when the child process failed to run. In addition to the underlying error message, it also contains some information related to why the child process errored.

	The child process stderr then stdout are appended to the end, separated with newlines and not interleaved.
	*/
	message: string;

	/**
	This is the same as the `message` property except it does not include the child process stdout/stderr.
	*/
	shortMessage: string;

	/**
	Original error message. This is the same as the `message` property except it includes neither the child process stdout/stderr nor some additional information added by Execa.

	This is `undefined` unless the child process exited due to an `error` event or a timeout.
	*/
	originalMessage?: string;
} & Error & ExecaReturnBase<StdoutStderrType>;

type ExecaError<StdoutStderrType extends StdoutStderrAll = string> = {
	/**
	The output of the process with `stdout` and `stderr` interleaved.

	This is `undefined` if either:
	- the `all` option is `false` (default value)
	- `execaSync()` was used
	*/
	all?: StdoutStderrType;

	/**
	Whether the process was canceled.
	*/
	isCanceled: boolean;
} & ExecaSyncError<StdoutStderrType>;

type KillOptions = {
	/**
	Milliseconds to wait for the child process to terminate before sending `SIGKILL`.

	Can be disabled with `false`.

	@default 5000
	*/
	forceKillAfterTimeout?: number | false;
};

type ExecaChildPromise<StdoutStderrType extends StdoutStderrAll> = {
	/**
	Stream combining/interleaving [`stdout`](https://nodejs.org/api/child_process.html#child_process_subprocess_stdout) and [`stderr`](https://nodejs.org/api/child_process.html#child_process_subprocess_stderr).

	This is `undefined` if either:
		- the `all` option is `false` (the default value)
		- both `stdout` and `stderr` options are set to [`'inherit'`, `'ipc'`, `Stream` or `integer`](https://nodejs.org/dist/latest-v6.x/docs/api/child_process.html#child_process_options_stdio)
	*/
	all?: Readable;

	catch<ResultType = never>(
		onRejected?: (reason: ExecaError<StdoutStderrType>) => ResultType | PromiseLike<ResultType>
	): Promise<ExecaReturnValue<StdoutStderrType> | ResultType>;

	/**
	Same as the original [`child_process#kill()`](https://nodejs.org/api/child_process.html#child_process_subprocess_kill_signal), except if `signal` is `SIGTERM` (the default value) and the child process is not terminated after 5 seconds, force it by sending `SIGKILL`. Note that this graceful termination does not work on Windows, because Windows [doesn't support signals](https://nodejs.org/api/process.html#process_signal_events) (`SIGKILL` and `SIGTERM` has the same effect of force-killing the process immediately.) If you want to achieve graceful termination on Windows, you have to use other means, such as [`taskkill`](https://github.com/sindresorhus/taskkill).
	*/
	kill(signal?: string, options?: KillOptions): void;

	/**
	Similar to [`childProcess.kill()`](https://nodejs.org/api/child_process.html#child_process_subprocess_kill_signal). This used to be preferred when cancelling the child process execution as the error is more descriptive and [`childProcessResult.isCanceled`](#iscanceled) is set to `true`. But now this is deprecated and you should either use `.kill()` or the `signal` option when creating the child process.
	*/
	cancel(): void;

	/**
	[Pipe](https://nodejs.org/api/stream.html#readablepipedestination-options) the child process's `stdout` to `target`, which can be:
	- Another `execa()` return value
	- A writable stream
	- A file path string

	If the `target` is another `execa()` return value, it is returned. Otherwise, the original `execa()` return value is returned. This allows chaining `pipeStdout()` then `await`ing the final result.

	The `stdout` option] must be kept as `pipe`, its default value.
	*/
	pipeStdout?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeStdout?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;

	/**
	Like `pipeStdout()` but piping the child process's `stderr` instead.

	The `stderr` option must be kept as `pipe`, its default value.
	*/
	pipeStderr?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeStderr?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;

	/**
	Combines both `pipeStdout()` and `pipeStderr()`.

	Either the `stdout` option or the `stderr` option must be kept as `pipe`, their default value. Also, the `all` option must be set to `true`.
	*/
	pipeAll?<Target extends ExecaChildPromise<StdoutStderrAll>>(target: Target): Target;
	pipeAll?(target: Writable | string): ExecaChildProcess<StdoutStderrType>;
};

type ExecaChildProcess<StdoutStderrType extends StdoutStderrAll = string> = ChildProcess &
ExecaChildPromise<StdoutStderrType> &
Promise<ExecaReturnValue<StdoutStderrType>>;

declare const prompt: {
    executeTask: (childProcessFactories: ((signal?: AbortSignal) => ExecaChildProcess) | ((signal?: AbortSignal) => ExecaChildProcess)[], { intro, error, success, abortable, }: {
        intro: string;
        error: string;
        success: string;
        abortable?: boolean;
    }) => Promise<"aborted" | void>;
    executeTaskWithSpinner: (childProcessFactories: ((signal?: AbortSignal) => ExecaChildProcess) | ((signal?: AbortSignal) => ExecaChildProcess)[], { id, intro, error, success, abortable, }: {
        id: string;
        intro: string;
        error: string;
        success: string;
        abortable?: boolean;
    }) => Promise<"aborted" | void>;
    setPromptLibrary: (library: "clack") => void;
    getPromptLibrary: () => "clack";
    getPromptProvider: () => PromptProvider;
    isClackEnabled: () => boolean;
    getPreferredStdio: () => "inherit" | "pipe";
    text: (options: TextPromptOptions, promptOptions?: PromptOptions) => Promise<string>;
    confirm: (options: ConfirmPromptOptions, promptOptions?: PromptOptions) => Promise<boolean>;
    select: <T>(options: SelectPromptOptions<T>, promptOptions?: PromptOptions) => Promise<T>;
    multiselect: <T>(options: MultiSelectPromptOptions<T>, promptOptions?: PromptOptions) => Promise<T[]>;
    spinner: (options: SpinnerOptions) => SpinnerInstance;
    taskLog: (options: TaskLogOptions) => TaskLogInstance;
};

type Metadata = Record<string, any>;
interface LogEntry {
    timestamp: Date;
    level: LogLevel | 'prompt';
    message: string;
    metadata?: Metadata;
}
/**
 * Tracks and manages logs for Storybook CLI operations. Provides functionality to collect, store
 * and write logs to a file.
 */
declare class LogTracker {
    #private;
    /** Enables writing logs to file. */
    enableLogWriting(): void;
    /** Returns whether logs should be written to file. */
    get shouldWriteLogsToFile(): boolean;
    /** Returns a copy of all stored logs. */
    get logs(): LogEntry[];
    /**
     * Adds a new log entry.
     *
     * @param level - The log level
     * @param message - The log message
     * @param metadata - Optional metadata to attach to the log, can be any JSON serializable value
     */
    addLog(level: LogEntry['level'], message: string, metadata?: Metadata): void;
    /** Clears all stored logs. */
    clear(): void;
    /**
     * Writes all stored logs to a file and clears the log store.
     *
     * @param filePath - Optional custom file path to write logs to
     * @returns The path where logs were written, by default is debug-storybook.log in current working
     *   directory
     */
    writeToFile(filePath: string | boolean | undefined): Promise<string>;
}
declare const logTracker: LogTracker;

type Formatter = (input: string | number | null | undefined) => string

declare const CLI_COLORS: {
    success: Formatter;
    error: Formatter;
    warning: Formatter;
    info: Formatter;
    debug: Formatter;
    cta: Formatter;
    muted: Formatter;
    storybook: (text: string) => string;
};

interface ConsoleLoggerOptions {
    prefix: string;
    color: 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgBlackBright' | 'bgRedBright' | 'bgGreenBright' | 'bgYellowBright' | 'bgBlueBright' | 'bgMagentaBright' | 'bgCyanBright' | 'bgWhiteBright';
}
declare class ConsoleLogger implements Console {
    Console: typeof ConsoleLogger;
    protected timers: Map<string, number>;
    protected counters: Map<string, number>;
    protected lastStatusLine: string | null;
    protected statusLineCount: number;
    protected get prefix(): string;
    protected get color(): (text: string) => string;
    protected formatMessage(...data: any[]): string;
    assert(condition?: boolean, ...data: any[]): void;
    /**
     * The **`console.clear()`** static method clears the console if possible.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/clear_static)
     */
    clear(): void;
    /**
     * The **`console.count()`** static method logs the number of times that this particular call to
     * `count()` has been called.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/count_static)
     */
    count(label?: string): void;
    /**
     * The **`console.countReset()`** static method resets counter used with console/count_static.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/countReset_static)
     */
    countReset(label?: string): void;
    /**
     * The **`console.debug()`** static method outputs a message to the console at the 'debug' log
     * level.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/debug_static)
     */
    debug(...data: any[]): void;
    /**
     * The **`console.dir()`** static method displays a list of the properties of the specified
     * JavaScript object.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dir_static)
     */
    dir(item?: any, options?: any): void;
    /**
     * The **`console.dirxml()`** static method displays an interactive tree of the descendant
     * elements of the specified XML/HTML element.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/dirxml_static)
     */
    dirxml(...data: any[]): void;
    /**
     * The **`console.error()`** static method outputs a message to the console at the 'error' log
     * level.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/error_static)
     */
    error(...data: any[]): void;
    /**
     * The **`console.group()`** static method creates a new inline group in the Web console log,
     * causing any subsequent console messages to be indented by an additional level, until
     * console/groupEnd_static is called.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/group_static)
     */
    group(...data: any[]): void;
    /**
     * The **`console.groupCollapsed()`** static method creates a new inline group in the console.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupCollapsed_static)
     */
    groupCollapsed(...data: any[]): void;
    /**
     * The **`console.groupEnd()`** static method exits the current inline group in the console.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/groupEnd_static)
     */
    groupEnd(): void;
    /**
     * The **`console.info()`** static method outputs a message to the console at the 'info' log
     * level.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/info_static)
     */
    info(...data: any[]): void;
    /**
     * The **`console.log()`** static method outputs a message to the console.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log_static)
     */
    log(...data: any[]): void;
    /**
     * The **`console.table()`** static method displays tabular data as a table.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/table_static)
     */
    table(tabularData?: any, properties?: string[]): void;
    /**
     * The **`console.time()`** static method starts a timer you can use to track how long an
     * operation takes.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/time_static)
     */
    time(label?: string): void;
    /**
     * The **`console.timeEnd()`** static method stops a timer that was previously started by calling
     * console/time_static.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeEnd_static)
     */
    timeEnd(label?: string): void;
    /**
     * The **`console.timeLog()`** static method logs the current value of a timer that was previously
     * started by calling console/time_static.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/timeLog_static)
     */
    timeLog(label?: string, ...data: any[]): void;
    timeStamp(label?: string): void;
    /**
     * The **`console.trace()`** static method outputs a stack trace to the console.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/trace_static)
     */
    trace(...data: any[]): void;
    /**
     * The **`console.warn()`** static method outputs a warning message to the console at the
     * 'warning' log level.
     *
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/warn_static)
     */
    warn(...data: any[]): void;
    profile(label?: string): void;
    profileEnd(label?: string): void;
}
declare class StyledConsoleLogger extends ConsoleLogger {
    private _prefix;
    private _color;
    constructor(options: ConsoleLoggerOptions);
    protected get prefix(): string;
    protected get color(): Formatter;
}

/** @deprecated Use CLI_COLORS instead */
declare const colors: {
    pink: (text: string) => string;
    purple: (text: string) => string;
    orange: (text: string) => string;
    green: (text: string) => string;
    blue: (text: string) => string;
    red: (text: string) => string;
    gray: (text: string) => string;
};
declare const logger: {
    verbose: (message: string) => void;
    line: (count?: number) => void;
    /** For non-critical issues or warnings */
    warn: (message: string) => void;
    trace: ({ message, time }: {
        message: string;
        time: [number, number];
    }) => void;
    setLevel: (level?: LogLevel) => void;
    error: (message: unknown) => void;
    setLogLevel: (level: LogLevel) => void;
    getLogLevel: () => LogLevel;
    shouldLog: (level: LogLevel) => boolean;
    debug: (message: any) => void;
    log: (message?: string | string[] | undefined, args_1?: LogMessageOptions | undefined) => void;
    info: (message: string, opts?: LogMessageOptions | undefined) => void;
    logBox: (message: string, { title, ...options }?: {
        title?: string;
    } & BoxOptions) => void;
    intro: (message: string) => void;
    outro: (message: string) => void;
    step: (message: string) => void;
    SYMBOLS: {
        success: string;
        error: string;
    };
    wrapTextForClack: typeof wrapTextForClack;
};

declare const once: {
    (type: "verbose" | "info" | "warn" | "error"): (message: string) => void;
    clear(): void;
    verbose: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
};
declare const deprecate: (message: string) => void;

export { CLI_COLORS, ConsoleLogger, type LogLevel, type SpinnerInstance, StyledConsoleLogger, type TaskLogInstance, colors, createHyperlink, deprecate, npmlog as instance, logTracker, logger, once, prompt, protectUrls };
