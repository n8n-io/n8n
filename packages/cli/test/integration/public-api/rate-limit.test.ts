import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils/';

Object.assign(Container.get(GlobalConfig).publicApi.rateLimit, {
	enabled: true,
	globalReadLimit: 2,
});

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

describe('Public API rate limiting', () => {
	test('should return 429 when an API key goes over the all-endpoints read limit', async () => {
		const owner = await createOwnerWithApiKey();
		const agent = testServer.publicApiAgentFor(owner);

		const [response1, response2] = await Promise.all([agent.get('/tags'), agent.get('/tags')]);
		expect(response1.statusCode).toBe(200);
		expect(response2.statusCode).toBe(200);

		const rateLimitedResponse = await agent.get('/tags');

		expect(rateLimitedResponse.statusCode).toBe(429);
		expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
		expect(rateLimitedResponse.headers['x-ratelimit-limit']).toBe('2');
	});
});
