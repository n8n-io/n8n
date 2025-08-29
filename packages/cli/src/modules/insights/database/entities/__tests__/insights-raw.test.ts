import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { createMetadata, createRawInsightsEvent } from './db-utils';
import { InsightsRawRepository } from '../../repositories/insights-raw.repository';
import { InsightsRaw } from '../insights-raw';
import type { TypeUnit } from '../insights-shared';

let insightsRawRepository: InsightsRawRepository;

beforeAll(async () => {
	await testModules.loadModules(['insights']);
	await testDb.init();
	insightsRawRepository = Container.get(InsightsRawRepository);
});

beforeEach(async () => {
	await insightsRawRepository.delete({});
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Insights Raw Entity', () => {
	test.each(['success', 'failure', 'runtime_ms', 'time_saved_min'] satisfies TypeUnit[])(
		'`%s` can be serialized and deserialized correctly',
		(typeUnit) => {
			// ARRANGE
			const rawInsight = new InsightsRaw();

			// ACT
			rawInsight.type = typeUnit;

			// ASSERT
			expect(rawInsight.type).toBe(typeUnit);
		},
	);

	test('`timestamp` can be serialized and deserialized correctly', () => {
		// ARRANGE
		const rawInsight = new InsightsRaw();
		const now = new Date();

		// ACT

		rawInsight.timestamp = now;

		// ASSERT
		now.setMilliseconds(0);
		expect(rawInsight.timestamp).toEqual(now);
	});

	test('timestamp uses the correct default value', async () => {
		// ARRANGE
		const project = await createTeamProject();
		const workflow = await createWorkflow({}, project);
		await createMetadata(workflow);
		const rawInsight = await createRawInsightsEvent(workflow, {
			type: 'success',
			value: 1,
		});

		// ACT
		const now = DateTime.utc().startOf('second');
		await insightsRawRepository.save(rawInsight);

		// ASSERT
		const timestampValue = await insightsRawRepository.find();
		expect(timestampValue).toHaveLength(1);
		const timestamp = timestampValue[0].timestamp;

		expect(
			Math.abs(now.toSeconds() - DateTime.fromJSDate(timestamp).toUTC().toSeconds()),
		).toBeLessThan(2);
	});
});
