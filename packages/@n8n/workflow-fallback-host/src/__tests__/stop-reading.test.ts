/**
 * `stopReading` (`worker-pool.ts`) uses Node.js internals: `_handle.readStop`
 * and the stream's `_read`. When a new Node.js removes them, the pool falls
 * back to the hand-over without a copy, and the runtime gets no
 * `worker_lost`. This test fails then, so the change does not stay unseen.
 */
import { connect, createServer, type Server, type Socket } from 'node:net';

import { stopReading } from '../worker-pool';

describe('stopReading', () => {
	let server: Server;
	let client: Socket;
	let accepted: Socket;

	beforeEach(async () => {
		const ready = new Promise<Socket>((resolve) => {
			server = createServer((socket) => resolve(socket));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		const address = server.address();
		const port = typeof address === 'object' && address ? address.port : 0;
		client = connect(port, '127.0.0.1');
		accepted = await ready;
	});

	afterEach(async () => {
		client.destroy();
		accepted.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('stops the reads of this Node.js version on an accepted socket', async () => {
		accepted.pause();
		// False means that `_handle.readStop` is gone: the pool then sends no `worker_lost`.
		expect(stopReading(accepted)).toBe(true);
		client.write(Buffer.alloc(1024, 1));
		await new Promise((resolve) => setTimeout(resolve, 100));
		// The bytes stay in the kernel for the process that serves the socket.
		expect(accepted.readableLength).toBe(0);
		expect(Reflect.get(Reflect.get(accepted, '_handle') ?? {}, 'reading')).toBe(false);
	});
});
