import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import type { IdentityVerifier } from '../../auth';
import type {
	CancelExecutionService,
	ExecutionQueryService,
	StartExecutionService,
} from '../../execution';
import { createEngineServer, type EngineServerDeps } from '../create-engine-server';

function deps(identityVerifier: IdentityVerifier): EngineServerDeps {
	return {
		identityVerifier,
		startExecution: { start: vi.fn() } as unknown as StartExecutionService,
		cancelExecution: { cancel: vi.fn() } as unknown as CancelExecutionService,
		executionQuery: {} as ExecutionQueryService,
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	};
}

describe('engine server request middleware', () => {
	it('runs before authentication and body parsing but not on health requests', async () => {
		const calls: string[] = [];
		const verify = vi.fn(() => {
			calls.push('verify');
			throw new Error('invalid');
		});
		const middleware = vi.fn((req, _res, next) => {
			calls.push('middleware');
			expect(req.body).toBeUndefined();
			expect(req.caller).toBeUndefined();
			next();
		});
		const { app } = createEngineServer({ ...deps({ verify }), requestMiddleware: middleware });
		await request(app).get('/healthz').expect(200);
		expect(middleware).not.toHaveBeenCalled();
		const response = await request(app)
			.post('/api/workflow-executions')
			.set('Authorization', 'Bearer invalid')
			.set('Content-Type', 'application/json')
			.send('{');
		expect(response.status).toBe(401);
		expect(response.body).toEqual({ error: 'unauthenticated' });
		expect(calls).toEqual(['middleware', 'verify']);
	});

	it('keeps body validation after successful authentication', async () => {
		const verify = vi.fn(() => ({ cpId: 'cp-1', tenantId: 'tenant-1' }));
		const middleware = vi.fn((_req, _res, next) => next());
		const { app } = createEngineServer({ ...deps({ verify }), requestMiddleware: middleware });
		await request(app)
			.post('/api/workflow-executions')
			.set('Authorization', 'Bearer valid')
			.send({})
			.expect(400);
		expect(middleware).toHaveBeenCalledOnce();
		expect(verify).toHaveBeenCalledExactlyOnceWith('valid');
	});

	it('keeps the authentication behavior when middleware is absent', async () => {
		const verify = vi.fn();
		const { app } = createEngineServer(deps({ verify }));
		await request(app)
			.post('/api/workflow-executions')
			.set('Content-Type', 'application/json')
			.send('{')
			.expect(401);
		expect(verify).not.toHaveBeenCalled();
	});
});
