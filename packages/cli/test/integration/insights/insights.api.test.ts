import type { InsightsDateRange } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';

import { Telemetry } from '@/telemetry';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

mockInstance(Telemetry);

let agents: Record<string, SuperAgentTest> = {};
const testServer = utils.setupTestServer({
	endpointGroups: ['insights', 'license', 'auth'],
	enabledFeatures: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
	quotas: { 'quota:insights:maxHistoryDays': 365 },
	modules: ['insights'],
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
			await authAgent
				.get('/insights/by-time/time-saved')
				.expect(agentName.includes('member') ? 403 : 200);
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
			await authAgent
				.get('/insights/by-time/time-saved')
				.expect(agentName.includes('member') ? 403 : 200);
			await authAgent.get('/insights/by-workflow').expect(403);
		},
	);
});

describe('GET /insights routes return 403 if date range outside license limits', () => {
	beforeAll(() => {
		testServer.license.setDefaults({ quotas: { 'quota:insights:maxHistoryDays': 3 } });
	});

	test('Call should throw forbidden for default week insights', async () => {
		const authAgent = agents.admin;
		await authAgent.get('/insights/summary').expect(403);
		await authAgent.get('/insights/by-time').expect(403);
		await authAgent.get('/insights/by-time/time-saved').expect(403);
		await authAgent.get('/insights/by-workflow').expect(403);
	});

	test('Call should throw forbidden for daily data without viewHourlyData enabled', async () => {
		const authAgent = agents.admin;
		await authAgent.get('/insights/summary?dateRange=day').expect(403);
		await authAgent.get('/insights/by-time?dateRange=day').expect(403);
		await authAgent.get('/insights/by-time/time-saved?dateRange=day').expect(403);
		await authAgent.get('/insights/by-workflow?dateRange=day').expect(403);
	});
});

describe('GET /insights routes return 200 if date range inside license limits', () => {
	beforeAll(() => {
		testServer.license.setDefaults({
			features: [
				'feat:insights:viewSummary',
				'feat:insights:viewDashboard',
				'feat:insights:viewHourlyData',
			],
			quotas: { 'quota:insights:maxHistoryDays': 365 },
		});
	});

	test.each<InsightsDateRange['key']>([
		'day',
		'week',
		'2weeks',
		'month',
		'quarter',
		'6months',
		'year',
	])('Call should work for date range %s', async (dateRange) => {
		const authAgent = agents.admin;
		await authAgent.get(`/insights/summary?dateRange=${dateRange}`).expect(200);
		await authAgent.get(`/insights/by-time?dateRange=${dateRange}`).expect(200);
		await authAgent.get(`/insights/by-time/time-saved?dateRange=${dateRange}`).expect(200);
		await authAgent.get(`/insights/by-workflow?dateRange=${dateRange}`).expect(200);
	});
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
		'Call should return bad request with invalid pagination query parameters',
		async (queryParams) => {
			await agents.owner.get('/insights/by-workflow').query(queryParams).expect(400);
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
