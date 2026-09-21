import {
	mockLogger,
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
} from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';
import { mock } from 'vitest-mock-extended';

import {
	createCompactedInsightsEvent,
	createMetadata,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriod } from '../database/entities/insights-by-period';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
});

beforeEach(async () => {
	await testDb.truncate([
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

describe('InsightsPruningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;

	beforeAll(async () => {
		insightsConfig = Container.get(InsightsConfig);
		insightsConfig.maxAgeDays = 10;
		insightsConfig.pruneCheckIntervalHours = 1;
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
		insightsPruningService = new InsightsPruningService(
			insightsByPeriodRepository,
			insightsConfig,
			mockLogger(),
		);
	});

	test('old insights get pruned successfully', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createMetadata(workflow);

		const timestamp = DateTime.utc().minus({ days: insightsConfig.maxAgeDays + 1 });
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});

		// ACT
		await insightsPruningService.pruneInsights();

		// ASSERT
		await expect(insightsByPeriodRepository.count()).resolves.toBe(0);
	});

	test('insights newer than maxAgeDays do not get pruned', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);

		await createMetadata(workflow);

		const timestamp = DateTime.utc().minus({ days: insightsConfig.maxAgeDays - 1 });
		await createCompactedInsightsEvent(workflow, {
			type: 'success',
			value: 1,
			periodUnit: 'day',
			periodStart: timestamp,
		});

		// ACT
		await insightsPruningService.pruneInsights();

		// ASSERT
		expect(await insightsByPeriodRepository.count()).toBe(1);
	});

	test('overlapping prune runs delete each old row once and keep newer rows', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		const { metaId } = await createMetadata(workflow);
		const now = DateTime.utc();
		const row = (periodStart: DateTime) => {
			const event = new InsightsByPeriod();
			event.metaId = metaId;
			event.type = 'success';
			event.value = 1;
			event.periodUnit = 'hour';
			event.periodStart = periodStart.startOf('hour').toJSDate();
			return event;
		};
		const old = Array.from({ length: 500 }, (_, hour) =>
			row(now.minus({ days: insightsConfig.maxAgeDays + 1, hours: hour })),
		);
		const fresh = Array.from({ length: 24 }, (_, hour) =>
			row(now.minus({ days: insightsConfig.maxAgeDays - 1, hours: hour })),
		);
		await insightsByPeriodRepository.save([...old, ...fresh]);

		// ACT
		const runs = Array.from(
			{ length: 4 },
			async () => await insightsPruningService.pruneInsights(),
		);

		// ASSERT
		await expect(Promise.all(runs)).resolves.toHaveLength(4);
		await expect(insightsByPeriodRepository.count()).resolves.toBe(fresh.length);
	});

	test.each<{ config: number; result: number }>([
		{ config: -1, result: 730 },
		{ config: 0, result: 365 },
		{ config: 5, result: 5 },
		{ config: 365, result: 365 },
		{ config: 730, result: 730 },
		{ config: 2000, result: 730 },
	])(
		'pruningMaxAgeInDays uses N8N_INSIGHTS_MAX_AGE_DAYS: -1 maps to cap, other values below 1 use default, finite values capped at 730',
		async ({ config, result }) => {
			const insightsPruningService = new InsightsPruningService(
				insightsByPeriodRepository,
				mock<InsightsConfig>({
					maxAgeDays: config,
				}),
				mockLogger(),
			);

			expect(insightsPruningService.pruningMaxAgeInDays).toBe(result);
		},
	);
});
