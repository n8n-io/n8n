import { Logger } from '@n8n/backend-common';
import { mockInstance, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { HTML_NONCE_PLACEHOLDER } from '@n8n/constants';
import { Container } from '@n8n/di';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { ControllerRegistry } from '@/controller.registry';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { EventService } from '@/events/event.service';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import { ExternalHooks } from '@/external-hooks';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MfaService } from '@/mfa/mfa.service';
import { PostHogClient } from '@/posthog';
import { Push } from '@/push';
import type { FrontendService } from '@/services/frontend.service';
import { Telemetry } from '@/telemetry';

import { createOwner } from './shared/db/users';

vi.mock('@/public-api', () => ({
	loadPublicApiVersions: async () => ({
		apiRouters: [(_req: unknown, _res: unknown, next: () => void) => next()],
		apiLatestVersion: 1,
	}),
}));

vi.mock('@/mfa/helpers', () => ({
	handleMfaDisable: async () => {},
	isMfaFeatureEnabled: () => false,
}));

/** The static mount differs per `frontendService` state, so both are built and checked. */
const MOUNTS = ['without a frontend service', 'with a frontend service'] as const;
type Mount = (typeof MOUNTS)[number];

describe('Server static assets', () => {
	const httpServers: http.Server[] = [];
	const ports = {} as Record<Mount, number>;
	let authCookie: string;

	// Raw `http.request` rather than `supertest`: superagent normalises a path
	// before it leaves the process, so the forms under test would never reach the
	// server.
	const request = async (
		method: string,
		requestPath: string,
		port: number,
		headers: http.OutgoingHttpHeaders = {},
	) =>
		await new Promise<{
			statusCode: number;
			headers: http.IncomingHttpHeaders;
			body: string;
		}>((resolve, reject) => {
			const req = http.request(
				{ host: '127.0.0.1', port, method, path: requestPath, headers },
				(res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (chunk: string) => (body += chunk));
					res.on('end', () =>
						resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body }),
					);
				},
			);
			req.on('error', reject);
			req.end();
		});

	const get = async (requestPath: string, port: number, headers?: http.OutgoingHttpHeaders) =>
		await request('GET', requestPath, port, headers);

	beforeAll(async () => {
		const staticCacheDir = mkdtempSync(path.join(tmpdir(), 'n8n-static-cache-'));
		mkdirSync(path.join(staticCacheDir, 'types'));
		writeFileSync(path.join(staticCacheDir, 'types', 'nodes.json'), '[{"name":"a-node"}]');
		writeFileSync(path.join(staticCacheDir, 'types', 'credentials.json'), '[{"name":"a-cred"}]');
		writeFileSync(path.join(staticCacheDir, 'types', 'node-versions.json'), '{"a-node":1}');
		writeFileSync(
			path.join(staticCacheDir, 'index.html'),
			`<html><script nonce="${HTML_NONCE_PLACEHOLDER}"></script></html>`,
		);
		writeFileSync(path.join(staticCacheDir, 'public-asset.txt'), 'public');
		writeFileSync(path.join(staticCacheDir, 'types-extra.txt'), 'extra');

		Container.set(Logger, mockLogger());
		mockInstance(PostHogClient);
		mockInstance(Push);
		mockInstance(Telemetry);
		mockInstance(ControllerRegistry);
		mockInstance(MessageEventBus);
		mockInstance(LogStreamingEventRelay);
		mockInstance(CredentialsOverwrites);
		mockInstance(MfaService);
		const externalHooks = mockInstance(ExternalHooks);

		await testDb.init();
		const owner = await createOwner();
		const jwt = Container.get(AuthService).issueJWT(owner, false, 'test-browser-id');
		authCookie = `${AUTH_COOKIE_NAME}=${jwt}`;

		const globalConfig = Container.get(GlobalConfig);
		globalConfig.credentials.overwrite.endpoint = '';

		const instanceSettings = mock<InstanceSettings>({
			staticCacheDir,
			n8nFolder: staticCacheDir,
			hostId: 'test-host',
		});
		Container.set(InstanceSettings, instanceSettings);

		const { Server } = await import('@/server.js');

		for (const mount of MOUNTS) {
			const server = new Server(
				mock<LoadNodesAndCredentials>(),
				Container.get(PostHogClient),
				mock<EventService>(),
				instanceSettings,
			);

			if (mount === 'with a frontend service') {
				// Both are set by `start()`, which the test does not run
				Reflect.set(server, 'externalHooks', externalHooks);
				Reflect.set(
					server,
					'frontendService',
					mock<FrontendService>({
						getSettings: async () => mock<Awaited<ReturnType<FrontendService['getSettings']>>>(),
					}),
				);
			}

			await server.configure();

			const httpServer = server.app.listen(0);
			httpServers.push(httpServer);
			ports[mount] = (httpServer.address() as AddressInfo).port;
		}
	});

	afterAll(async () => {
		for (const httpServer of httpServers) {
			if (httpServer.listening) {
				await new Promise<void>((resolve) => httpServer.close(() => resolve()));
			}
		}
		await testDb.terminate();
	});

	describe.each(MOUNTS)('%s', (mount) => {
		// Only the frontend-service branch installs the history-api handler, which gives
		// an unknown page its own cache header
		test('builds the expected static mount', async () => {
			const { headers } = await get('/unknown-page', ports[mount], { accept: 'text/html' });

			if (mount === 'with a frontend service') {
				expect(headers['cache-control']).toContain('no-store');
			} else {
				expect(headers['cache-control']).toBeUndefined();
			}
		});

		test('does not serve an upper-cased non-UI route as the editor page', async () => {
			const { headers } = await get('/ASSETS/main.js', ports[mount], { accept: 'text/html' });

			expect(headers['cache-control']).toBeUndefined();
		});

		describe('type files', () => {
			const assertProtected = async (requestPath: string, method = 'GET') => {
				const { statusCode, body } = await request(method, requestPath, ports[mount]);

				expect(statusCode).toBe(401);
				expect(body).not.toContain('a-node');
				expect(body).not.toContain('a-cred');
			};

			test.each([
				'/types/nodes.json',
				'/types/credentials.json',
				'/types/node-versions.json',
				'/types',
			])(
				'requires authentication for %s',
				async (requestPath) => await assertProtected(requestPath),
			);

			test.each([
				'/types//nodes.json',
				'/types/%2fnodes.json',
				'/types/x/../nodes.json',
				'/foo/..%20/types/nodes.json',
			])(
				'requires authentication for %s',
				async (requestPath) => await assertProtected(requestPath),
			);

			test('requires authentication for a mixed-case canonical path', async () => {
				await assertProtected('/TYPES/nodes.json');
			});

			test.each(['HEAD', 'POST'])(
				'requires authentication for %s /types/nodes.json',
				async (method) => await assertProtected('/types/nodes.json', method),
			);

			test.each([
				['/types/nodes.json', 'a-node'],
				['/types/credentials.json', 'a-cred'],
				['/types/node-versions.json', 'a-node'],
			])('serves %s to an authenticated request', async (requestPath, content) => {
				const { statusCode, body } = await get(requestPath, ports[mount], {
					cookie: authCookie,
				});

				expect(statusCode).toBe(200);
				expect(body).toContain(content);
			});

			test('denies a non-canonical form without clearing the session cookie', async () => {
				const { statusCode, headers } = await get('/types//nodes.json', ports[mount], {
					cookie: authCookie,
				});

				expect(statusCode).toBe(401);
				expect(headers['set-cookie']).toBeUndefined();
			});
		});

		test.each([
			['/public-asset.txt', 'public'],
			['/types-extra.txt', 'extra'],
		])('serves the unrelated static asset %s without authentication', async (requestPath, body) => {
			// A non-HTML `Accept`, so the frontend mount's history-api handler declines the
			// request and it reaches the static handler
			const response = await get(requestPath, ports[mount], { accept: 'text/plain' });

			expect(response.statusCode).toBe(200);
			expect(response.body).toBe(body);
		});

		// The frontend-service branch answers a GET with no `Accept` with the editor page, since
		// only it can fill in the page's nonce placeholders
		test('answers a request with no Accept header per mount', async () => {
			const response = await get('/public-asset.txt', ports[mount]);

			expect(response.statusCode).toBe(200);

			if (mount === 'with a frontend service') {
				expect(response.body).toContain('<html>');
			} else {
				expect(response.body).toBe('public');
			}
		});

		// A malformed percent sequence anywhere in the path is undecodable as a whole, so the
		// gate can't rule out it naming the protected directory and denies unconditionally, even
		// for a path with no relation to it — an intentional, conservative trade-off.
		test('denies a request with a malformed percent sequence, even outside /types', async () => {
			const response = await get('/public-asset.txt%zz', ports[mount]);

			expect(response.statusCode).toBe(401);
		});
	});
});
