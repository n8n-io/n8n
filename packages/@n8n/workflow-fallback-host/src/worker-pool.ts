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
 * - CPU guard: the pool pings each worker. A worker of the normal lane that
 *   does not answer for `blockedMs` runs synchronous code that delays its
 *   other steps. The pool stops it, and its steps run again in the slow lane.
 * - Lanes (`lanes.ts`, `docs/isolation.md`): a step that blocks the event
 *   loop of a worker for `lagMs` gets a mark on its key (workflow id and step
 *   name). The next steps with that key run in the slow lane: alone in a
 *   worker, one at a time, with the full `stepTimeoutMs`. A code step whose
 *   key has no mark starts there. The workers of the normal lane give such
 *   steps to the pool (`RELAY_JOB`).
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
 * which step caused it. It runs each of those steps again, alone, in the
 * slow lane. A step that stops its worker there is the cause: it fails.
 * The other steps get their real result. So a step can run twice; the
 * runtime gives steps at-least-once semantics already (crash recovery and
 * idempotency keys).
 *
 * Steps go to a worker as bytes, not as IPC messages. Each worker has a
 * socket pair (`DATA_FD`) next to its IPC channel. A step is one frame
 * `<u32 length><u32 job><request JSON>`, and the answer is the same form
 * with the response JSON. The pool does not parse the request: the request
 * frame of the runtime goes to the worker as it is, and the worker parses it
 * once. The IPC channel carries the control messages (connection hand-over,
 * stats, log).
 *
 * The CPU guard pings over the step socket, not over the IPC channel. The IPC
 * channel also passes the socket of a connection hand-over, and Node.js queues
 * every message to that worker until the worker takes the socket. A step can
 * also stop the channel (`process.removeAllListeners('message')`, a closed
 * descriptor). Either way the worker goes on with its steps and answers no
 * ping, so the pool would stop a healthy worker every `blockedMs`. The step
 * socket has neither problem: only the pool writes to it.
 */
import { type ChildProcess, fork } from 'node:child_process';
import type { Socket } from 'node:net';

import { workerLost } from './hello';
import { type LaneChange, laneKey, LaneTable, SlowQueue, workflowOfKey } from './lanes';
import { encodeFrame, FrameDecoder, isJsonObject } from './protocol';
import type { JsonObject, StepRequest, StepResponse } from './protocol';
import type { ControlMessage, FromWorker, StepWorkerData, ToWorker } from './step-worker';

/** Same as `WORKER_DATA_ENV` of `step-worker.ts`, which this file must not load. */
const WORKER_DATA_ENV = 'WF_FALLBACK_WORKER_DATA';

/** The file descriptor of the step socket in a worker. Same as `DATA_FD` of `step-worker.ts`. */
const DATA_FD = 4;

/** The bytes of the length and the job number before the JSON of a worker frame. */
const WORKER_FRAME_HEADER = 8;

/**
 * The job number of a control frame on the step socket. It is not a job, so no
 * step has it. Same as `CONTROL_JOB` of `step-worker.ts`.
 */
const CONTROL_JOB = 0;

/** The job number of a step for the slow lane. Same as `RELAY_JOB` of `step-worker.ts`. */
const RELAY_JOB = 0xffff_ffff;

/** The most keys that the pool keeps for one worker. */
const MAX_WORKER_KEYS = 256;

export interface WorkerPoolOptions {
	/** The compiled `step-worker.js`. */
	script: string;
	size: number;
	workerData: StepWorkerData;
	/** The longest wall-clock time of one step. */
	stepTimeoutMs: number;
	/** How long a worker of the normal lane may not answer a ping before the pool stops it. */
	blockedMs: number;
	/** Workers of the slow lane. Default: one for each four workers, from 2 to 4. */
	slowSize?: number;
	/** An event loop delay of this length, or longer, is a block. */
	lagMs?: number;
	/** The most steps that wait for the slow lane. One workflow gets at most half. */
	slowQueueMax?: number;
	/** How long a key stays in the slow lane after a step with it blocked a worker. */
	slowTtlMs?: number;
	/** How long a key that ran alone without a block stays in the normal lane unchecked. */
	clearTtlMs?: number;
	/** The most keys with a mark. */
	maxKeys?: number;
	/** False: a code step with a key that has no mark runs in the normal lane. */
	codeStartsSlow?: boolean;
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
export const DEFAULT_BLOCKED_MS = 5_000;
export const DEFAULT_LAG_MS = 100;
export const DEFAULT_SLOW_QUEUE = 256;
export const DEFAULT_SLOW_TTL_MS = 600_000;
export const DEFAULT_MAX_KEYS = 4096;

/** The counters of the lanes, for the load test and for monitoring. */
export interface PoolStats {
	/** Steps in the workers of the normal lane, at their last answer. */
	normalInFlight: number;
	slowInFlight: number;
	/** Steps that wait for a worker of the slow lane. */
	slowWaiting: number;
	/** Steps that went to the slow lane, since the start. */
	movedToSlow: number;
	/** Workers of the normal lane that the CPU guard stopped. */
	guardStops: number;
	/** Blocks of `lagMs` or longer that the workers reported. */
	blockEvents: number;
	/** The longest block that a worker reported, in milliseconds. */
	maxBlockMs: number;
	/** Steps that failed because the slow lane was full or the wait was too long. */
	slowRejected: number;
	/** Keys with a mark. */
	marks: number;
}
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
	/** The step runs in the slow lane. */
	slow: boolean;
	timer?: NodeJS.Timeout;
	/** The key of the step (`lanes.ts`), when the pool knows it. */
	key?: string;
	/** The worker that gave the step to the pool, and its number there. */
	origin?: { worker: PoolWorker; relay: number };
	/** When the step started to wait for the slow lane. */
	queuedAt?: number;
	/** The worker that runs the step. */
	runner?: PoolWorker;
	/**
	 * The step need not run in the slow lane: this gives it back to the worker
	 * that it came from, which then runs it.
	 */
	bounce?: () => void;
}

interface PoolWorker {
	child: ChildProcess;
	/** The step socket of the worker. */
	data: Socket | undefined;
	/** V8 wrote its out-of-memory message to stderr. */
	outOfMemory: boolean;
	jobs: Map<number, Job>;
	/** `slow`: it runs one step at a time, without the CPU guard. */
	lane: 'normal' | 'slow';
	/** The keys of the steps that run in it, as far as it reported them. */
	keys: Set<string>;
	/** The steps that it gave to the pool for the slow lane, by its relay number. */
	relays: Map<number, Job>;
	/** Slow lane: the step that runs in it blocked it. */
	blockedInJob: boolean;
	/** The CPU guard stopped it: each of its steps runs again in the slow lane. */
	moved: boolean;
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

	private pingsSent = 0;

	private pongsAnswered = 0;

	private readonly lanes: LaneTable;

	private readonly slowQueue: SlowQueue<Job>;

	/** The keys with a step in the slow lane that shows if the key blocks. At most one for each slow worker. */
	private readonly trying = new Set<string>();

	private readonly counters = {
		movedToSlow: 0,
		guardStops: 0,
		blockEvents: 0,
		maxBlockMs: 0,
		slowRejected: 0,
	};

	constructor(private readonly options: WorkerPoolOptions) {
		const slowTtlMs = options.slowTtlMs ?? DEFAULT_SLOW_TTL_MS;
		this.lanes = new LaneTable({
			max: options.maxKeys ?? DEFAULT_MAX_KEYS,
			slowTtlMs,
			clearTtlMs: options.clearTtlMs ?? slowTtlMs,
		});
		this.slowQueue = new SlowQueue(options.slowQueueMax ?? DEFAULT_SLOW_QUEUE);
		for (let i = 0; i < options.size; i++) this.workers.push(this.spawn('normal'));
		const slowSize = options.slowSize ?? Math.min(4, Math.max(2, Math.ceil(options.size / 4)));
		for (let i = 0; i < slowSize; i++) this.workers.push(this.spawn('slow'));
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
			this.dispatch({ seq: this.nextSeq(), body, resolve, slow: false });
		});
	}

	async close(): Promise<void> {
		this.closed = true;
		clearInterval(this.heartbeat);
		for (const job of this.slowQueue.remove(() => true)) {
			job.resolve(failureBody(job.body, 'The fallback host is stopping', true));
		}
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
			if (w.lane === 'slow' || w.gone || w.draining || w.stopReason || !w.child.connected) continue;
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
		const live = this.workers.filter((w) => w.lane === 'normal' && !w.gone && !w.draining);
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
		try {
			target.child.send(message, socket, { keepOpen: keep }, (error) => {
				target.handovers.delete(conn);
				if (!error) return;
				target.conns.delete(conn);
				socket.destroy();
			});
		} catch (error) {
			// A hand-over that throws keeps no half state: the runtime connects again.
			this.options.log(
				`A connection hand-over failed: ${error instanceof Error ? error.message : String(error)}.`,
			);
			target.handovers.delete(conn);
			target.conns.delete(conn);
			socket.destroy();
		}
	}

	/** Steps that each worker runs now; for tests and stats. */
	load(): number[] {
		return this.workers.filter((w) => w.lane === 'normal').map((w) => w.jobs.size);
	}

	/** The counters of the lanes; for tests, the load test and monitoring. */
	stats(): PoolStats {
		let normalInFlight = 0;
		let slowInFlight = 0;
		for (const worker of this.workers) {
			if (worker.lane === 'slow') slowInFlight += worker.jobs.size;
			// A worker counts the steps that it gave to the slow lane as its own.
			else normalInFlight += Math.max(0, worker.directInflight - worker.relays.size);
		}
		return {
			normalInFlight,
			slowInFlight,
			slowWaiting: this.slowQueue.size,
			...this.counters,
			marks: this.lanes.size,
		};
	}

	/** Pings that the pool sent, and pongs that a worker answered; for tests and monitoring. */
	pingStats(): { sent: number; answered: number } {
		return { sent: this.pingsSent, answered: this.pongsAnswered };
	}

	/**
	 * What the pool itself holds, for tests and monitoring: its workers, the
	 * sockets that it keeps a copy of, the connections that wait for a worker,
	 * the hand-overs that a worker has not confirmed, and its own steps.
	 */
	state(): {
		workers: number;
		connections: number;
		pending: number;
		handovers: number;
		jobs: number;
	} {
		let connections = 0;
		let pending = 0;
		let handovers = 0;
		let jobs = 0;
		for (const worker of this.workers) {
			connections += worker.conns.size;
			pending += worker.pending.length;
			handovers += worker.handovers.size;
			jobs += worker.jobs.size;
		}
		return { workers: this.workers.length, connections, pending, handovers, jobs };
	}

	/** The memory of each pool worker, after a garbage collection where possible. */
	async memory(): Promise<WorkerMemory[]> {
		const live = this.workers.filter((w) => w.lane === 'normal' && !w.gone && w.ready);
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
		if (job.slow) {
			this.enqueueSlow(job);
			return;
		}
		let worker: PoolWorker | undefined;
		for (const w of this.workers) {
			if (w.lane === 'slow' || w.gone || w.draining) continue;
			if (!worker || w.jobs.size < worker.jobs.size) worker = w;
		}
		if (!worker) {
			job.resolve(failureBody(job.body, 'No fallback host worker is running', true));
			return;
		}
		this.send(worker, job);
	}

	/**
	 * Puts a step in the queue of the slow lane. A full queue is a limit: the
	 * step fails, and it can run again.
	 */
	private enqueueSlow(job: Job): void {
		job.key ??= keyOfBody(job.body);
		job.queuedAt = Date.now();
		this.counters.movedToSlow += 1;
		if (!this.slowQueue.push(workflowOfKey(job.key), job)) {
			if (job.bounce) {
				job.bounce();
				return;
			}
			this.counters.slowRejected += 1;
			job.resolve(
				failureBody(
					job.body,
					'The slow lane of the fallback host is full (limit); the step can run again',
					true,
				),
			);
			return;
		}
		this.pumpSlow();
	}

	/** Gives the steps that wait to the workers of the slow lane that run no step. */
	private pumpSlow(): void {
		for (const worker of this.workers) {
			if (this.slowQueue.size === 0) return;
			if (worker.lane !== 'slow' || !worker.ready || worker.jobs.size > 0) continue;
			if (worker.gone || worker.stopReason) continue;
			const job = this.slowQueue.shift();
			if (!job) return;
			worker.blockedInJob = false;
			this.send(worker, job);
		}
	}

	private send(target: PoolWorker, job: Job): void {
		target.jobs.set(job.seq, job);
		target.steps += 1;
		job.runner = target;
		const limit = this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS;
		if (target.lane === 'normal' && target.steps >= limit) {
			this.drain(target, `it ran ${target.steps} steps`);
		}
		// The clock starts when the worker has loaded its modules.
		if (target.ready) this.startClock(target, job);
		// A write to a worker that just stopped fails; its exit handler then
		// runs this job again.
		const data = target.data;
		if (data && !data.destroyed) data.write(workerFrame(job.seq, job.body));
	}

	private nextSeq(): number {
		this.seq = (this.seq + 1) % RELAY_JOB;
		// `CONTROL_JOB` and `RELAY_JOB` are no job numbers.
		if (this.seq === CONTROL_JOB) this.seq = 1;
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
		// The code of the step can still run there: the slow lane gets a new worker.
		if (worker.lane === 'slow') {
			this.verdict(job, true);
			this.stop(worker, 'its step timed out');
		}
	}

	/** Tells the workers of the normal lane the new marks of keys. */
	private broadcast(changes: Array<LaneChange | undefined>): void {
		for (const change of changes) {
			if (!change) continue;
			const frame = controlFrame({ control: 'lane', ...change });
			for (const worker of this.workers) {
				if (worker.lane === 'slow' || worker.gone) continue;
				const data = worker.data;
				if (data && !data.destroyed) data.write(frame);
			}
		}
	}

	private spawn(lane: 'normal' | 'slow'): PoolWorker {
		const child = fork(this.options.script, [], {
			execArgv: [`--max-old-space-size=${this.options.memoryMb}`, ...(this.options.execArgv ?? [])],
			env: {
				...process.env,
				// A worker enforces the step time limit on its runtime connections.
				[WORKER_DATA_ENV]: JSON.stringify({
					stepTimeoutMs: this.options.stepTimeoutMs,
					recycleSteps: this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS,
					...this.options.workerData,
					...(lane === 'slow' ? { lane } : {}),
					lagMs: this.options.lagMs ?? DEFAULT_LAG_MS,
					codeStartsSlow: this.options.codeStartsSlow !== false,
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
			lane,
			keys: new Set(),
			relays: new Map(),
			blockedInJob: false,
			moved: false,
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
			// A new worker of the normal lane gets the marks. It reads them before its first step.
			if (lane === 'normal') {
				for (const change of this.lanes.entries(Date.now())) {
					data.write(controlFrame({ control: 'lane', ...change }));
				}
			}
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
			case 'pong':
				// `seq` 0 is no answer: the worker says that it reached its step limit.
				if (message.seq > 0) this.pongsAnswered += 1;
				this.onPong(worker, message.rss, message.steps, message.inflight);
				return;
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
				if (worker.lane === 'slow') this.pumpSlow();
				return;
		}
	}

	/** The pool counts an answer of the CPU guard: the worker runs. */
	private onPong(worker: PoolWorker, rss: number, steps: number, inflight: number): void {
		worker.lastPong = Date.now();
		worker.rss = rss;
		worker.directSteps = steps;
		worker.directInflight = inflight;
		const limit = this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS;
		const total = worker.steps + worker.directSteps;
		if (worker.lane === 'normal' && total >= limit) this.drain(worker, `it ran ${total} steps`);
	}

	/** A worker says that synchronous code held its event loop for `ms`. */
	private onBlocked(worker: PoolWorker, ms: number, keys: string[], complete: boolean): void {
		this.counters.blockEvents += 1;
		this.counters.maxBlockMs = Math.max(this.counters.maxBlockMs, ms);
		// The slow lane runs one step at a time: that step is the cause.
		if (worker.lane === 'slow') worker.blockedInJob = true;
		else this.broadcast(this.lanes.suspects(keys, complete, false, Date.now()));
	}

	/**
	 * A service call of a step in the slow lane goes to the worker that has the
	 * runtime connection of the step, and the answer goes back (`service-calls.ts`).
	 */
	private onService(worker: PoolWorker, id: number, message: JsonObject): void {
		if (message.control === 'service') {
			const origin = worker.jobs.get(id)?.origin;
			if (origin && !origin.worker.gone) {
				writeControl(origin.worker, { ...message, id: origin.relay });
				return;
			}
			writeControl(worker, {
				control: 'serviceResult',
				id,
				ok: false,
				error: 'The service needs a runtime connection of protocol version 2; this step has none',
			});
			return;
		}
		const job = worker.relays.get(id);
		if (job?.runner && !job.runner.gone) writeControl(job.runner, { ...message, id: job.seq });
	}

	/**
	 * A worker gives a step to the slow lane:
	 * `<u32 relay><u8 wait><u16 key length><key><request JSON>`.
	 */
	private onRelay(worker: PoolWorker, frame: Buffer): void {
		if (frame.length < 7) return;
		const relay = frame.readUInt32LE(0);
		const wait = frame.readUInt8(4) === 1;
		const keyEnd = 7 + frame.readUInt16LE(5);
		if (frame.length < keyEnd) return;
		const key = frame.toString('utf8', 7, keyEnd);
		const answer = (response: Buffer) => {
			const data = worker.data;
			if (worker.gone || !data || data.destroyed) return;
			const header = Buffer.allocUnsafe(12);
			header.writeUInt32LE(8 + response.length, 0);
			header.writeUInt32LE(RELAY_JOB, 4);
			header.writeUInt32LE(relay, 8);
			data.write(header);
			if (response.length > 0) data.write(response);
		};
		const job: Job = {
			seq: this.nextSeq(),
			body: frame.subarray(keyEnd),
			key,
			slow: true,
			origin: { worker, relay },
			resolve: (response) => {
				worker.relays.delete(relay);
				answer(response);
			},
		};
		if (!wait) {
			job.bounce = () => job.resolve(Buffer.alloc(0));
			// One step shows if the key blocks. The next steps of the key wait for
			// that answer only. A key does not wait for the steps of other keys.
			if (!this.trying.has(key)) {
				if (this.slowQueue.size > 0 || !this.hasFreeSlowWorker()) {
					answer(Buffer.alloc(0));
					return;
				}
				this.trying.add(key);
			}
		}
		worker.relays.set(relay, job);
		this.dispatch(job);
	}

	/**
	 * A step ran alone in the slow lane, so the pool knows if its key blocks.
	 * The steps that waited for this answer go back to the normal lane when
	 * the key does not block.
	 */
	private verdict(job: Job, blocked: boolean): void {
		const key = job.key;
		if (key === undefined) return;
		this.broadcast([this.lanes.ran(key, blocked, Date.now())]);
		if (!this.trying.delete(key) || blocked) return;
		const waiting = this.slowQueue.remove((j) => j.bounce !== undefined && j.key === key);
		for (const other of waiting) other.bounce?.();
	}

	private hasFreeSlowWorker(): boolean {
		return this.workers.some(
			(w) => w.lane === 'slow' && w.ready && w.jobs.size === 0 && !w.gone && !w.stopReason,
		);
	}

	/** A control frame of a worker on the step socket: its answer to a ping. */
	private onControl(worker: PoolWorker, body: Buffer): void {
		let parsed: unknown;
		try {
			parsed = JSON.parse(body.toString('utf8'));
		} catch {
			this.stop(worker, 'it wrote a control frame that is not JSON');
			return;
		}
		if (!isJsonObject(parsed)) return;
		if (parsed.control === 'start') {
			if (typeof parsed.key === 'string' && worker.keys.size < MAX_WORKER_KEYS) {
				worker.keys.add(parsed.key);
			}
			return;
		}
		if (parsed.control === 'blocked') {
			const keys = Array.isArray(parsed.keys)
				? parsed.keys.filter((k) => typeof k === 'string')
				: [];
			const ms = typeof parsed.ms === 'number' ? parsed.ms : 0;
			this.onBlocked(worker, ms, keys, parsed.complete === true);
			return;
		}
		if (parsed.control === 'service' || parsed.control === 'serviceResult') {
			if (typeof parsed.id === 'number') this.onService(worker, parsed.id, parsed);
			return;
		}
		if (parsed.control !== 'pong') return;
		const { rss, steps, inflight } = parsed;
		if (Array.isArray(parsed.keys)) {
			worker.keys = new Set(parsed.keys.filter((k) => typeof k === 'string'));
		}
		if (typeof rss !== 'number' || typeof steps !== 'number' || typeof inflight !== 'number') {
			this.stop(worker, 'it wrote a control frame without its counts');
			return;
		}
		this.pongsAnswered += 1;
		this.onPong(worker, rss, steps, inflight);
	}

	/** A result frame of a worker: the job number, then the response JSON. */
	private onResult(worker: PoolWorker, frame: Buffer): void {
		// The decoder removed the length, so the frame starts with the job number.
		if (frame.length < 4) return;
		const seq = frame.readUInt32LE(0);
		if (seq === CONTROL_JOB) {
			this.onControl(worker, frame.subarray(4));
			return;
		}
		if (seq === RELAY_JOB) {
			this.onRelay(worker, frame.subarray(4));
			return;
		}
		const job = worker.jobs.get(seq);
		if (!job) return; // It timed out already.
		worker.jobs.delete(seq);
		clearTimeout(job.timer);
		job.resolve(frame.subarray(4));
		if (worker.lane === 'slow') this.afterSlowStep(worker, job);
		else if (worker.draining && worker.jobs.size === 0 && worker.conns.size === 0) {
			this.stop(worker, 'recycled');
		}
	}

	/** A step ended in the slow lane. */
	private afterSlowStep(worker: PoolWorker, job: Job): void {
		this.verdict(job, worker.blockedInJob);
		const steps = this.options.recycleSteps ?? DEFAULT_RECYCLE_STEPS;
		const rss = (this.options.recycleRssMb ?? DEFAULT_RECYCLE_RSS_MB) * 1024 * 1024;
		// It runs no step now. Its exit starts the new worker.
		if (worker.steps >= steps || worker.rss > rss) this.stop(worker, 'recycled');
		else this.pumpSlow();
	}

	/** Pings each worker and stops a worker that has not answered for too long. */
	private check(): void {
		const now = Date.now();
		const late = this.slowQueue.remove(
			(job) => now - (job.queuedAt ?? now) > this.options.stepTimeoutMs,
		);
		for (const job of late) {
			this.counters.slowRejected += 1;
			job.resolve(
				failureBody(
					job.body,
					`The step waited longer than ${this.options.stepTimeoutMs} ms for the slow lane (limit); the step can run again`,
					true,
				),
			);
		}
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
			// A step of the slow lane delays no other step: only its time limit stops it.
			if (worker.lane === 'normal' && now - worker.lastPong > this.options.blockedMs) {
				// Each key that ran in it can be the cause. The slow lane shows which one.
				worker.moved = true;
				this.counters.guardStops += 1;
				this.broadcast(
					this.lanes.suspects([...worker.keys], worker.keys.size < MAX_WORKER_KEYS, true, now),
				);
				this.stop(worker, `it did not answer for ${this.options.blockedMs} ms (a step blocks it)`);
				continue;
			}
			const rssLimit = (this.options.recycleRssMb ?? DEFAULT_RECYCLE_RSS_MB) * 1024 * 1024;
			if (worker.lane === 'normal' && !worker.draining && worker.rss > rssLimit) {
				this.drain(worker, `it uses ${Math.round(worker.rss / 1024 / 1024)} MB`);
			}
			this.ping(worker);
		}
	}

	private ping(worker: PoolWorker): void {
		const seq = ++worker.pingSeq;
		this.pingsSent += 1;
		const data = worker.data;
		if (data && !data.destroyed) {
			data.write(controlFrame({ control: 'ping', seq }));
			return;
		}
		// A worker without a step socket runs no step, but it still gets the check.
		const message: ToWorker = { type: 'ping', seq };
		if (worker.child.connected) worker.child.send(message, () => {});
	}

	/** Replace a worker: a new one takes the new steps, the old one ends its own. */
	private drain(worker: PoolWorker, reason: string): void {
		if (worker.draining || this.closed) return;
		worker.draining = true;
		this.options.log(`Recycling a worker: ${reason}.`);
		this.workers.push(this.spawn('normal'));
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
		closeConnectionsOf(worker, this.closed ? undefined : reason, worker.moved);
		// The steps that it gave to the slow lane and that still wait have no place for their answer.
		this.slowQueue.remove((j) => j.origin?.worker === worker);
		// A recycled worker of the normal lane has its replacement already.
		if (!this.closed && (worker.lane === 'slow' || !worker.draining)) {
			if (worker.lane === 'normal') {
				this.options.log(
					`A worker stopped: ${reason}. ${jobs.length + worker.directInflight} step(s) were in it, ${connCount} runtime connection(s).`,
				);
			}
			this.workers.push(this.spawn(worker.lane));
		}
		// Only a step that was alone in its worker is surely the cause.
		const sole = jobs.length === 1 && worker.abandoned === 0;
		for (const job of jobs) {
			clearTimeout(job.timer);
			if (this.closed) {
				job.resolve(failureBody(job.body, 'The fallback host is stopping', true));
			} else if (worker.lane === 'slow' || (sole && !worker.moved)) {
				// The step was alone in its worker, so it caused the stop.
				if (worker.lane === 'slow') this.verdict(job, true);
				job.resolve(failureBody(job.body, `The step stopped its host worker: ${reason}`));
			} else {
				// The key and the origin stay: the step is the same.
				this.dispatch({ ...job, seq: this.nextSeq(), slow: true, timer: undefined });
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

function closeConnectionsOf(worker: PoolWorker, reason: string | undefined, again: boolean): void {
	for (const socket of worker.conns.values()) {
		if (!socket) continue;
		if (reason === undefined || socket.destroyed || !socket.writable) {
			socket.destroy();
			continue;
		}
		socket.end(encodeFrame(workerLost(reason, again)), () => socket.destroy());
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

/** `<u32 length><u32 0><control JSON>`: a control frame for a worker. */
function controlFrame(body: ControlMessage): Buffer {
	const json = Buffer.from(JSON.stringify(body), 'utf8');
	const frame = Buffer.allocUnsafe(WORKER_FRAME_HEADER + json.length);
	frame.writeUInt32LE(4 + json.length, 0);
	frame.writeUInt32LE(CONTROL_JOB, 4);
	json.copy(frame, WORKER_FRAME_HEADER);
	return frame;
}

function writeControl(worker: PoolWorker, body: JsonObject): void {
	const data = worker.data;
	if (!data || data.destroyed) return;
	const json = Buffer.from(JSON.stringify(body), 'utf8');
	const header = Buffer.allocUnsafe(WORKER_FRAME_HEADER);
	header.writeUInt32LE(4 + json.length, 0);
	header.writeUInt32LE(CONTROL_JOB, 4);
	data.write(header);
	data.write(json);
}

/** The key of a request body (`lanes.ts`). A body that is not a request has the empty key. */
function keyOfBody(body: Buffer): string {
	try {
		const parsed: unknown = JSON.parse(body.toString('utf8'));
		if (!isJsonObject(parsed)) return laneKey(undefined, '');
		const { workflowId, step } = parsed;
		return laneKey(
			typeof workflowId === 'string' ? workflowId : undefined,
			typeof step === 'string' ? step : '',
		);
	} catch {
		return laneKey(undefined, '');
	}
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
