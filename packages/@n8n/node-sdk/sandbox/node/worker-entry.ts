// The entry of `dist/guest/worker.cjs`: the guest of both kinds in a worker thread of the host.
// The host posts each line on `port` and then increments `signal`, so `receive` can block.
import { MessagePort, receiveMessageOnPort, workerData } from 'node:worker_threads';

import { guestArgsOf, runGuest, type SyncTransport } from './transport';

const data: unknown = workerData;
if (
	typeof data !== 'object' ||
	data === null ||
	!('port' in data && data.port instanceof MessagePort) ||
	!('signal' in data && data.signal instanceof Int32Array)
) {
	throw new Error('The worker guest needs a port and a signal in workerData');
}
const { port, signal } = data;

const transport: SyncTransport = {
	receive() {
		for (;;) {
			// Read the signal first: a line that comes after the read changes it, so the wait ends.
			const seen = Atomics.load(signal, 0);
			const received = receiveMessageOnPort(port);
			if (received !== undefined) {
				return typeof received.message === 'string' ? received.message : undefined;
			}
			Atomics.wait(signal, 0, seen);
		}
	},
	send(line) {
		port.postMessage(line);
	},
};

void runGuest(transport, guestArgsOf(process.argv.slice(2)));
