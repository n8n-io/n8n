import type { User } from '@/databases/entities/user';
import { Telemetry } from '@/telemetry';
import { mockInstance } from '@test/mocking';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let authOwnerAgent: SuperAgentTest;
let owner: User;
let admin: User;
let member: User;
mockInstance(Telemetry);

let agents: Record<string, SuperAgentTest> = {};

const testServer = utils.setupTestServer({
	endpointGroups: ['insights', 'license', 'auth'],
	enabledFeatures: [],
});

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	admin = await createUser({ role: 'global:admin' });
	member = await createUser({ role: 'global:member' });
	authOwnerAgent = testServer.authAgentFor(owner);
	agents.owner = authOwnerAgent;
	agents.admin = testServer.authAgentFor(admin);
	agents.member = testServer.authAgentFor(member);
});

describe('GET /insights routes work for owner and admins', () => {
	test.each(['owner', 'member', 'admin'])(
		'Call should work and return empty summary for user %s',
		async (agentName: string) => {
			const authAgent = agents[agentName];
			await authAgent.get('/insights/summary').expect(agentName === 'member' ? 403 : 200);
			await authAgent.get('/insights/by-time').expect(agentName === 'member' ? 403 : 200);
			await authAgent.get('/insights/by-workflow').expect(agentName === 'member' ? 403 : 200);
		},
	);
});

describe('GET /insights/by-worklow', () => {
	test('Call should work with valid query parameters', async () => {
		await authOwnerAgent
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
			await authOwnerAgent.get('/insights/by-workflow').query(queryParams).expect(500);
		},
	);

	test('Call should return bad request with invalid sortby query parameters', async () => {
		await authOwnerAgent
			.get('/insights/by-workflow')
			.query({
				skip: '1',
				take: '20',
				sortBy: 'not_a_sortby',
			})
			.expect(400);
	});
});
