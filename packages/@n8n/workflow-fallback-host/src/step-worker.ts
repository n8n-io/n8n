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
 *
 * Lanes (`lanes.ts`, `docs/isolation.md`): a worker of the normal lane does
 * not run a step whose key is marked. It gives the step to the pool
 * (`RELAY_JOB`), which runs it alone in a worker of the slow lane, and it
 * writes the answer where the step came from. The worker measures the delay
 * of its event loop and tells the pool when a step blocked it.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Socket } from 'node:net';

import { messageOf, runWithClockOffset } from './code-step';
import { fileCredentialStore } from './credentials';
import { GOAWAY, helloAnswer } from './hello';
import { installSharedAgents } from './http-pool';
import { type Lane, laneKey, slowNeed } from './lanes';
import {
	encodeFrame,
	FrameDecoder,
	parseRequest,
	ProtocolError,
	readClockOffset,
} from './protocol';
import type { JsonValue, StepRequest, StepResponse } from './protocol';
import { StepHandler } from './server';
import {
	ConnectionServices,
	failsStep,
	ServiceCallError,
	type ServiceChannel,
	withServiceChannel,
} from './service-calls';
import { createStepProfiler, STEP_PROFILE_ENV, type StepMark } from './step-profile';

export interface StepWorkerData {
	credentialsFile?: string;
	codeTimeoutMs?: number;
	/** The longest wall-clock time of a step that comes on a runtime connection. */
	stepTimeoutMs?: number;
	/** Steps after which the pool replaces the worker (`WorkerPoolOptions.recycleSteps`). */
	recycleSteps?: number;
	/** `slow`: the worker runs one step at a time, and it runs every step that it gets. */
	lane?: 'slow';
	/** An event loop delay of this length, or longer, is a block (`WorkerPoolOptions.lagMs`). */
	lagMs?: number;
	/** False: a code step with a key that has no mark runs in the normal lane. */
	codeStartsSlow?: boolean;
}

/** Same as `DEFAULT_LAG_MS` of `worker-pool.ts`, which this file must not load. */
const DEFAULT_LAG_MS = 100;

/** The most keys in one control frame. */
const MAX_KEYS = 64;

/** The file descriptor of the step socket, which the pool opens next to the IPC channel. */
export const DATA_FD = 4;

/**
 * The job number of a control frame on the step socket. It is not a job, so no
 * step has it. Same as `CONTROL_JOB` of `worker-pool.ts`.
 */
export const CONTROL_JOB = 0;

/**
 * The job number of a step that a worker gives to the pool for the slow lane:
 * `<u32 length><u32 RELAY_JOB><u32 relay><u8 wait><u16 key length><key><request JSON>`.
 * `wait` 1: the step waits for the slow lane. 0: it runs there only when a
 * worker is free. The pool answers
 * `<u32 length><u32 RELAY_JOB><u32 relay><response JSON>`. An answer without
 * a response says that the worker must run the step itself.
 * Same as `RELAY_JOB` of `worker-pool.ts`.
 */
export const RELAY_JOB = 0xffff_ffff;

/**
 * The supervision traffic on the step socket. The pool pings there, so a
 * connection hand-over or a broken IPC channel cannot hide a worker that runs
 * (`worker-pool.ts`).
 */
export type ControlMessage =
	| { control: 'ping'; seq: number }
	/** `keys`: the keys of the steps that run in the worker now. */
	| {
			control: 'pong';
			seq: number;
			rss: number;
			steps: number;
			inflight: number;
			keys?: string[];
	  }
	/** To a worker: the mark of a key. */
	| { control: 'lane'; key: string; lane: Lane; until: number }
	/** From a worker: a step with a key that did not run in it starts now. */
	| { control: 'start'; key: string }
	/**
	 * From a worker: its event loop did not run for `ms`. `keys`: the keys of
	 * the steps that ran in that time. `complete`: `keys` holds each of them.
	 */
	| { control: 'blocked'; ms: number; keys: string[]; complete: boolean }
	/**
	 * A service call of a step in the slow lane, on its way to the runtime
	 * connection of the step. `id`: the job from a slow worker, the relay
	 * number to the worker that has the connection.
	 */
	| { control: 'service'; id: number; service: string; op: string; args: unknown }
	| { control: 'serviceResult'; id: number; ok: boolean; result?: JsonValue; error?: string };

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
	/** Ends the step with an error. It does nothing after the step has ended. */
	fail: (error: unknown) => void;
}

/** The pool passes the worker data in this environment variable, as JSON. */
export const WORKER_DATA_ENV = 'WF_FALLBACK_WORKER_DATA';

function isJsonValue(value: unknown): value is JsonValue {
	// The value comes from `JSON.parse`, so it is JSON when it is defined.
	return value !== undefined;
}

function readWorkerData(): StepWorkerData {
	const parsed: unknown = JSON.parse(process.env[WORKER_DATA_ENV] ?? '{}');
	if (typeof parsed !== 'object' || parsed === null) return {};
	const credentialsFile: unknown = Reflect.get(parsed, 'credentialsFile');
	const codeTimeoutMs: unknown = Reflect.get(parsed, 'codeTimeoutMs');
	const stepTimeoutMs: unknown = Reflect.get(parsed, 'stepTimeoutMs');
	const recycleSteps: unknown = Reflect.get(parsed, 'recycleSteps');
	const lagMs: unknown = Reflect.get(parsed, 'lagMs');
	return {
		lane: Reflect.get(parsed, 'lane') === 'slow' ? 'slow' : undefined,
		lagMs: typeof lagMs === 'number' ? lagMs : undefined,
		codeStartsSlow: Reflect.get(parsed, 'codeStartsSlow') !== false,
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
		// A service of n8n refused a call of this step, and the node did not wait for the
		// answer: the step fails with the error of the service. The worker goes on.
		if (failsStep(error, step)) step?.fail(error);
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

	/** Writes the result of job `seq` from the JSON of the response. */
	const writeResultBody = (seq: number, body: Buffer) => {
		if (steps.destroyed) return;
		const header = Buffer.allocUnsafe(8);
		header.writeUInt32LE(4 + body.length, 0);
		header.writeUInt32LE(seq, 4);
		steps.write(header);
		steps.write(body);
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

	// ---- lanes (`lanes.ts`)

	const slowLane = data.lane === 'slow';
	const lagMs = data.lagMs ?? DEFAULT_LAG_MS;
	/** The marks of the keys, as the pool sent them. The pool bounds their number. */
	const marks = new Map<string, { lane: Lane; until: number }>();
	/** How many steps of each key run now. */
	const keyCounts = new Map<string, number>();
	/** The keys of the steps that ran since the last look at the event loop delay. */
	let recent = new Set<string>();
	let recentComplete = true;

	const enter = (key: string) => {
		const count = keyCounts.get(key) ?? 0;
		keyCounts.set(key, count + 1);
		if (recent.size < MAX_KEYS) recent.add(key);
		else if (!recent.has(key)) recentComplete = false;
		// The pool must know the key before the step can block the worker.
		if (count === 0 && !slowLane) writeControl({ control: 'start', key });
	};
	const leave = (key: string) => {
		const count = (keyCounts.get(key) ?? 1) - 1;
		if (count <= 0) keyCounts.delete(key);
		else keyCounts.set(key, count);
	};
	const markOf = (key: string): Lane | undefined => {
		const mark = marks.get(key);
		if (!mark) return undefined;
		if (mark.until > Date.now()) return mark.lane;
		marks.delete(key);
		return undefined;
	};

	// A timer that comes late shows that synchronous code held the event loop.
	const tickMs = Math.max(5, Math.min(20, Math.floor(lagMs / 4)));
	let lastTick = performance.now();
	/**
	 * Looks at the time since the last look. The timer does it, and each step
	 * does it before its answer, so the pool gets the block before the answer.
	 */
	const lagCheck = () => {
		const now = performance.now();
		const late = now - lastTick - tickMs;
		lastTick = now;
		if (late >= lagMs && recent.size > 0) {
			writeControl({
				control: 'blocked',
				ms: Math.round(late),
				keys: [...recent],
				complete: recentComplete,
			});
		}
		recent = new Set([...keyCounts.keys()].slice(0, MAX_KEYS));
		recentComplete = keyCounts.size <= MAX_KEYS;
	};
	setInterval(lagCheck, tickMs).unref();

	/** Where the answer of a step goes: as a response, or as its JSON. */
	interface Origin {
		write(response: StepResponse): void;
		writeRaw(body: Buffer): void;
	}
	interface Relay {
		origin: Origin;
		request: StepRequest;
		mark: StepMark | undefined;
		channel: ServiceChannel | undefined;
		key: string;
		timeoutMs: number | undefined;
	}
	/** The steps that the pool runs in the slow lane for this worker. */
	const relays = new Map<number, Relay>();
	let relaySeq = 0;

	/** Gives a step to the pool for the slow lane. */
	const relay = (raw: Buffer, wait: boolean, entry: Relay) => {
		inflight++;
		relaySeq = (relaySeq + 1) % 0x1_0000_0000;
		relays.set(relaySeq, entry);
		const keyBytes = Buffer.from(entry.key, 'utf8').subarray(0, 0xffff);
		const frame = Buffer.allocUnsafe(15 + keyBytes.length + raw.length);
		frame.writeUInt32LE(11 + keyBytes.length + raw.length, 0);
		frame.writeUInt32LE(RELAY_JOB, 4);
		frame.writeUInt32LE(relaySeq, 8);
		frame.writeUInt8(wait ? 1 : 0, 12);
		frame.writeUInt16LE(keyBytes.length, 13);
		keyBytes.copy(frame, 15);
		raw.copy(frame, 15 + keyBytes.length);
		steps.write(frame);
	};

	/** The answer of the pool for a step in the slow lane: `<u32 relay><response JSON>`. */
	const onRelayResult = (frame: Buffer) => {
		if (frame.length < 4) return;
		const id = frame.readUInt32LE(0);
		const entry = relays.get(id);
		if (!entry) return;
		relays.delete(id);
		inflight--;
		if (frame.length === 4) {
			// No worker of the slow lane is free, and the step need not wait for one.
			const { request, key, mark, origin, timeoutMs, channel } = entry;
			runStep(request, key, mark, (response) => origin.write(response), timeoutMs, channel);
			return;
		}
		try {
			entry.origin.writeRaw(frame.subarray(4));
		} catch (error) {
			log(`Could not write the result of step ${entry.request.id}: ${messageOf(error)}`);
		}
		if (entry.mark) profiler?.end(entry.mark, entry.request);
		checkIdle();
	};

	/** Runs a step here, or gives it to the pool when its key belongs in the slow lane. */
	const submit = (
		request: StepRequest,
		raw: Buffer,
		mark: StepMark | undefined,
		origin: Origin,
		timeoutMs?: number,
		channel?: ServiceChannel,
	) => {
		const key = laneKey(request.workflowId, request.step);
		const need =
			slowLane || steps.destroyed
				? 'no'
				: slowNeed(markOf(key), request.kind, data.codeStartsSlow !== false);
		// The pool applies the time limit of a step that it runs.
		if (need !== 'no') {
			relay(raw, need === 'must', { origin, request, mark, channel, key, timeoutMs });
		} else runStep(request, key, mark, (response) => origin.write(response), timeoutMs, channel);
	};

	type ServiceAnswer = { ok: boolean; result?: JsonValue; error?: string };
	/** The service calls of the steps that the pool sent, by job. One call at a time for each. */
	const serviceWaits = new Map<number, (answer: ServiceAnswer) => void>();
	const poolChannel = (seq: number): ServiceChannel => {
		let last: Promise<unknown> = Promise.resolve();
		const one = async (service: string, op: string, args: unknown) => {
			const answer = await new Promise<ServiceAnswer>((resolve) => {
				serviceWaits.set(seq, resolve);
				writeControl({ control: 'service', id: seq, service, op, args });
			});
			if (answer.ok) return answer.result ?? null;
			throw new ServiceCallError(answer.error ?? 'The service call failed');
		};
		return {
			call: async (service, op, args) => {
				const run = last.then(
					async () => await one(service, op, args),
					async () => await one(service, op, args),
				);
				last = run;
				return await run;
			},
		};
	};

	/** A service call of a step that this worker gave to the pool: ask on the step's connection. */
	const onRelayService = (id: number, service: string, op: string, args: unknown) => {
		const channel = relays.get(id)?.channel;
		if (!channel) {
			writeControl({
				control: 'serviceResult',
				id,
				ok: false,
				error: `The ${service} service needs a runtime connection of protocol version 2; this step has none`,
			});
			return;
		}
		channel.call(service, op, args).then(
			(result) => writeControl({ control: 'serviceResult', id, ok: true, result }),
			(error: unknown) =>
				writeControl({ control: 'serviceResult', id, ok: false, error: messageOf(error) }),
		);
	};

	/**
	 * Runs one step and gives its response to `deliver` once. `timeoutMs`:
	 * the step fails with a timeout after this time, and a later result is
	 * dropped (the pool enforces it for its own steps).
	 */
	const runStep = (
		request: StepRequest,
		key: string,
		mark: StepMark | undefined,
		deliver: (response: StepResponse) => void,
		timeoutMs?: number,
		channel?: ServiceChannel,
	) => {
		inflight++;
		enter(key);
		let settle: (response: StepResponse) => void = () => {};
		const settled = new Promise<StepResponse>((resolve) => (settle = resolve));
		const fail = (error: unknown) => settle({ id: request.id, ok: false, error: messageOf(error) });
		const step: StepScope = {
			id: request.id,
			done: false,
			fail,
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
			// An error on the way to the handler, or a rejection of its promise, ends this step
			// only. Without it the step has no answer, and the runtime waits for its timeout.
			try {
				const handle = async () => await handler.handle(request);
				// The step reads its own run clock (`CLOCK-OFFSET`, spec 9) through this context.
				const clockOffsetMs = request.clockOffsetMs ?? readClockOffset(request.execution);
				void runWithClockOffset(clockOffsetMs, async () =>
					channel ? await withServiceChannel(channel, handle) : await handle(),
				).then(settle, fail);
			} catch (error) {
				fail(error);
			}
		});
		void settled.then((response) => {
			if (step.done) return;
			step.done = true;
			clearTimeout(timer);
			inflight--;
			lagCheck();
			leave(key);
			try {
				deliver(response);
			} catch (error) {
				// The answer could not be written. The worker still counts the step as ended.
				log(`Could not write the result of step ${request.id}: ${messageOf(error)}`);
			}
			if (mark) profiler?.end(mark, request);
			checkIdle();
		});
	};

	// ---- runtime connections (protocol version 2, `hello.ts`)

	let directSteps = 0;

	// ---- supervision on the step socket

	/** The counts that a pong gives the pool. */
	const pongFields = () => ({
		rss: process.memoryUsage.rss(),
		steps: directSteps,
		inflight,
		keys: [...keyCounts.keys()].slice(0, MAX_KEYS),
	});

	/** Writes a control frame: `<u32 length><u32 0><control JSON>`. */
	const writeControl = (message: ControlMessage) => {
		const json = Buffer.from(JSON.stringify(message), 'utf8');
		const frame = Buffer.allocUnsafe(8 + json.length);
		frame.writeUInt32LE(4 + json.length, 0);
		frame.writeUInt32LE(CONTROL_JOB, 4);
		json.copy(frame, 8);
		if (!steps.destroyed) steps.write(frame);
	};

	/**
	 * Answers a control frame of the pool. A worker that blocks its event loop
	 * cannot answer it, which is what the CPU guard looks for.
	 */
	const onControl = (body: Buffer) => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(body.toString('utf8'));
		} catch {
			log('A control frame is not JSON');
			return;
		}
		if (typeof parsed !== 'object' || parsed === null) return;
		const control: unknown = Reflect.get(parsed, 'control');
		const seq: unknown = Reflect.get(parsed, 'seq');
		if (control === 'ping' && typeof seq === 'number') {
			writeControl({ control: 'pong', seq, ...pongFields() });
			return;
		}
		const id: unknown = Reflect.get(parsed, 'id');
		if (control === 'lane') {
			const key: unknown = Reflect.get(parsed, 'key');
			const lane: unknown = Reflect.get(parsed, 'lane');
			const until: unknown = Reflect.get(parsed, 'until');
			if (typeof key !== 'string' || typeof until !== 'number') return;
			if (lane === 'slow' || lane === 'probe' || lane === 'maybe' || lane === 'clear') {
				marks.set(key, { lane, until });
			}
		} else if (control === 'service' && typeof id === 'number') {
			const service: unknown = Reflect.get(parsed, 'service');
			const op: unknown = Reflect.get(parsed, 'op');
			if (typeof service !== 'string' || typeof op !== 'string') return;
			onRelayService(id, service, op, Reflect.get(parsed, 'args'));
		} else if (control === 'serviceResult' && typeof id === 'number') {
			const answer = serviceWaits.get(id);
			serviceWaits.delete(id);
			const error: unknown = Reflect.get(parsed, 'error');
			const result: unknown = Reflect.get(parsed, 'result');
			answer?.({
				ok: Reflect.get(parsed, 'ok') === true,
				result: isJsonValue(result) ? result : null,
				error: typeof error === 'string' ? error : undefined,
			});
		}
	};

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

	/** One response frame on a runtime connection, from the JSON of the response. */
	const writeResponseBody = (socket: Socket, body: Buffer) => {
		if (socket.destroyed || !socket.writable) return;
		const header = Buffer.allocUnsafe(4);
		header.writeUInt32LE(body.length, 0);
		socket.write(header);
		socket.write(body);
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
					submit(
						request,
						body,
						mark,
						{
							write: (response) => writeResponse(socket, response),
							writeRaw: (answer) => writeResponseBody(socket, answer),
						},
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
			// Only a pool without a step socket pings here (`worker-pool.ts`).
			send({ type: 'pong', seq: message.seq, ...pongFields() });
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
			if (seq === CONTROL_JOB) {
				onControl(frame.subarray(4));
				continue;
			}
			if (seq === RELAY_JOB) {
				onRelayResult(frame.subarray(4));
				continue;
			}
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
			const raw = frame.subarray(4);
			void ready.then(() =>
				submit(
					request,
					raw,
					mark,
					{
						write: (response) => writeResult(seq, response),
						writeRaw: (answer) => writeResultBody(seq, answer),
					},
					undefined,
					// Only a step of the slow lane can reach a runtime connection through the pool.
					slowLane ? poolChannel(seq) : undefined,
				),
			);
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
