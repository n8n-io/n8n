import type { Logger } from '@n8n/backend-common';
import type { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { SsrfProtectionService } from '../../ssrf';
import { startServer, type LocalServer } from '../local-server';
import { OutboundHttp } from '../outbound-http';

describe('OutboundHttp.requests keepAlive', () => {
	let server: LocalServer;
	const clientPorts: number[] = [];

	beforeAll(async () => {
		server = await startServer((req, res) => {
			clientPorts.push(req.socket.remotePort ?? 0);
			res.end('ok');
		});
	});

	afterAll(async () => {
		await server.close();
	});

	beforeEach(() => {
		clientPorts.length = 0;
	});

	async function sendTwice(keepAlive: boolean): Promise<void> {
		const outboundHttp = new OutboundHttp(
			mock<SsrfProtectionService>(),
			mock<SsrfProtectionConfig>({ enabled: false }),
			mock<Logger>(),
		);
		const client = outboundHttp.requests({
			useDefaultSsrfPolicy: 'unsafe',
			baseURL: server.url,
			keepAlive,
		});

		await client.request({ url: '/a', method: 'GET' });
		await client.request({ url: '/b', method: 'GET' });
	}

	it('sends sequential calls over one connection', async () => {
		await sendTwice(true);

		expect(new Set(clientPorts).size).toBe(1);
	});

	it('opens a connection per call without keepAlive', async () => {
		await sendTwice(false);

		expect(new Set(clientPorts).size).toBe(2);
	});
});
