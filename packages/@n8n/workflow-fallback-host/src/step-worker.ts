/**
 * The entry of one step worker process (`worker-pool.ts`). The pool starts
 * it with `child_process.fork` and talks to it over the IPC channel.
 *
 * The worker runs steps with an in-process `StepHandler`, many at a time. It
 * keeps one step failure inside that step:
 *
 * - Each step runs in its own async context (`AsyncLocalStorage`). An
 *   uncaught exception or an unhandled rejection names the step whose code
 *   made it, also from a timer or a socket of that step. As in n8n's main
 *   process, the worker logs the error with that step and goes on: the step
 *   ends with its own result, so other steps are not touched.
 * - `process.exit`, `process.abort` and `process.kill` of the own process
 *   throw in the step that calls them.
 *
 * The pool handles what the worker cannot: a step that blocks the event loop,
 * memory over the worker limit, and a worker that stops.
 *
 * Steps come on the step socket (`DATA_FD`), as frames
 * `<u32 length><u32 job><request JSON>`. The worker parses each request
 * once and writes the result as `<u32 length><u32 job><response JSON>`.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Socket } from 'node:net';

import { messageOf } from './code-step';
import { fileCredentialStore } from './credentials';
import { GOAWAY, helloAnswer } from './hello';
import { installSharedAgents } from './http-pool';
import { encodeFrame, FrameDecoder, parseRequest, ProtocolError } from './protocol';
import type { StepRequest, StepResponse } from './protocol';
import { StepHandler } from './server';
import { ConnectionServices, type ServiceChannel, withServiceChannel } from './service-calls';
import { createStepProfiler, STEP_PROFILE_ENV, type StepMark } from './step-profile';

export interface StepWorkerData {
	credentialsFile?: string;
	codeTimeoutMs?: number;
	/** The longest wall-clock time of a step that comes on a runtime connection. */
	stepTimeoutMs?: number;
	/** Steps after which the pool replaces the worker (`WorkerPoolOptions.recycleSteps`). */
	recycleSteps?: number;
}

/** The file descriptor of the step socket, which the pool opens next to the IPC channel. */
export const DATA_FD = 4;

/**
 * Control messages from the pool to a worker. Steps come on the step socket,
 * or on runtime connections that the pool hands over (`conn`, with the
 * socket as the handle of the message; `hello.ts`).
 */
export type ToWorker =
	| { type: 'ping'; seq: number }
	| { type: 'stats'; seq: number }
	/** `conn`: the number of the connection in the pool, for `conn-closed`. */
	| { type: 'conn'; conn: number; rest: Buffer; workers: number; worker: number }
	/** The worker is recycled: no new steps on its runtime connections. */
	| { type: 'drain' };

/** Control messages from a worker to the pool. Results go on the step socket. */
export type FromWorker =
	| { type: 'ready' }
	/**
	 * `steps`: steps that came on runtime connections, for recycling.
	 * `inflight`: the steps that run now, for the log when the worker stops.
	 */
	| { type: 'pong'; seq: number; rss: number; steps: number; inflight: number }
	/** A runtime connection of the worker closed: the pool closes its copy. */
	| { type: 'conn-closed'; conn: number }
	/** After `drain`: no step is in flight, so the pool can stop the worker. */
	| { type: 'idle' }
	/** After a full garbage collection when the worker can run one (`--expose-gc`). */
	| { type: 'stats'; seq: number; rss: number; heapUsed: number }
	| { type: 'log'; message: string };

export class ProcessCallError extends Error {
	constructor(call: string) {
		super(`A step called ${call}. The host does not allow it.`);
		this.name = 'ProcessCallError';
	}
}

interface StepScope {
	id: string;
	done: boolean;
}

/** The pool passes the worker data in this environment variable, as JSON. */
export const WORKER_DATA_ENV = 'WF_FALLBACK_WORKER_DATA';

function readWorkerData(): StepWorkerData {
	const parsed: unknown = JSON.parse(process.env[WORKER_DATA_ENV] ?? '{}');
	if (typeof parsed !== 'object' || parsed === null) return {};
	const credentialsFile: unknown = Reflect.get(parsed, 'credentialsFile');
	const codeTimeoutMs: unknown = Reflect.get(parsed, 'codeTimeoutMs');
	const stepTimeoutMs: unknown = Reflect.get(parsed, 'stepTimeoutMs');
	const recycleSteps: unknown = Reflect.get(parsed, 'recycleSteps');
	return {
		credentialsFile: typeof credentialsFile === 'string' ? credentialsFile : undefined,
		codeTimeoutMs: typeof codeTimeoutMs === 'number' ? codeTimeoutMs : undefined,
		stepTimeoutMs: typeof stepTimeoutMs === 'number' ? stepTimeoutMs : undefined,
		recycleSteps: typeof recycleSteps === 'number' ? recycleSteps : undefined,
	};
}

/** Stops node code from ending the worker or the process. */
function guardProcess(): void {
	process.exit = () => {
		throw new ProcessCallError('process.exit');
	};
	process.abort = () => {
		throw new ProcessCallError('process.abort');
	};
	const kill = process.kill.bind(process);
	process.kill = (pid: number, signal?: string | number) => {
		if (pid === process.pid || pid === 0) throw new ProcessCallError('process.kill');
		return kill(pid, signal);
	};
}

function main(): void {
	const channel = process.send?.bind(process);
	if (!channel) throw new Error('step-worker.js runs only as a forked worker process');
	const data = readWorkerData();
	const send = (message: FromWorker) => {
		// After the pool has gone, a send would throw into the error handlers below.
		if (process.connected) channel(message);
	};
	// The pool is gone: end, with the real exit (the guard replaces it).
	const reallyExit = process.exit.bind(process);
	const profiler = createStepProfiler(process.env[STEP_PROFILE_ENV]);
	process.on('disconnect', () => {
		profiler?.flush();
		reallyExit(0);
	});
	const log = (message: string) => send({ type: 'log', message });

	const scope = new AsyncLocalStorage<StepScope>();
	// As n8n's main process: an error outside a result is logged with the step that caused it,
	// and the step goes on to its own result. A step fails only through its own result, a
	// timeout, or the death of its worker.
	const strayError = (kind: string) => (error: unknown) => {
		const step = scope.getStore();
		const owner = step ? ` (from step ${step.id}${step.done ? ', which has ended' : ''})` : '';
		log(`${kind}${owner}: ${messageOf(error)}`);
	};
	// The steps of this worker share keep-alive connections (`http-pool.ts`).
	installSharedAgents();
	process.on('uncaughtException', strayError('Uncaught exception'));
	process.on('unhandledRejection', strayError('Unhandled rejection'));
	guardProcess();

	const handler = new StepHandler({
		credentials: fileCredentialStore(data.credentialsFile),
		codeTimeoutMs: data.codeTimeoutMs,
		log,
	});

	const steps = new Socket({ fd: DATA_FD, readable: true, writable: true });
	steps.on('error', (error) => log(`Step socket error: ${error.message}`));

	/** Writes the result of job `seq`: `<u32 length><u32 job><response JSON>`. */
	const writeResult = (seq: number, response: StepResponse) => {
		let json: string;
		try {
			json = JSON.stringify(response);
		} catch (error) {
			json = JSON.stringify({
				id: response.id,
				ok: false,
				error: `The step result is not JSON: ${messageOf(error)}`,
			});
		}
		const length = Buffer.byteLength(json, 'utf8');
		const frame = Buffer.allocUnsafe(8 + length);
		frame.writeUInt32LE(4 + length, 0);
		frame.writeUInt32LE(seq, 4);
		frame.write(json, 8, 'utf8');
		if (!steps.destroyed) steps.write(frame);
	};

	/** Steps in flight in this worker, from the pool and from runtime connections. */
	let inflight = 0;
	let draining = false;
	const runtimeConns = new Set<Socket>();
	/**
	 * After `drain`, the worker is idle when no step runs and the runtime has
	 * closed its connections (it closes one after `goaway` when its last step
	 * there ended), so no step can still be on its way.
	 */
	const checkIdle = () => {
		if (draining && inflight === 0 && runtimeConns.size === 0) send({ type: 'idle' });
	};

	/**
	 * Runs one step and gives its response to `deliver` once. `timeoutMs`:
	 * the step fails with a timeout after this time, and a later result is
	 * dropped (the pool enforces it for its own steps).
	 */
	const runStep = (
		request: StepRequest,
		mark: StepMark | undefined,
		deliver: (response: StepResponse) => void,
		timeoutMs?: number,
		channel?: ServiceChannel,
	) => {
		inflight++;
		let settle: (response: StepResponse) => void = () => {};
		const settled = new Promise<StepResponse>((resolve) => (settle = resolve));
		const step: StepScope = {
			id: request.id,
			done: false,
		};
		const timer =
			timeoutMs === undefined
				? undefined
				: setTimeout(
						() =>
							settle({
								id: request.id,
								ok: false,
								error: `The step did not finish within ${timeoutMs} ms`,
							}),
						timeoutMs,
					);
		scope.run(step, () => {
			const handle = async () => await handler.handle(request);
			void (channel ? withServiceChannel(channel, handle) : handle()).then(settle);
		});
		void settled.then((response) => {
			if (step.done) return;
			step.done = true;
			clearTimeout(timer);
			inflight--;
			deliver(response);
			if (mark) profiler?.end(mark, request);
			checkIdle();
		});
	};

	// ---- runtime connections (protocol version 2, `hello.ts`)

	let directSteps = 0;

	/** One response frame on a runtime connection. */
	const writeResponse = (socket: Socket, response: StepResponse) => {
		let frame: Buffer;
		try {
			frame = encodeFrame(response);
		} catch (error) {
			frame = encodeFrame({
				id: response.id,
				ok: false,
				error: `The step result is not JSON: ${messageOf(error)}`,
			});
		}
		if (!socket.destroyed && socket.writable) socket.write(frame);
	};

	const attach = (socket: Socket, conn: number, rest: Buffer, workers: number, worker: number) => {
		runtimeConns.add(socket);
		const connDecoder = new FrameDecoder();
		const services = new ConnectionServices(socket);
		socket.on('error', (error) => log(`Runtime connection error: ${error.message}`));
		socket.on('close', () => {
			runtimeConns.delete(socket);
			services.close();
			send({ type: 'conn-closed', conn });
			checkIdle();
		});
		socket.write(encodeFrame({ hello: helloAnswer(workers, worker) }));
		if (draining) socket.write(encodeFrame(GOAWAY));
		const onData = (chunk: Buffer) => {
			let frames: Buffer[];
			try {
				frames = connDecoder.push(chunk);
			} catch (error) {
				// The stream is corrupt, so no later frame boundary can be trusted.
				log(`Closing a runtime connection: ${messageOf(error)}`);
				socket.destroy();
				return;
			}
			for (const body of frames) {
				if (services.onFrame(body)) continue;
				const mark = profiler?.start();
				let request: StepRequest;
				try {
					request = parseRequest(body);
				} catch (error) {
					const id = error instanceof ProtocolError ? (error.requestId ?? '') : '';
					writeResponse(socket, { id, ok: false, error: messageOf(error) });
					if (mark) profiler?.drop(mark);
					continue;
				}
				directSteps++;
				// The pool counts steps at each ping. At the limit, tell it at once.
				if (directSteps === data.recycleSteps) {
					send({
						type: 'pong',
						seq: 0,
						rss: process.memoryUsage.rss(),
						steps: directSteps,
						inflight,
					});
				}
				void ready.then(() =>
					runStep(
						request,
						mark,
						(response) => writeResponse(socket, response),
						data.stepTimeoutMs,
						services.channelFor(request.id),
					),
				);
			}
		};
		socket.on('data', onData);
		if (rest.length > 0) onData(rest);
		socket.resume();
	};

	const sendStats = (seq: number) => {
		const collect: unknown = Reflect.get(globalThis, 'gc');
		if (typeof collect === 'function') Reflect.apply(collect, undefined, []);
		const usage = process.memoryUsage();
		send({ type: 'stats', seq, rss: usage.rss, heapUsed: usage.heapUsed });
	};

	// Steps wait for the preload below, so the CPU guard covers them.
	let preloaded: () => void = () => {};
	const ready = new Promise<void>((resolve) => (preloaded = resolve));
	process.on('message', (message: ToWorker, handle: unknown) => {
		if (message.type === 'ping') {
			send({
				type: 'pong',
				seq: message.seq,
				rss: process.memoryUsage.rss(),
				steps: directSteps,
				inflight,
			});
		} else if (message.type === 'stats') {
			sendStats(message.seq);
		} else if (message.type === 'conn') {
			if (handle instanceof Socket) {
				attach(handle, message.conn, Buffer.from(message.rest), message.workers, message.worker);
			}
		} else if (message.type === 'drain') {
			draining = true;
			for (const socket of runtimeConns) if (socket.writable) socket.write(encodeFrame(GOAWAY));
			checkIdle();
		}
	});
	const decoder = new FrameDecoder();
	steps.on('data', (chunk: Buffer) => {
		let frames: Buffer[];
		try {
			frames = decoder.push(chunk);
		} catch (error) {
			// The pool wrote a frame that cannot be read. Its steps time out.
			log(`Bad step frame: ${messageOf(error)}`);
			steps.destroy();
			return;
		}
		for (const frame of frames) {
			if (frame.length < 4) continue;
			const seq = frame.readUInt32LE(0);
			const mark = profiler?.start();
			let request: StepRequest;
			try {
				request = parseRequest(frame.subarray(4));
			} catch (error) {
				// The same answer that the server gave for a bad request.
				const id = error instanceof ProtocolError ? (error.requestId ?? '') : '';
				writeResult(seq, { id, ok: false, error: messageOf(error) });
				if (mark) profiler?.drop(mark);
				continue;
			}
			void ready.then(() => runStep(request, mark, (response) => writeResult(seq, response)));
		}
	});
	// Load n8n-core, the node loader and the expression engine before the
	// pool counts pings, so a first node step does not look like a blocked
	// worker.
	void (async () => {
		try {
			const { NodeStepRunner } = await import('./node-step.js');
			await new NodeStepRunner({ credentials: fileCredentialStore(undefined) }).warmUp();
		} catch (error) {
			log(`Preload failed: ${messageOf(error)}`);
		}
		send({ type: 'ready' });
		preloaded();
	})();
}

main();
