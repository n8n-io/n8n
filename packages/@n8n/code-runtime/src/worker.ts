/**
 * Worker entry point. The code daemon starts it with a control socket on fd 3
 * (JSON lines). The worker loads the runtime and sends `ready`.
 *
 * Two modes, set by the `start` message:
 *
 * - One task (default): the worker runs one task in its slot folder, writes
 *   `out/result.json`, sends `done` or `error` and exits. Console output goes
 *   to stdout and stderr, which the daemon streams to n8n.
 * - Shared (`shared: true`, reuse mode): the worker is the one process of the
 *   sandbox. It runs tasks at the same time and stays alive. Each task has its
 *   own scope for the built-ins, and an async context, so console output and
 *   errors go to the right task. Console output is sent as `output` messages
 *   on fd 3, because the pipes are shared. `cancel` drops a task.
 */
import type { AsyncLocalStorage as AsyncLocalStorageType } from 'node:async_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import * as net from 'node:net';
import * as path from 'node:path';

import { errorFromRpc, serializeError } from './errors';
import { runTask } from './run-task';

type ControlMessage =
	| { type: 'start'; taskId: string; dir: string; deadline: number; shared?: boolean }
	| { type: 'cancel'; taskId: string }
	| { type: 'rpc_result'; callId: string; ok: boolean; data?: unknown; error?: unknown };

interface TaskState {
	taskId: string;
	/** Set when the task sent its terminal message or was cancelled. */
	finished: boolean;
}

/** Starts the worker protocol on fd 3. Call it once per process. */
export function startWorker() {
	const ctrl = new net.Socket({ fd: 3, readable: true, writable: true });
	ctrl.setEncoding('utf-8');
	runProtocol(ctrl);
}

type Write = (chunk: unknown, ...rest: unknown[]) => boolean;

/** The daemon cuts an `output` text longer than 64 KiB. Stay well below. */
const OUTPUT_CHUNK = 16 * 1024;

/** Splits text in parts of at most OUTPUT_CHUNK code units, not inside a surrogate pair. */
function splitText(text: string): string[] {
	const parts: string[] = [];
	let start = 0;
	while (start < text.length) {
		let end = Math.min(start + OUTPUT_CHUNK, text.length);
		const last = text.charCodeAt(end - 1);
		if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
		parts.push(text.slice(start, end));
		start = end;
	}
	return parts;
}

function runProtocol(ctrl: net.Socket) {
	async function send(message: object): Promise<void> {
		return await new Promise((resolve) => {
			ctrl.write(JSON.stringify(message) + '\n', () => resolve());
		});
	}

	const pendingRpc = new Map<
		string,
		{ resolve: (v: unknown) => void; reject: (e: Error) => void }
	>();
	let nextCallId = 0;
	let tasks = 0;
	let shared = false;
	const running = new Map<string, TaskState>();
	// Loaded at run time, not at import: the V8 startup snapshot loads this
	// module, and node:async_hooks is not verified for snapshots.
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { AsyncLocalStorage } = require('node:async_hooks') as {
		AsyncLocalStorage: typeof AsyncLocalStorageType;
	};
	const taskContext = new AsyncLocalStorage<TaskState>();
	const rawStderrWrite = process.stderr.write.bind(process.stderr) as Write;

	// The globals of a fresh worker. The shared worker removes all others when
	// no task runs, for example globals that sloppy user code created.
	const baseGlobals = new Set(Object.getOwnPropertyNames(globalThis));

	/** Sends an RPC call for a task. The daemon refuses calls of an ended task. */
	function rpcFor(taskId: string) {
		return async (name: string, params: unknown[]): Promise<unknown> => {
			const callId = String(++nextCallId);
			const promise = new Promise<unknown>((resolve, reject) => {
				pendingRpc.set(callId, { resolve, reject });
			});
			await send({ type: 'rpc', callId, taskId, name, params });
			return await promise;
		};
	}

	async function flushStdio(): Promise<void> {
		const flush = async (stream: NodeJS.WriteStream) =>
			await new Promise<void>((resolve) => stream.write('', () => resolve()));
		await Promise.all([flush(process.stdout), flush(process.stderr)]);
	}

	function removeTaskGlobals() {
		for (const key of Object.getOwnPropertyNames(globalThis)) {
			if (baseGlobals.has(key)) continue;
			try {
				delete (globalThis as Record<string, unknown>)[key];
			} catch {
				// Not configurable. It stays.
			}
		}
	}

	/**
	 * Sends the writes of a task to the daemon as `output` messages. Writes
	 * outside a task go to the pipe. Writes of an ended task are dropped.
	 */
	function routeOutput(stream: NodeJS.WriteStream, name: 'stdout' | 'stderr') {
		const write = stream.write.bind(stream) as Write;
		stream.write = ((chunk: unknown, ...rest: unknown[]) => {
			const task = taskContext.getStore();
			if (!task) return write(chunk, ...rest);
			const onWritten = rest.find((r) => typeof r === 'function') as (() => void) | undefined;
			if (!task.finished) {
				const encoding = typeof rest[0] === 'string' ? (rest[0] as BufferEncoding) : 'utf8';
				const text =
					typeof chunk === 'string'
						? encoding === 'utf8' || encoding === 'utf-8'
							? chunk
							: Buffer.from(chunk, encoding).toString('utf8')
						: chunk instanceof Uint8Array
							? Buffer.from(chunk).toString('utf8')
							: String(chunk);
				for (const part of splitText(text)) {
					void send({ type: 'output', taskId: task.taskId, stream: name, text: part });
				}
			}
			if (onWritten) process.nextTick(onWritten);
			return true;
		}) as typeof stream.write;
	}

	function enableShared() {
		if (shared) return;
		shared = true;
		routeOutput(process.stdout, 'stdout');
		routeOutput(process.stderr, 'stderr');
		process.on('unhandledRejection', (reason) => onUncaught(reason));
	}

	/** Ends a task. A one-task worker exits after the message. */
	async function finish(task: TaskState, message: Record<string, unknown>) {
		if (task.finished) return;
		task.finished = true;
		running.delete(task.taskId);
		if (!shared) {
			await flushStdio();
			await send({ ...message, taskId: task.taskId });
			process.exit(0);
		}
		await send({ ...message, taskId: task.taskId });
		if (running.size === 0) removeTaskGlobals();
	}

	async function onStart(msg: Extract<ControlMessage, { type: 'start' }>) {
		if (running.has(msg.taskId)) return;
		// A one-task worker runs exactly one task.
		if (!msg.shared && tasks > 0) return;
		if (msg.shared) enableShared();
		const task: TaskState = { taskId: msg.taskId, finished: false };
		running.set(task.taskId, task);
		tasks++;
		const taskNumber = tasks;
		await taskContext.run(task, async () => {
			try {
				const { resultFile, timings } = await runTask(msg.dir, rpcFor(msg.taskId), {
					isolateScope: shared,
				});
				if (task.finished) return;
				const tWrite = performance.now();
				const outDir = path.join(msg.dir, 'out');
				await mkdir(outDir, { recursive: true });
				await writeFile(path.join(outDir, 'result.json'), JSON.stringify(resultFile));
				timings.write = Math.round(performance.now() - tWrite);
				await finish(task, { type: 'done', timings: { ...timings, workerTasks: taskNumber } });
			} catch (e) {
				await finish(task, { type: 'error', error: serializeError(e) });
			}
		});
	}

	/** Drops a task of the shared worker. Its code can still run, but nothing it does counts. */
	function onCancel(taskId: string) {
		const task = running.get(taskId);
		if (task) {
			task.finished = true;
			running.delete(taskId);
		}
		void send({ type: 'cancelled', taskId });
		if (running.size === 0) removeTaskGlobals();
	}

	function onMessage(msg: ControlMessage) {
		if (msg.type === 'start') {
			void onStart(msg);
			return;
		}
		if (msg.type === 'cancel') {
			onCancel(msg.taskId);
			return;
		}
		if (msg.type === 'rpc_result') {
			const pending = pendingRpc.get(msg.callId);
			if (!pending) return;
			pendingRpc.delete(msg.callId);
			if (msg.ok) pending.resolve(msg.data);
			else pending.reject(errorFromRpc(msg.error));
		}
	}

	/**
	 * An error that escapes the user code, for example in a timer, ends the task
	 * that it belongs to. A one-task worker then exits. The shared worker keeps
	 * running its other tasks. An error outside any task ends the process.
	 */
	function onUncaught(e: unknown) {
		const task = taskContext.getStore() ?? (shared ? undefined : [...running.values()][0]);
		if (task && !task.finished) {
			void finish(task, { type: 'error', error: serializeError(e) }).then(() => {
				if (!shared) process.exit(1);
			});
			return;
		}
		if (task && shared) {
			// The task has ended already. Its late error changes nothing.
			rawStderrWrite(`error in ended task ${task.taskId}: ${String(e)}\n`);
			return;
		}
		rawStderrWrite(`uncaught error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
		process.exit(1);
	}

	let buffer = '';
	ctrl.on('data', (chunk: string) => {
		buffer += chunk;
		let nl = buffer.indexOf('\n');
		while (nl !== -1) {
			const line = buffer.slice(0, nl).trim();
			buffer = buffer.slice(nl + 1);
			if (line) {
				try {
					onMessage(JSON.parse(line) as ControlMessage);
				} catch (e) {
					rawStderrWrite(`invalid control message: ${String(e)}\n`);
				}
			}
			nl = buffer.indexOf('\n');
		}
	});
	// The daemon closed the socket: nothing more to do.
	ctrl.on('close', () => process.exit(tasks > 0 ? 0 : 1));

	process.on('uncaughtException', (e) => onUncaught(e));

	void send({ type: 'ready' });
}
