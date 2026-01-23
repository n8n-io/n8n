import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { DateTime } from 'luxon';

import { InsightsRawRepository } from '@/modules/insights/database/repositories/insights-raw.repository';

import {
	createRawInsightsEvent,
	createRawInsightsEvents,
} from '../database/entities/__tests__/db-utils';
import { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import { InsightsCompactionService } from '../insights-compaction.service';

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

// Terminate DB once after all tests complete
afterAll(async () => {
	await testDb.terminate();
});

describe('BigInt migration validation', () => {
	describe('Store value exceeding 32-bit integer maximum', () => {
		test('should store and retrieve values larger than 2^31', async () => {
			// ARRANGE
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			// Values exceeding 32-bit signed integer maximum (2,147,483,647)
			const largeValue1 = 2_147_483_648; // 2^31
			const largeValue2 = 5_000_000_000;

			// ACT
			const event1 = await createRawInsightsEvent(workflow, {
				type: 'success',
				value: largeValue1,
				timestamp: DateTime.utc(),
			});

			const event2 = await createRawInsightsEvent(workflow, {
				type: 'success',
				value: largeValue2,
				timestamp: DateTime.utc(),
			});

			// ASSERT
			// Verify the events were stored with exact values (no overflow)
			expect(event1.value).toBe(largeValue1);
			expect(event2.value).toBe(largeValue2);

			// Verify retrieval from database returns exact values
			const retrievedEvents = await insightsRawRepository.find();
			expect(retrievedEvents).toHaveLength(2);

			const retrieved1 = retrievedEvents.find((e) => e.id === event1.id);
			const retrieved2 = retrievedEvents.find((e) => e.id === event2.id);

			expect(retrieved1?.value).toBe(largeValue1);
			expect(retrieved2?.value).toBe(largeValue2);
		});
	});

	describe('Compaction sum exceeding 32-bit integer maximum', () => {
		test('should correctly sum large values during compaction without overflow', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			// Create 3 events with large values that sum to exceed 32-bit max
			// 1,800,000,000 * 3 = 5,400,000,000 (exceeds 2^31 - 1 = 2,147,483,647)
			const eventValue = 1_800_000_000;
			const expectedSum = 5_400_000_000;

			const timestamp = DateTime.utc().startOf('hour');

			// Create 3 events in the same hour period for the same workflow
			const events = [
				{ type: 'success' as const, value: eventValue, timestamp },
				{ type: 'success' as const, value: eventValue, timestamp: timestamp.plus({ minutes: 10 }) },
				{ type: 'success' as const, value: eventValue, timestamp: timestamp.plus({ minutes: 20 }) },
			];

			await createRawInsightsEvents(workflow, events);

			// ACT
			await insightsCompactionService.compactRawToHour();

			// ASSERT
			// Verify raw events are compacted (removed)
			await expect(insightsRawRepository.count()).resolves.toBe(0);

			// Verify compacted event has correct sum (no overflow)
			const compactedEvents = await insightsByPeriodRepository.find();
			expect(compactedEvents).toHaveLength(1);
			expect(compactedEvents[0].value).toBe(expectedSum);
			expect(compactedEvents[0].type).toBe('success');
		});
	});

	describe('Maximum safe integer boundary validation', () => {
		test('should handle Number.MAX_SAFE_INTEGER and arithmetic operations', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			// Maximum safe integer in JavaScript (2^53 - 1 = 9,007,199,254,740,991)
			const maxSafeInteger = Number.MAX_SAFE_INTEGER;

			const timestamp = DateTime.utc().startOf('hour');

			// ACT - Test storing MAX_SAFE_INTEGER
			const event = await createRawInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: maxSafeInteger,
				timestamp,
			});

			// ASSERT - Verify exact storage and retrieval
			expect(event.value).toBe(maxSafeInteger);

			const retrieved = await insightsRawRepository.findOne({ where: { id: event.id } });
			expect(retrieved?.value).toBe(maxSafeInteger);

			// Clean up for next test
			await testDb.truncate(['InsightsRaw', 'InsightsByPeriod', 'InsightsMetadata']);

			// ACT - Test arithmetic with large values (50% of MAX_SAFE_INTEGER each)
			const workflow2 = await createWorkflow({}, project);
			const halfMaxSafe = Math.floor(Number.MAX_SAFE_INTEGER / 2);

			await createRawInsightsEvents(workflow2, [
				{ type: 'time_saved_min', value: halfMaxSafe, timestamp },
				{ type: 'time_saved_min', value: halfMaxSafe, timestamp: timestamp.plus({ minutes: 5 }) },
			]);

			await insightsCompactionService.compactRawToHour();

			// ASSERT - Verify compaction sum is correct
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const compacted = await insightsByPeriodRepository.find();
			expect(compacted).toHaveLength(1);

			// Sum should be close to MAX_SAFE_INTEGER (allowing for floor rounding)
			expect(compacted[0].value).toBe(halfMaxSafe * 2);
			expect(compacted[0].value).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
		});

		test('should demonstrate precision loss for values exceeding MAX_SAFE_INTEGER', async () => {
			// ARRANGE
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const timestamp = DateTime.utc();

			// JavaScript Number type cannot safely represent integers beyond MAX_SAFE_INTEGER
			// MAX_SAFE_INTEGER = 9,007,199,254,740,991 (2^53 - 1)
			const maxSafeInteger = Number.MAX_SAFE_INTEGER; // 9,007,199,254,740,991

			// Values BEYOND MAX_SAFE_INTEGER will experience precision loss in JavaScript
			// Note: Database stores as bigint (no precision loss), but JS Number loses precision
			// Beyond MAX_SAFE_INTEGER, consecutive integers cannot be represented uniquely
			const unsafeValue1 = maxSafeInteger + 1; // Should be 9,007,199,254,740,992
			const unsafeValue2 = maxSafeInteger + 2; // Should be 9,007,199,254,740,993

			// ASSERT - Demonstrate precision loss BEFORE storing
			// Both values are NOT safe integers (precision cannot be guaranteed)
			expect(Number.isSafeInteger(unsafeValue1)).toBe(false);
			expect(Number.isSafeInteger(unsafeValue2)).toBe(false);

			// Critical demonstration: JavaScript rounds both values to the SAME number
			// This proves precision loss - two different values become identical
			expect(unsafeValue1).toBe(unsafeValue2);
			expect(unsafeValue1).toBe(9007199254740992); // Both round to MAX_SAFE_INTEGER + 1

			// ACT - Store values that exceed MAX_SAFE_INTEGER
			const event1 = await createRawInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: unsafeValue1,
				timestamp,
			});

			const event2 = await createRawInsightsEvent(workflow, {
				type: 'runtime_ms',
				value: unsafeValue2,
				timestamp: timestamp.plus({ seconds: 10 }),
			});

			// ASSERT - Stored values are identical (due to JS precision loss)
			expect(event1.value).toBe(event2.value); // Both are 9007199254740992
			expect(event1.value).toBe(9007199254740992);
			expect(event2.value).toBe(9007199254740992);

			// Retrieve from database - values remain identical due to JS Number conversion
			const retrievedEvents = await insightsRawRepository.find({ order: { id: 'ASC' } });
			expect(retrievedEvents).toHaveLength(2);

			// Retrieved values are also identical (demonstrating persistent precision loss)
			expect(retrievedEvents[0].value).toBe(retrievedEvents[1].value);
			expect(retrievedEvents[0].value).toBe(9007199254740992);
			expect(retrievedEvents[1].value).toBe(9007199254740992);

			// Both retrieved values are NOT safe integers
			expect(Number.isSafeInteger(retrievedEvents[0].value)).toBe(false);
			expect(Number.isSafeInteger(retrievedEvents[1].value)).toBe(false);

			// IMPORTANT: This test documents the current limitation.
			// Two distinct values (MAX_SAFE_INTEGER + 1 and MAX_SAFE_INTEGER + 2)
			// become indistinguishable due to JavaScript Number precision limits.
			//
			// To properly handle values > MAX_SAFE_INTEGER, we would need:
			// 1. TypeORM transformer to convert bigint ↔ BigInt (not Number)
			// 2. Application-level validation to reject values > MAX_SAFE_INTEGER
			// 3. OR: Change entity type from 'number' to 'bigint' with proper transformers
		});
	});

	describe('Migration preserves existing small values', () => {
		test('should correctly store and compact small integer values', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const smallValue1 = 42;
			const smallValue2 = 1_000_000;
			const expectedSum = smallValue1 + smallValue2;

			const timestamp = DateTime.utc().startOf('hour');

			// ACT
			await createRawInsightsEvents(workflow, [
				{ type: 'success', value: smallValue1, timestamp },
				{ type: 'success', value: smallValue2, timestamp: timestamp.plus({ minutes: 15 }) },
			]);

			// ASSERT - Verify retrieval of small values
			const rawEvents = await insightsRawRepository.find({ order: { id: 'ASC' } });
			expect(rawEvents).toHaveLength(2);
			expect(rawEvents[0].value).toBe(smallValue1);
			expect(rawEvents[1].value).toBe(smallValue2);

			// ACT - Compact the events
			await insightsCompactionService.compactRawToHour();

			// ASSERT - Verify compaction sum is correct
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const compacted = await insightsByPeriodRepository.find();
			expect(compacted).toHaveLength(1);
			expect(compacted[0].value).toBe(expectedSum);
		});
	});

	describe('Negative large values', () => {
		test('should handle negative values exceeding 32-bit signed integer minimum', async () => {
			// ARRANGE
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			// Values below 32-bit signed integer minimum (-2,147,483,648)
			const negativeValue1 = -2_147_483_649; // Below 2^31
			const negativeValue2 = -5_000_000_000;

			// ACT
			const event1 = await createRawInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: negativeValue1,
				timestamp: DateTime.utc(),
			});

			const event2 = await createRawInsightsEvent(workflow, {
				type: 'time_saved_min',
				value: negativeValue2,
				timestamp: DateTime.utc(),
			});

			// ASSERT - Verify storage and retrieval of negative large values
			expect(event1.value).toBe(negativeValue1);
			expect(event2.value).toBe(negativeValue2);

			const retrievedEvents = await insightsRawRepository.find({ order: { id: 'ASC' } });
			expect(retrievedEvents).toHaveLength(2);
			expect(retrievedEvents[0].value).toBe(negativeValue1);
			expect(retrievedEvents[1].value).toBe(negativeValue2);
		});

		test('should correctly compact mixed positive and negative large values', async () => {
			// ARRANGE
			const insightsCompactionService = Container.get(InsightsCompactionService);
			const insightsRawRepository = Container.get(InsightsRawRepository);
			const insightsByPeriodRepository = Container.get(InsightsByPeriodRepository);

			const project = await createTeamProject();
			const workflow = await createWorkflow({}, project);

			const timestamp = DateTime.utc().startOf('hour');

			// Mix of large positive and negative values
			const positiveValue = 3_000_000_000;
			const negativeValue = -2_500_000_000;
			const expectedSum = positiveValue + negativeValue; // = 500,000,000

			// ACT
			await createRawInsightsEvents(workflow, [
				{ type: 'runtime_ms', value: positiveValue, timestamp },
				{ type: 'runtime_ms', value: negativeValue, timestamp: timestamp.plus({ minutes: 10 }) },
			]);

			await insightsCompactionService.compactRawToHour();

			// ASSERT
			await expect(insightsRawRepository.count()).resolves.toBe(0);
			const compacted = await insightsByPeriodRepository.find();
			expect(compacted).toHaveLength(1);
			expect(compacted[0].value).toBe(expectedSum);
		});
	});
});
