import { Container } from '@n8n/di';

import type { User } from '@/databases/entities/user';
import { InsightsService } from '@/modules/insights/insights.service';
import { Telemetry } from '@/telemetry';
import { mockInstance } from '@test/mocking';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let owner: User;
let member: User;
mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['insights', 'license', 'auth'],
	enabledFeatures: [],
});

let insightsService: InsightsService;

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);

	insightsService = Container.get(InsightsService);
});

describe('GET /insights/summary', () => {
	test('Call should work and return empty summary for owner user', async () => {
		await authOwnerAgent.get('/insights/summary').expect(200);
		await authOwnerAgent.get('/insights/by-time').expect(200);
		await authOwnerAgent.get('/insights/by-workflow').expect(200);
	});

	test('Call should return forbidden and return empty summary for member user', async () => {
		await authMemberAgent.get('/insights/summary').expect(403);
		await authMemberAgent.get('/insights/by-time').expect(403);
		await authMemberAgent.get('/insights/by-workflow').expect(403);
	});
});
