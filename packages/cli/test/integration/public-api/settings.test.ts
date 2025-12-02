import { createMemberWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';
import { N8N_ROOT_VERSION } from '@/constants';

describe('Settings in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

	describe('GET /settings', () => {
		it('if not authenticated, should reject', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/settings');

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('should return the version number from the root package.json', async () => {
			const member = await createMemberWithApiKey();

			const response = await testServer.publicApiAgentFor(member).get('/settings');

			expect(response.status).toBe(200);
			expect(response.body).toEqual({ version: N8N_ROOT_VERSION });
		});
	});
});
