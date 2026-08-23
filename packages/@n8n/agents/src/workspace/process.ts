import { Readable, Writable } from 'node:stream';

import type { SpawnProcessOptions, ProcessInfo, CommandResult } from './types';

export abstract class SandboxProcessManager {
	abstract spawn(command: string, options?: SpawnProcessOptions): Promise<ProcessHandle>;
	abstract list(): Promise<ProcessInfo[]>;
	abstract get(pid: number): Promise<ProcessHandle | undefined>;
	abstract kill(pid: number): Promise<boolean>;
}

/**
 * Handle to a spawned process.
 *
 * The base class handles stdout/stderr accumulation, callback dispatch via
 * `emitStdout`/`emitStderr`, lazy `reader`/`writer` stream getters, and
 * temporary streaming callbacks on `wait()`.
 *
 * **For implementors:** Override `_wait()`, `kill()`, and `sendStdin()` with
 * platform-specific logic. Call `emitStdout(data)` / `emitStderr(data)` from
 * your transport callback to dispatch data. Pass `options` through to
 * `super(options)` to wire spawn-time user callbacks automatically.
 *
 * **For consumers:**
 * - `handle.stdout` / `handle.stderr` — poll accumulated output
 * - `handle.wait()` — wait for exit, optionally with streaming callbacks
 * - `handle.reader` / `handle.writer` — Node.js stream interop (LSP, JSON-RPC, pipes)
 * - `onStdout`/`onStderr` in `SpawnProcessOptions` — stream at spawn time
 */
export abstract class ProcessHandle {
	/** Process ID */
	abstract readonly pid: number;
	/** Exit code, undefined while the process is still running */
	abstract readonly exitCode: number | undefined;
	/** The command that was spawned */
	command?: string;

	private _stdout = '';
	private _stderr = '';
	private _stdoutListeners = new Set<(data: string) => void>();
	private _stderrListeners = new Set<(data: string) => void>();
	private _reader?: Readable;
	private _writer?: Writable;
	/**
	 * Cached completion promise — `_wait()` is called at most once per handle.
	 * Shared between `wait()` and the `reader` getter so that accessing `reader`
	 * never triggers a second concurrent wait call.
	 */
	private _completion?: Promise<CommandResult>;

	/** Kill the running process. Returns true if killed, false if not found. */
	abstract kill(): Promise<boolean>;
	/** Send data to the process's stdin */
	abstract sendStdin(data: string): Promise<void>;

	/**
	 * Platform-specific wait implementation.
	 *
	 * Called at most once per handle instance. The base class `wait()` wraps
	 * this with listener management and result caching — do not call `_wait()`
	 * directly from outside this class.
	 */
	protected abstract _wait(): Promise<CommandResult>;

	constructor(options?: Pick<SpawnProcessOptions, 'onStdout' | 'onStderr'>) {
		if (options?.onStdout) this._stdoutListeners.add(options.onStdout);
		if (options?.onStderr) this._stderrListeners.add(options.onStderr);
	}

	/**
	 * Wait for the process to finish and return the result.
	 *
	 * The underlying `_wait()` is invoked at most once; subsequent calls (or
	 * concurrent calls) share the same completion promise.
	 *
	 * Optionally pass `onStdout`/`onStderr` callbacks to stream output chunks
	 * while waiting. The callbacks are automatically removed when `wait()`
	 * resolves, so there's no cleanup needed by the caller.
	 */
	async wait(options?: {
		onStdout?: (data: string) => void;
		onStderr?: (data: string) => void;
	}): Promise<CommandResult> {
		if (options?.onStdout) this._stdoutListeners.add(options.onStdout);
		if (options?.onStderr) this._stderrListeners.add(options.onStderr);

		this._completion ??= this._wait();

		try {
			return await this._completion;
		} finally {
			if (options?.onStdout) this._stdoutListeners.delete(options.onStdout);
			if (options?.onStderr) this._stderrListeners.delete(options.onStderr);
		}
	}

	/** Accumulated stdout so far */
	get stdout(): string {
		return this._stdout;
	}

	/** Accumulated stderr so far */
	get stderr(): string {
		return this._stderr;
	}

	/**
	 * Emit stdout data — accumulates, dispatches to listeners, and pushes to the reader stream.
	 * @internal Called by subclasses to dispatch transport data.
	 */
	protected emitStdout(data: string): void {
		this._stdout += data;
		for (const listener of this._stdoutListeners) listener(data);
		this._reader?.push(data);
	}

	/**
	 * Emit stderr data — accumulates and dispatches to listeners.
	 * @internal Called by subclasses to dispatch transport data.
	 */
	protected emitStderr(data: string): void {
		this._stderr += data;
		for (const listener of this._stderrListeners) listener(data);
	}

	/** Add a permanent stdout listener (remains active until the handle is discarded) */
	addStdoutListener(listener: (data: string) => void): void {
		this._stdoutListeners.add(listener);
	}

	/** Add a permanent stderr listener (remains active until the handle is discarded) */
	addStderrListener(listener: (data: string) => void): void {
		this._stderrListeners.add(listener);
	}

	/** Readable stream of stdout (for use with StreamMessageReader, pipes, etc.) */
	get reader(): Readable {
		if (!this._reader) {
			this._reader = new Readable({ read() {} });
			// Re-use the shared completion so _wait() is never called a second time
			this._completion ??= this._wait();
			void this._completion.then(
				() => this._reader!.push(null),
				() => this._reader!.push(null),
			);
		}
		return this._reader;
	}

	/** Writable stream to stdin (for use with StreamMessageWriter, pipes, etc.) */
	get writer(): Writable {
		this._writer ??= new Writable({
			write: (chunk: { toString: () => string }, _encoding, callbackFn) => {
				this.sendStdin(chunk.toString()).then(() => callbackFn(), callbackFn);
			},
		});
		return this._writer;
	}
}
