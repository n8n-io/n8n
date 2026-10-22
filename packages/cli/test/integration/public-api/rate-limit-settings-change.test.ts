import { testDb } from '@n8n/backend-test-utils';
import { PublicApiRateLimitConfig } from '@n8n/config';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils/';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi', 'public-api-rate-limit-settings'],
});

describe('Public API rate limiting after a settings change', () => {
	beforeEach(async () => {
		await testDb.truncate(['Settings']);
	});

	test('should apply saved limits without a restart', async () => {
		const owner = await createOwnerWithApiKey();
		const publicApi = testServer.publicApiAgentFor(owner);
		expect((await publicApi.get('/tags')).statusCode).toBe(200);

		await testServer
			.authAgentFor(owner)
			.put('/settings/policies/rate-limits')
			.send({ ...new PublicApiRateLimitConfig(), enabled: true, globalReadLimit: 1 })
			.expect(200);

		expect((await publicApi.get('/tags')).statusCode).toBe(200);
		expect((await publicApi.get('/tags')).statusCode).toBe(429);
	});
});
