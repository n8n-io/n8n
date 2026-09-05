import type { InsightsDateRange } from '@n8n/api-types';
import {
	mockInstance,
	createWorkflow,
	createTeamProject,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { GLOBAL_ADMIN_ROLE, GLOBAL_MEMBER_ROLE, GLOBAL_OWNER_ROLE } from '@n8n/db';
import { DateTime } from 'luxon';

import { createCompactedInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';
import type { InsightsByPeriod } from '@/modules/insights/database/entities/insights-by-period';
import { Telemetry } from '@/telemetry';

import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

mockInstance(Telemetry);

const agents: Record<string, SuperAgentTest> = {};
const testServer = utils.setupTestServer({
	endpointGroups: ['insights', 'license', 'auth'],
	enabledFeatures: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
	quotas: { 'quota:insights:maxHistoryDays': 365 },
	modules: ['insights'],
});

const truncateDatabase = async () => {
	await testDb.truncate([
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'SharedWorkflow',
		'WorkflowEntity',
		'Project',
	]);
};

beforeAll(async () => {
	const owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	const admin = await createUser({ role: GLOBAL_ADMIN_ROLE });
	const member = await createUser({ role: GLOBAL_MEMBER_ROLE });
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

describe('GET /insights/summary', () => {
	describe('scopes results by project access', () => {
		let insightsViewer: SuperAgentTest;
		let accessibleProject: Project;
		let inaccessibleProject: Project;

		let accessibleWorkflowInsights: InsightsByPeriod;

		beforeAll(async () => {
			testServer.license.setDefaults({
				features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
				quotas: { 'quota:insights:maxHistoryDays': 365 },
			});

			// A global role granting only the insights view scopes, and no workflow access
			const insightsRole = await createCustomRoleWithScopeSlugs(
				['insights:list', 'insights:read'],
				{
					roleType: 'global',
				},
			);
			const viewer = await createUser({ role: insightsRole });
			insightsViewer = testServer.authAgentFor(viewer);

			accessibleProject = await createTeamProject();
			inaccessibleProject = await createTeamProject();
			await linkUserToProject(viewer, accessibleProject, 'project:viewer');

			const accessibleWorkflow = await createWorkflow({}, accessibleProject);
			const inaccessibleWorkflow = await createWorkflow({}, inaccessibleProject);

			const periodStart = DateTime.utc().startOf('day');
			accessibleWorkflowInsights = await createCompactedInsightsEvent(accessibleWorkflow, {
				type: 'success',
				value: 1,
				periodUnit: 'day',
				periodStart,
			});
			await createCompactedInsightsEvent(inaccessibleWorkflow, {
				type: 'success',
				value: 5,
				periodUnit: 'day',
				periodStart,
			});
		});

		test('should return the summary for a project the user can read', async () => {
			const response = await insightsViewer
				.get('/insights/summary')
				.query({ projectId: accessibleProject.id })
				.expect(200);

			expect(response.body.data.total.value).toBe(accessibleWorkflowInsights.value);
		});

		test('should return 403 for a project the user cannot read', async () => {
			await insightsViewer
				.get('/insights/summary')
				.query({ projectId: inaccessibleProject.id })
				.expect(403);
		});

		test('should respond the same for an unknown project id as for an inaccessible one', async () => {
			await insightsViewer
				.get('/insights/summary')
				.query({ projectId: 'non-existing-project-id' })
				.expect(403);
		});

		test('should return the summary when no project is requested', async () => {
			const response = await insightsViewer.get('/insights/summary').expect(200);

			expect(response.body.data.total.value).toBe(accessibleWorkflowInsights.value);
			expect(response.body.data.billable.value).toBe(0);
		});

		afterAll(async () => {
			await truncateDatabase();
		});
	});

	test('returns billable independently of total', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 10,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 1 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 1 }),
		});
		await createCompactedInsightsEvent(workflow, {
			type: 'billable',
			value: 9,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 1 }),
		});

		const response = await agents.owner
			.get('/insights/summary')
			.query({
				startDate: DateTime.utc().minus({ days: 2 }).toISO(),
				endDate: DateTime.utc().plus({ days: 1 }).toISO(),
			})
			.expect(200);

		expect(response.body.data.total.value).toBe(12);
		expect(response.body.data.billable.value).toBe(9);
		expect(response.body.data.billable.unit).toBe('count');

		await truncateDatabase();
	});
});

describe('GET /insights/by-workflow', () => {
	beforeAll(() => {
		testServer.license.setDefaults({
			features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
		});
	});

	test.each([
		{
			skip: '10',
			take: '20',
			sortBy: 'total:desc',
		},
		{
			skip: '1',
			take: '25',
			sortBy: 'workflowName:asc',
		},
	])('Call should work with valid query parameters: %s', async (queryParams) => {
		await agents.owner.get('/insights/by-workflow').query(queryParams).expect(200);
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

	test.each([
		'total:asc',
		'total:desc',
		'succeeded:asc',
		'succeeded:desc',
		'failed:asc',
		'failed:desc',
		'failureRate:asc',
		'failureRate:desc',
		'timeSaved:asc',
		'timeSaved:desc',
		'runTime:asc',
		'runTime:desc',
		'averageRunTime:asc',
		'averageRunTime:desc',
		'workflowName:asc',
		'workflowName:desc',
	])('Call should return 200 with valid sortBy option: %s', async (sortBy) => {
		const response = await agents.owner.get('/insights/by-workflow').query({ sortBy }).expect(200);

		expect(response.body).toHaveProperty('data');
		expect(response.body.data).toHaveProperty('count');
		expect(Array.isArray(response.body.data.data)).toBe(true);
	});

	describe('sorting order verification', () => {
		afterEach(async () => {
			await truncateDatabase();
		});

		test('should return workflows sorted by total:desc', async () => {
			const project = await createTeamProject('Test Project 1');
			const testData = [
				{ name: 'Workflow A', total: 10 },
				{ name: 'Workflow B', total: 5 },
				{ name: 'Workflow C', total: 15 },
			];

			const workflows = await Promise.all(
				testData.map(async (data) => await createWorkflow({ name: data.name }, project)),
			);

			const periodStart = DateTime.utc().startOf('day');

			await Promise.all(
				workflows.map(
					async (workflow, index) =>
						await createCompactedInsightsEvent(workflow, {
							type: 'success',
							value: testData[index].total,
							periodUnit: 'day',
							periodStart,
						}),
				),
			);

			const response = await agents.owner
				.get('/insights/by-workflow')
				.query({ sortBy: 'total:desc' })
				.expect(200);

			expect(response.body.data.count).toBe(3);
			expect(response.body.data.data).toHaveLength(3);

			// Verify descending order by total
			const expectedOrder = [15, 10, 5];
			response.body.data.data.forEach((item: any, index: number) => {
				expect(item.total).toBe(expectedOrder[index]);
			});
		});

		test('should return workflows sorted by workflowName:asc', async () => {
			const project = await createTeamProject('Test Project A');
			const workflowNames = ['Zebra Workflow', 'Alpha Workflow', 'Beta Workflow'];

			const workflows = await Promise.all(
				workflowNames.map(async (name) => await createWorkflow({ name }, project)),
			);

			const periodStart = DateTime.utc().startOf('day');

			await Promise.all(
				workflows.map(
					async (workflow) =>
						await createCompactedInsightsEvent(workflow, {
							type: 'success',
							value: 5,
							periodUnit: 'day',
							periodStart,
						}),
				),
			);

			const response = await agents.owner
				.get('/insights/by-workflow')
				.query({ sortBy: 'workflowName:asc' })
				.expect(200);

			expect(response.body.data.count).toBe(3);
			expect(response.body.data.data).toHaveLength(3);

			// Verify ascending order by workflow name
			const expectedOrder = ['Alpha Workflow', 'Beta Workflow', 'Zebra Workflow'];
			response.body.data.data.forEach((item: any, index: number) => {
				expect(item.workflowName).toBe(expectedOrder[index]);
			});
		});

		test('should return workflows sorted by failureRate:asc', async () => {
			const project = await createTeamProject('Another Test Project');
			const testData = [
				{ name: 'Low Failure', success: 9, failure: 1 }, // 10% failure rate
				{ name: 'High Failure', success: 2, failure: 8 }, // 80% failure rate
				{ name: 'Medium Failure', success: 5, failure: 5 }, // 50% failure rate
			];

			const workflows = await Promise.all(
				testData.map(async (data) => await createWorkflow({ name: data.name }, project)),
			);

			const periodStart = DateTime.utc().startOf('day');

			// Create insights events for each workflow individually to avoid race conditions
			for (const [index, workflow] of workflows.entries()) {
				const data = testData[index];

				await createCompactedInsightsEvent(workflow, {
					type: 'success',
					value: data.success,
					periodUnit: 'day',
					periodStart,
				});

				await createCompactedInsightsEvent(workflow, {
					type: 'failure',
					value: data.failure,
					periodUnit: 'day',
					periodStart,
				});
			}

			const response = await agents.owner
				.get('/insights/by-workflow')
				.query({ sortBy: 'failureRate:asc' })
				.expect(200);

			expect(response.body.data.count).toBe(3);
			expect(response.body.data.data).toHaveLength(3);

			// Verify ascending order by failure rate
			const expectedOrder = [0.1, 0.5, 0.8]; // 10%, 50%, 80%
			response.body.data.data.forEach((item: any, index: number) => {
				expect(item.failureRate).toBe(expectedOrder[index]);
			});
		});
	});

	describe('scopes results by project access', () => {
		let insightsViewer: SuperAgentTest;
		let accessibleProject: Project;
		let inaccessibleProject: Project;
		let inaccessibleWorkflowName: string;

		let accessibleWorkflowInsights: InsightsByPeriod;

		beforeAll(async () => {
			testServer.license.setDefaults({
				features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
				quotas: { 'quota:insights:maxHistoryDays': 365 },
			});

			// A global role granting only the insights view scopes, and no workflow access
			const insightsRole = await createCustomRoleWithScopeSlugs(
				['insights:list', 'insights:read'],
				{
					roleType: 'global',
				},
			);
			const viewer = await createUser({ role: insightsRole });
			insightsViewer = testServer.authAgentFor(viewer);

			accessibleProject = await createTeamProject();
			inaccessibleProject = await createTeamProject();
			await linkUserToProject(viewer, accessibleProject, 'project:viewer');

			const accessibleWorkflow = await createWorkflow({}, accessibleProject);
			const inaccessibleWorkflow = await createWorkflow(
				{ name: 'TOPSECRET Payroll Sync' },
				inaccessibleProject,
			);
			inaccessibleWorkflowName = inaccessibleWorkflow.name;

			const periodStart = DateTime.utc().startOf('day');
			accessibleWorkflowInsights = await createCompactedInsightsEvent(accessibleWorkflow, {
				type: 'success',
				value: 2,
				periodUnit: 'day',
				periodStart,
			});
			await createCompactedInsightsEvent(inaccessibleWorkflow, {
				type: 'success',
				value: 6,
				periodUnit: 'day',
				periodStart,
			});
		});

		test('should not include workflows from inaccessible projects when no project is requested', async () => {
			const response = await insightsViewer.get('/insights/by-workflow').expect(200);

			expect(response.body.data.count).toBe(1);
			expect(response.body.data.data).toHaveLength(1);

			const workflowNames = response.body.data.data.map(
				(row: { workflowName: string }) => row.workflowName,
			);
			expect(workflowNames).not.toContain(inaccessibleWorkflowName);
			expect(response.body.data.data[0].total).toBe(accessibleWorkflowInsights.value);
		});

		test('should return 403 for a project the user cannot read', async () => {
			await insightsViewer
				.get('/insights/by-workflow')
				.query({ projectId: inaccessibleProject.id })
				.expect(403);
		});

		test('should return workflows for a project the user can read', async () => {
			const response = await insightsViewer
				.get('/insights/by-workflow')
				.query({ projectId: accessibleProject.id })
				.expect(200);

			expect(response.body.data.data).toHaveLength(1);
			expect(response.body.data.data[0].total).toBe(accessibleWorkflowInsights.value);
		});

		afterAll(async () => {
			await truncateDatabase();
		});
	});
});

describe('GET /insights/by-time', () => {
	describe('scopes results by project access', () => {
		let insightsViewer: SuperAgentTest;
		let accessibleProject: Project;
		let inaccessibleProject: Project;

		let accessibleWorkflowInsights: InsightsByPeriod;

		beforeAll(async () => {
			testServer.license.setDefaults({
				features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
				quotas: { 'quota:insights:maxHistoryDays': 365 },
			});

			// A global role granting only the insights view scopes, and no workflow access
			const insightsRole = await createCustomRoleWithScopeSlugs(
				['insights:list', 'insights:read'],
				{
					roleType: 'global',
				},
			);
			const viewer = await createUser({ role: insightsRole });
			insightsViewer = testServer.authAgentFor(viewer);

			accessibleProject = await createTeamProject();
			inaccessibleProject = await createTeamProject();
			await linkUserToProject(viewer, accessibleProject, 'project:viewer');

			const accessibleWorkflow = await createWorkflow({}, accessibleProject);
			const inaccessibleWorkflow = await createWorkflow({}, inaccessibleProject);

			const periodStart = DateTime.utc().startOf('day');
			accessibleWorkflowInsights = await createCompactedInsightsEvent(accessibleWorkflow, {
				type: 'success',
				value: 3,
				periodUnit: 'day',
				periodStart,
			});
			await createCompactedInsightsEvent(inaccessibleWorkflow, {
				type: 'success',
				value: 7,
				periodUnit: 'day',
				periodStart,
			});
		});

		test('returns 403 for an inaccessible project and scoped totals otherwise', async () => {
			await insightsViewer
				.get('/insights/by-time')
				.query({ projectId: inaccessibleProject.id })
				.expect(403);

			const response = await insightsViewer.get('/insights/by-time').expect(200);

			expect(response.body.data[0].values.succeeded).toBe(accessibleWorkflowInsights.value);
		});

		afterAll(async () => {
			await truncateDatabase();
		});
	});
});

describe('GET /insights/by-time/time-saved', () => {
	describe('scopes results by project access', () => {
		let insightsViewer: SuperAgentTest;
		let accessibleProject: Project;
		let inaccessibleProject: Project;

		let accessibleWorkflowInsights: InsightsByPeriod;

		beforeAll(async () => {
			testServer.license.setDefaults({
				features: ['feat:insights:viewSummary', 'feat:insights:viewDashboard'],
				quotas: { 'quota:insights:maxHistoryDays': 365 },
			});

			// A global role granting only the insights view scopes, and no workflow access
			const insightsRole = await createCustomRoleWithScopeSlugs(
				['insights:list', 'insights:read'],
				{
					roleType: 'global',
				},
			);
			const viewer = await createUser({ role: insightsRole });
			insightsViewer = testServer.authAgentFor(viewer);

			accessibleProject = await createTeamProject();
			inaccessibleProject = await createTeamProject();
			await linkUserToProject(viewer, accessibleProject, 'project:viewer');

			const accessibleWorkflow = await createWorkflow({}, accessibleProject);
			const inaccessibleWorkflow = await createWorkflow({}, inaccessibleProject);

			const periodStart = DateTime.utc().startOf('day');
			accessibleWorkflowInsights = await createCompactedInsightsEvent(accessibleWorkflow, {
				type: 'time_saved_min',
				value: 4,
				periodUnit: 'day',
				periodStart,
			});
			await createCompactedInsightsEvent(inaccessibleWorkflow, {
				type: 'time_saved_min',
				value: 8,
				periodUnit: 'day',
				periodStart,
			});
		});

		afterAll(async () => {
			await truncateDatabase();
		});

		test('returns 403 for an inaccessible project and scoped totals otherwise', async () => {
			await insightsViewer
				.get('/insights/by-time/time-saved')
				.query({ projectId: inaccessibleProject.id })
				.expect(403);

			const response = await insightsViewer.get('/insights/by-time/time-saved').expect(200);

			expect(response.body.data[0].values.timeSaved).toBe(accessibleWorkflowInsights.value);
		});
	});
});
