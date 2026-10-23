import { testDb } from '@n8n/backend-test-utils';
import { PublicApiRateLimitConfig } from '@n8n/config';

import { createMember, createOwner } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

const codeDefaults = { ...new PublicApiRateLimitConfig() };
const { enabled: _enabled, ...limitDefaults } = codeDefaults;

const settings = {
	...codeDefaults,
	enabled: true,
	globalReadLimit: 50,
	endpointWriteLimit: 0,
};

describe('PublicApiRateLimitSettingsController', () => {
	const testServer = setupTestServer({ endpointGroups: ['public-api-rate-limit-settings'] });
	let ownerAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;

	beforeAll(async () => {
		ownerAgent = testServer.authAgentFor(await createOwner());
		memberAgent = testServer.authAgentFor(await createMember());
	});

	beforeEach(async () => {
		await testDb.truncate(['Settings']);
	});

	it('returns the code defaults when nothing is stored', async () => {
		const response = await ownerAgent.get('/settings/policies/rate-limits').expect(200);

		expect(response.body.data).toEqual({
			...codeDefaults,
			defaults: limitDefaults,
			envManagedFields: [],
		});
	});

	it('stores the settings, so a later GET returns them', async () => {
		const putResponse = await ownerAgent
			.put('/settings/policies/rate-limits')
			.send(settings)
			.expect(200);
		const getResponse = await ownerAgent.get('/settings/policies/rate-limits').expect(200);

		expect(putResponse.body.data).toMatchObject(settings);
		expect(getResponse.body.data).toMatchObject(settings);
	});

	it('accepts a GET body sent back as a PUT body', async () => {
		const response = await ownerAgent.get('/settings/policies/rate-limits').expect(200);
		const body = response.body as { data: object };

		await ownerAgent.put('/settings/policies/rate-limits').send(body.data).expect(200);
	});

	it('returns 400 for an invalid value', async () => {
		await ownerAgent
			.put('/settings/policies/rate-limits')
			.send({ ...settings, globalReadWindowSeconds: 0 })
			.expect(400);
	});

	it('returns 400 when rate limiting is turned on with every limit at 0', async () => {
		await ownerAgent
			.put('/settings/policies/rate-limits')
			.send({
				...settings,
				globalReadLimit: 0,
				globalWriteLimit: 0,
				endpointReadLimit: 0,
				endpointWriteLimit: 0,
			})
			.expect(400);
	});

	it.each(['get', 'put'] as const)('returns 403 on %s for a member', async (method) => {
		await memberAgent[method]('/settings/policies/rate-limits').send(settings).expect(403);
	});
});
