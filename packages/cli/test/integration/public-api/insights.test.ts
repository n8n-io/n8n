import { insightsSummarySchema } from '@n8n/api-types';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	testDb,
} from '@n8n/backend-test-utils';
import { type Project, type User } from '@n8n/db';
import { DateTime } from 'luxon';

import { AUTH_COOKIE_NAME } from '@/constants';
import { createCompactedInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';

import { createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { addApiKey, createOwnerWithApiKey, createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

const testServer = utils.setupTestServer({
	endpointGroups: ['publicApi'],
	enabledFeatures: ['feat:advancedPermissions', 'feat:insights:viewSummary'],
	quotas: { 'quota:insights:maxHistoryDays': 365 },
	modules: ['insights'],
});

let scopedOwner: User;
let unscopedOwner: User;
let authScopedAgent: SuperAgentTest;
let authUnscopedAgent: SuperAgentTest;

async function createSummaryMetrics(
	workflow: Awaited<ReturnType<typeof createWorkflow>>,
	values: { success?: number; failure?: number; runtimeMs?: number; timeSavedMin?: number },
) {
	const periodStart = DateTime.utc().minus({ days: 1 });
	const periodUnit = 'day' as const;

	if (values.success !== undefined) {
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: values.success,
			periodStart,
			periodUnit,
		});
	}

	if (values.failure !== undefined) {
		await createCompactedInsightsEvent(workflow, {
			type: 'failure',
			value: values.failure,
			periodStart,
			periodUnit,
		});
	}

	if (values.runtimeMs !== undefined) {
		await createCompactedInsightsEvent(workflow, {
			type: 'runtime_ms',
			value: values.runtimeMs,
			periodStart,
			periodUnit,
		});
	}

	if (values.timeSavedMin !== undefined) {
		await createCompactedInsightsEvent(workflow, {
			type: 'time_saved_min',
			value: values.timeSavedMin,
			periodStart,
			periodUnit,
		});
	}
}

beforeAll(async () => {
	scopedOwner = await createOwnerWithApiKey({ scopes: ['insights:read'] });
	unscopedOwner = await createOwnerWithApiKey({ scopes: ['workflow:list'] });
});

beforeEach(async () => {
	await testDb.truncate(['InsightsByPeriod', 'InsightsMetadata', 'InsightsRaw']);
	authScopedAgent = testServer.publicApiAgentFor(scopedOwner);
	authUnscopedAgent = testServer.publicApiAgentFor(unscopedOwner);
});

describe('GET /insights/summary', () => {
	test('returns 401 without API key', async () => {
		await testServer.publicApiAgentWithoutApiKey().get('/insights/summary').expect(401);
	});

	test('returns data via session cookie, without an API key', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createSummaryMetrics(workflow, {
			success: 3,
			failure: 1,
			runtimeMs: 400,
			timeSavedMin: 20,
		});

		const response = await testServer
			.publicApiAgentWithCookie(scopedOwner)
			.get('/insights/summary')
			.query({
				startDate: DateTime.utc().minus({ days: 2 }).toISO(),
				endDate: DateTime.utc().plus({ days: 1 }).toISO(),
			})
			.expect(200);

		expect(response.body.total.value).toBe(4);
		expect(response.body.failed.value).toBe(1);
	});

	test('returns 401 with an invalid session cookie', async () => {
		const agent = testServer.publicApiAgentWithoutApiKey();
		agent.jar.setCookie(`${AUTH_COOKIE_NAME}=invalid`);

		const response = await agent.get('/insights/summary').expect(401);

		expect(response.body).toEqual({ message: 'Unauthorized' });
	});

	test('returns 401 with a hint to use an API key when no credentials are sent at all', async () => {
		const agent = testServer.publicApiAgentWithoutApiKey();

		const response = await agent.get('/insights/summary').expect(401);

		expect(response.body).toEqual({ message: "'X-N8N-API-KEY' header required" });
	});

	test('returns 403 without insights:read scope', async () => {
		await authUnscopedAgent.get('/insights/summary').expect(403);
	});

	test('returns data matching InsightsSummary schema', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createSummaryMetrics(workflow, {
			success: 3,
			failure: 1,
			runtimeMs: 400,
			timeSavedMin: 20,
		});

		const response = await authScopedAgent
			.get('/insights/summary')
			.query({
				startDate: DateTime.utc().minus({ days: 2 }).toISO(),
				endDate: DateTime.utc().plus({ days: 1 }).toISO(),
			})
			.expect(200);

		const parsed = insightsSummarySchema.safeParse(response.body);
		expect(parsed.success).toBe(true);
		expect(response.body.total.value).toBe(4);
		expect(response.body.failed.value).toBe(1);
	});

	test('respects startDate and endDate filters', async () => {
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 2,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 1 }),
		});

		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 9,
			periodUnit: 'day',
			periodStart: DateTime.utc().minus({ days: 10 }),
		});

		const response = await authScopedAgent
			.get('/insights/summary')
			.query({
				startDate: DateTime.utc().minus({ days: 2 }).toISO(),
				endDate: DateTime.utc().plus({ days: 1 }).toISO(),
			})
			.expect(200);

		expect(response.body.total.value).toBe(2);
	});

	test('respects projectId filter', async () => {
		const [firstProject, secondProject] = await Promise.all([
			createTeamProject(),
			createTeamProject(),
		]);
		const [firstWorkflow, secondWorkflow] = await Promise.all([
			createWorkflow({}, firstProject),
			createWorkflow({}, secondProject),
		]);

		await createSummaryMetrics(firstWorkflow, {
			success: 3,
			failure: 1,
			runtimeMs: 400,
			timeSavedMin: 20,
		});
		await createSummaryMetrics(secondWorkflow, {
			success: 5,
			failure: 0,
			runtimeMs: 500,
			timeSavedMin: 25,
		});

		const response = await authScopedAgent
			.get('/insights/summary')
			.query({
				projectId: firstProject.id,
				startDate: DateTime.utc().minus({ days: 2 }).toISO(),
				endDate: DateTime.utc().plus({ days: 1 }).toISO(),
			})
			.expect(200);

		expect(response.body.total.value).toBe(4);
		expect(response.body.failed.value).toBe(1);
	});

	describe('project access', () => {
		let viewer: User;
		let viewerAgent: SuperAgentTest;
		let accessibleProject: Project;
		let inaccessibleProject: Project;
		let accessibleWorkflow: Awaited<ReturnType<typeof createWorkflow>>;
		let inaccessibleWorkflow: Awaited<ReturnType<typeof createWorkflow>>;

		beforeAll(async () => {
			// A global role granting only the insights view scopes, and no workflow access
			const insightsRole = await createCustomRoleWithScopeSlugs(
				['insights:list', 'insights:read'],
				{
					roleType: 'global',
				},
			);
			viewer = await createUser({ role: insightsRole });
			viewer.apiKeys = [await addApiKey(viewer, { scopes: ['insights:read'] })];

			accessibleProject = await createTeamProject();
			inaccessibleProject = await createTeamProject();
			await linkUserToProject(viewer, accessibleProject, 'project:viewer');
			accessibleWorkflow = await createWorkflow({}, accessibleProject);
			inaccessibleWorkflow = await createWorkflow({}, inaccessibleProject);
		});

		beforeEach(() => {
			viewerAgent = testServer.publicApiAgentFor(viewer);
		});

		test('returns 403 for a project the API key holder cannot read', async () => {
			await viewerAgent
				.get('/insights/summary')
				.query({ projectId: inaccessibleProject.id })
				.expect(403);
		});

		test('returns the summary for a project the API key holder can read', async () => {
			await viewerAgent
				.get('/insights/summary')
				.query({ projectId: accessibleProject.id })
				.expect(200);
		});

		test('aggregates only accessible projects when no project is requested', async () => {
			const accessibleSuccessfulExecutions = 3;
			const inaccessibleSuccessfulExecutions = 5;

			await createSummaryMetrics(accessibleWorkflow, { success: accessibleSuccessfulExecutions });
			await createSummaryMetrics(inaccessibleWorkflow, {
				success: inaccessibleSuccessfulExecutions,
			});

			const response = await viewerAgent
				.get('/insights/summary')
				.query({
					startDate: DateTime.utc().minus({ days: 2 }).toISO(),
					endDate: DateTime.utc().plus({ days: 1 }).toISO(),
				})
				.expect(200);

			expect(response.body.total.value).toBe(accessibleSuccessfulExecutions);
		});
	});
});
