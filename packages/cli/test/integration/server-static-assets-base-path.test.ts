import { Logger } from '@n8n/backend-common';
import { type EventService, PathResolvingService, PostHogClient } from '@n8n/backend-services';
import { mockInstance, mockLogger, testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
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
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { MfaService } from '@/mfa/mfa.service';
import { Push } from '@/push';
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

const BASE_PATH = '/n8n';
const BROWSER_ID = 'test-browser-id';

describe('Server static assets under N8N_BASE_PATH', () => {
	let httpServer: http.Server;
	let port: number;
	let authCookie: string;

	// Raw `http.request` rather than `supertest`: superagent normalises a path
	// before it leaves the process, so the forms under test would never reach the
	// server.
	const get = async (requestPath: string, headers: http.OutgoingHttpHeaders = {}) =>
		await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
			const req = http.request(
				{ host: '127.0.0.1', port, method: 'GET', path: requestPath, headers },
				(res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (chunk: string) => (body += chunk));
					res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
				},
			);
			req.on('error', reject);
			req.end();
		});

	beforeAll(async () => {
		const globalConfig = Container.get(GlobalConfig);
		globalConfig.basePath = BASE_PATH;
		globalConfig.credentials.overwrite.endpoint = '';
		Container.set(PathResolvingService, new PathResolvingService(globalConfig));

		const staticCacheDir = mkdtempSync(path.join(tmpdir(), 'n8n-static-cache-'));
		mkdirSync(path.join(staticCacheDir, 'types'));
		writeFileSync(path.join(staticCacheDir, 'types', 'nodes.json'), '[{"name":"a-node"}]');
		writeFileSync(path.join(staticCacheDir, 'types', 'credentials.json'), '[{"name":"a-cred"}]');
		writeFileSync(path.join(staticCacheDir, 'types', 'node-versions.json'), '{"a-node":1}');
		writeFileSync(path.join(staticCacheDir, 'public-asset.txt'), 'public');

		Container.set(Logger, mockLogger());
		mockInstance(PostHogClient);
		mockInstance(Push);
		mockInstance(Telemetry);
		mockInstance(ControllerRegistry);
		mockInstance(MessageEventBus);
		mockInstance(LogStreamingEventRelay);
		mockInstance(CredentialsOverwrites);
		mockInstance(MfaService);

		await testDb.init();
		const owner = await createOwner();
		const jwt = Container.get(AuthService).issueJWT(owner, false, BROWSER_ID);
		authCookie = `${AUTH_COOKIE_NAME}=${jwt}`;

		const instanceSettings = mock<InstanceSettings>({
			staticCacheDir,
			n8nFolder: staticCacheDir,
			hostId: 'test-host',
		});
		Container.set(InstanceSettings, instanceSettings);

		const { Server } = await import('@/server.js');
		const server = new Server(
			mock<LoadNodesAndCredentials>(),
			Container.get(PostHogClient),
			mock<EventService>(),
			instanceSettings,
		);
		await server.configure();

		httpServer = server.app.listen(0);
		port = (httpServer.address() as AddressInfo).port;
	});

	afterAll(async () => {
		if (httpServer?.listening) {
			await new Promise<void>((resolve) => httpServer.close(() => resolve()));
		}
		await testDb.terminate();
	});

	test('serves a public asset under the base path', async () => {
		const { statusCode, body } = await get(`${BASE_PATH}/public-asset.txt`);

		expect(statusCode).toBe(200);
		expect(body).toBe('public');
	});

	test('serves a type file to an authenticated request', async () => {
		const { statusCode, body } = await get(`${BASE_PATH}/types/nodes.json`, {
			cookie: authCookie,
		});

		expect(statusCode).toBe(200);
		expect(body).toContain('a-node');
	});

	test.each([
		`${BASE_PATH}/types/nodes.json`,
		`${BASE_PATH}/types//nodes.json`,
		`${BASE_PATH}/types/%2fnodes.json`,
		`${BASE_PATH}/%74ypes/credentials.json`,
		`${BASE_PATH}/types/x/../nodes.json`,
		`${BASE_PATH}/TYPES/nodes.json`,
	])('requires authentication for %s', async (requestPath) => {
		const { statusCode, body } = await get(requestPath);

		expect(statusCode).toBe(401);
		expect(body).not.toContain('a-node');
		expect(body).not.toContain('a-cred');
	});
});
