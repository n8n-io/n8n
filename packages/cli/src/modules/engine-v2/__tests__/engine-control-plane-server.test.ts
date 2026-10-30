import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import { mintActionToken, mintIdentityToken } from '@n8n/engine';
import type { Request, Response } from 'express';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneServer } from '../engine-control-plane-server';
import type { EngineCredentialsController } from '../engine-credentials.controller';

const authSecret = 'a'.repeat(32);

/** Binds for real, so these exercise the wiring rather than a mock app. */
describe('EngineControlPlaneServer', () => {
	let server: EngineControlPlaneServer;
	let serverLogger: Logger;
	let credentialsController: EngineCredentialsController;
	let baseUrl: string;

	const engineConfig = (overrides: Partial<EngineConfig> = {}) =>
		mock<EngineConfig>({
			authSecret,
			controlPlaneHost: '127.0.0.1',
			// Port 0: the OS picks a free one, so parallel files cannot clash.
			controlPlanePort: 0,
			...overrides,
		});

	beforeEach(async () => {
		serverLogger = mock<Logger>();
		credentialsController = mock<EngineCredentialsController>();
		server = new EngineControlPlaneServer(
			engineConfig(),
			credentialsController,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(serverLogger) }),
		);
		await server.start();

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
			const response = await postResolve('not json');

			expect(response.status).toBe(401);
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

	it('stops listening when stopped', async () => {
		await server.stop();

		await expect(request(baseUrl).get('/healthz')).rejects.toThrow();
	});
});
