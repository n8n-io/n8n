import type {SignalConstants} from 'node:os';
import type {Readable} from 'node:stream';
import type {Unless} from '../utils.js';
import type {Message} from '../ipc.js';
import type {StdinOptionCommon, StdoutStderrOptionCommon, StdioOptionsProperty} from '../stdio/type.js';
import type {VerboseOption} from '../verbose.js';
import type {FdGenericOption} from './specific.js';
import type {EncodingOption} from './encoding-option.js';

export type CommonOptions<IsSync extends boolean = boolean> = {
	/**
	Prefer locally installed binaries when looking for a binary to execute.

	@default `true` with `$`, `false` otherwise
	*/
	readonly preferLocal?: boolean;

	/**
	Preferred path to find locally installed binaries, when using the `preferLocal` option.

	@default `cwd` option
	*/
	readonly localDir?: string | URL;

	/**
	If `true`, runs with Node.js. The first argument must be a Node.js file.

	The subprocess inherits the current Node.js [CLI flags](https://nodejs.org/api/cli.html#options) and version. This can be overridden using the `nodeOptions` and `nodePath` options.

	@default `true` with `execaNode()`, `false` otherwise
	*/
	readonly node?: boolean;

	/**
	List of [CLI flags](https://nodejs.org/api/cli.html#cli_options) passed to the Node.js executable.

	Requires the `node` option to be `true`.

	@default [`process.execArgv`](https://nodejs.org/api/process.html#process_process_execargv) (current Node.js CLI flags)
	*/
	readonly nodeOptions?: readonly string[];

	/**
	Path to the Node.js executable.

	Requires the `node` option to be `true`.

	@default [`process.execPath`](https://nodejs.org/api/process.html#process_process_execpath) (current Node.js executable)
	*/
	readonly nodePath?: string | URL;

	/**
	If `true`, runs the command inside of a [shell](https://en.wikipedia.org/wiki/Shell_(computing)).

	Uses [`/bin/sh`](https://en.wikipedia.org/wiki/Unix_shell) on UNIX and [`cmd.exe`](https://en.wikipedia.org/wiki/Cmd.exe) on Windows. A different shell can be specified as a string. The shell should understand the `-c` switch on UNIX or `/d /s /c` on Windows.

	We recommend against using this option.

	@default false
	*/
	readonly shell?: boolean | string | URL;

	/**
	Current [working directory](https://en.wikipedia.org/wiki/Working_directory) of the subprocess.

	This is also used to resolve the `nodePath` option when it is a relative path.

	@default process.cwd()
	*/
	readonly cwd?: string | URL;

	/**
	[Environment variables](https://en.wikipedia.org/wiki/Environment_variable).

	Unless the `extendEnv` option is `false`, the subprocess also uses the current process' environment variables ([`process.env`](https://nodejs.org/api/process.html#processenv)).

	@default [process.env](https://nodejs.org/api/process.html#processenv)
	*/
	readonly env?: Readonly<Partial<Record<string, string>>>;

	/**
	If `true`, the subprocess uses both the `env` option and the current process' environment variables ([`process.env`](https://nodejs.org/api/process.html#processenv)).
	If `false`, only the `env` option is used, not `process.env`.

	@default true
	*/
	readonly extendEnv?: boolean;

	/**
	Write some input to the subprocess' [`stdin`](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)).

	See also the `inputFile` and `stdin` options.
	*/
	readonly input?: string | Uint8Array | Readable;

	/**
	Use a file as input to the subprocess' [`stdin`](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)).

	See also the `input` and `stdin` options.
	*/
	readonly inputFile?: string | URL;

	/**
	How to setup the subprocess' [standard input](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)). This can be `'pipe'`, `'overlapped'`, `'ignore`, `'inherit'`, a file descriptor integer, a Node.js `Readable` stream, a web `ReadableStream`, a `{ file: 'path' }` object, a file URL, an `Iterable`, an `AsyncIterable`, an `Uint8Array`, a generator function, a `Duplex` or a web `TransformStream`.

	This can be an array of values such as `['inherit', 'pipe']` or `[fileUrl, 'pipe']`.

	@default `'inherit'` with `$`, `'pipe'` otherwise
	*/
	readonly stdin?: StdinOptionCommon<IsSync>;

	/**
	How to setup the subprocess' [standard output](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)). This can be `'pipe'`, `'overlapped'`, `'ignore`, `'inherit'`, a file descriptor integer, a Node.js `Writable` stream, a web `WritableStream`, a `{ file: 'path' }` object, a file URL, a generator function, a `Duplex` or a web `TransformStream`.

	This can be an array of values such as `['inherit', 'pipe']` or `[fileUrl, 'pipe']`.

	@default 'pipe'
	*/
	readonly stdout?: StdoutStderrOptionCommon<IsSync>;

	/**
	How to setup the subprocess' [standard error](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin)). This can be `'pipe'`, `'overlapped'`, `'ignore`, `'inherit'`, a file descriptor integer, a Node.js `Writable` stream, a web `WritableStream`, a `{ file: 'path' }` object, a file URL, a generator function, a `Duplex` or a web `TransformStream`.

	This can be an array of values such as `['inherit', 'pipe']` or `[fileUrl, 'pipe']`.

	@default 'pipe'
	*/
	readonly stderr?: StdoutStderrOptionCommon<IsSync>;

	/**
	Like the `stdin`, `stdout` and `stderr` options but for all [file descriptors](https://en.wikipedia.org/wiki/File_descriptor) at once. For example, `{stdio: ['ignore', 'pipe', 'pipe']}` is the same as `{stdin: 'ignore', stdout: 'pipe', stderr: 'pipe'}`.

	A single string can be used as a shortcut.

	The array can have more than 3 items, to create additional file descriptors beyond `stdin`/`stdout`/`stderr`.

	@default 'pipe'
	*/
	readonly stdio?: StdioOptionsProperty<IsSync>;

	/**
	Add a `subprocess.all` stream and a `result.all` property. They contain the combined/interleaved output of the subprocess' `stdout` and `stderr`.

	@default false
	*/
	readonly all?: boolean;

	/**
	If the subprocess outputs text, specifies its character encoding, either [`'utf8'`](https://en.wikipedia.org/wiki/UTF-8) or [`'utf16le'`](https://en.wikipedia.org/wiki/UTF-16).

	If it outputs binary data instead, this should be either:
	- `'buffer'`: returns the binary output as an `Uint8Array`.
	- [`'hex'`](https://en.wikipedia.org/wiki/Hexadecimal), [`'base64'`](https://en.wikipedia.org/wiki/Base64), [`'base64url'`](https://en.wikipedia.org/wiki/Base64#URL_applications), [`'latin1'`](https://nodejs.org/api/buffer.html#buffers-and-character-encodings) or [`'ascii'`](https://nodejs.org/api/buffer.html#buffers-and-character-encodings): encodes the binary output as a string.

	The output is available with `result.stdout`, `result.stderr` and `result.stdio`.

	@default 'utf8'
	*/
	readonly encoding?: EncodingOption;

	/**
	Set `result.stdout`, `result.stderr`, `result.all` and `result.stdio` as arrays of strings, splitting the subprocess' output into lines.

	This cannot be used if the `encoding` option is binary.

	By default, this applies to both `stdout` and `stderr`, but different values can also be passed.

	@default false
	*/
	readonly lines?: FdGenericOption<boolean>;

	/**
	Strip the final [newline character](https://en.wikipedia.org/wiki/Newline) from the output.

	If the `lines` option is true, this applies to each output line instead.

	By default, this applies to both `stdout` and `stderr`, but different values can also be passed.

	@default true
	*/
	readonly stripFinalNewline?: FdGenericOption<boolean>;

	/**
	Largest amount of data allowed on `stdout`, `stderr` and `stdio`.

	By default, this applies to both `stdout` and `stderr`, but different values can also be passed.

	When reached, `error.isMaxBuffer` becomes `true`.

	@default 100_000_000
	*/
	readonly maxBuffer?: FdGenericOption<number>;

	/**
	When `buffer` is `false`, the `result.stdout`, `result.stderr`, `result.all` and `result.stdio` properties are not set.

	By default, this applies to both `stdout` and `stderr`, but different values can also be passed.

	@default true
	*/
	readonly buffer?: FdGenericOption<boolean>;

	/**
	Enables exchanging messages with the subprocess using `subprocess.sendMessage(message)`, `subprocess.getOneMessage()` and `subprocess.getEachMessage()`.

	The subprocess must be a Node.js file.

	@default `true` if the `node`, `ipcInput` or `gracefulCancel` option is set, `false` otherwise
	*/
	readonly ipc?: Unless<IsSync, boolean>;

	/**
	Specify the kind of serialization used for sending messages between subprocesses when using the `ipc` option.

	@default 'advanced'
	*/
	readonly serialization?: Unless<IsSync, 'json' | 'advanced'>;

	/**
	Sends an IPC message when the subprocess starts.

	The subprocess must be a Node.js file. The value's type depends on the `serialization` option.
	*/
	readonly ipcInput?: Unless<IsSync, Message>;

	/**
	If `verbose` is `'short'`, prints the command on [`stderr`](https://en.wikipedia.org/wiki/Standard_streams#Standard_error_(stderr)): its file, arguments, duration and (if it failed) error message.

	If `verbose` is `'full'` or a function, the command's [`stdout`](https://en.wikipedia.org/wiki/Standard_streams#Standard_output_(stdout)), `stderr` and IPC messages are also printed.

	A function can be passed to customize logging.

	By default, this applies to both `stdout` and `stderr`, but different values can also be passed.

	@default 'none'
	*/
	readonly verbose?: VerboseOption;

	/**
	Setting this to `false` resolves the result's promise with the error instead of rejecting it.

	@default true
	*/
	readonly reject?: boolean;

	/**
	If `timeout` is greater than `0`, the subprocess will be terminated if it runs for longer than that amount of milliseconds.

	On timeout, `error.timedOut` becomes `true`.

	@default 0
	*/
	readonly timeout?: number;

	/**
	When the `cancelSignal` is [aborted](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort), terminate the subprocess using a `SIGTERM` signal.

	When aborted, `error.isCanceled` becomes `true`.

	@example
	```
	import {execaNode} from 'execa';

	const controller = new AbortController();
	const cancelSignal = controller.signal;

	setTimeout(() => {
		controller.abort();
	}, 5000);

	try {
		await execaNode({cancelSignal})`build.js`;
	} catch (error) {
		if (error.isCanceled) {
			console.error('Canceled by cancelSignal.');
		}

		throw error;
	}
	```
	*/
	readonly cancelSignal?: Unless<IsSync, AbortSignal>;

	/**
	When the `cancelSignal` option is [aborted](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort), do not send any `SIGTERM`. Instead, abort the [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) returned by `getCancelSignal()`. The subprocess should use it to terminate gracefully.

	The subprocess must be a Node.js file.

	When aborted, `error.isGracefullyCanceled` becomes `true`.

	@default false
	*/
	readonly gracefulCancel?: Unless<IsSync, boolean>;

	/**
	If the subprocess is terminated but does not exit, forcefully exit it by sending [`SIGKILL`](https://en.wikipedia.org/wiki/Signal_(IPC)#SIGKILL).

	When this happens, `error.isForcefullyTerminated` becomes `true`.

	@default 5000
	*/
	readonly forceKillAfterDelay?: Unless<IsSync, number | boolean>;

	/**
	Default [signal](https://en.wikipedia.org/wiki/Signal_(IPC)) used to terminate the subprocess.

	This can be either a name (like `'SIGTERM'`) or a number (like `9`).

	@default 'SIGTERM'
	*/
	readonly killSignal?: keyof SignalConstants | number;

	/**
	Run the subprocess independently from the current process.

	@default false
	*/
	readonly detached?: Unless<IsSync, boolean>;

	/**
	Kill the subprocess when the current process exits.

	@default true
	*/
	readonly cleanup?: Unless<IsSync, boolean>;

	/**
	Sets the [user identifier](https://en.wikipedia.org/wiki/User_identifier) of the subprocess.

	@default current user identifier
	*/
	readonly uid?: number;

	/**
	Sets the [group identifier](https://en.wikipedia.org/wiki/Group_identifier) of the subprocess.

	@default current group identifier
	*/
	readonly gid?: number;

	/**
	Value of [`argv[0]`](https://nodejs.org/api/process.html#processargv0) sent to the subprocess.

	@default file being executed
	*/
	readonly argv0?: string;

	/**
	On Windows, do not create a new console window.

	@default true
	*/
	readonly windowsHide?: boolean;

	/**
	If `false`, escapes the command arguments on Windows.

	@default `true` if the `shell` option is `true`, `false` otherwise
	*/
	readonly windowsVerbatimArguments?: boolean;
};

/**
Subprocess options.

Some options are related to the subprocess output: `verbose`, `lines`, `stripFinalNewline`, `buffer`, `maxBuffer`. By default, those options apply to all file descriptors (`stdout`, `stderr`, etc.). A plain object can be passed instead to apply them to only `stdout`, `stderr`, `all` (both stdout and stderr), `ipc`, `fd3`, etc.

@example

```
// Same value for stdout and stderr
await execa({verbose: 'full'})`npm run build`;

// Different values for stdout and stderr
await execa({verbose: {stdout: 'none', stderr: 'full'}})`npm run build`;
```
*/
export type Options = CommonOptions<false>;

/**
Subprocess options, with synchronous methods.

Some options are related to the subprocess output: `verbose`, `lines`, `stripFinalNewline`, `buffer`, `maxBuffer`. By default, those options apply to all file descriptors (`stdout`, `stderr`, etc.). A plain object can be passed instead to apply them to only `stdout`, `stderr`, `all` (both stdout and stderr), `ipc`, `fd3`, etc.

@example

```
// Same value for stdout and stderr
execaSync({verbose: 'full'})`npm run build`;

// Different values for stdout and stderr
execaSync({verbose: {stdout: 'none', stderr: 'full'}})`npm run build`;
```
*/
export type SyncOptions = CommonOptions<true>;

export type StricterOptions<
	WideOptions extends CommonOptions,
	StrictOptions extends CommonOptions,
> = WideOptions extends StrictOptions ? WideOptions : StrictOptions;
