import { PublicApiRateLimitConfig } from '@n8n/config';
import { Settings, SettingsRepository } from '@n8n/db';

import { PUBLIC_API_RATE_LIMIT_SETTINGS_KEY } from '@/public-api/public-api-rate-limit-settings.service';

import { createOwnerWithApiKey } from '../shared/db/users';
import * as utils from '../shared/utils/';

// The routes are registered in the test server's `beforeAll`, so the stored row must exist before
// any test can insert one.
const findByKey = SettingsRepository.prototype.findByKey;
vi.spyOn(SettingsRepository.prototype, 'findByKey').mockImplementation(async function (
	this: SettingsRepository,
	key,
	em,
) {
	if (key !== PUBLIC_API_RATE_LIMIT_SETTINGS_KEY) return await findByKey.call(this, key, em);
	return Object.assign(new Settings(), {
		key,
		value: JSON.stringify({ ...new PublicApiRateLimitConfig(), enabled: true, globalReadLimit: 1 }),
		loadOnStartup: false,
	});
});

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

describe('Public API rate limiting from stored settings', () => {
	test('should apply the stored settings when the routes are registered', async () => {
		const owner = await createOwnerWithApiKey();
		const agent = testServer.publicApiAgentFor(owner);

		expect((await agent.get('/tags')).statusCode).toBe(200);
		expect((await agent.get('/tags')).statusCode).toBe(429);
	});
});
