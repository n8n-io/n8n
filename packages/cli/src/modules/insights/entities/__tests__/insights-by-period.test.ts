import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { InsightsRawRepository } from '@/databases/repositories/insights-raw.repository';
import { sql } from '@/utils/sql';
import { createMetadata, createRawInsightsEvent } from '@test-integration/db/insights';
import { createTeamProject } from '@test-integration/db/projects';
import { createWorkflow } from '@test-integration/db/workflows';

import * as testDb from '../../../../../test/integration/shared/test-db';
import { InsightsByPeriod } from '../insights-by-period';
import type { PeriodUnits, TypeUnits } from '../insights-shared';

let insightsRawRepository: InsightsRawRepository;
const config = Container.get(GlobalConfig);

beforeAll(async () => {
	await testDb.init();
	insightsRawRepository = Container.get(InsightsRawRepository);
});

beforeEach(async () => {
	await testDb.truncate(['InsightsRaw']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Insights By Period', () => {
	test.each(['time_saved_min', 'runtime_ms', 'failure', 'success'] satisfies TypeUnits[])(
		'`%s` can be serialized and deserialized correctly',
		(typeUnit) => {
			// ARRANGE
			const insightByPeriod = new InsightsByPeriod();

			// ACT
			insightByPeriod.type = typeUnit;

			// ASSERT
			expect(insightByPeriod.type).toBe(typeUnit);
		},
	);
	test.each(['hour', 'day', 'week'] satisfies PeriodUnits[])(
		'`%s` can be serialized and deserialized correctly',
		(periodUnit) => {
			// ARRANGE
			const insightByPeriod = new InsightsByPeriod();

			// ACT
			insightByPeriod.periodUnit = periodUnit;

			// ASSERT
			expect(insightByPeriod.periodUnit).toBe(periodUnit);
		},
	);

	if (config.database.type === 'sqlite') {
		test('timestamp is stored as timestamp, not as date', async () => {
			// ARRANGE
			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);
			const now = DateTime.utc().startOf('second');
			await createMetadata(workflow);
			const rawInsight = await createRawInsightsEvent(workflow, {
				type: 'success',
				value: 1,
				timestamp: now,
			});

			// ACT
			await insightsRawRepository.save(rawInsight);

			// ASSERT
			const timestampValue: Array<{ timestamp: number }> = await insightsRawRepository.query(sql`
				SELECT timestamp from insights_raw
			`);
			expect(timestampValue).toHaveLength(1);
			const timestamp = timestampValue[0].timestamp;
			expect(timestamp).toEqual(now.toSeconds());
		});
	}
});
