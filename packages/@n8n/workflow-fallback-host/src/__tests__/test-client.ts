import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { connect, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fileCredentialStore } from '../credentials';
import { disposeExpressionEngine } from '../node-step';
import { encodeFrame, FrameDecoder, type StepResponse } from '../protocol';
import { createFallbackServer } from '../server';
import type { WorkerPoolOptions } from '../worker-pool';
import { WorkerPool } from '../worker-pool';

const PACKAGE_ROOT = join(__dirname, '..', '..');

/**
 * The compiled host for the tests. It is not `dist/`: hosts that other
 * processes run from `dist/` must not change under them.
 */
export const TEST_BUILD_DIR = join(PACKAGE_ROOT, 'dist', 'test-build');

/** Compiles the host into `TEST_BUILD_DIR`. The worker processes run `step-worker.js` from it. */
export function buildHostForTests(): void {
	execFileSync(
		process.execPath,
		[
			join(require.resolve('typescript'), '..', '..', 'bin', 'tsc'),
			'-p',
			'tsconfig.build.json',
			'--noCheck',
			'--outDir',
			TEST_BUILD_DIR,
			'--tsBuildInfoFile',
			join(TEST_BUILD_DIR, 'tsconfig.build.tsbuildinfo'),
		],
		{ cwd: PACKAGE_ROOT },
	);
}

/** A minimal runtime-side client: it sends frames and collects responses by id. */
export class TestClient {
	private readonly decoder = new FrameDecoder();

	private readonly waiting = new Map<string, (response: StepResponse) => void>();

	readonly order: string[] = [];

	private constructor(private readonly socket: Socket) {
		socket.on('data', (chunk: Buffer) => {
			for (const body of this.decoder.push(chunk)) {
				const response = JSON.parse(body.toString('utf8')) as StepResponse;
				this.order.push(response.id);
				this.waiting.get(response.id)?.(response);
				this.waiting.delete(response.id);
			}
		});
	}

	static async connect(path: string): Promise<TestClient> {
		return await new Promise((resolve, reject) => {
			const socket = connect(path, () => resolve(new TestClient(socket)));
			socket.once('error', reject);
		});
	}

	/** Sends all requests in one write and waits for every response. */
	async sendBatch(requests: unknown[]): Promise<StepResponse[]> {
		const replies = requests.map(
			async (request) => await this.expect((request as { id: string }).id),
		);
		this.socket.write(Buffer.concat(requests.map(encodeFrame)));
		return await Promise.all(replies);
	}

	/** Sends raw bytes, such as a frame split across writes. */
	write(bytes: Buffer): void {
		this.socket.write(bytes);
	}

	async expect(id: string): Promise<StepResponse> {
		return await new Promise((resolve) => this.waiting.set(id, resolve));
	}

	close(): void {
		this.socket.end();
	}
}

export interface TestHost {
	socketPath: string;
	/** The worker pool, when the host has one. */
	pool: WorkerPool | undefined;
	credentialsPath: string;
	writeCredentials(value: unknown): void;
	stop(): Promise<void>;
}

/** Options of a test host whose steps run on a `WorkerPool` (`dist/step-worker.js`). */
export interface TestPoolOptions
	extends Partial<Omit<WorkerPoolOptions, 'script' | 'workerData' | 'log'>> {
	log?: (message: string) => void;
}

export async function startTestHost(
	codeTimeoutMs = 1_000,
	pool?: TestPoolOptions,
): Promise<TestHost> {
	const dir = mkdtempSync(join(tmpdir(), 'wf-fallback-'));
	const socketPath = join(dir, 'host.sock');
	const credentialsPath = join(dir, 'credentials.json');
	writeFileSync(credentialsPath, '{}');

	const runner = pool
		? new WorkerPool({
				script: join(TEST_BUILD_DIR, 'step-worker.js'),
				size: pool.size ?? 2,
				workerData: { credentialsFile: credentialsPath, codeTimeoutMs },
				stepTimeoutMs: pool.stepTimeoutMs ?? 30_000,
				blockedMs: pool.blockedMs ?? 5_000,
				memoryMb: pool.memoryMb ?? 1024,
				recycleSteps: pool.recycleSteps,
				recycleRssMb: pool.recycleRssMb,
				execArgv: pool.execArgv,
				log: pool.log ?? (() => {}),
			})
		: undefined;
	const server: Server = createFallbackServer({
		credentials: fileCredentialStore(credentialsPath),
		codeTimeoutMs,
		runner,
	});
	await new Promise<void>((resolve) => server.listen(socketPath, resolve));

	return {
		socketPath,
		pool: runner,
		credentialsPath,
		writeCredentials: (value) => writeFileSync(credentialsPath, JSON.stringify(value)),
		stop: async () => {
			// The pool first: its copies of runtime connections keep the server open.
			// The server first: a server that handed sockets to worker processes asks
			// them on close, and it never ends its close when they have all stopped.
			const closed = new Promise<void>((resolve) => server.close(() => resolve()));
			await runner?.close();
			await closed;
			await disposeExpressionEngine();
			rmSync(dir, { recursive: true, force: true });
		},
	};
}

type Frame = Record<string, unknown>;

/** The most connections that wfrt keeps to one host (`fallback_frames.zig`, `max_conns`). */
const MAX_CONNS = 8;

interface RuntimeStep {
	request: Frame;
	resolve: (response: StepResponse) => void;
	/** This run is the second, alone on its own connection. */
	alone: boolean;
}

interface RuntimeConn {
	socket: Socket;
	state: 'hello' | 'ready' | 'draining' | 'closed';
	steps: Map<string, RuntimeStep>;
	/** It runs one step that goes again alone, and takes no other. */
	alone: boolean;
	/** A step waits to go again alone: this one takes no new steps, so it becomes idle. */
	reserved: boolean;
	/** The reason of `worker_lost`, when the host sent one. */
	lostReason?: string;
}

/**
 * A client that does what wfrt does with a host of protocol version 2
 * (`hello.ts`, `workflow-runtime/src/shell/server.zig`):
 *
 * - It starts each connection with a hello, and keeps one connection for
 *   each worker of the answer (at most 8). A host without workers gets one.
 * - It sends each step on the open connection with the fewest steps.
 * - After `goaway`, it sends no new steps there. The connection closes when
 *   its last step has ended, and a new one takes its place.
 * - When a connection closes with steps on it after `worker_lost`, a step
 *   that was alone there fails with `The step stopped its host worker:
 *   <reason>`. Without `worker_lost` (the host stopped), that step fails as
 *   retryable. Each step of a connection with more steps goes again, alone
 *   on an idle connection.
 * - It answers the service calls of the steps with `onService`.
 */
export class RuntimeClient {
	private readonly conns: RuntimeConn[] = [];

	private target = 1;

	/** Connections that are being opened. */
	private opening = 0;

	/** Steps that wait to go again alone. */
	private readonly aloneQueue: RuntimeStep[] = [];

	/** New steps that wait for a connection that takes steps. */
	private readonly waiting: RuntimeStep[] = [];

	/** Answers to frames that the client did not send as steps (a bad frame). */
	private readonly expected = new Map<string, (response: StepResponse) => void>();

	private closing = false;

	/** Answers the service calls of steps (spec 9.9), as n8n does through wfrt. */
	onService: ((call: Frame) => Frame) | undefined;

	readonly serviceCalls: Frame[] = [];

	/** The `worker_lost` reasons that the host sent. */
	readonly lostReasons: string[] = [];

	/** How many connections closed after `goaway`. */
	recycled = 0;

	private constructor(private readonly path: string) {}

	static async connect(path: string): Promise<RuntimeClient> {
		const client = new RuntimeClient(path);
		const first = await client.open();
		await waitUntil(() => first.state !== 'hello', 30_000);
		await client.fill();
		return client;
	}

	/** The number of connections that take steps now. */
	get openConnections(): number {
		return this.conns.filter((c) => c.state === 'ready').length;
	}

	async send(request: unknown): Promise<StepResponse> {
		if (!isFrame(request)) throw new Error('A step request must be an object');
		return await new Promise((resolve) => {
			this.waiting.push({ request, resolve, alone: false });
			this.pump();
		});
	}

	async sendBatch(requests: unknown[]): Promise<StepResponse[]> {
		return await Promise.all(requests.map(async (r) => await this.send(r)));
	}

	/** Writes raw bytes on one connection; `expect` gets the answer. */
	writeRaw(bytes: Buffer): void {
		const conn = this.conns.find((c) => c.state === 'ready');
		if (!conn) throw new Error('No connection is open');
		conn.socket.write(bytes);
	}

	async expect(id: string): Promise<StepResponse> {
		return await new Promise((resolve) => this.expected.set(id, resolve));
	}

	close(): void {
		this.closing = true;
		for (const conn of this.conns) conn.socket.end();
	}

	private async open(): Promise<RuntimeConn> {
		this.opening++;
		const socket = await new Promise<Socket>((resolve, reject) => {
			const s = connect(this.path, () => resolve(s));
			s.once('error', reject);
		}).finally(() => this.opening--);
		// A connection that opens after `close` closes at once.
		if (this.closing) socket.end();
		const conn: RuntimeConn = {
			socket,
			state: 'hello',
			steps: new Map(),
			alone: false,
			reserved: false,
		};
		this.conns.push(conn);
		const decoder = new FrameDecoder();
		socket.on('data', (chunk: Buffer) => {
			for (const body of decoder.push(chunk)) this.onFrame(conn, body);
		});
		socket.on('error', () => {});
		socket.on('close', () => this.onClose(conn));
		socket.write(encodeFrame({ hello: { version: 2 } }));
		return conn;
	}

	/** `fill` after a connection closed. A host that has stopped refuses it; a test that waits for steps sees that. */
	private async refill(): Promise<void> {
		try {
			await this.fill();
		} catch {
			// The host is gone.
		}
	}

	/** Opens the connections that are missing, as wfrt does on each loop. */
	private async fill(): Promise<void> {
		while (!this.closing && this.conns.length + this.opening < this.target) {
			const conn = await this.open();
			await waitUntil(() => conn.state !== 'hello' || this.closing, 30_000);
		}
		this.pump();
	}

	private onFrame(conn: RuntimeConn, body: Buffer): void {
		const frame: unknown = JSON.parse(body.toString('utf8'));
		if (!isFrame(frame)) return;
		if (isFrame(frame.hello)) {
			conn.state = 'ready';
			const workers = typeof frame.hello.workers === 'number' ? frame.hello.workers : 0;
			this.target = Math.min(MAX_CONNS, Math.max(1, workers));
			return;
		}
		if (isFrame(frame.goaway)) {
			conn.state = 'draining';
			if (conn.steps.size === 0) this.retire(conn);
			return;
		}
		if (isFrame(frame.worker_lost)) {
			const reason = frame.worker_lost.reason;
			conn.lostReason = typeof reason === 'string' ? reason : 'no reason';
			this.lostReasons.push(conn.lostReason);
			return;
		}
		if (frame.type === 'service') {
			this.serviceCalls.push(frame);
			const answer = this.onService?.(frame) ?? { ok: false, error: 'no service here' };
			conn.socket.write(encodeFrame({ type: 'serviceResult', id: frame.id, ...answer }));
			return;
		}
		if (conn.state === 'hello') {
			// A host of version 1 answers the hello with an error: one connection.
			conn.state = 'ready';
			this.target = 1;
			return;
		}
		const id = String(frame.id);
		const response = frame as unknown as StepResponse;
		const step = conn.steps.get(id);
		if (!step) {
			this.expected.get(id)?.(response);
			this.expected.delete(id);
			return;
		}
		conn.steps.delete(id);
		if (step.alone) conn.alone = false;
		step.resolve(response);
		if (conn.state === 'draining' && conn.steps.size === 0) this.retire(conn);
		this.pump();
	}

	/** A connection after `goaway` with no step on it: close it and open a new one. */
	private retire(conn: RuntimeConn): void {
		this.recycled++;
		conn.state = 'closed';
		conn.socket.end();
		this.remove(conn);
		void this.refill();
	}

	private remove(conn: RuntimeConn): void {
		const index = this.conns.indexOf(conn);
		if (index >= 0) this.conns.splice(index, 1);
	}

	/** The blame rule of wfrt. */
	private onClose(conn: RuntimeConn): void {
		conn.state = 'closed';
		this.remove(conn);
		const steps = [...conn.steps.values()];
		conn.steps.clear();
		const sole = steps.length === 1 || steps.some((s) => s.alone);
		for (const step of steps) {
			if (sole && conn.lostReason !== undefined) {
				step.resolve({
					id: String(step.request.id),
					ok: false,
					error: `The step stopped its host worker: ${conn.lostReason}`,
				});
			} else if (sole) {
				// Nothing says that the step stopped its worker.
				step.resolve({
					id: String(step.request.id),
					ok: false,
					error: 'The fallback host connection closed before the step ended',
					retryable: true,
				});
			} else {
				this.aloneQueue.push({ ...step, alone: true });
			}
		}
		if (!this.closing) void this.refill();
	}

	/** Sends steps that go again alone first, each on an idle connection, then new steps. */
	private pump(): void {
		const ready = this.conns.filter((c) => c.state === 'ready' && !c.alone);
		for (const conn of ready) {
			if (this.aloneQueue.length === 0) break;
			if (conn.steps.size > 0) continue;
			const step = this.aloneQueue.shift();
			if (!step) break;
			conn.reserved = false;
			conn.alone = true;
			this.write(conn, step);
		}
		if (this.aloneQueue.length > 0 && !this.conns.some((c) => c.reserved)) {
			// No connection is idle: one takes no new steps until it is.
			const fewest = [...ready].sort((a, b) => a.steps.size - b.steps.size)[0];
			if (fewest) fewest.reserved = true;
		}
		if (this.aloneQueue.length === 0) for (const c of this.conns) c.reserved = false;
		for (;;) {
			const open = this.conns.filter((c) => c.state === 'ready' && !c.alone && !c.reserved);
			if (open.length === 0 || this.waiting.length === 0) return;
			const conn = open.reduce((a, b) => (b.steps.size < a.steps.size ? b : a));
			const step = this.waiting.shift();
			if (step) this.write(conn, step);
		}
	}

	private write(conn: RuntimeConn, step: RuntimeStep): void {
		conn.steps.set(String(step.request.id), step);
		conn.socket.write(encodeFrame(step.request));
	}
}

function isFrame(value: unknown): value is Frame {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function waitUntil(check: () => boolean, ms: number): Promise<void> {
	const deadline = Date.now() + ms;
	while (!check()) {
		if (Date.now() > deadline) throw new Error('The host did not answer in time');
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}
