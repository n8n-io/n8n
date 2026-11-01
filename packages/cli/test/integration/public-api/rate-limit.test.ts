import { PublicApiRateLimitConfig } from '@n8n/config';
import { Settings, SettingsRepository } from '@n8n/db';

import { PUBLIC_API_RATE_LIMIT_SETTINGS_KEY } from '@/public-api/public-api-rate-limit-settings.service';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils/';

// The settings load in the test server's `beforeAll`, before any test can insert a row.
const findByKey = SettingsRepository.prototype.findByKey;
const storedRowAtStartup = vi
	.spyOn(SettingsRepository.prototype, 'findByKey')
	.mockImplementation(async function (this: SettingsRepository, key, em) {
		if (key !== PUBLIC_API_RATE_LIMIT_SETTINGS_KEY) return await findByKey.call(this, key, em);
		return Object.assign(new Settings(), {
			key,
			value: JSON.stringify({
				...new PublicApiRateLimitConfig(),
				enabled: true,
				globalReadLimit: 2,
			}),
			loadOnStartup: false,
		});
	});

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi', 'public-api-rate-limit-settings'],
});

beforeAll(() => {
	storedRowAtStartup.mockRestore();
});

describe('Public API rate limiting', () => {
	describe('stored settings', () => {
		test('should apply the stored settings at startup', async () => {
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

	describe('settings change', () => {
		test('should apply saved limits without a restart', async () => {
			const owner = await createOwnerWithApiKey();
			const settingsApi = testServer.authAgentFor(owner);
			const publicApi = testServer.publicApiAgentFor(owner);

			await settingsApi
				.put('/settings/policies/rate-limits')
				.send({ ...new PublicApiRateLimitConfig(), enabled: false })
				.expect(200);
			expect((await publicApi.get('/tags')).statusCode).toBe(200);

			await settingsApi
				.put('/settings/policies/rate-limits')
				.send({ ...new PublicApiRateLimitConfig(), enabled: true, globalReadLimit: 1 })
				.expect(200);

			expect((await publicApi.get('/tags')).statusCode).toBe(200);
			expect((await publicApi.get('/tags')).statusCode).toBe(429);
		});
	});
});
