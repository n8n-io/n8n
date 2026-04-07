import { insightsSummarySchema } from '@n8n/api-types';
import { createTeamProject, createWorkflow, testDb } from '@n8n/backend-test-utils';
import { type User } from '@n8n/db';
import { DateTime } from 'luxon';

import { createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

import { createCompactedInsightsEvent } from '@/modules/insights/database/entities/__tests__/db-utils';

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
});
