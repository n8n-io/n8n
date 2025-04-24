import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';
import * as testDb from '@test-integration/test-db';

import {
	createCompactedInsightsEvent,
	createMetadata,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsPruningService } from '../insights-pruning.service';
import { InsightsConfig } from '../insights.config';

// Initialize DB once for all tests
beforeAll(async () => {
	await testDb.init(['insights']);
});

describe('InsightsPrunningService', () => {
	let insightsConfig: InsightsConfig;
	let insightsByPeriodRepository: InsightsByPeriodRepository;
	let insightsPruningService: InsightsPruningService;
	beforeAll(async () => {
		insightsConfig = Container.get(InsightsConfig);
		insightsPruningService = Container.get(InsightsPruningService);
		insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);
	});

	test('prune old insights', async () => {
		// ARRANGE
		insightsConfig.maxAgeDays = 10;

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
		expect(await insightsByPeriodRepository.count()).toBe(0);
	});

	test('prune old insights with recent data', async () => {
		// ARRANGE
		insightsConfig.maxAgeDays = 10;

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

	test('startPruningTimer runs pruning on schedule', async () => {
		jest.useFakeTimers();
		try {
			// ARRANGE
			insightsConfig.pruneCheckIntervalHours = 1; // Set pruning interval to 1 hour
			insightsPruningService.startPruningTimer();
			const pruneSpy = jest.spyOn(insightsPruningService, 'pruneInsights');

			// ACT
			// Advance time by 1 hour and 1 minute
			jest.advanceTimersByTime(1000 * 60 * 61);

			// ASSERT
			expect(pruneSpy).toHaveBeenCalledTimes(1);
		} finally {
			jest.useRealTimers();
			insightsPruningService.stopPruningTimer();
		}
	});
});
