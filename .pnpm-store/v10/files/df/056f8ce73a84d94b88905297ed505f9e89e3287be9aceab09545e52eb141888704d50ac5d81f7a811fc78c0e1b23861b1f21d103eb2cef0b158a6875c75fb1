import type {FdGenericOption} from './arguments/specific.js';
import type {Options, SyncOptions} from './arguments/options.js';
import type {Result, SyncResult} from './return/result.js';

export type VerboseOption = FdGenericOption<
| 'none'
| 'short'
| 'full'
| VerboseFunction
>;

type VerboseFunction = (verboseLine: string, verboseObject: MinimalVerboseObject) => string | void;

type GenericVerboseObject = {
	/**
	Event type. This can be:
	- `'command'`: subprocess start
	- `'output'`: `stdout`/`stderr` output
	- `'ipc'`: IPC output
	- `'error'`: subprocess failure
	- `'duration'`: subprocess success or failure
	*/
	type: 'command' | 'output' | 'ipc' | 'error' | 'duration';

	/**
	Depending on `verboseObject.type`, this is:
	- `'command'`: the `result.escapedCommand`
	- `'output'`: one line from `result.stdout` or `result.stderr`
	- `'ipc'`: one IPC message from `result.ipcOutput`
	- `'error'`: the `error.shortMessage`
	- `'duration'`: the `result.durationMs`
	*/
	message: string;

	/**
	The file and arguments that were run. This is the same as `result.escapedCommand`.
	*/
	escapedCommand: string;

	/**
	Serial number identifying the subprocess within the current process. It is incremented from `'0'`.

	This is helpful when multiple subprocesses are running at the same time.

	This is similar to a [PID](https://en.wikipedia.org/wiki/Process_identifier) except it has no maximum limit, which means it never repeats. Also, it is usually shorter.
	*/
	commandId: string;

	/**
	Event date/time.
	*/
	timestamp: Date;

	/**
	Whether another subprocess is piped into this subprocess. This is `false` when `result.pipedFrom` is empty.
	*/
	piped: boolean;
};

type MinimalVerboseObject = GenericVerboseObject & {
	// We cannot use the `CommonOptions` type because it would make this type recursive
	options: object;
	result?: never;
};

/**
Subprocess event object, for logging purpose, using the `verbose` option and `execa()`.
*/
export type VerboseObject = GenericVerboseObject & {
	/**
	The options passed to the subprocess.
	*/
	options: Options;

	/**
	Subprocess result.

	This is `undefined` if `verboseObject.type` is `'command'`, `'output'` or `'ipc'`.
	*/
	result?: Result;
};

/**
Subprocess event object, for logging purpose, using the `verbose` option and `execaSync()`.
*/
export type SyncVerboseObject = GenericVerboseObject & {
	/**
	The options passed to the subprocess.
	*/
	options: SyncOptions;

	/**
	Subprocess result.

	This is `undefined` if `verboseObject.type` is `'command'`, `'output'` or `'ipc'`.
	*/
	result?: SyncResult;
};
