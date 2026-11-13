import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { installSharedAgents } from '../http-pool';

/** A GET with a new agent for the request, as n8n's request helpers make it. */
async function get(port: number, agent: http.Agent): Promise<string> {
	return await new Promise((resolve, reject) => {
		http
			.get({ host: '127.0.0.1', port, path: '/', agent }, (res) => {
				let body = '';
				res.on('data', (chunk: Buffer) => (body += chunk.toString()));
				res.on('end', () => resolve(body));
			})
			.on('error', reject);
	});
}

describe('shared keep-alive agents', () => {
	let server: http.Server;
	let port = 0;
	let connections = 0;

	beforeAll(async () => {
		installSharedAgents({});
		server = http.createServer((_req, res) => res.end('ok'));
		server.on('connection', () => connections++);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterAll(async () => {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
	});

	beforeEach(() => {
		connections = 0;
	});

	it('sends requests with their own plain agents over one connection', async () => {
		expect(await get(port, new http.Agent())).toBe('ok');
		expect(await get(port, new http.Agent())).toBe('ok');
		expect(await get(port, new http.Agent())).toBe('ok');
		expect(connections).toBe(1);
	});

	it('keeps an agent with its own DNS lookup (the SSRF guard) on its own connections', async () => {
		const lookup: http.AgentOptions['lookup'] = (_host, _options, done) =>
			// Same answer as the system lookup; only the presence of the option matters.
			done(null, [{ address: '127.0.0.1', family: 4 }]);
		await get(port, new http.Agent({ lookup }));
		await get(port, new http.Agent({ lookup }));
		expect(connections).toBe(2);
	});

	it('keeps an agent of another class on its own connections', async () => {
		class OtherAgent extends http.Agent {}
		await get(port, new OtherAgent());
		await get(port, new OtherAgent());
		expect(connections).toBe(2);
	});
});
