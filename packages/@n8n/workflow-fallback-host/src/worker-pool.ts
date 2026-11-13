/**
 * Runs steps on a pool of worker processes (`step-worker.ts`), so that one
 * step that fails badly does not stop the host or the steps of other
 * executions. Worker processes, not threads: the host stops a worker with
 * SIGKILL, and a native crash (isolated-vm, a native module) stops only that
 * worker. Worker threads cannot give either.
 *
 * Each worker runs many steps at a time: node steps wait on I/O most of the
 * time. The pool watches each step and each worker:
 *
 * - Wall-clock limit: a step that has not answered after `stepTimeoutMs`
 *   fails with a timeout. Its worker goes on with the other steps.
 * - CPU guard: the pool pings each worker. A worker that does not answer for
 *   `blockedMs` runs synchronous code that does not end. The pool stops it.
 * - Memory: each worker has a heap limit (`memoryMb`). A worker over it stops,
 *   the host does not.
 * - A worker that stops for any reason (blocked, out of memory, a native
 *   error) is replaced at once.
 * - Recycling: a worker that has run `recycleSteps` steps, or whose resident
 *   memory is over `recycleRssMb`, takes no new steps. A new worker takes its
 *   place, and the old one stops when its last step has ended. This bounds
 *   what node code leaves behind (caches, timers, sockets) over a long run.
 *
 * When a worker stops with more than one step in it, the pool does not know
 * which step caused it. It runs each of those steps again, alone, on its own
 * new worker. A step that stops its own worker again is the cause: it fails.
 * The other steps get their real result. So a step can run twice; the
 * runtime gives steps at-least-once semantics already (crash recovery and
 * idempotency keys).
 *
 * Steps go to a worker as bytes, not as IPC messages. Each worker has a
 * socket pair (`DATA_FD`) next to its IPC channel. A step is one frame
 * `<u32 length><u32 job><request JSON>`, and the answer is the same form
 * with the response JSON. The pool does not parse the request: the request
 * frame of the runtime goes to the worker as it is, and the worker parses it
 * once. The IPC channel carries only the control messages (ping, stats, log).
 */
import { type ChildProcess, fork } from 'node:child_process';
import type { Socket } from 'node:net';

import { workerLost } from './hello';
import { encodeFrame, FrameDecoder, isJsonObject } from './protocol';
import type { StepRequest, StepResponse } from './protocol';
import type { FromWorker, StepWorkerData, ToWorker } from './step-worker';

/** Same as `WORKER_DATA_ENV` of `step-worker.ts`, which this file must not load. */
const WORKER_DATA_ENV = 'WF_FALLBACK_WORKER_DATA';

/** The file descriptor of the step socket in a worker. Same as `DATA_FD` of `step-worker.ts`. */
const DATA_FD = 4;

/** The bytes of the length and the job number before the JSON of a worker frame. */
const WORKER_FRAME_HEADER = 8;

export interface WorkerPoolOptions {
	/** The compiled `step-worker.js`. */
	script: string;
	size: number;
	workerData: StepWorkerData;
	/** The longest wall-clock time of one step. */
	stepTimeoutMs: number;
	/** How long a worker may not answer a ping before the pool stops it. */
	blockedMs: number;
	/** The heap limit of each worker (old generation), in MB. */
	memoryMb: number;
	/** Steps after which a worker is replaced. */
	recycleSteps?: number;
	/** Resident memory, in MB, above which a worker is replaced. */
	recycleRssMb?: number;
	/** More Node.js flags for the workers (tests: `--expose-gc`). */
	execArgv?: string[];
	log: (message: string) => void;
}

export interface WorkerMemory {
	pid: number;
	steps: number;
	rss: number;
	heapUsed: number;
}

export const DEFAULT_STEP_TIMEOUT_MS = 300_000;
export const DEFAULT_BLOCKED_MS = 30_000;
export const DEFAULT_WORKER_MEMORY_MB = 4096;
export const DEFAULT_RECYCLE_STEPS = 20_000;
export const DEFAULT_RECYCLE_RSS_MB = 1536;

/** The longest start of a worker, module loading included. */
const STARTUP_MS = 120_000;

/** The longest time that a ready worker may take to confirm a runtime connection. */
const HANDOVER_MS = 10_000;

interface WaitingConn {
	socket: Socket;
	/** The bytes that came after the hello. */
	rest: Buffer;
	/** The pool keeps a copy of the socket (`stopReading`). */
	keep: boolean;
}

interface Job {
	/** The number of the job in the pool. A second run of the step gets a new number. */
	seq: number;
	/** The request JSON, as the runtime sent it. */
	body: Buffer;
	/** Gets the response JSON. */
	resolve: (response: Buffer) => void;
	/** This run is the second, alone on its own worker. */
	alone: boolean;
	timer?: NodeJS.Timeout;
}

interface PoolWorker {
	child: ChildProcess;
	/** The step socket of the worker. */
	data: Socket | undefined;
	/** V8 wrote its out-of-memory message to stderr. */
	outOfMemory: boolean;
	jobs: Map<number, Job>;
	/** Runs only its one job, then stops. */
	alone: boolean;
	lastPong: number;
	pingSeq: number;
	/** The worker has loaded its modules; the CPU guard applies from then on. */
	ready: boolean;
	startedAt: number;
	/** Why the pool stopped it. */
	stopReason?: string;
	/** Steps that timed out in it. Their code can still run there. */
	abandoned: number;
	gone: boolean;
	/** Steps sent to it by the pool. */
	steps: number;
	/** Steps that came on its runtime connections (at the last pong). */
	directSteps: number;
	/** Steps of its runtime connections in flight (at the last pong). */
	directInflight: number;
	/**
	 * Runtime connections that the pool handed to it (`hello.ts`), by
	 * connection number. The pool keeps its own copy of each socket: when
	 * the worker stops, it writes `worker_lost` on it and closes it.
	 */
	conns: Map<number, Socket | undefined>;
	/** Connection hand-overs that the worker has not confirmed, and since when. */
	handovers: Map<number, number>;
	/** Runtime connections that wait until the worker has loaded its modules. */
	pending: WaitingConn[];
	/** Resident memory at the last pong, in bytes. */
	rss: number;
	/** It takes no new steps and stops when its last step has ended. */
	draining: boolean;
	stats: Map<number, (memory: WorkerMemory) => void>;
}

export class WorkerPool {
	private readonly workers: PoolWorker[] = [];

	private readonly heartbeat: NodeJS.Timeout;

	private closed = false;

	private seq = 0;

	private connSeq = 0;

	constructor(private readonly options: WorkerPoolOptions) {
		for (let i = 0; i < options.size; i++) this.workers.push(this.spawn(false));
		const every = Math.max(50, Math.min(1000, Math.floor(options.blockedMs / 4)));
		this.heartbeat = setInterval(() => this.check(), every);
		this.heartbeat.unref();
	}

	/** Runs one step. The promise always resolves, also when the step fails. */
	async run(request: StepRequest): Promise<StepResponse> {
		const response = await this.runFrame(Buffer.from(JSON.stringify(request), 'utf8'));
		return parseResponse(response);
	}

	/**
	 * Runs one step from the JSON body of a request frame and gives the JSON
	 * body of the response frame. The promise always resolves, also when the
	 * step fails or the body is not a valid request (the worker answers it as
	 * the server did).
	 */
	async runFrame(body: Buffer): Promise<Buffer> {
		if (this.closed) return failureBody(body, 'The fallback host is stopping', true);
		return await new Promise((resolve) => {
			this.dispatch({ seq: this.nextSeq(), body, resolve, alone: false });
		});
	}

	async close(): Promise<void> {
		this.closed = true;
		clearInterval(this.heartbeat);
		await Promise.all(
			this.workers.map(
				async (w) =>
					await new Promise<void>((resolve) => {
						if (w.gone) return resolve();
						w.child.once('close', () => resolve());
						w.child.kill('SIGKILL');
					}),
			),
		);
	}

	/**
	 * Hands a runtime connection that sent a version 2 hello to the worker
	 * with the fewest connections (`hello.ts`). The worker answers the hello
	 * and serves the connection; its steps no longer pass this process.
	 * Without a worker, the connection closes and the runtime connects again.
	 */
	adopt(socket: Socket, rest: Buffer): void {
		// One connection for each worker, as far as possible: the runtime blames
		// a step that was alone on a connection whose worker stopped, so a worker
		// with two connections could make it blame a step that did not stop it.
		let worker: PoolWorker | undefined;
		for (const w of this.workers) {
			if (w.alone || w.gone || w.draining || w.stopReason || !w.child.connected) continue;
			if (!worker || connectionsOf(w) < connectionsOf(worker)) worker = w;
		}
		if (!worker || this.closed) {
			socket.destroy();
			return;
		}
		// This copy only waits: it reads nothing, and it writes only `worker_lost`.
		// Without a way to stop its reads, the pool gives the socket away.
		const keep = stopReading(socket);
		socket.on('error', () => {});
		const waiting: WaitingConn = { socket, rest, keep };
		if (worker.ready) {
			this.handOver(worker, waiting);
			return;
		}
		// A worker that loads its modules does not read its IPC channel for
		// seconds: the connection waits until the worker is ready.
		const target = worker;
		target.pending.push(waiting);
		socket.once('close', () => {
			const index = target.pending.indexOf(waiting);
			if (index >= 0) target.pending.splice(index, 1);
		});
	}

	private handOver(target: PoolWorker, waiting: WaitingConn): void {
		const { socket, rest, keep } = waiting;
		if (socket.destroyed) return;
		const live = this.workers.filter((w) => !w.alone && !w.gone && !w.draining);
		this.connSeq = (this.connSeq + 1) % 0x1_0000_0000;
		const conn = this.connSeq;
		const message: ToWorker = {
			type: 'conn',
			conn,
			rest,
			workers: this.options.size,
			worker: Math.max(0, live.indexOf(target)),
		};
		target.conns.set(conn, keep ? socket : undefined);
		// Node.js sends no other message to the worker until it confirms the
		// handle, pings included. `check` stops a worker that does not.
		target.handovers.set(conn, Date.now());
		target.child.send(message, socket, { keepOpen: keep }, (error) => {
			target.handovers.delete(conn);
			if (!error) return;
			target.conns.delete(conn);
			socket.destroy();
		});
	}

	/** Steps that each worker runs now; for tests and stats. */
	load(): number[] {
		return this.workers.filter((w) => !w.alone).map((w) => w.jobs.size);
	}

	/** The memory of each pool worker, after a garbage collection where possible. */
	async memory(): Promise<WorkerMemory[]> {
		const live = this.workers.filter((w) => !w.alone && !w.gone && w.ready);
		return await Promise.all(
			live.map(
				async (w) =>
					await new Promise<WorkerMemory>((resolve) => {
						const seq = ++w.pingSeq;
						w.stats.set(seq, resolve);
						const message: ToWorker = { type: 'stats', seq };
						w.child.send(message, () => {});
					}),
			),
		);
	}

	private dispatch(job: Job): void {
		let worker: PoolWorker | undefined;
		if (job.alone) {
			worker = this.spawn(true);
			this.workers.push(worker);
		} else {
			for (const w of this.workers) {
				if (w.alone || w.gone || w.draining) continue;
				if (!worker || w.jobs.size < worker.jobs.size) worker = w;
			}
		}
		if (!worker) {
			job.resolve(failureBody(job.body, 'No fallback host worker is running', true));
			return;
		}
		const target = worker;
		target.jobs.set(job.seq, job);
		target.steps += 1;
		const limit = this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS;
		if (!target.alone && target.steps >= limit) this.drain(target, `it ran ${target.steps} steps`);
		// The clock starts when the worker has loaded its modules.
		if (target.ready) this.startClock(target, job);
		// A write to a worker that just stopped fails; its exit handler then
		// runs this job again.
		const data = target.data;
		if (data && !data.destroyed) data.write(workerFrame(job.seq, job.body));
	}

	private nextSeq(): number {
		this.seq = (this.seq + 1) % 0x1_0000_0000;
		return this.seq;
	}

	private startClock(worker: PoolWorker, job: Job): void {
		job.timer = setTimeout(() => this.timeOut(worker, job), this.options.stepTimeoutMs);
	}

	private timeOut(worker: PoolWorker, job: Job): void {
		if (worker.jobs.get(job.seq) !== job) return;
		worker.jobs.delete(job.seq);
		worker.abandoned += 1;
		job.resolve(
			failureBody(job.body, `The step did not finish within ${this.options.stepTimeoutMs} ms`),
		);
		// A worker that runs only this step is not needed any more.
		if (worker.alone) this.stop(worker, 'its step timed out');
	}

	private spawn(alone: boolean): PoolWorker {
		const child = fork(this.options.script, [], {
			execArgv: [`--max-old-space-size=${this.options.memoryMb}`, ...(this.options.execArgv ?? [])],
			env: {
				...process.env,
				// A worker enforces the step time limit on its runtime connections.
				[WORKER_DATA_ENV]: JSON.stringify({
					stepTimeoutMs: this.options.stepTimeoutMs,
					recycleSteps: this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS,
					...this.options.workerData,
				}),
			},
			serialization: 'advanced',
			// Index DATA_FD is the step socket.
			stdio: ['ignore', 'inherit', 'pipe', 'ipc', 'pipe'],
		});
		const stream = child.stdio[DATA_FD];
		const data = isSocket(stream) ? stream : undefined;
		const worker: PoolWorker = {
			child,
			data,
			outOfMemory: false,
			jobs: new Map(),
			alone,
			lastPong: Date.now(),
			pingSeq: 0,
			ready: false,
			startedAt: Date.now(),
			abandoned: 0,
			gone: false,
			steps: 0,
			directSteps: 0,
			directInflight: 0,
			conns: new Map(),
			handovers: new Map(),
			pending: [],
			rss: 0,
			draining: false,
			stats: new Map(),
		};
		child.stderr?.on('data', (chunk: Buffer) => {
			process.stderr.write(chunk);
			if (/heap out of memory|Reached heap limit/i.test(chunk.toString('utf8'))) {
				worker.outOfMemory = true;
			}
		});
		child.on('message', (message: FromWorker) => this.onMessage(worker, message));
		if (data) {
			const decoder = new FrameDecoder();
			data.on('data', (chunk: Buffer) => {
				let frames: Buffer[];
				try {
					frames = decoder.push(chunk);
				} catch (error) {
					// The worker wrote a frame that cannot be read, so no later frame can be trusted.
					this.stop(
						worker,
						`it wrote a bad frame: ${error instanceof Error ? error.message : String(error)}`,
					);
					return;
				}
				for (const frame of frames) this.onResult(worker, frame);
			});
			// A worker that stops closes the socket; its exit handler handles its jobs.
			data.on('error', () => {});
		}
		child.on('error', (error) => {
			worker.stopReason ??= `it failed: ${error.message}`;
		});
		// 'close' comes after stderr has ended, so the out-of-memory text is in.
		child.on('close', (code, signal) => this.onExit(worker, code, signal));
		return worker;
	}

	private onMessage(worker: PoolWorker, message: FromWorker): void {
		switch (message.type) {
			case 'pong': {
				worker.lastPong = Date.now();
				worker.rss = message.rss;
				worker.directSteps = message.steps;
				worker.directInflight = message.inflight;
				const limit = this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS;
				const total = worker.steps + worker.directSteps;
				if (!worker.alone && total >= limit) this.drain(worker, `it ran ${total} steps`);
				return;
			}
			case 'conn-closed':
				worker.conns.get(message.conn)?.destroy();
				worker.handovers.delete(message.conn);
				worker.conns.delete(message.conn);
				return;
			case 'idle':
				if (worker.draining && worker.jobs.size === 0) this.stop(worker, 'recycled');
				return;
			case 'stats': {
				const done = worker.stats.get(message.seq);
				worker.stats.delete(message.seq);
				done?.({
					pid: worker.child.pid ?? 0,
					steps: worker.steps,
					rss: message.rss,
					heapUsed: message.heapUsed,
				});
				return;
			}
			case 'log':
				this.options.log(`worker ${worker.child.pid}: ${message.message}`);
				return;
			case 'ready':
				worker.ready = true;
				worker.lastPong = Date.now();
				for (const job of worker.jobs.values()) if (!job.timer) this.startClock(worker, job);
				for (const waiting of worker.pending.splice(0)) this.handOver(worker, waiting);
				return;
		}
	}

	/** A result frame of a worker: the job number, then the response JSON. */
	private onResult(worker: PoolWorker, frame: Buffer): void {
		// The decoder removed the length, so the frame starts with the job number.
		if (frame.length < 4) return;
		const seq = frame.readUInt32LE(0);
		const job = worker.jobs.get(seq);
		if (!job) return; // It timed out already.
		worker.jobs.delete(seq);
		clearTimeout(job.timer);
		job.resolve(frame.subarray(4));
		if (worker.alone) this.stop(worker, 'its step ended');
		else if (worker.draining && worker.jobs.size === 0 && worker.conns.size === 0) {
			this.stop(worker, 'recycled');
		}
	}

	/** Pings each worker and stops a worker that has not answered for too long. */
	private check(): void {
		const now = Date.now();
		for (const worker of this.workers) {
			if (worker.gone || worker.stopReason) continue;
			if (!worker.ready) {
				if (now - worker.startedAt > STARTUP_MS) this.stop(worker, 'it did not start');
				continue;
			}
			for (const since of worker.handovers.values()) {
				if (now - since <= HANDOVER_MS) continue;
				this.stop(worker, `it did not take a runtime connection within ${HANDOVER_MS} ms`);
				break;
			}
			if (worker.stopReason) continue;
			if (now - worker.lastPong > this.options.blockedMs) {
				this.stop(worker, `it did not answer for ${this.options.blockedMs} ms (a step blocks it)`);
				continue;
			}
			const rssLimit = (this.options.recycleRssMb ?? DEFAULT_RECYCLE_RSS_MB) * 1024 * 1024;
			if (!worker.alone && !worker.draining && worker.rss > rssLimit) {
				this.drain(worker, `it uses ${Math.round(worker.rss / 1024 / 1024)} MB`);
			}
			const ping: ToWorker = { type: 'ping', seq: ++worker.pingSeq };
			if (worker.child.connected) worker.child.send(ping, () => {});
		}
	}

	/** Replace a worker: a new one takes the new steps, the old one ends its own. */
	private drain(worker: PoolWorker, reason: string): void {
		if (worker.draining || this.closed) return;
		worker.draining = true;
		this.options.log(`Recycling a worker: ${reason}.`);
		this.workers.push(this.spawn(false));
		// A worker with runtime connections sends `goaway` on them, and `idle` when they closed.
		if (worker.conns.size > 0) {
			const message: ToWorker = { type: 'drain' };
			if (worker.child.connected) worker.child.send(message, () => {});
		} else if (worker.jobs.size === 0) {
			this.stop(worker, 'recycled');
		}
	}

	private stop(worker: PoolWorker, reason: string): void {
		if (worker.stopReason || worker.gone) return;
		worker.stopReason = reason;
		worker.child.kill('SIGKILL');
	}

	private onExit(worker: PoolWorker, code: number | null, signal: NodeJS.Signals | null): void {
		if (worker.gone) return;
		worker.gone = true;
		const index = this.workers.indexOf(worker);
		if (index >= 0) this.workers.splice(index, 1);
		const reason =
			worker.stopReason ??
			(worker.outOfMemory
				? 'it ran out of memory'
				: `it stopped (${signal ?? `exit code ${String(code)}`})`);
		const jobs = [...worker.jobs.values()];
		worker.jobs.clear();
		const connCount = worker.conns.size;
		// The runtime connects again; another worker takes the connection.
		for (const waiting of worker.pending.splice(0)) waiting.socket.destroy();
		// No reason when the host stops: the steps did not cause it.
		closeConnectionsOf(worker, this.closed ? undefined : reason);
		// A recycled worker has its replacement already.
		if (!worker.alone && !worker.draining && !this.closed) {
			this.options.log(
				`A worker stopped: ${reason}. ${jobs.length + worker.directInflight} step(s) were in it, ${connCount} runtime connection(s).`,
			);
			this.workers.push(this.spawn(false));
		}
		// Only a step that was alone in its worker is surely the cause.
		const sole = jobs.length === 1 && worker.abandoned === 0;
		for (const job of jobs) {
			clearTimeout(job.timer);
			if (this.closed) {
				job.resolve(failureBody(job.body, 'The fallback host is stopping', true));
			} else if (sole || job.alone) {
				// The step was alone in its worker, so it caused the stop.
				job.resolve(failureBody(job.body, `The step stopped its host worker: ${reason}`));
			} else {
				this.dispatch({ seq: this.nextSeq(), body: job.body, resolve: job.resolve, alone: true });
			}
		}
	}
}

/**
 * The steps on the runtime connections of a worker that stopped ended with
 * it. The runtime blames a step that was alone on its connection and sends
 * the others again (`hello.ts`), so it gets the reason first.
 */
/** The runtime connections of a worker, with those that wait until it is ready. */
function connectionsOf(worker: PoolWorker): number {
	return worker.conns.size + worker.pending.length;
}

function closeConnectionsOf(worker: PoolWorker, reason: string | undefined): void {
	for (const socket of worker.conns.values()) {
		if (!socket) continue;
		if (reason === undefined || socket.destroyed || !socket.writable) {
			socket.destroy();
			continue;
		}
		socket.end(encodeFrame(workerLost(reason)), () => socket.destroy());
	}
	worker.conns.clear();
}

/**
 * Stops the reads of this process on a socket that a worker serves. A paused
 * stream still reads until its buffer is full, and the worker would never get
 * those bytes. Node.js has no public call for this. So the stream gets a
 * `_read` that does nothing (else it starts the reads again on a later tick),
 * and the socket handle stops its reads. False when the handle has no
 * `readStop`.
 */
export function stopReading(socket: Socket): boolean {
	const handle: unknown = Reflect.get(socket, '_handle');
	if (typeof handle !== 'object' || handle === null) return false;
	const readStop: unknown = Reflect.get(handle, 'readStop');
	if (typeof readStop !== 'function') return false;
	Reflect.set(socket, '_read', () => {});
	Reflect.apply(readStop, handle, []);
	Reflect.set(handle, 'reading', false);
	return true;
}

function isSocket(value: unknown): value is Socket {
	return (
		typeof value === 'object' && value !== null && typeof Reflect.get(value, 'write') === 'function'
	);
}

/** `<u32 length><u32 job><body>`: one step for a worker. */
function workerFrame(seq: number, body: Buffer): Buffer {
	const frame = Buffer.allocUnsafe(WORKER_FRAME_HEADER + body.length);
	frame.writeUInt32LE(4 + body.length, 0);
	frame.writeUInt32LE(seq, 4);
	body.copy(frame, WORKER_FRAME_HEADER);
	return frame;
}

/** The id of a request body, or '' when the body is not a request with a string id. */
function requestIdOf(body: Buffer): string {
	try {
		const parsed: unknown = JSON.parse(body.toString('utf8'));
		return isJsonObject(parsed) && typeof parsed.id === 'string' ? parsed.id : '';
	} catch {
		return '';
	}
}

/** The response JSON of a step that the pool failed. */
function failureBody(body: Buffer, error: string, retryable = false): Buffer {
	const id = requestIdOf(body);
	const response: StepResponse = retryable
		? { id, ok: false, error, retryable: true }
		: { id, ok: false, error };
	return Buffer.from(JSON.stringify(response), 'utf8');
}

function parseResponse(body: Buffer): StepResponse {
	const parsed: unknown = JSON.parse(body.toString('utf8'));
	if (isStepResponse(parsed)) return parsed;
	throw new Error('A worker gave a response that is not a step response');
}

function isStepResponse(value: unknown): value is StepResponse {
	if (!isJsonObject(value) || typeof value.id !== 'string') return false;
	return value.ok === true ? Array.isArray(value.result) : typeof value.error === 'string';
}
