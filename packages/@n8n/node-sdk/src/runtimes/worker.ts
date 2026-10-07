import { UnexpectedError, UserError } from 'n8n-workflow';
import path from 'node:path';
import { MessageChannel, Worker } from 'node:worker_threads';

import { connectLines, type GuestRuntime } from '../sandbox';

/** The worker guest that the package build writes (`scripts/node-guest.ts`). */
export const WORKER_GUEST = path.resolve(__dirname, '..', '..', 'dist', 'guest', 'worker.cjs');

/** The guest of `workerRuntime`. */
export interface WorkerOptions {
	/** The worker guest of both kinds. Default: `WORKER_GUEST`. */
	readonly guest?: string;
}

/**
 * One worker thread per session with the JS guest of the sandbox. It is a reliability tier, not a
 * security boundary: the guest shares the process, its permissions and the network with the host.
 * A crash or an out-of-memory error stops only the worker.
 */
export function workerRuntime({ guest = WORKER_GUEST }: WorkerOptions = {}): GuestRuntime {
	return {
		name: 'worker',
		async start({ kind, limits, manifest, bundleFile, sdk, grants }) {
			const { port1: port, port2 } = new MessageChannel();
			const signal = new Int32Array(new SharedArrayBuffer(4));
			const worker = new Worker(guest, {
				argv: [
					...['--kind', kind],
					...grants.flatMap((grant) => ['--grant', grant]),
					...['--bundle', bundleFile, '--bundle-sha256', manifest.bundleHash],
					...(sdk ? ['--sdk', sdk.file, '--sdk-sha256', sdk.sha256] : []),
					...['--node-contract', manifest.nodeContract],
				],
				env: {},
				// A worker gets the flags of the host by default, e.g. a loader that makes each start slow.
				execArgv: [],
				workerData: { port: port2, signal },
				transferList: [port2],
				resourceLimits: { maxOldGenerationSizeMb: limits.memoryMb },
			});

			const connection = connectLines(
				{
					write: (line) => {
						port.postMessage(line);
						Atomics.add(signal, 0, 1);
						Atomics.notify(signal, 0);
					},
					stop: () => {
						port.close();
						void worker.terminate();
					},
				},
				{ limits, label: manifest.id },
			);
			port.on('message', (line: unknown) => {
				if (typeof line === 'string') connection.receive(line);
			});
			worker.on('error', (error) =>
				connection.fail(
					'code' in error && error.code === 'ERR_WORKER_OUT_OF_MEMORY'
						? new UserError(
								`The bundle reached its memory limit of ${limits.memoryMb} MB and was stopped`,
							)
						: new UnexpectedError(`The sandbox stopped: ${error.message}`),
				),
			);
			worker.on('exit', (code) =>
				connection.fail(new UnexpectedError(`The sandbox stopped (exit ${code})`)),
			);
			return connection;
		},
	};
}
