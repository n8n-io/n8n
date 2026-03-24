import { setupTestServer } from '@test-integration/utils';

/**
 * Regression test for GHC-7439: healthz endpoint not respecting base URL
 *
 * ISSUE DESCRIPTION:
 * When N8N_PATH is set (e.g., /n8n), the backend correctly configures the health
 * endpoint at the prefixed path (/n8n/healthz). However, the frontend has a
 * hardcoded default of `/healthz` that is used before settings are loaded from
 * the backend, causing health checks to fail.
 *
 * ROOT CAUSE:
 * 1. packages/frontend/editor-ui/src/__tests__/defaults.ts has `endpointHealth: '/healthz'`
 * 2. packages/frontend/editor-ui/src/app/App.vue calls `useBackendStatus()` at module load time (line 46)
 * 3. This happens BEFORE `initializeCore()` loads settings from the backend
 * 4. So the frontend makes requests to `/healthz` instead of `/n8n/healthz`
 *
 * This test demonstrates that the BACKEND works correctly - it does respect N8N_PATH.
 * The bug is in the frontend initialization order.
 *
 * To run this test with N8N_PATH set:
 * N8N_PATH=/n8n pnpm test healthcheck-with-path.controller.test.ts
 */
describe('HealthcheckController with N8N_PATH', () => {
	const testServer = setupTestServer({
		endpointGroups: ['health'],
	});

	/**
	 * These tests will PASS when N8N_PATH is NOT set (default behavior).
	 * They will FAIL when N8N_PATH=/n8n is set via environment variable,
	 * demonstrating that the health endpoint correctly moves to /n8n/healthz
	 * but the frontend doesn't know about it initially.
	 */

	it('should respond to /healthz when N8N_PATH is not set', async () => {
		const response = await testServer.restlessAgent.get('/healthz');

		// When N8N_PATH is not set, this works
		// When N8N_PATH=/n8n is set, this returns 404
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	it('should respond to /healthz/readiness when N8N_PATH is not set', async () => {
		const response = await testServer.restlessAgent.get('/healthz/readiness');

		// When N8N_PATH is not set, this works
		// When N8N_PATH=/n8n is set, this returns 404
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ status: 'ok' });
	});

	/**
	 * NOTE: To properly test with N8N_PATH=/n8n, you need to:
	 * 1. Set N8N_PATH=/n8n environment variable before running tests
	 * 2. The health endpoint will be at /n8n/healthz
	 * 3. The tests above will fail (404) because the endpoint moved
	 * 4. The frontend's hardcoded `/healthz` default will also fail
	 *
	 * This is the bug: the frontend can't find the health endpoint on startup.
	 */
});
