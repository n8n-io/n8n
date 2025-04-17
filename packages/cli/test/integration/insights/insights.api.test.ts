import { Telemetry } from '@/telemetry';
import { mockInstance } from '@test/mocking';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

mockInstance(Telemetry);

let agents: Record<string, SuperAgentTest> = {};
const testServer = utils.setupTestServer({
	endpointGroups: ['insights', 'license', 'auth'],
	enabledFeatures: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
});

beforeAll(async () => {
	const owner = await createUser({ role: 'global:owner' });
	const admin = await createUser({ role: 'global:admin' });
	const member = await createUser({ role: 'global:member' });
	agents.owner = testServer.authAgentFor(owner);
	agents.admin = testServer.authAgentFor(admin);
	agents.member = testServer.authAgentFor(member);
});

describe('GET /insights routes work for owner and admins for server with dashboard license', () => {
	test.each(['owner', 'admin', 'member'])(
		'Call should work and return empty summary for user %s',
		async (agentName: string) => {
			const authAgent = agents[agentName];
			await authAgent.get('/insights/summary').expect(agentName.includes('member') ? 403 : 200);
			await authAgent.get('/insights/by-time').expect(agentName.includes('member') ? 403 : 200);
			await authAgent.get('/insights/by-workflow').expect(agentName.includes('member') ? 403 : 200);
		},
	);
});

describe('GET /insights routes return 403 for dashboard routes when summary license only', () => {
	beforeAll(() => {
		testServer.license.setDefaults({ features: ['feat:insights:viewSummary'] });
	});
	test.each(['owner', 'admin', 'member'])(
		'Call should work and return empty summary for user %s',
		async (agentName: string) => {
			const authAgent = agents[agentName];
			await authAgent.get('/insights/summary').expect(agentName.includes('member') ? 403 : 200);
			await authAgent.get('/insights/by-time').expect(403);
			await authAgent.get('/insights/by-workflow').expect(403);
		},
	);
});

describe('GET /insights/by-workflow', () => {
	beforeAll(() => {
		testServer.license.setDefaults({
			features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
		});
	});
	test('Call should work with valid query parameters', async () => {
		await agents.owner
			.get('/insights/by-workflow')
			.query({ skip: '10', take: '20', sortBy: 'total:desc' })
			.expect(200);
	});

	test.each<{ skip: string; take?: string; sortBy?: string }>([
		{
			skip: 'not_a_number',
			take: '20',
		},
		{
			skip: '1',
			take: 'not_a_number',
		},
	])(
		'Call should return internal server error with invalid pagination query parameters',
		async (queryParams) => {
			await agents.owner.get('/insights/by-workflow').query(queryParams).expect(500);
		},
	);

	test('Call should return bad request with invalid sortby query parameters', async () => {
		await agents.owner
			.get('/insights/by-workflow')
			.query({
				skip: '1',
				take: '20',
				sortBy: 'not_a_sortby',
			})
			.expect(400);
	});
});
