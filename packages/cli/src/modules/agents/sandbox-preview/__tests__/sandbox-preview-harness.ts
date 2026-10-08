import type { SandboxPortRoute, WorkspaceSandbox } from '@n8n/agents/sandbox';
import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { GlobalConfig } from '@n8n/config';
import type { User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { AuthError } from '@n8n/errors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { getHtmlSandboxCSP, type InstanceSettings } from 'n8n-core';
import {
	Agent as HttpAgent,
	createServer,
	request,
	type IncomingHttpHeaders,
	type IncomingMessage,
	type OutgoingHttpHeaders,
	type Server,
	type ServerResponse,
} from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import type { AddressInfo } from 'node:net';
import type { Mock } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { bodyParser, rawBodyReader } from '@/middlewares/body-parser';
import { userHasScopes } from '@/permissions.ee/check-access';
import { JwtService } from '@/services/jwt.service';
import type { SandboxSettingsService } from '@/services/sandbox-settings.service';

import type { SandboxPortCapability } from '../sandbox-port-capability.service';
import { SandboxPreviewAccess } from '../sandbox-preview-access';
import { SandboxPreviewProxyController } from '../sandbox-preview-proxy.controller';
import { SandboxPreviewService } from '../sandbox-preview.service';

/*
 * The integration harness of the preview proxy: a stub sandbox service on a
 * random port and an n8n app with the middlewares that run before every
 * controller. A test file that uses it must mock `@/permissions.ee/check-access`.
 */

export const PORT_PATH = '/sandboxes/sb-1/ports/5173';
export const SESSION_COOKIE = 'valid-session';
export const PAGE = { accept: 'text/html,application/xhtml+xml' };

export type UpstreamMode =
	| 'ok'
	| 'restarted'
	| 'app-down'
	| 'stream'
	| 'abort-sized'
	| 'abort-chunked'
	| 'abort-reset-sized'
	| 'abort-reset-chunked';

/** Modes in which the service stops after the first chunk of a 200 answer. */
const ABORT_MODES: ReadonlySet<UpstreamMode> = new Set([
	'abort-sized',
	'abort-chunked',
	'abort-reset-sized',
	'abort-reset-chunked',
]);

export interface SeenRequest {
	method?: string;
	url?: string;
	headers: IncomingHttpHeaders;
	body: string;
	raw: Buffer;
	/** The client port of the n8n connection, the same for requests on one kept-alive socket. */
	remotePort?: number;
}

export interface Answer {
	status: number;
	headers: IncomingHttpHeaders;
	body: string;
}

export interface SendOptions {
	method?: string;
	headers?: Record<string, string>;
	body?: string | Buffer;
	/** `false` opens a new connection to n8n for this request only. */
	agent?: false;
}

export const listen = async (server: Server) => {
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	return (server.address() as AddressInfo).port;
};

export const close = async (server: Server) => {
	server.closeAllConnections();
	await new Promise<void>((resolve) => server.close(() => resolve()));
};

export const UPSTREAM_PAGE_HEADERS: OutgoingHttpHeaders = {
	'content-security-policy': "default-src 'self'",
	'x-frame-options': 'DENY',
	'set-cookie': 'upstream=1',
	'cache-control': 'max-age=3600',
	'referrer-policy': 'unsafe-url',
	'access-control-allow-origin': '*',
	'access-control-allow-credentials': 'true',
	'x-app-version': '1.2.3',
};

/** Upstream headers that would act on the whole n8n origin or prompt for its credentials. */
export const ORIGIN_WIDE_HEADERS: OutgoingHttpHeaders = {
	'clear-site-data': '"cookies", "storage"',
	'strict-transport-security': 'max-age=31536000; includeSubDomains',
	'alt-svc': 'h3=":443"',
	nel: '{"report_to":"app","max_age":86400}',
	'report-to': '{"group":"app","max_age":86400,"endpoints":[{"url":"https://reports.test"}]}',
	'service-worker-allowed': '/',
	'www-authenticate': 'Basic realm="app"',
};

export const expectHardened = (answer: Answer) => {
	expect(answer.headers['content-security-policy']).toBe(getHtmlSandboxCSP());
	expect(answer.headers['x-content-type-options']).toBe('nosniff');
	expect(answer.headers['cache-control']).toBe('no-store, no-transform');
	expect(answer.headers['referrer-policy']).toBe('no-referrer');
	expect(answer.headers['access-control-allow-origin']).toBe('null');
};

interface UpstreamState {
	mode: UpstreamMode;
	endStream: () => void;
}

interface HarnessMocks {
	authService: MockProxy<AuthService>;
	userRepository: MockProxy<UserRepository>;
	outboundHttp: MockProxy<OutboundHttp>;
	getNodeAgent: Mock;
	logger: MockProxy<Logger>;
}

interface HarnessServers {
	upstream?: Server;
	n8n?: Server;
	upstreamUrl: string;
	port: number;
}

/** Answers like an app that the sandbox service proxies, or like the service when `mode` says so. */
function answerUpstream(
	state: UpstreamState,
	req: IncomingMessage,
	res: ServerResponse,
	body: string,
) {
	if (ABORT_MODES.has(state.mode)) {
		const length = state.mode.endsWith('-sized') ? { 'content-length': '1000' } : {};
		res.writeHead(200, { 'content-type': 'application/javascript', ...length });
		res.write('partial');
		// The service stops after the first chunk reached n8n, as when the app crashes. A reset
		// (TCP RST, as from a crashed process or a load balancer) makes the n8n request emit 'error'.
		const reset = state.mode.startsWith('abort-reset');
		setTimeout(() => (reset ? res.socket?.resetAndDestroy() : res.socket?.destroy()), 20);
		return;
	}
	if (state.mode === 'restarted') {
		res.writeHead(409, { 'x-sandbox-restarted': '1', 'content-type': 'text/plain' });
		res.end('Sandbox restarted');
		return;
	}
	if (state.mode === 'app-down') {
		res.writeHead(502, { 'content-type': 'text/plain' });
		res.end('No app on the port');
		return;
	}
	if (state.mode === 'stream') {
		res.writeHead(200, { 'content-type': 'text/event-stream' });
		res.write('data: first\n\n');
		state.endStream = () => res.end('data: last\n\n');
		return;
	}
	const isPage = req.url?.split('?')[0].endsWith('/') ?? false;
	res.writeHead(200, {
		...UPSTREAM_PAGE_HEADERS,
		...ORIGIN_WIDE_HEADERS,
		'content-type': isPage ? 'text/html' : 'application/javascript',
	});
	res.end(body ? `echo:${body}` : isPage ? '<html>app</html>' : 'export {}');
}

function stubSandboxService(state: UpstreamState, seen: SeenRequest[]): Server {
	return createServer((req, res) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => {
			const raw = Buffer.concat(chunks);
			const body = raw.toString();
			const { method, url, headers } = req;
			seen.push({ method, url, headers, body, raw, remotePort: req.socket.remotePort });
			answerUpstream(state, req, res, body);
		});
	});
}

/** The same middlewares that run before every n8n controller, then the preview router. */
function n8nApp(): Server {
	const app = express();
	app.use(compression());
	app.use(rawBodyReader);
	app.use(cookieParser());
	app.use(bodyParser);
	app.use('/sandbox-preview', SandboxPreviewProxyController.routers[0].router);
	return createServer(app);
}

/** Sends the path as it is: `fetch` would remove its dot segments. */
export const sendTo = async (port: number, path: string, options: SendOptions = {}) =>
	await new Promise<Answer>((resolve, reject) => {
		const outgoing = request(
			{
				host: '127.0.0.1',
				port,
				path,
				method: options.method ?? 'GET',
				headers: options.headers,
				agent: options.agent,
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

const jwtService = new JwtService(
	mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
	mock<GlobalConfig>({ userManagement: { jwtSecret: '' } }),
	mock(),
);

/** The sandbox settings of the instance: the agent sandbox is on and uses the n8n sandbox service. */
function sandboxSettings(config: { serviceUrl: string; apiKey: string }) {
	const settings = mock<SandboxSettingsService>();
	settings.isAgentSandboxEnabled.mockReturnValue(true);
	settings.getProvider.mockReturnValue('n8n-sandbox');
	settings.resolveN8nSandboxConfig.mockResolvedValue(config);
	return settings;
}

/** A new service for each test, so that no entry or cached setting passes over from another test. */
function previewServiceFor(settings: SandboxSettingsService) {
	const capability = mock<SandboxPortCapability>();
	capability.resolveRoute.mockImplementation(async (sandbox, port) => {
		if (!sandbox.getPortRoute) throw new Error('The test sandbox has no port route');
		return await sandbox.getPortRoute(port);
	});
	const globalConfig = mock<GlobalConfig>({ path: '/' });
	return new SandboxPreviewService(jwtService, settings, capability, globalConfig);
}

/** Registers the hooks of the harness in the calling `describe`. */
export function usePreviewHarness() {
	const seen: SeenRequest[] = [];
	const state: UpstreamState = { mode: 'ok', endStream: () => {} };
	const apiKey = `test-key-${crypto.randomUUID()}`;
	const servers: HarnessServers = { upstreamUrl: '', port: 0 };
	const users = {
		tokenUser: mock<User>({ id: 'user-1', disabled: false }),
		sessionUser: mock<User>({ id: 'user-2', disabled: false }),
	};
	const mocks: HarnessMocks = {
		authService: mock<AuthService>(),
		userRepository: mock<UserRepository>(),
		outboundHttp: mock<OutboundHttp>(),
		getNodeAgent: vi.fn(),
		logger: mock<Logger>(),
	};
	const agents = {
		httpAgent: new HttpAgent({ keepAlive: true }),
		httpsAgent: new HttpsAgent({ keepAlive: true }),
	};
	const current = {
		settings: sandboxSettings({ serviceUrl: '', apiKey }),
		previewService: previewServiceFor(mock<SandboxSettingsService>()),
	};

	beforeAll(async () => {
		servers.upstream = stubSandboxService(state, seen);
		servers.upstreamUrl = `http://127.0.0.1:${await listen(servers.upstream)}`;
		servers.n8n = n8nApp();
		// Each test makes a new controller, and http-proxy-middleware adds one server 'close'
		// listener for each proxy of a controller. Production has one controller.
		servers.n8n.setMaxListeners(0);
		servers.port = await listen(servers.n8n);
	});

	afterAll(async () => {
		agents.httpAgent.destroy();
		agents.httpsAgent.destroy();
		const started = [servers.n8n, servers.upstream].filter((s): s is Server => s !== undefined);
		await Promise.all(started.map(close));
	});

	beforeEach(() => {
		vi.clearAllMocks();
		seen.length = 0;
		state.mode = 'ok';
		resetMocks(mocks, users, agents);
		current.settings = sandboxSettings({ serviceUrl: servers.upstreamUrl, apiKey });
		current.previewService = previewServiceFor(current.settings);
		// A new controller for each test, so that no access check passes over from another test.
		const access = new SandboxPreviewAccess(mocks.authService, mocks.userRepository);
		const { logger, outboundHttp } = mocks;
		const controller = new SandboxPreviewProxyController(
			logger,
			current.previewService,
			access,
			outboundHttp,
		);
		Container.set(SandboxPreviewProxyController, controller);
	});

	/**
	 * A preview URL for the stub service, or for `route` when given. The
	 * instance settings then name the service of `route`.
	 */
	const openPreview = async (route?: SandboxPortRoute) => {
		const target = route ?? { serviceUrl: servers.upstreamUrl, path: PORT_PATH };
		current.settings.resolveN8nSandboxConfig.mockResolvedValue({
			serviceUrl: target.serviceUrl,
			apiKey,
		});
		const sandbox = mock<WorkspaceSandbox>({ getPortRoute: vi.fn().mockResolvedValue(target) });
		const { url } = await current.previewService.open(sandbox, {
			userId: 'user-1',
			projectId: 'project-1',
			port: route ? 3000 : 5173,
		});
		return { url, token: url.split('/')[2] };
	};

	return {
		seen,
		state,
		apiKey,
		servers,
		jwtService,
		...users,
		...mocks,
		...agents,
		/** The sandbox settings of the current test. */
		get settings() {
			return current.settings;
		},
		/** The preview service of the current test. */
		get previewService() {
			return current.previewService;
		},
		openPreview,
		send: async (path: string, options?: SendOptions) => await sendTo(servers.port, path, options),
	};
}

function resetMocks(
	mocks: HarnessMocks,
	users: { tokenUser: User; sessionUser: User },
	agents: { httpAgent: HttpAgent; httpsAgent: HttpsAgent },
) {
	mocks.logger.scoped.mockReturnValue(mocks.logger);
	mocks.getNodeAgent.mockReturnValue(agents);
	mocks.outboundHttp.transport.mockReturnValue({
		getNodeAgent: mocks.getNodeAgent,
		asCustomFetch: vi.fn(),
		getDispatcher: vi.fn(),
	});
	mocks.authService.getCookieToken.mockImplementation(
		(req) => (req.cookies as Record<string, string | undefined> | undefined)?.['n8n-auth'],
	);
	mocks.authService.authenticateUserByCookie.mockImplementation(async (cookie) => {
		if (cookie === SESSION_COOKIE) return await Promise.resolve(users.sessionUser);
		throw new AuthError('Unauthorized');
	});
	mocks.userRepository.findByIdWithRole.mockResolvedValue(users.tokenUser);
	vi.mocked(userHasScopes).mockResolvedValue(true);
}
