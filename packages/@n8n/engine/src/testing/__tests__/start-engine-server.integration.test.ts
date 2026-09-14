import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SharedSecretIdentityVerifier } from '../../auth';
import type { ExecutionQueryService, StartExecutionService } from '../../execution';
import { startEngineServer } from '../start-engine-server';

describe('engine HTTP server (e2e)', () => {
	let url: string;
	let stop: () => Promise<void>;

	beforeAll(async () => {
		// only /healthz is under test, and the execution routes never call these
		({ url, stop } = await startEngineServer({
			startExecution: {} as StartExecutionService,
			executionQuery: {} as ExecutionQueryService,
			identityVerifier: new SharedSecretIdentityVerifier('a'.repeat(32)),
		}));
	});

	afterAll(async () => {
		await stop();
	});

	it('responds to GET /healthz with { status: "ok" }', async () => {
		const response = await request(url).get('/healthz');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});
});
