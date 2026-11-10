import type { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mintActionToken, mintIdentityToken, type LifecycleEvent } from '@n8n/engine';
import type { Request, Response } from 'express';
import { generateTlsCerts, type TlsCertFiles } from 'n8n-containers/helpers/tls-certs';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneServer } from '../engine-control-plane-server';
import { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import type { EngineCredentialsController } from '../engine-credentials.controller';
import type { EngineDataTablesController } from '../engine-data-tables.controller';
import type { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';
import { EngineLifecycleEventController } from '../engine-lifecycle-event.controller';
import type { EngineSubWorkflowController } from '../engine-sub-workflow.controller';
import type { EngineTlsMaterial } from '../engine-tls-material';

const authSecret = 'a'.repeat(32);

const events: LifecycleEvent[] = [
	{
		type: 'execution:completed',
		executionId: 'exec-1',
		workflowId: 'wf-1',
		at: '2026-08-25T10:00:00.000Z',
	},
];

/** Binds for real, so these exercise the wiring rather than a mock app. */
describe('EngineControlPlaneServer', () => {
	let server: EngineControlPlaneServer;
	let serverLogger: Logger;
	let pushRelay: EngineLifecycleEventPushRelay;
	let credentialsController: EngineCredentialsController;
	let dataTablesController: EngineDataTablesController;
	let baseUrl: string;

	const engineConfig = (overrides: Partial<EngineConfig> = {}) =>
		mock<EngineConfig>({
			authSecret,
			controlPlaneHost: '127.0.0.1',
			// Port 0: the OS picks a free one, so parallel files cannot clash.
			controlPlanePort: 0,
			...overrides,
		});

	const startServer = async (tls?: EngineTlsMaterial['tls']) => {
		server = new EngineControlPlaneServer(
			engineConfig(),
			{ tls } as EngineTlsMaterial,
			new EngineLifecycleEventController(pushRelay),
			credentialsController,
			dataTablesController,
			mock<EngineSubWorkflowController>(),
			mock<Logger>({ scoped: vi.fn().mockReturnValue(serverLogger) }),
		);
		await server.start();
	};

	beforeEach(async () => {
		serverLogger = mock<Logger>();
		pushRelay = mock<EngineLifecycleEventPushRelay>();
		credentialsController = mock<EngineCredentialsController>();
		dataTablesController = mock<EngineDataTablesController>();
		await startServer();

		baseUrl = `http://127.0.0.1:${server.port}`;
	});

	afterEach(async () => {
		await server.stop();
	});

	const post = (body: unknown, token?: string) => {
		const req = request(baseUrl).post('/internal/status-callback');
		if (token) req.set('Authorization', `Bearer ${token}`);
		return req.send(body as object);
	};

	const postResolve = (body: unknown, token?: string) => {
		const req = request(baseUrl).post('/internal/credentials/resolve');
		if (token) req.set('Authorization', `Bearer ${token}`);
		return req.send(body as object);
	};

	const postDataTableCall = (body: unknown, token?: string) => {
		const req = request(baseUrl).post('/internal/data-tables/call');
		if (token) req.set('Authorization', `Bearer ${token}`);
		return req.send(body as object);
	};

	it('logs the port it actually bound, not the configured one', () => {
		// Configured as `0`, so the OS picked it: logging the configured value
		// would tell an operator to dial port 0.
		expect(serverLogger.info).toHaveBeenCalledWith(
			expect.stringContaining(`http://127.0.0.1:${server.port}`),
		);
		expect(serverLogger.info).not.toHaveBeenCalledWith(expect.stringContaining(':0'));
	});

	it('logs a server error that is not a failure to bind', () => {
		// Nothing else handles these, so an unlogged one is a silent failure.
		const error = Object.assign(new Error('boom'), { code: 'ECONNRESET' });

		// @ts-expect-error reaching for the server's own error handler
		server.server.emit('error', error);

		expect(serverLogger.error).toHaveBeenCalledWith('Engine v2 control plane server error', {
			error,
		});
	});

	it('serves an open healthcheck', async () => {
		const response = await request(baseUrl).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('accepts a batch from an authenticated data plane', async () => {
		const response = await post({ events }, mintActionToken(authSecret, 'lifecycle-events:write'));

		expect(response.status).toBe(204);
		// Confirms the request reached the relay.
		expect(pushRelay.relay).toHaveBeenCalledExactlyOnceWith(events);
	});

	it.each([
		['no token', undefined],
		[
			'an identity token minted for the other direction',
			mintIdentityToken(authSecret, {
				cpId: 'cp-1',
				tenantId: 'tenant-1',
			}),
		],
		[
			'a token signed with a different secret',
			mintActionToken('b'.repeat(32), 'lifecycle-events:write'),
		],
		[
			'an action token minted for credential reads',
			mintActionToken(authSecret, 'credentials:read'),
		],
	])('rejects %s', async (_label, token) => {
		const response = await post({ events }, token);

		expect(response.status).toBe(401);
		expect(response.body).toEqual({ code: 401, message: 'Unauthenticated' });
	});

	it('rejects a batch the engine schema does not accept', async () => {
		const response = await post(
			{ events: [{ type: 'nope' }] },
			mintActionToken(authSecret, 'lifecycle-events:write'),
		);

		expect(response.status).toBe(400);
	});

	it('does not authenticate the request body before the caller', async () => {
		// An unauthenticated caller must not learn whether its body would validate.
		const response = await post({ events: [{ type: 'nope' }] });

		expect(response.status).toBe(401);
	});

	describe('credential resolve route', () => {
		const body = { credential: { id: 'cred-1' } };

		beforeEach(() => {
			vi.mocked(credentialsController.resolveCredential).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: {} });
				},
			);
		});

		it('hands an authenticated request with its parsed body to the controller', async () => {
			const response = await postResolve(body, mintActionToken(authSecret, 'credentials:read'));

			expect(response.status).toBe(200);
			expect(credentialsController.resolveCredential).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ body }),
				expect.anything(),
			);
		});

		it.each([
			['no token', undefined],
			['a lifecycle token', mintActionToken(authSecret, 'lifecycle-events:write')],
			[
				'a token signed with a different secret',
				mintActionToken('b'.repeat(32), 'credentials:read'),
			],
		])('rejects %s before the controller sees it', async (_label, token) => {
			const response = await postResolve(body, token);

			expect(response.status).toBe(401);
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
		});
	});

	describe('data table call route', () => {
		const body = { call: { kind: 'getColumns', dataTableId: 'dt-1' } };

		beforeEach(() => {
			vi.mocked(dataTablesController.call).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: [] });
				},
			);
		});

		it('hands an authenticated request with its parsed body to the controller', async () => {
			const response = await postDataTableCall(
				body,
				mintActionToken(authSecret, 'data-tables:use'),
			);

			expect(response.status).toBe(200);
			expect(dataTablesController.call).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ body }),
				expect.anything(),
			);
		});

		it.each([
			['no token', undefined],
			['a lifecycle token', mintActionToken(authSecret, 'lifecycle-events:write')],
			['a credentials token', mintActionToken(authSecret, 'credentials:read')],
			[
				'a token signed with a different secret',
				mintActionToken('b'.repeat(32), 'data-tables:use'),
			],
		])('rejects %s before the controller sees it', async (_label, token) => {
			const response = await postDataTableCall(body, token);

			expect(response.status).toBe(401);
			expect(dataTablesController.call).not.toHaveBeenCalled();
		});
	});

	describe('over mutual TLS', () => {
		const loopback = ['DNS:localhost', 'IP:127.0.0.1'];
		let dir: string;
		let certs: TlsCertFiles;

		beforeAll(() => {
			dir = mkdtempSync(join(tmpdir(), 'engine-cp-tls-'));
			certs = generateTlsCerts(dir, { cp: loopback, dp: loopback });
		});

		afterAll(() => rmSync(dir, { recursive: true, force: true }));

		const leaf = (name: string) => ({
			cert: readFileSync(certs.leaves[name].certFile),
			key: readFileSync(certs.leaves[name].keyFile),
		});

		beforeEach(async () => {
			await server.stop();
			await startServer({ ...leaf('cp'), ca: readFileSync(certs.caFile) });
			baseUrl = `https://127.0.0.1:${server.port}`;
		});

		const postAs = (client?: { cert: Buffer; key: Buffer }) => {
			const req = request(baseUrl).post('/internal/status-callback').ca(readFileSync(certs.caFile));
			if (client) req.cert(client.cert).key(client.key);
			return req
				.set('Authorization', `Bearer ${mintActionToken(authSecret, 'lifecycle-events:write')}`)
				.send({ events });
		};

		it('accepts the control plane transport of a data plane with a certificate from the trusted CA', async () => {
			const transport = new EngineControlPlaneTransport(
				engineConfig({ controlPlaneBaseUrl: baseUrl }),
				Container.get(OutboundHttp),
				{ tls: { ...leaf('dp'), ca: readFileSync(certs.caFile) } } as EngineTlsMaterial,
			);

			const response = await transport.forScope('lifecycle-events:write').request({
				url: '/internal/status-callback',
				method: 'POST',
				body: { events },
				json: true,
				returnFullResponse: true,
			});

			expect(response.statusCode).toBe(204);
			expect(pushRelay.relay).toHaveBeenCalledExactlyOnceWith(events);
		});

		it('refuses a control plane certificate from another CA even with NODE_TLS_REJECT_UNAUTHORIZED=0', async () => {
			const otherDir = mkdtempSync(join(tmpdir(), 'engine-cp-tls-other-'));
			try {
				const other = generateTlsCerts(otherDir, { cp: loopback });
				await server.stop();
				await startServer({
					cert: readFileSync(other.leaves.cp.certFile),
					key: readFileSync(other.leaves.cp.keyFile),
					ca: readFileSync(certs.caFile),
				});
				vi.stubEnv('NODE_TLS_REJECT_UNAUTHORIZED', '0');
				const transport = new EngineControlPlaneTransport(
					engineConfig({ controlPlaneBaseUrl: `https://127.0.0.1:${server.port}` }),
					Container.get(OutboundHttp),
					{ tls: { ...leaf('dp'), ca: readFileSync(certs.caFile) } } as EngineTlsMaterial,
				);

				await expect(
					transport.forScope('lifecycle-events:write').request({
						url: '/internal/status-callback',
						method: 'POST',
						body: { events },
						json: true,
					}),
				).rejects.toThrow(/certificate/);
				expect(pushRelay.relay).not.toHaveBeenCalled();
			} finally {
				vi.unstubAllEnvs();
				rmSync(otherDir, { recursive: true, force: true });
			}
		});

		it('rejects a valid token without a client certificate', async () => {
			const response = await postAs();

			expect(response.status).toBe(401);
			expect(pushRelay.relay).not.toHaveBeenCalled();
		});

		it('serves the healthcheck without a client certificate', async () => {
			const response = await request(baseUrl).get('/healthz').ca(readFileSync(certs.caFile));

			expect(response.status).toBe(200);
		});
	});

	it('stops listening when stopped', async () => {
		await server.stop();

		await expect(request(baseUrl).get('/healthz')).rejects.toThrow();
	});
});
