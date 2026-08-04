// Env feature flag deliberately unset: the module loads but must not register
// any routes while N8N_ENV_FEAT_SERVICE_ACCOUNTS is off.
delete process.env.N8N_ENV_FEAT_SERVICE_ACCOUNTS;

import { testDb } from '@n8n/backend-test-utils';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['service-accounts'],
	modules: ['service-accounts'],
});

let ownerAgent: SuperAgentTest;

beforeEach(async () => {
	await testDb.truncate(['ProjectRelation', 'Project', 'User']);
	ownerAgent = testServer.authAgentFor(await createOwner());
});

describe('service-accounts (env flag off)', () => {
	test('GET /service-accounts is unreachable', async () => {
		await ownerAgent.get('/service-accounts').expect(404);
	});

	test('POST /service-accounts is unreachable', async () => {
		await ownerAgent.post('/service-accounts').send({ name: 'Deploy Bot' }).expect(404);
	});

	test('POST /impersonation is unreachable', async () => {
		await ownerAgent.post('/impersonation').send({ serviceAccountId: 'x' }).expect(404);
	});

	test('DELETE /impersonation is unreachable', async () => {
		await ownerAgent.delete('/impersonation').expect(404);
	});
});
