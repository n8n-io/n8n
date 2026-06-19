import express from 'express';
import { mock } from 'jest-mock-extended';
import type { AddressInfo, Socket } from 'net';
import { createServer, type Server as HttpServer, get as httpGet } from 'node:http';
import { WebSocket } from 'ws';

import { BrowserUseServer } from '../browser/browser-use-server';
import {
	CDP_TOKEN_HEADER,
	type BrowserUseUpgradeRequest,
} from '../browser/browser-use-ws.constants';
import type { InstanceAiBrowserSessionService } from '../browser/instance-ai-browser-session.service';

describe('BrowserUseServer', () => {
	const sessionService = mock<InstanceAiBrowserSessionService>();
	let server: HttpServer;
	let port: number;
	const clients: WebSocket[] = [];
	const sockets = new Set<Socket>();

	function connect(path: string, headers?: Record<string, string>): WebSocket {
		const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
		ws.on('error', () => {});
		clients.push(ws);
		return ws;
	}

	beforeAll(async () => {
		const app = express();
		server = createServer(app);
		server.on('connection', (socket) => {
			sockets.add(socket);
			socket.on('close', () => sockets.delete(socket));
		});
		new BrowserUseServer(sessionService).setup(server, app);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterEach(() => {
		for (const ws of clients.splice(0)) ws.terminate();
	});

	afterAll(async () => {
		for (const socket of sockets) socket.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('routes a /browser-use/extension upgrade to handleExtensionUpgrade', async () => {
		const received = new Promise<BrowserUseUpgradeRequest>((resolve) => {
			sessionService.handleExtensionUpgrade.mockImplementation((req) => resolve(req));
		});

		connect('/browser-use/extension/sess-1?token=abc');

		const req = await received;
		expect(req.params.sessionId).toBe('sess-1');
		expect(req.query.token).toBe('abc');
		expect(req.ws).toBeDefined();
		expect(sessionService.handleCdpUpgrade).not.toHaveBeenCalled();
	});

	it('routes a /browser-use/cdp upgrade to handleCdpUpgrade with the token header', async () => {
		const received = new Promise<BrowserUseUpgradeRequest>((resolve) => {
			sessionService.handleCdpUpgrade.mockImplementation((req) => resolve(req));
		});

		connect('/browser-use/cdp/sess-2', { [CDP_TOKEN_HEADER]: 'cdp-token' });

		const req = await received;
		expect(req.params.sessionId).toBe('sess-2');
		expect(req.headers[CDP_TOKEN_HEADER]).toBe('cdp-token');
		expect(sessionService.handleExtensionUpgrade).not.toHaveBeenCalled();
	});

	it('ignores upgrades outside the /browser-use namespace', async () => {
		const ws = connect('/rest/push');

		const opened = await new Promise<boolean>((resolve) => {
			ws.on('open', () => resolve(true));
			ws.on('error', () => resolve(false));
			setTimeout(() => resolve(false), 200);
		});

		expect(opened).toBe(false);
		expect(sessionService.handleExtensionUpgrade).not.toHaveBeenCalled();
		expect(sessionService.handleCdpUpgrade).not.toHaveBeenCalled();
	});

	it('responds 426 to a plain HTTP request on a browser-use route', async () => {
		const status = await new Promise<number>((resolve, reject) => {
			httpGet(`http://127.0.0.1:${port}/browser-use/extension/sess-3`, (res) => {
				res.resume();
				resolve(res.statusCode ?? 0);
			}).on('error', reject);
		});

		expect(status).toBe(426);
		expect(sessionService.handleExtensionUpgrade).not.toHaveBeenCalled();
	});
});
