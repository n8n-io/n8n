import type { Server } from 'node:http';

/**
 * Moves the test server to 127.0.0.1, the address that supertest sends requests to.
 * A server on the wildcard address can get a port that another local process already
 * listens on at 127.0.0.1 (seen on macOS). The requests then go to that process.
 * A server on 127.0.0.1 cannot share the port, so every request reaches n8n.
 * Use it with `reuseServer: true`, so that the agents send requests to this server.
 */
export async function listenOnLoopback(server: Server): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()));
	});
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject);
			resolve();
		});
	});
}
