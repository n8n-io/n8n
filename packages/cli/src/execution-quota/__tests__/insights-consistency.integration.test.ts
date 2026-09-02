import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { ProjectExecutionCounterRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import {
	createMetadata,
	createRawInsightsEvent,
} from '@/modules/insights/database/entities/__tests__/db-utils';
import { InsightsCompactionService } from '@/modules/insights/insights-compaction.service';
import { InsightsService } from '@/modules/insights/insights.service';
import { createOwner } from '@test-integration/db/users';

import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'ProjectExecutionCounter',
		'ProjectExecutionQuota',
		'InsightsRaw',
		'InsightsByPeriod',
		'InsightsMetadata',
		'WorkflowEntity',
		'Project',
	]);
});

afterAll(async () => {
	await testDb.terminate();
});

test('live counter matches Insights for clean-completing executions in the same period', async () => {
	const project = await createTeamProject();
	const workflow = await createWorkflow({}, project);
	await createMetadata(workflow);

	const quotaService = Container.get(ProjectExecutionQuotaService);
	const counterRepository = Container.get(ProjectExecutionCounterRepository);
	const compactionService = Container.get(InsightsCompactionService);
	const insightsService = Container.get(InsightsService);

	// An owner has unrestricted access, so `getInsightsSummary`'s access
	// filter is a no-op here — this test is about count reconciliation, not
	// access filtering.
	const owner = await createOwner();

	// Simulate 4 clean, successful executions: the pre-execution gate
	// increments the live counter, and (mirroring what Insights would record
	// for a completed 'success' run) a matching raw insights event is seeded.
	for (let i = 0; i < 4; i++) {
		await quotaService.assertWithinQuotaAndIncrement(workflow.id, 'webhook');
		await createRawInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			timestamp: DateTime.utc(),
		});
	}

	await compactionService.compactRawToHour();

	const today = DateTime.utc().toFormat('yyyy-MM-dd');
	const liveTotal = await counterRepository.getProjectPeriodTotal(project.id, 'day', today);

	const now = DateTime.utc();
	const summary = await insightsService.getInsightsSummary({
		user: owner,
		projectId: project.id,
		startDate: now.startOf('day').toJSDate(),
		endDate: now.toJSDate(),
	});

	expect(liveTotal).toBe(4);
	expect(summary.total.value).toBe(4);
});
