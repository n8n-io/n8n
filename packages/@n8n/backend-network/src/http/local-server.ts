import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { promisify } from 'node:util';

export interface LocalServer {
	url: string;
	hostWithPort: string;
	captured: string[];
	clear: () => void;
	close: () => Promise<void>;
}

const LOOPBACK = '127.0.0.1';
export async function startServer(handler: http.RequestListener): Promise<LocalServer> {
	const captured: string[] = [];
	const server = http.createServer((req, res) => {
		captured.push(req.url ?? '');
		handler(req, res);
	});
	await new Promise<void>((resolve, reject) => {
		server.listen(0, LOOPBACK, resolve);
		server.on('error', reject);
	});
	const { port } = server.address() as AddressInfo;
	return {
		url: `http://${LOOPBACK}:${port}`,
		hostWithPort: `${LOOPBACK}:${port}`,
		captured,
		clear: () => {
			captured.length = 0;
		},
		close: async () => await promisify(server.close.bind(server))(),
	};
}
