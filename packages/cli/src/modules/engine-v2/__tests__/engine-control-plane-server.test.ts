import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import { mintActionToken, mintIdentityToken, type LifecycleEvent } from '@n8n/engine';
import request from 'supertest';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneServer } from '../engine-control-plane-server';
import type { EngineLifecycleEventPushRelay } from '../engine-lifecycle-event-push-relay';
import { EngineLifecycleEventController } from '../engine-lifecycle-event.controller';

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
		pushRelay = mock<EngineLifecycleEventPushRelay>();
		const controller = new EngineLifecycleEventController(pushRelay);
		server = new EngineControlPlaneServer(
			engineConfig(),
			controller,
			mock<Logger>({ scoped: vi.fn().mockReturnValue(serverLogger) }),
		);
		await server.start();

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

		expect(serverLogger.error).toHaveBeenCalledWith('Engine 2.0 control plane server error', {
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

	it('stops listening when stopped', async () => {
		await server.stop();

		await expect(request(baseUrl).get('/healthz')).rejects.toThrow();
	});
});
