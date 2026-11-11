import type { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mintActionToken, mintIdentityToken } from '@n8n/engine';
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
import type { EngineSubWorkflowController } from '../engine-sub-workflow.controller';
import type { EngineTlsMaterial } from '../engine-tls-material';

const authSecret = 'a'.repeat(32);

/** Binds for real, so these exercise the wiring rather than a mock app. */
describe('EngineControlPlaneServer', () => {
	let server: EngineControlPlaneServer;
	let serverLogger: Logger;
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
			credentialsController,
			dataTablesController,
			mock<EngineSubWorkflowController>(),
			mock<Logger>({ scoped: vi.fn().mockReturnValue(serverLogger) }),
		);
		await server.start();
	};

	beforeEach(async () => {
		serverLogger = mock<Logger>();
		credentialsController = mock<EngineCredentialsController>();
		dataTablesController = mock<EngineDataTablesController>();
		await startServer();

		baseUrl = `http://127.0.0.1:${server.port}`;
	});

	afterEach(async () => {
		await server.stop();
	});

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

	it('no longer accepts lifecycle events over HTTP', async () => {
		const response = await request(baseUrl)
			.post('/internal/status-callback')
			.set('Authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`)
			.send({ events: [] });

		expect(response.status).toBe(404);
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

		it('does not read the request body before it authenticates the caller', async () => {
			// Malformed JSON: a parser that ran first would fail on it, not return a 401.
			const response = await request(baseUrl)
				.post('/internal/credentials/resolve')
				.set('Content-Type', 'application/json')
				.send('not json');

			expect(response.status).toBe(401);
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
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
			[
				'an identity token minted for the other direction',
				mintIdentityToken(authSecret, { cpId: 'cp-1', tenantId: 'tenant-1' }),
			],
			[
				'a token signed with a different secret',
				mintActionToken('b'.repeat(32), 'credentials:read'),
			],
		])('rejects %s before the controller sees it', async (_label, token) => {
			const response = await postResolve(body, token);

			expect(response.status).toBe(401);
			expect(response.body).toEqual({ code: 401, message: 'Unauthenticated' });
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
			[
				'an identity token minted for the other direction',
				mintIdentityToken(authSecret, { cpId: 'cp-1', tenantId: 'tenant-1' }),
			],
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
		const body = { credential: { id: 'cred-1' } };
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

		const dataPlaneTransport = (controlPlaneBaseUrl: string) =>
			new EngineControlPlaneTransport(
				engineConfig({ controlPlaneBaseUrl }),
				Container.get(OutboundHttp),
				{ tls: { ...leaf('dp'), ca: readFileSync(certs.caFile) } } as EngineTlsMaterial,
			);

		const resolveVia = async (transport: EngineControlPlaneTransport) =>
			await transport.forScope('credentials:read').request({
				url: '/internal/credentials/resolve',
				method: 'POST',
				body,
				json: true,
				returnFullResponse: true,
			});

		beforeEach(async () => {
			vi.mocked(credentialsController.resolveCredential).mockImplementation(
				async (_req: Request, res: Response) => {
					res.status(200).json({ data: {} });
				},
			);
			await server.stop();
			await startServer({ ...leaf('cp'), ca: readFileSync(certs.caFile) });
			baseUrl = `https://127.0.0.1:${server.port}`;
		});

		it('accepts the control plane transport of a data plane with a certificate from the trusted CA', async () => {
			const response = await resolveVia(dataPlaneTransport(baseUrl));

			expect(response.statusCode).toBe(200);
			expect(credentialsController.resolveCredential).toHaveBeenCalledOnce();
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

				await expect(
					resolveVia(dataPlaneTransport(`https://127.0.0.1:${server.port}`)),
				).rejects.toThrow(/certificate/);
				expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
			} finally {
				vi.unstubAllEnvs();
				rmSync(otherDir, { recursive: true, force: true });
			}
		});

		it('rejects a valid token without a client certificate', async () => {
			const response = await request(baseUrl)
				.post('/internal/credentials/resolve')
				.ca(readFileSync(certs.caFile))
				.set('Authorization', `Bearer ${mintActionToken(authSecret, 'credentials:read')}`)
				.send(body);

			expect(response.status).toBe(401);
			expect(credentialsController.resolveCredential).not.toHaveBeenCalled();
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
