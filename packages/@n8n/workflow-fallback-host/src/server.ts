import { createServer, type Server, type Socket } from 'node:net';

import {
	DEFAULT_CODE_TIMEOUT_MS,
	messageOf,
	parseCodeStepArgs,
	runCodeStepAsync,
} from './code-step';
import type { CredentialStore } from './credentials';
import { replaceStaticData, staticDataOf, withStaticData } from './static-data';
import { frameCredentialStore } from './credentials';
import { readFrameExecution } from './urls';
import { helloAnswer, isHello } from './hello';
import type { NodeStepRunner } from './node-step';
import {
	DEFAULT_MAX_FRAME_BYTES,
	encodeFrame,
	FRAME_HEADER_BYTES,
	FrameDecoder,
	parseRequest,
	ProtocolError,
	type JsonObject,
	type StepRequest,
	type StepResponse,
} from './protocol';

export interface FallbackHostOptions {
	credentials: CredentialStore;
	/** The longest time that one code step can run, in milliseconds. */
	codeTimeoutMs?: number;
	maxFrameBytes?: number;
	log?: (message: string) => void;
	/**
	 * Runs the steps somewhere else, such as a `WorkerPool`. Without it, the
	 * server runs each step in its own process with a `StepHandler`.
	 */
	runner?: StepRunner;
	/**
	 * False: the server answers a version 2 hello as a version 1 host does,
	 * so the runtime sends all steps through this process. Default true.
	 */
	direct?: boolean;
}

/**
 * The node step module, loaded once. A dynamic `import()` for each step goes
 * through the module loader each time, which cost more than a simple node step.
 */
let nodeStepModule: Promise<typeof import('./node-step.js')> | undefined;

async function loadNodeStepModule(): Promise<typeof import('./node-step.js')> {
	nodeStepModule ??= import('./node-step.js');
	return await nodeStepModule;
}

export interface StepRunner {
	run(request: StepRequest): Promise<StepResponse>;
	/**
	 * Runs a step from the JSON body of a request frame and gives the JSON
	 * body of the response frame, also for a body that is not a valid request.
	 * With it, the server does not parse requests (`WorkerPool`).
	 */
	runFrame?(body: Buffer): Promise<Buffer>;
	/**
	 * Takes a runtime connection that sent a version 2 hello (`hello.ts`): a
	 * worker process reads and answers it from now on. `rest` holds the bytes
	 * that came after the hello. With it, the runtime connects to the workers
	 * without a hop through this process.
	 */
	adopt?(socket: Socket, rest: Buffer): void;
}

/**
 * Answers step requests. The host keeps no state between requests: each
 * request carries all that its step needs.
 */
export class StepHandler {
	private nodeRunner: Promise<NodeStepRunner> | undefined;

	constructor(private readonly options: FallbackHostOptions) {}

	async handle(request: StepRequest): Promise<StepResponse> {
		try {
			const statics = staticDataOf(request.args);
			const { value: result, staticData } = await withStaticData(statics, async () =>
				request.kind === 'code'
					? await this.runCode(request, statics)
					: await this.runNodeStep(request),
			);
			return { id: request.id, ok: true, result, ...(staticData ? { staticData } : {}) };
		} catch (error) {
			return { id: request.id, ok: false, error: messageOf(error) };
		}
	}

	/**
	 * A JavaScript code step gets the static data as JSON (its context has its
	 * own realm) and gives back the document it changed; it then replaces the
	 * working copy of `withStaticData`.
	 */
	private async runCode(request: StepRequest, statics: JsonObject | undefined) {
		const args = parseCodeStepArgs(request.args);
		const timeoutMs = this.options.codeTimeoutMs ?? DEFAULT_CODE_TIMEOUT_MS;
		if (args.language === 'python') {
			const { runPythonStep } = await import('./python-step.js');
			return runPythonStep(args, { timeoutMs });
		}
		if (!statics) return await runCodeStepAsync(args, { timeoutMs });
		return await runCodeStepAsync(
			{ ...args, staticData: statics },
			{ timeoutMs, onStaticData: replaceStaticData },
		);
	}

	private async runNodeStep(request: StepRequest) {
		const { parseNodeStepArgs } = await loadNodeStepModule();
		const args = parseNodeStepArgs(request.args);
		const runner = await this.loadNodeRunner();
		const credentials =
			request.credential || request.credentials
				? frameCredentialStore(request, args.credential, this.options.credentials)
				: undefined;
		return await runner.run(args, {
			step: request.step,
			key: request.key,
			credentials,
			execution: readFrameExecution(request.execution),
		});
	}

	/** Loads n8n-core and the node package on the first node step only. */
	private async loadNodeRunner(): Promise<NodeStepRunner> {
		this.nodeRunner ??= loadNodeStepModule().then(
			({ NodeStepRunner }) =>
				new NodeStepRunner({
					credentials: this.options.credentials,
					codeTimeoutMs: this.options.codeTimeoutMs,
				}),
		);
		return await this.nodeRunner;
	}
}

/**
 * Creates the socket server. Each connection can send many requests without
 * waiting. The server answers each request when its step ends, so answers can
 * come in any order.
 *
 * Without a `runner`, a code step runs on the event loop and blocks the
 * process until it ends or times out. `main.ts` gives a `WorkerPool`.
 */
export function createFallbackServer(options: FallbackHostOptions): Server {
	const handler = new StepHandler(options);
	const runner: StepRunner = options.runner ?? { run: async (r) => await handler.handle(r) };
	const log = options.log ?? (() => {});
	let connections = 0;
	const server = createServer((socket) =>
		serveConnection(socket, runner, options, log, (connections = (connections + 1) % 1e9)),
	);
	forgetStoppedWorkersOnClose(server);
	return server;
}

/**
 * A socket that the server hands to a worker process (`WorkerPool.adopt`) makes
 * Node.js close the server through its children: `close` asks each of them, and
 * it waits for their answers. Node.js drops a child from that list when it
 * stops. With no child left, the list is empty, and `close` then waits for
 * answers that never come: the host never stops cleanly. No socket is left in
 * that case, so the server can close as one without handed-over sockets.
 */
function forgetStoppedWorkersOnClose(server: Server): void {
	const state = server as unknown as { _usingWorkers?: boolean; _workers?: unknown[] };
	const close = server.close.bind(server);
	server.close = (done?: (error?: Error) => void) => {
		if (state._usingWorkers === true && (state._workers?.length ?? 0) === 0) {
			state._usingWorkers = false;
		}
		return close(done);
	};
}

function serveConnection(
	socket: Socket,
	handler: StepRunner,
	options: FallbackHostOptions,
	log: (message: string) => void,
	connection: number,
): void {
	const decoder = new FrameDecoder(options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES);

	const reply = (response: StepResponse) => {
		if (socket.destroyed || !socket.writable) return;
		socket.write(encodeFrame(response));
	};

	/** Writes a response body that the runner encoded already. */
	const replyBody = (body: Buffer) => {
		if (socket.destroyed || !socket.writable) return;
		const frame = Buffer.allocUnsafe(FRAME_HEADER_BYTES + body.length);
		frame.writeUInt32LE(body.length, 0);
		body.copy(frame, FRAME_HEADER_BYTES);
		socket.write(frame);
	};
	const runFrame = handler.runFrame?.bind(handler);
	let first = true;

	const onData = (chunk: Buffer) => {
		let bodies: Buffer[];
		try {
			bodies = decoder.push(chunk);
		} catch (error) {
			// The stream is corrupt, so no later frame boundary can be trusted.
			log(`Closing connection: ${messageOf(error)}`);
			socket.destroy();
			return;
		}

		for (const [index, body] of bodies.entries()) {
			if (first) {
				first = false;
				if (isHello(body) && options.direct !== false) {
					if (handler.adopt) {
						// A worker takes the connection, with the bytes that came after the hello.
						socket.off('data', onData);
						socket.pause();
						handler.adopt(socket, restAfter(bodies.slice(index + 1), decoder.takeRest()));
						return;
					}
					// Steps run in this process (`--workers 0`): one connection, as in version 1.
					socket.write(encodeFrame({ hello: helloAnswer(0, 0) }));
					continue;
				}
			}
			if (runFrame) {
				// The runner parses the request and answers with the request's own id.
				void runFrame(body).then(replyBody);
				continue;
			}
			let request: StepRequest;
			try {
				request = parseRequest(body);
			} catch (error) {
				const id = error instanceof ProtocolError ? (error.requestId ?? '') : '';
				reply({ id, ok: false, error: messageOf(error) });
				continue;
			}
			// Ids are unique on one connection only: several runtime processes can
			// share the host, and the worker pool keys its steps by id.
			const id = request.id;
			void handler
				.run({ ...request, id: `${connection}/${id}` })
				.then((response) => reply({ ...response, id }));
		}
	};
	socket.on('data', onData);

	socket.on('error', (error) => log(`Connection error: ${error.message}`));
}

/** Whole frames again, then the bytes of a frame that is not complete yet. */
function restAfter(bodies: Buffer[], pending: Buffer): Buffer {
	const parts: Buffer[] = [];
	for (const body of bodies) {
		const header = Buffer.allocUnsafe(FRAME_HEADER_BYTES);
		header.writeUInt32LE(body.length, 0);
		parts.push(header, body);
	}
	parts.push(pending);
	return Buffer.concat(parts);
}
