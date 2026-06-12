jest.mock('@n8n/backend-common', () => {
	const actual = jest.requireActual('@n8n/backend-common');
	return {
		...actual,
		inProduction: true,
	};
});

import { mockInstance } from '@n8n/backend-test-utils';

import { setupTestServer } from '@test-integration/utils';

import { OAuthServerConfig } from '../oauth-server.config';

// The static routers' IP rate limits are baked into the controller's metadata at
// import time, so the config override must be registered before the test server
// imports the controller (which happens in setupTestServer's beforeAll hook).
const RATE_LIMIT = 5;

mockInstance(OAuthServerConfig, {
	rateLimitRegister: RATE_LIMIT,
	rateLimitAuthorize: RATE_LIMIT,
	rateLimitToken: RATE_LIMIT,
	rateLimitRevoke: RATE_LIMIT,
});

const testServer = setupTestServer({ modules: ['oauth-server', 'mcp'], endpointGroups: ['mcp'] });

function expectTooManyRequests(status: number, body: unknown) {
	expect(status).toBe(429);
	expect(body).toEqual({ message: 'Too many requests' });
}

describe('OAuth server IP rate limiting (production)', () => {
	it.each([
		['POST', '/mcp-oauth/token'],
		['POST', '/mcp-oauth/authorize'],
		['POST', '/mcp-oauth/revoke'],
	] as const)('should enforce the configured limit on %s %s', async (_method, path) => {
		for (let i = 0; i < RATE_LIMIT; i++) {
			const res = await testServer.restlessAgent.post(path).send({});
			expect(res.status).not.toBe(429);
		}

		const blocked = await testServer.restlessAgent.post(path).send({});
		expectTooManyRequests(blocked.status, blocked.body);
	});

	it('should rate limit the neutral /oauth/* prefix independently of /mcp-oauth/*', async () => {
		// Exhaust the /mcp-oauth/token limit.
		for (let i = 0; i <= RATE_LIMIT; i++) {
			await testServer.restlessAgent.post('/mcp-oauth/token').send({});
		}
		const mcpBlocked = await testServer.restlessAgent.post('/mcp-oauth/token').send({});
		expectTooManyRequests(mcpBlocked.status, mcpBlocked.body);

		// The /oauth/token prefix has its own counter and is still serving.
		const neutral = await testServer.restlessAgent.post('/oauth/token').send({});
		expect(neutral.status).not.toBe(429);
	});
});
