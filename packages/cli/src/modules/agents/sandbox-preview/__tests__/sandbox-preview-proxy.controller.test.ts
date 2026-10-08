import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User, UserRepository } from '@n8n/db';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { AuthError } from '@n8n/errors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { getHtmlSandboxCSP, type InstanceSettings } from 'n8n-core';
import {
	createServer,
	request,
	type IncomingHttpHeaders,
	type OutgoingHttpHeaders,
	type Server,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { bodyParser, rawBodyReader } from '@/middlewares/body-parser';
import { userHasScopes } from '@/permissions.ee/check-access';
import { JwtService } from '@/services/jwt.service';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import type { SandboxPortCapability } from '../sandbox-port-capability.service';
import { SandboxPreviewProxyController } from '../sandbox-preview-proxy.controller';
import { SANDBOX_PREVIEW_TTL_SECONDS, SandboxPreviewService } from '../sandbox-preview.service';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const PORT_PATH = '/sandboxes/sb-1/ports/5173';
const SESSION_COOKIE = 'valid-session';
const PAGE = { accept: 'text/html,application/xhtml+xml' };

type UpstreamMode = 'ok' | 'restarted' | 'app-down' | 'stream';

interface SeenRequest {
	method?: string;
	url?: string;
	headers: IncomingHttpHeaders;
	body: string;
}

interface Answer {
	status: number;
	headers: IncomingHttpHeaders;
	body: string;
}

const listen = async (server: Server) => {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return (server.address() as AddressInfo).port;
};

const close = async (server: Server) => {
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
};

const UPSTREAM_PAGE_HEADERS: OutgoingHttpHeaders = {
	'content-security-policy': "default-src 'self'",
	'x-frame-options': 'DENY',
	'set-cookie': 'upstream=1',
	'cache-control': 'max-age=3600',
	'referrer-policy': 'unsafe-url',
	'access-control-allow-origin': '*',
	'access-control-allow-credentials': 'true',
	'x-app-version': '1.2.3',
};

/** Upstream headers that would act on the whole n8n origin. */
const ORIGIN_WIDE_HEADERS: OutgoingHttpHeaders = {
	'clear-site-data': '"cookies", "storage"',
	'strict-transport-security': 'max-age=31536000; includeSubDomains',
	'alt-svc': 'h3=":443"',
	nel: '{"report_to":"app","max_age":86400}',
	'report-to': '{"group":"app","max_age":86400,"endpoints":[{"url":"https://reports.test"}]}',
	'service-worker-allowed': '/',
};

describe('SandboxPreviewProxyController', () => {
	const seen: SeenRequest[] = [];
	let mode: UpstreamMode = 'ok';
	let endStream: () => void = () => {};
	let upstream: Server;
	let upstreamUrl: string;
	let server: Server;
	let port: number;
	let previewService: SandboxPreviewService;
	let jwtService: JwtService;
	let apiKey: string;
	const authService = mock<AuthService>();
	const userRepository = mock<UserRepository>();
	const tokenUser = mock<User>({ id: 'user-1', disabled: false });
	const sessionUser = mock<User>({ id: 'user-2', disabled: false });

	beforeAll(async () => {
		upstream = createServer((req, res) => {
			const chunks: Buffer[] = [];
			req.on('data', (chunk: Buffer) => chunks.push(chunk));
			req.on('end', () => {
				const body = Buffer.concat(chunks).toString();
				seen.push({ method: req.method, url: req.url, headers: req.headers, body });
				if (mode === 'restarted') {
					res.writeHead(409, { 'x-sandbox-restarted': '1', 'content-type': 'text/plain' });
					res.end('Sandbox restarted');
					return;
				}
				if (mode === 'app-down') {
					res.writeHead(502, { 'content-type': 'text/plain' });
					res.end('No app on the port');
					return;
				}
				if (mode === 'stream') {
					res.writeHead(200, { 'content-type': 'text/event-stream' });
					res.write('data: first\n\n');
					endStream = () => res.end('data: last\n\n');
					return;
				}
				const isPage = req.url?.split('?')[0].endsWith('/') ?? false;
				res.writeHead(200, {
					...UPSTREAM_PAGE_HEADERS,
					...ORIGIN_WIDE_HEADERS,
					'content-type': isPage ? 'text/html' : 'application/javascript',
				});
				res.end(body ? `echo:${body}` : isPage ? '<html>app</html>' : 'export {}');
			});
		});
		upstreamUrl = `http://127.0.0.1:${await listen(upstream)}`;

		jwtService = new JwtService(
			mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
			mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
			mock(),
		);
		apiKey = `test-key-${crypto.randomUUID()}`;
		const settings = mock<SandboxSettingsService>();
		settings.resolveN8nSandboxConfig.mockResolvedValue({ serviceUrl: upstreamUrl, apiKey });
		const capability = mock<SandboxPortCapability>();
		capability.assertSupported.mockResolvedValue(undefined);
		previewService = new SandboxPreviewService(
			jwtService,
			settings,
			capability,
			mock<GlobalConfig>({ path: '/' }),
		);

		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const controller = new SandboxPreviewProxyController(
			logger,
			previewService,
			authService,
			userRepository,
		);
		Container.set(SandboxPreviewProxyController, controller);

		// The same middlewares that run before every n8n controller.
		const app = express();
		app.use(compression());
		app.use(rawBodyReader);
		app.use(cookieParser());
		app.use(bodyParser);
		app.use('/sandbox-preview', SandboxPreviewProxyController.routers[0].router);
		server = createServer(app);
		port = await listen(server);
	});

	afterAll(async () => {
		await Promise.all([close(server), close(upstream)]);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		seen.length = 0;
		mode = 'ok';
		authService.getCookieToken.mockImplementation(
			(req) => (req.cookies as Record<string, string | undefined> | undefined)?.['n8n-auth'],
		);
		authService.authenticateUserByCookie.mockImplementation(async (cookie) => {
			if (cookie === SESSION_COOKIE) return await Promise.resolve(sessionUser);
			throw new AuthError('Unauthorized');
		});
		userRepository.findByIdWithRole.mockResolvedValue(tokenUser);
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	/** A preview URL for the stub service, or for `route` when given. */
	const openPreview = async (route?: SandboxPortRoute) => {
		const target = route ?? { serviceUrl: upstreamUrl, path: PORT_PATH };
		const sandbox = mock<WorkspaceSandbox>({ getPortRoute: vi.fn().mockResolvedValue(target) });
		const { url } = await previewService.open(sandbox, {
			userId: 'user-1',
			projectId: 'project-1',
			port: route ? 3000 : 5173,
		});
		const token = url.split('/')[2];
		return { url, token };
	};

	/** Sends the path as it is: `fetch` would remove its dot segments. */
	const send = async (
		path: string,
		options: { method?: string; headers?: Record<string, string>; body?: string } = {},
	) =>
		await new Promise<Answer>((resolve, reject) => {
			const outgoing = request(
				{
					host: '127.0.0.1',
					port,
					path,
					method: options.method ?? 'GET',
					headers: options.headers,
				},
				(res) => {
					const chunks: Buffer[] = [];
					res.on('data', (chunk: Buffer) => chunks.push(chunk));
					res.on('end', () =>
						resolve({
							status: res.statusCode ?? 0,
							headers: res.headers,
							body: Buffer.concat(chunks).toString(),
						}),
					);
				},
			);
			outgoing.on('error', reject);
			if (options.body) outgoing.write(options.body);
			outgoing.end();
		});

	const expectHardened = (answer: Answer) => {
		expect(answer.headers['content-security-policy']).toBe(getHtmlSandboxCSP());
		expect(answer.headers['x-content-type-options']).toBe('nosniff');
		expect(answer.headers['cache-control']).toBe('no-store, no-transform');
		expect(answer.headers['referrer-policy']).toBe('no-referrer');
		expect(answer.headers['access-control-allow-origin']).toBe('null');
	};

	it('is a root-level route without session auth', () => {
		const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
			SandboxPreviewProxyController as never,
		);

		expect(metadata.basePath).toBe('/sandbox-preview');
		expect(metadata.registerOnRootPath).toBe(true);
		expect(SandboxPreviewProxyController.routers).toEqual([
			expect.objectContaining({ path: '/', skipAuth: true }),
		]);
	});

	it('proxies a GET under the port route with the API key, the rest of the path and the query', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/main.ts?t=1&v=2`);

		expect(answer.status).toBe(200);
		expect(answer.body).toBe('export {}');
		expect(seen).toHaveLength(1);
		expect(seen[0].method).toBe('GET');
		expect(seen[0].url).toBe(`${PORT_PATH}/src/main.ts?t=1&v=2`);
		expect(seen[0].headers['x-api-key']).toBe(apiKey);
		expect(seen[0].headers.host).toBe(new URL(upstreamUrl).host);
	});

	it('strips n8n credentials and conditional headers, and replaces a client API key', async () => {
		const { url } = await openPreview();

		await send(`${url}src/main.ts`, {
			headers: {
				cookie: 'n8n-auth=secret-session; other=1',
				authorization: 'Bearer secret',
				'if-none-match': '"etag"',
				'if-modified-since': 'Wed, 07 Oct 2026 10:00:00 GMT',
				'x-api-key': 'client-supplied',
			},
		});

		const { headers } = seen[0];
		expect(headers.cookie).toBeUndefined();
		expect(headers.authorization).toBeUndefined();
		expect(headers['if-none-match']).toBeUndefined();
		expect(headers['if-modified-since']).toBeUndefined();
		expect(headers['x-api-key']).toBe(apiKey);
	});

	it('keeps headers that a reverse proxy in front of n8n adds away from the app', async () => {
		const { url } = await openPreview();

		await send(`${url}src/main.ts`, {
			headers: {
				'x-forwarded-for': '203.0.113.7',
				'x-forwarded-user': 'ada',
				'x-forwarded-access-token': `token-${crypto.randomUUID()}`,
				'cf-access-jwt-assertion': `assertion-${crypto.randomUUID()}`,
				'proxy-authorization': 'Basic placeholder',
				'browser-id': 'browser-1',
				referer: `http://127.0.0.1:${port}/projects/p/agents/a`,
			},
		});

		expect(Object.keys(seen[0].headers).sort()).toEqual(['connection', 'host', 'x-api-key']);
	});

	it('forwards the headers that the app needs to answer', async () => {
		const { url } = await openPreview();
		const sent = {
			accept: 'application/json',
			'accept-language': 'en-GB',
			'content-type': 'application/json',
			origin: 'null',
			range: 'bytes=0-99',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'user-agent': 'preview-test',
			'x-requested-with': 'XMLHttpRequest',
		};

		await send(`${url}api/items`, { headers: sent });

		expect(seen[0].headers).toEqual(expect.objectContaining(sent));
	});

	it('replaces the security headers of a script and keeps its other headers', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });

		expectHardened(answer);
		expect(answer.headers['x-frame-options']).toBeUndefined();
		expect(answer.headers['set-cookie']).toBeUndefined();
		expect(answer.headers['access-control-allow-credentials']).toBeUndefined();
		expect(answer.headers['x-app-version']).toBe('1.2.3');
	});

	it('removes the headers of the app that would act on the whole n8n origin', async () => {
		const { url } = await openPreview();

		const answer = await send(url, { headers: PAGE });

		for (const name of Object.keys(ORIGIN_WIDE_HEADERS)) {
			expect(answer.headers).not.toHaveProperty(name);
		}
	});

	it('serves the page with the hardening headers', async () => {
		const { url } = await openPreview();

		const answer = await send(url, { headers: PAGE });

		expect(answer.status).toBe(200);
		expect(answer.body).toBe('<html>app</html>');
		expectHardened(answer);
		expect(answer.headers['set-cookie']).toBeUndefined();
	});

	it('proxies under the base path of a service URL', async () => {
		const { url } = await openPreview({ serviceUrl: `${upstreamUrl}/base`, path: PORT_PATH });

		const answer = await send(`${url}src/main.ts`);

		expect(answer.status).toBe(200);
		expect(seen[0].url).toBe(`/base${PORT_PATH}/src/main.ts`);
	});

	it('passes each chunk of a streamed answer on as it arrives, uncompressed', async () => {
		const { url } = await openPreview();
		mode = 'stream';

		const { encoding, chunks } = await new Promise<{ encoding?: string; chunks: string[] }>(
			(resolve, reject) => {
				const received: string[] = [];
				let ended = false;
				const end = () => {
					if (!ended) endStream();
					ended = true;
				};
				const outgoing = request(
					{ host: '127.0.0.1', port, path: `${url}events`, headers: { 'accept-encoding': 'gzip' } },
					(res) => {
						const contentEncoding = res.headers['content-encoding'];
						// A compressed stream holds the first event back, so end it now and fail below.
						if (contentEncoding) end();
						res.setEncoding('utf8');
						res.on('data', (chunk: string) => {
							received.push(chunk);
							// The upstream ends the stream only after the first event reached the client.
							end();
						});
						res.on('end', () => resolve({ encoding: contentEncoding, chunks: received }));
					},
				);
				outgoing.on('error', reject);
				outgoing.end();
			},
		);

		expect(encoding).toBeUndefined();
		expect(chunks[0]).toBe('data: first\n\n');
		expect(chunks.join('')).toBe('data: first\n\ndata: last\n\n');
	});

	it.each([
		'/../../sandboxes/other/exec',
		'/src/..%2F..%2Fsandboxes/other/exec',
		'/%2e%2e/%2e%2e/sandboxes/other/exec',
		'/src/.%2e/..',
		'/..%5c..%5csandboxes',
		'/%252e%252e/sandboxes/other/exec',
		'/%zz',
	])('answers 400 without proxying when the path leaves the port route (%s)', async (suffix) => {
		const { token } = await openPreview();

		const answer = await send(`/sandbox-preview/${token}${suffix}`);

		expect(answer.status).toBe(400);
		expectHardened(answer);
		expect(seen).toHaveLength(0);
	});

	it('proxies a dot segment that stays inside the port route', async () => {
		const { url } = await openPreview();

		const answer = await send(`${url}src/./main.ts`);

		expect(answer.status).toBe(200);
		expect(seen[0].url).toBe(`${PORT_PATH}/src/./main.ts`);
	});

	it('redirects the URL without a trailing slash to the slashed form', async () => {
		const { token } = await openPreview();

		const answer = await send(`/sandbox-preview/${token}?x=1`);

		expect(answer.status).toBe(302);
		expect(answer.headers.location).toBe(`./${token}/?x=1`);
		expectHardened(answer);
		expect(seen).toHaveLength(0);
	});

	describe('token checks', () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		it.each(['/sandbox-preview', '/sandbox-preview/', '/sandbox-preview/unknown/src/main.ts'])(
			'answers 404 for %s',
			async (path) => {
				const answer = await send(path, { headers: { cookie: `n8n-auth=${SESSION_COOKIE}` } });

				expect(answer.status).toBe(404);
				expectHardened(answer);
				expect(seen).toHaveLength(0);
			},
		);

		it('answers 404 for a token with another audience', async () => {
			const { token } = await openPreview();
			const { jti } = jwtService.decodeUnverified<{ jti: string }>(token);
			const forged = jwtService.sign('session', { sub: 'user-1', jti });

			const answer = await send(`/sandbox-preview/${forged}/`, { headers: PAGE });

			expect(answer.status).toBe(404);
			expect(seen).toHaveLength(0);
		});

		it('answers 404 once the token has expired', async () => {
			const { url } = await openPreview();
			vi.useFakeTimers({ toFake: ['Date'] });
			vi.setSystemTime(Date.now() + SANDBOX_PREVIEW_TTL_SECONDS * 1000);

			const answer = await send(url, { headers: PAGE });

			expect(answer.status).toBe(404);
			expect(seen).toHaveLength(0);
		});
	});

	describe('access on page load', () => {
		it('answers 403 when the user of the token lost agent:execute on the project', async () => {
			vi.mocked(userHasScopes).mockResolvedValue(false);
			const { url } = await openPreview();

			const answer = await send(url, { headers: PAGE });

			expect(answer.status).toBe(403);
			expectHardened(answer);
			expect(seen).toHaveLength(0);
			expect(userRepository.findByIdWithRole).toHaveBeenCalledWith('user-1');
			expect(userHasScopes).toHaveBeenCalledWith(tokenUser, ['agent:execute'], false, {
				projectId: 'project-1',
			});
		});

		it('checks the session user when the browser sends the n8n cookie', async () => {
			const { url } = await openPreview();

			const answer = await send(url, {
				headers: { ...PAGE, cookie: `n8n-auth=${SESSION_COOKIE}` },
			});

			expect(answer.status).toBe(200);
			expect(authService.authenticateUserByCookie).toHaveBeenCalledWith(SESSION_COOKIE);
			expect(userHasScopes).toHaveBeenCalledWith(sessionUser, ['agent:execute'], false, {
				projectId: 'project-1',
			});
			expect(userRepository.findByIdWithRole).not.toHaveBeenCalled();
			expect(seen[0].headers.cookie).toBeUndefined();
		});

		it('answers 403 when the session user has no access, even though the token user has', async () => {
			vi.mocked(userHasScopes).mockImplementation(
				async (user) => await Promise.resolve(user === tokenUser),
			);
			const { url } = await openPreview();

			const answer = await send(url, {
				headers: { ...PAGE, cookie: `n8n-auth=${SESSION_COOKIE}` },
			});

			expect(answer.status).toBe(403);
		});

		it('answers 403 for a session cookie that does not validate, without using the token user', async () => {
			const { url } = await openPreview();

			const answer = await send(url, { headers: { ...PAGE, cookie: 'n8n-auth=signed-out' } });

			expect(answer.status).toBe(403);
			expect(userRepository.findByIdWithRole).not.toHaveBeenCalled();
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it.each([
			['is disabled', mock<User>({ id: 'user-1', disabled: true })],
			['no longer exists', null],
		])('answers 403 when the user of the token %s', async (_case, user) => {
			userRepository.findByIdWithRole.mockResolvedValue(user);
			const { url } = await openPreview();

			const answer = await send(url, { headers: { 'sec-fetch-dest': 'iframe' } });

			expect(answer.status).toBe(403);
			expect(userHasScopes).not.toHaveBeenCalled();
			expect(seen).toHaveLength(0);
		});

		it('does not check access again for scripts, assets and API calls', async () => {
			const { url } = await openPreview();

			await send(`${url}src/main.ts`, { headers: { accept: '*/*' } });
			await send(`${url}api/items`, {
				method: 'POST',
				headers: { accept: 'text/html', 'content-type': 'application/json' },
				body: '{}',
			});

			expect(userHasScopes).not.toHaveBeenCalled();
			expect(userRepository.findByIdWithRole).not.toHaveBeenCalled();
			expect(seen).toHaveLength(2);
		});
	});

	it.each([
		['application/json', '{"name":"Ada","items":[1,2]}'],
		['text/plain', 'plain text body'],
		['application/octet-stream', 'raw bytes'],
	])('forwards a %s body that n8n already read', async (contentType, body) => {
		const { url } = await openPreview();

		const answer = await send(`${url}api/items`, {
			method: 'POST',
			headers: { 'content-type': contentType },
			body,
		});

		expect(answer.status).toBe(200);
		expect(answer.body).toBe(`echo:${body}`);
		expect(seen[0].method).toBe('POST');
		expect(seen[0].body).toBe(body);
		expect(seen[0].headers['content-length']).toBe(String(Buffer.byteLength(body)));
	});

	it('streams a multipart body that n8n did not read', async () => {
		const { url } = await openPreview();
		const body = [
			'--boundary',
			'Content-Disposition: form-data; name="file"; filename="a.txt"',
			'Content-Type: text/plain',
			'',
			'file contents',
			'--boundary--',
			'',
		].join('\r\n');

		const answer = await send(`${url}api/upload`, {
			method: 'POST',
			headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
			body,
		});

		expect(answer.status).toBe(200);
		expect(seen[0].body).toBe(body);
		expect(seen[0].headers['content-type']).toBe('multipart/form-data; boundary=boundary');
	});

	describe('CORS preflight from the opaque-origin page', () => {
		const preflight = {
			origin: 'null',
			'access-control-request-method': 'PUT',
			'access-control-request-headers': 'content-type',
		};

		it('answers the preflight itself, without the app and without an access check', async () => {
			const { url } = await openPreview();

			const answer = await send(`${url}api/items/1`, { method: 'OPTIONS', headers: preflight });

			expect(answer.status).toBe(204);
			expectHardened(answer);
			expect(answer.headers['access-control-allow-methods']).toContain('PUT');
			expect(answer.headers['access-control-allow-headers']).toContain('content-type');
			expect(answer.headers['access-control-max-age']).toBe('600');
			expect(seen).toHaveLength(0);
			expect(userHasScopes).not.toHaveBeenCalled();
		});

		it('answers 404 to a preflight with an unknown token', async () => {
			const answer = await send('/sandbox-preview/unknown/api/items', {
				method: 'OPTIONS',
				headers: preflight,
			});

			expect(answer.status).toBe(404);
			expect(answer.headers['access-control-allow-methods']).toBeUndefined();
		});

		it('proxies an OPTIONS request that is not a preflight to the app', async () => {
			const { url } = await openPreview();

			const answer = await send(`${url}api/items`, { method: 'OPTIONS' });

			expect(answer.status).toBe(200);
			expect(seen[0].method).toBe('OPTIONS');
		});
	});

	it('answers 502 when the sandbox service cannot be reached, and keeps the URL', async () => {
		const closed = createServer();
		const closedPort = await listen(closed);
		await close(closed);
		const { url, token } = await openPreview({
			serviceUrl: `http://127.0.0.1:${closedPort}`,
			path: '/sandboxes/sb-2/ports/3000',
		});

		const answer = await send(`${url}src/main.ts`);

		expect(answer.status).toBe(502);
		expect(answer.body).toBe('Bad Gateway');
		expectHardened(answer);
		expect(previewService.resolveToken(token)).toBeDefined();
	});

	it('passes a sandbox restart through as 409 and answers 404 afterwards', async () => {
		const { url } = await openPreview();
		mode = 'restarted';

		const restarted = await send(`${url}src/main.ts`);
		mode = 'ok';
		const later = await send(url, { headers: PAGE });

		expect(restarted.status).toBe(409);
		expectHardened(restarted);
		expect(later.status).toBe(404);
		expect(seen).toHaveLength(1);
	});

	it('relays a 502 from the app without revoking the URL', async () => {
		const { url } = await openPreview();
		mode = 'app-down';

		const down = await send(`${url}src/main.ts`);
		mode = 'ok';
		const recovered = await send(`${url}src/main.ts`);

		expect(down.status).toBe(502);
		expect(recovered.status).toBe(200);
	});
});
