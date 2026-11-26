import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface RecordingProxy {
	url: string;
	host: string;
	port: number;
	received: Array<{ url?: string; headers: IncomingHttpHeaders }>;
	close: () => Promise<void>;
}

export async function startRecordingProxy(): Promise<RecordingProxy> {
	const received: RecordingProxy['received'] = [];
	const server = createServer((req, res) => {
		received.push({ url: req.url, headers: req.headers });
		res.end('ok');
	});
	const host = '127.0.0.1';
	await new Promise<void>((resolve) => server.listen(0, host, resolve));
	const { port } = server.address() as AddressInfo;

	return {
		url: `http://${host}:${port}`,
		host,
		port,
		received,
		close: async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
		},
	};
}
