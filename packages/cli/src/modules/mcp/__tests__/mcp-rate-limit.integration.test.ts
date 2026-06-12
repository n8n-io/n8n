/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return -- jest.mock factory */
jest.mock('@n8n/backend-common', () => {
	const actual = jest.requireActual('@n8n/backend-common');
	return {
		...actual,
		inProduction: true,
	};
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

import { mockInstance } from '@n8n/backend-test-utils';

import { setupTestServer } from '@test-integration/utils';

import { McpConfig } from '../mcp.config';

// The route's IP rate limit is baked into the controller's decorator metadata at
// import time, so the config override must be registered before the test server
// imports the controller (which happens in setupTestServer's beforeAll hook).
const RATE_LIMIT = 5;

mockInstance(McpConfig, { rateLimitServer: RATE_LIMIT });

const testServer = setupTestServer({ modules: ['mcp'], endpointGroups: ['mcp'] });

function expectTooManyRequests(status: number, body: unknown) {
	expect(status).toBe(429);
	expect(body).toEqual({ message: 'Too many requests' });
}

describe('MCP server IP rate limiting (production)', () => {
	it('should enforce the configured limit on POST /mcp-server/http', async () => {
		for (let i = 0; i < RATE_LIMIT; i++) {
			const res = await testServer.restlessAgent.post('/mcp-server/http').send({});
			expect(res.status).not.toBe(429);
		}

		const blocked = await testServer.restlessAgent.post('/mcp-server/http').send({});
		expectTooManyRequests(blocked.status, blocked.body);
	});
});
