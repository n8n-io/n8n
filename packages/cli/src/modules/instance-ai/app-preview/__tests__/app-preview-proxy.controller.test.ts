import type { WorkspaceFilesystem } from '@n8n/agents';
import type { User, UserRepository } from '@n8n/db';
import express from 'express';
import type { AddressInfo, Socket } from 'node:net';
import { createServer, request, type IncomingMessage, type Server as HttpServer } from 'node:http';
import { mock } from 'vitest-mock-extended';
import { WebSocket, WebSocketServer } from 'ws';

import { userHasScopes } from '@/permissions.ee/check-access';

import { AppPreviewProxyController } from '../app-preview-proxy.controller';
import type {
	AppPreviewBuiltEntry,
	AppPreviewDevEntry,
	AppPreviewService,
} from '../app-preview.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const LIVE_TOKEN = 'live-token';

describe('AppPreviewProxyController', () => {
	const appPreviewService = mock<AppPreviewService>();
	const userRepository = mock<UserRepository>();
	const upstreamRequests: IncomingMessage[] = [];
	const sockets = new Set<Socket>();
	let upstream: HttpServer;
	let upstreamWs: WebSocketServer;
	let server: HttpServer;
	let baseUrl: string;
	let entry: AppPreviewDevEntry;

	beforeAll(async () => {
		upstream = createServer((req, res) => {
			upstreamRequests.push(req);
			const isHtml = req.url?.endsWith('/') ?? false;
			res.writeHead(200, {
				'Content-Type': isHtml ? 'text/html' : 'application/javascript',
				'Content-Security-Policy': "default-src 'self'",
				'X-Frame-Options': 'DENY',
				'Set-Cookie': 'upstream=1',
			});
			res.end(isHtml ? '<html></html>' : 'export {}');
		});
		upstreamWs = new WebSocketServer({ server: upstream });
		upstreamWs.on('connection', (ws, req) => {
			upstreamRequests.push(req);
			ws.send('connected');
		});
		await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
		const upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
		entry = {
			kind: 'dev',
			token: LIVE_TOKEN,
			jti: 'jti-1',
			sandboxId: 'sandbox-1',
			sandbox: { url: upstreamUrl, apiKey: 'sandbox-key' },
			appId: 'app-1',
			projectId: 'project-1',
			namespace: 'greeter',
			port: 5173,
			userId: 'user-1',
			startedAt: new Date(),
			expiresAt: new Date(Date.now() + 60_000),
		};

		const controller = new AppPreviewProxyController(appPreviewService, userRepository);
		const app = express();
		app.use(
			'/apps-preview',
			express.Router().use(async (req, res, next) => await controller.handle(req, res, next)),
		);
		server = createServer(app);
		server.on('connection', (socket) => {
			sockets.add(socket);
			socket.on('close', () => sockets.delete(socket));
		});
		controller.setupUpgrade(server);
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => {
		for (const socket of sockets) socket.destroy();
		upstreamWs.close();
		await Promise.all([
			new Promise<void>((resolve) => server.close(() => resolve())),
			new Promise<void>((resolve) => upstream.close(() => resolve())),
		]);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		upstreamRequests.length = 0;
		appPreviewService.resolveToken.mockImplementation((token) =>
			token === LIVE_TOKEN ? entry : undefined,
		);
		userRepository.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user-1' }));
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	const get = async (path: string, headers: Record<string, string> = {}) =>
		await fetch(`${baseUrl}${path}`, { headers, redirect: 'manual' });

	/** `fetch` normalizes dot segments away; this sends the path as is. */
	const getRaw = async (path: string) =>
		await new Promise<IncomingMessage>((resolve, reject) => {
			const { hostname, port } = new URL(baseUrl);
			request({ hostname, port, path, method: 'GET' }, (response) => {
				response.resume();
				resolve(response);
			})
				.on('error', reject)
				.end();
		});

	it('answers 404 without a live token', async () => {
		const response = await get('/apps-preview/unknown/src/main.ts', { cookie: 'n8n-auth=secret' });

		expect(response.status).toBe(404);
		expect(upstreamRequests).toHaveLength(0);
	});

	it('answers 404 for the bare prefix', async () => {
		expect((await get('/apps-preview')).status).toBe(404);
		expect((await get('/apps-preview/')).status).toBe(404);
	});

	it.each([
		'/../../sandboxes/other/exec',
		'/src/..%2F..%2F..%2Fsandboxes/other/exec',
		'/%2e%2e/%2e%2e/sandboxes/other/exec',
		'/src/.%2e/..',
		'/%zz',
	])(
		'answers 404 without proxying when the path climbs out of the token prefix (%s)',
		async (suffix) => {
			const response = await getRaw(`/apps-preview/${LIVE_TOKEN}${suffix}`);

			expect(response.statusCode).toBe(404);
			expect(upstreamRequests).toHaveLength(0);
		},
	);

	it('proxies a path with a dot segment that stays inside the token prefix', async () => {
		const response = await getRaw(`/apps-preview/${LIVE_TOKEN}/src/./main.ts`);

		expect(response.statusCode).toBe(200);
		expect(upstreamRequests[0].url).toBe(
			`/sandboxes/sandbox-1/ports/5173/apps-preview/${LIVE_TOKEN}/src/./main.ts`,
		);
	});

	it('redirects the slash-less token URL to the slashed form', async () => {
		const response = await get(`/apps-preview/${LIVE_TOKEN}?x=1`);

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe(`/apps-preview/${LIVE_TOKEN}/?x=1`);
		expect(upstreamRequests).toHaveLength(0);
	});

	it('proxies under the sandbox port route with the API key and without the cookie', async () => {
		const response = await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts?t=1`, {
			cookie: 'n8n-auth=secret',
			authorization: 'Bearer secret',
		});

		expect(response.status).toBe(200);
		expect(upstreamRequests).toHaveLength(1);
		const [proxied] = upstreamRequests;
		expect(proxied.url).toBe(
			`/sandboxes/sandbox-1/ports/5173/apps-preview/${LIVE_TOKEN}/src/main.ts?t=1`,
		);
		expect(proxied.headers['x-api-key']).toBe('sandbox-key');
		expect(proxied.headers.cookie).toBeUndefined();
		expect(proxied.headers.authorization).toBeUndefined();
		expect(proxied.headers.host).toBe(new URL(entry.sandbox.url).host);
	});

	it('replaces the upstream CSP and strips X-Frame-Options and Set-Cookie', async () => {
		const response = await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts`);

		expect(response.headers.get('content-security-policy')).toMatch(/^sandbox /);
		expect(response.headers.get('x-frame-options')).toBeNull();
		expect(response.headers.get('set-cookie')).toBeNull();
		expect(response.headers.get('referrer-policy')).toBeNull();
	});

	it('sets Referrer-Policy on HTML and re-checks project access for the document', async () => {
		const response = await get(`/apps-preview/${LIVE_TOKEN}/`, { accept: 'text/html' });

		expect(response.status).toBe(200);
		expect(response.headers.get('referrer-policy')).toBe('no-referrer');
		expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
		expect(userHasScopes).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'user-1' }),
			['app:read'],
			false,
			{
				projectId: 'project-1',
			},
		);
	});

	it('answers 404 for the document when the minting user lost app:read', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);

		const response = await get(`/apps-preview/${LIVE_TOKEN}/`, { accept: 'text/html' });

		expect(response.status).toBe(404);
		expect(upstreamRequests).toHaveLength(0);
	});

	it('does not re-check access for module requests', async () => {
		await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts`, { accept: '*/*' });

		expect(userHasScopes).not.toHaveBeenCalled();
	});

	it('proxies the WebSocket upgrade with the API key and without the cookie', async () => {
		const ws = new WebSocket(
			`${baseUrl.replace('http', 'ws')}/apps-preview/${LIVE_TOKEN}/?token=vite`,
			'vite-hmr',
			{
				headers: { cookie: 'n8n-auth=secret' },
			},
		);
		const message = await new Promise<string>((resolve, reject) => {
			ws.on('message', (data) => resolve(String(data)));
			ws.on('error', reject);
		});
		ws.close();

		expect(message).toBe('connected');
		const [upgrade] = upstreamRequests;
		expect(upgrade.url).toBe(
			`/sandboxes/sandbox-1/ports/5173/apps-preview/${LIVE_TOKEN}/?token=vite`,
		);
		expect(upgrade.headers['x-api-key']).toBe('sandbox-key');
		expect(upgrade.headers.cookie).toBeUndefined();
		expect(upgrade.headers['sec-websocket-protocol']).toBe('vite-hmr');
	});

	it('destroys the socket on an upgrade with a bad token', async () => {
		const ws = new WebSocket(
			`${baseUrl.replace('http', 'ws')}/apps-preview/bad-token/`,
			'vite-hmr',
		);
		const outcome = await new Promise<string>((resolve) => {
			ws.on('open', () => resolve('open'));
			ws.on('error', () => resolve('error'));
			ws.on('close', () => resolve('close'));
		});

		expect(outcome).not.toBe('open');
		expect(upstreamRequests).toHaveLength(0);
	});

	it('leaves upgrades outside the preview prefix to other listeners', async () => {
		const seen = new Promise<void>((resolve) => server.once('upgrade', () => resolve()));
		const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/rest/push`);
		ws.on('error', () => {});
		await seen;

		expect(appPreviewService.resolveToken).not.toHaveBeenCalled();
		ws.terminate();
	});

	it('marks the entry dead when the upstream reports a restarted sandbox', async () => {
		const restartedUpstream = createServer((_req, res) => {
			res.writeHead(409, { 'X-Sandbox-Restarted': '1' });
			res.end();
		});
		await new Promise<void>((resolve) => restartedUpstream.listen(0, '127.0.0.1', resolve));
		const restartedEntry = {
			...entry,
			sandbox: { url: `http://127.0.0.1:${(restartedUpstream.address() as AddressInfo).port}` },
		};
		appPreviewService.resolveToken.mockReturnValue(restartedEntry);

		const response = await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts`);

		expect(response.status).toBe(409);
		expect(appPreviewService.markDead).toHaveBeenCalledWith(restartedEntry);
		await new Promise<void>((resolve) => restartedUpstream.close(() => resolve()));
	});

	it('relays an upstream 502 without marking the entry dead', async () => {
		const flakyUpstream = createServer((_req, res) => {
			res.writeHead(502);
			res.end();
		});
		await new Promise<void>((resolve) => flakyUpstream.listen(0, '127.0.0.1', resolve));
		appPreviewService.resolveToken.mockReturnValue({
			...entry,
			sandbox: { url: `http://127.0.0.1:${(flakyUpstream.address() as AddressInfo).port}` },
		});

		const response = await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts`);

		expect(response.status).toBe(502);
		expect(appPreviewService.markDead).not.toHaveBeenCalled();
		await new Promise<void>((resolve) => flakyUpstream.close(() => resolve()));
	});

	it('answers 502 and marks the entry dead when the upstream refuses the connection', async () => {
		const closed = createServer();
		await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
		const { port } = closed.address() as AddressInfo;
		await new Promise<void>((resolve) => closed.close(() => resolve()));
		const deadEntry = { ...entry, sandbox: { url: `http://127.0.0.1:${port}` } };
		appPreviewService.resolveToken.mockReturnValue(deadEntry);

		const response = await get(`/apps-preview/${LIVE_TOKEN}/src/main.ts`);

		expect(response.status).toBe(502);
		expect(appPreviewService.markDead).toHaveBeenCalledWith(deadEntry);
	});

	describe('built preview', () => {
		const readFile = vi.fn<(path: string) => Promise<Buffer>>();
		const files: Record<string, string> = {
			'apps/greeter/.n8n-preview-dist/index.html': '<html>built</html>',
			'apps/greeter/.n8n-preview-dist/assets/index-abc.js': 'export {}',
			'apps/greeter/.n8n-preview-dist/assets/logo.svg': '<svg/>',
		};
		const filesystem = { readFile } as unknown as WorkspaceFilesystem;
		let builtEntry: AppPreviewBuiltEntry;

		beforeEach(() => {
			const { sandbox: _sandbox, port: _port, kind: _kind, ...base } = entry;
			builtEntry = {
				...base,
				kind: 'built',
				buildSeq: 3,
				builtAt: new Date(),
				dist: { filesystem, dir: 'apps/greeter/.n8n-preview-dist' },
			};
			appPreviewService.resolveToken.mockImplementation((token) =>
				token === LIVE_TOKEN ? builtEntry : undefined,
			);
			readFile.mockImplementation(async (path) => {
				const content = files[path];
				if (content === undefined) throw new Error(`ENOENT: ${path}`);
				return await Promise.resolve(Buffer.from(content));
			});
		});

		it('serves index.html from the sandbox filesystem with the sandbox CSP and no caching', async () => {
			const response = await get(`/apps-preview/${LIVE_TOKEN}/?b=3`, { accept: 'text/html' });

			expect(response.status).toBe(200);
			expect(await response.text()).toBe('<html>built</html>');
			expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
			expect(response.headers.get('content-security-policy')).toMatch(/^sandbox /);
			expect(response.headers.get('cache-control')).toBe('no-cache');
			expect(response.headers.get('referrer-policy')).toBe('no-referrer');
			expect(response.headers.get('set-cookie')).toBeNull();
			expect(readFile).toHaveBeenCalledWith('apps/greeter/.n8n-preview-dist/index.html');
			expect(upstreamRequests).toHaveLength(0);
			expect(userHasScopes).toHaveBeenCalled();
		});

		it.each([
			['assets/index-abc.js', 'text/javascript; charset=utf-8'],
			['assets/logo.svg', 'image/svg+xml'],
		])('serves %s with its content type and revalidation caching', async (file, contentType) => {
			const response = await get(`/apps-preview/${LIVE_TOKEN}/${file}?b=3`);

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toBe(contentType);
			expect(response.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
			expect(response.headers.get('content-security-policy')).toMatch(/^sandbox /);
			expect(response.headers.get('referrer-policy')).toBeNull();
		});

		it('falls back to index.html for an app route', async () => {
			const response = await get(`/apps-preview/${LIVE_TOKEN}/clients/42`, { accept: 'text/html' });

			expect(response.status).toBe(200);
			expect(await response.text()).toBe('<html>built</html>');
			expect(readFile.mock.calls.map(([path]) => path)).toEqual([
				'apps/greeter/.n8n-preview-dist/clients/42',
				'apps/greeter/.n8n-preview-dist/index.html',
			]);
		});

		it('answers 404 when the dist has no index.html either', async () => {
			readFile.mockRejectedValue(new Error('ENOENT'));

			expect((await get(`/apps-preview/${LIVE_TOKEN}/`)).status).toBe(404);
		});

		it.each(['/../../../etc/passwd', '/assets/..%2F..%2Fpackage.json', '/%2e%2e/secret'])(
			'answers 404 without reading when the path climbs out of the dist (%s)',
			async (suffix) => {
				const response = await getRaw(`/apps-preview/${LIVE_TOKEN}${suffix}`);

				expect(response.statusCode).toBe(404);
				expect(readFile).not.toHaveBeenCalled();
			},
		);

		it('answers 405 for anything but GET and HEAD', async () => {
			const response = await fetch(`${baseUrl}/apps-preview/${LIVE_TOKEN}/api/x`, {
				method: 'POST',
				body: '{}',
			});

			expect(response.status).toBe(405);
			expect(response.headers.get('allow')).toBe('GET, HEAD');
			expect(readFile).not.toHaveBeenCalled();
		});

		it('destroys the socket on a WebSocket upgrade, which a built preview has no use for', async () => {
			const ws = new WebSocket(
				`${baseUrl.replace('http', 'ws')}/apps-preview/${LIVE_TOKEN}/`,
				'vite-hmr',
			);
			const outcome = await new Promise<string>((resolve) => {
				ws.on('open', () => resolve('open'));
				ws.on('error', () => resolve('error'));
				ws.on('close', () => resolve('close'));
			});

			expect(outcome).not.toBe('open');
			expect(upstreamRequests).toHaveLength(0);
		});
	});
});
