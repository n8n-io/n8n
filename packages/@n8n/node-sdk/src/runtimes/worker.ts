import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError, UserError } from 'n8n-workflow';
import path from 'node:path';
import { MessageChannel, Worker } from 'node:worker_threads';

import type { Connection, GuestRuntime } from '../sandbox';

/** The worker guest that the package build writes (`scripts/node-guest.ts`). */
export const WORKER_GUEST = path.resolve(__dirname, '..', '..', 'dist', 'guest', 'worker.cjs');

/** The guest of `workerRuntime`. */
export interface WorkerOptions {
	/** The worker guest of both kinds. Default: `WORKER_GUEST`. */
	readonly guest?: string;
}

type GuestCalls = Parameters<Connection['serve']>[0];

/**
 * One worker thread per session with the JS guest of the sandbox. It is a reliability tier, not a
 * security boundary: the guest shares the process, its permissions and the network with the host.
 * A crash or an out-of-memory error stops only the worker.
 */
export function workerRuntime({ guest = WORKER_GUEST }: WorkerOptions = {}): GuestRuntime {
	return {
		name: 'worker',
		async start({ kind, limits, manifest, bundleFile, grants }) {
			const { port1: port, port2 } = new MessageChannel();
			const signal = new Int32Array(new SharedArrayBuffer(4));
			const worker = new Worker(guest, {
				argv: [
					...['--kind', kind],
					...grants.flatMap((grant) => ['--grant', grant]),
					...['--bundle', bundleFile, '--bundle-sha256', manifest.bundleHash],
					...['--node-contract', manifest.nodeContract],
				],
				env: {},
				// A worker gets the flags of the host by default, e.g. a loader that makes each start slow.
				execArgv: [],
				workerData: { port: port2, signal },
				transferList: [port2],
				resourceLimits: { maxOldGenerationSizeMb: limits.memoryMb },
			});

			const pending = new Map<
				number,
				{ resolve(value: unknown): void; reject(error: Error): void }
			>();
			const state: { next: number; failure?: Error; calls?: GuestCalls; wall?: NodeJS.Timeout } = {
				next: 1,
			};
			const fail = (error: Error) => {
				state.failure ??= error;
				pending.forEach(({ reject }) => reject(error));
				pending.clear();
				clearTimeout(state.wall);
				port.close();
				void worker.terminate();
			};
			const send = (message: Record<string, unknown>) => {
				if (state.failure) return;
				port.postMessage(JSON.stringify({ jsonrpc: '2.0', ...message }));
				Atomics.add(signal, 0, 1);
				Atomics.notify(signal, 0);
			};
			const answer = async (id: unknown, method: string, params: Record<string, unknown>) => {
				try {
					if (!state.calls)
						throw Object.assign(new Error(`${method} has no run`), { code: -32601 });
					const result = await state.calls(method, params);
					if (id !== undefined) send({ id, result: result ?? null });
				} catch (error) {
					if (id === undefined) return;
					// The host throws its JSON-RPC errors with a numeric `code` and the error value as `data`.
					const rpc = isRecord(error) && typeof error.code === 'number' ? error : undefined;
					const message = error instanceof Error ? error.message : String(error);
					send({ id, error: { code: rpc?.code ?? -32603, message, data: rpc?.data } });
				}
			};
			const receive = (line: string) => {
				const message: unknown = JSON.parse(line);
				if (!isRecord(message)) {
					throw new UnexpectedError('The sandbox sent a message that is not an object');
				}
				if (typeof message.method === 'string') {
					void answer(message.id, message.method, isRecord(message.params) ? message.params : {});
					return;
				}
				const waiting = typeof message.id === 'number' ? pending.get(message.id) : undefined;
				if (!waiting || typeof message.id !== 'number') return;
				pending.delete(message.id);
				if (isRecord(message.error)) {
					const text = typeof message.error.message === 'string' ? message.error.message : 'error';
					waiting.reject(
						Object.assign(new UserError(text), {
							code: message.error.code,
							data: message.error.data,
						}),
					);
				} else {
					waiting.resolve(message.result);
				}
			};

			port.on('message', (line: unknown) => {
				if (typeof line !== 'string') return;
				if (line.length > limits.maxMessageBytes) {
					fail(
						new UserError(
							`${manifest.id} gave a message larger than ${limits.maxMessageBytes} bytes`,
						),
					);
					return;
				}
				try {
					receive(line);
				} catch (error) {
					fail(error instanceof Error ? error : new UnexpectedError(String(error)));
				}
			});
			worker.on('error', (error) =>
				fail(
					'code' in error && error.code === 'ERR_WORKER_OUT_OF_MEMORY'
						? new UserError(
								`The bundle reached its memory limit of ${limits.memoryMb} MB and was stopped`,
							)
						: new UnexpectedError(`The sandbox stopped: ${error.message}`),
				),
			);
			worker.on('exit', (code) => fail(new UnexpectedError(`The sandbox stopped (exit ${code})`)));

			return {
				async request(method, params) {
					if (state.failure) throw state.failure;
					// The wall clock starts at the first request, so a prestarted guest loses no run time.
					state.wall ??= setTimeout(
						() =>
							fail(
								new UserError(`${manifest.id} ran longer than ${limits.wallMs} ms and was stopped`),
							),
						limits.wallMs,
					);
					const id = state.next++;
					const result = new Promise<unknown>((resolve, reject) =>
						pending.set(id, { resolve, reject }),
					);
					send({ id, method, params });
					return await result;
				},
				notify(method, params) {
					send({ method, params });
				},
				serve(calls) {
					// The guest calls carry no run, so one connection runs one run at a time.
					if (state.calls) throw new UnexpectedError(`${manifest.id} runs one run at a time`);
					state.calls = calls;
					return () => {
						const served = state.calls !== undefined;
						state.calls = undefined;
						return served;
					};
				},
				close() {
					fail(new UnexpectedError('The sandbox is closed'));
				},
			};
		},
	};
}
