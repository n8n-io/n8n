import type { LicenseState } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { TypeToNumber } from '../database/entities/insights-shared';
import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import type { InsightsCollectionService } from '../insights-collection.service';
import type { InsightsCompactionService } from '../insights-compaction.service';
import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsService } from '../insights.service';

describe('InsightsService', () => {
	let insightsService: InsightsService;

	let mockInsightsByPeriodRepository: MockProxy<InsightsByPeriodRepository>;
	let mockCompactionService: MockProxy<InsightsCompactionService>;
	let mockCollectionService: MockProxy<InsightsCollectionService>;
	let mockPruningService: MockProxy<InsightsPruningService>;
	let mockLicenseState: MockProxy<LicenseState>;
	let mockInstanceSettings: MockProxy<InstanceSettings>;

	beforeEach(() => {
		jest.clearAllMocks();

		mockInsightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		mockCompactionService = mock<InsightsCompactionService>();
		mockCollectionService = mock<InsightsCollectionService>();
		mockPruningService = mock<InsightsPruningService>();
		mockLicenseState = mock<LicenseState>();
		mockInstanceSettings = mock<InstanceSettings>();

		insightsService = new InsightsService(
			mockInsightsByPeriodRepository,
			mockCompactionService,
			mockCollectionService,
			mockPruningService,
			mockLicenseState,
			mockInstanceSettings,
			mockLogger(),
		);
	});

	describe('getInsightsSummary', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		const createMockAggregates = (config: {
			currentRuntime?: number;
			currentSuccess?: number;
			currentFailure?: number;
			currentTimeSaved?: number;
			previousRuntime?: number;
			previousSuccess?: number;
			previousFailure?: number;
			previousTimeSaved?: number;
		}) => {
			const aggregates: Array<{
				period: 'previous' | 'current';
				type: 0 | 1 | 2 | 3;
				total_value: string | number;
			}> = [];

			if (config.previousSuccess !== undefined) {
				aggregates.push({
					period: 'previous',
					type: TypeToNumber.success,
					total_value: config.previousSuccess,
				});
			}

			if (config.previousFailure !== undefined) {
				aggregates.push({
					period: 'previous',
					type: TypeToNumber.failure,
					total_value: config.previousFailure,
				});
			}

			if (config.previousRuntime !== undefined) {
				aggregates.push({
					period: 'previous',
					type: TypeToNumber.runtime_ms,
					total_value: config.previousRuntime,
				});
			}

			if (config.previousTimeSaved !== undefined) {
				aggregates.push({
					period: 'previous',
					type: TypeToNumber.time_saved_min,
					total_value: config.previousTimeSaved,
				});
			}

			if (config.currentSuccess !== undefined) {
				aggregates.push({
					period: 'current',
					type: TypeToNumber.success,
					total_value: config.currentSuccess,
				});
			}

			if (config.currentFailure !== undefined) {
				aggregates.push({
					period: 'current',
					type: TypeToNumber.failure,
					total_value: config.currentFailure,
				});
			}

			if (config.currentRuntime !== undefined) {
				aggregates.push({
					period: 'current',
					type: TypeToNumber.runtime_ms,
					total_value: config.currentRuntime,
				});
			}

			if (config.currentTimeSaved !== undefined) {
				aggregates.push({
					period: 'current',
					type: TypeToNumber.time_saved_min,
					total_value: config.currentTimeSaved,
				});
			}

			return aggregates;
		};

		describe('average runtime', () => {
			describe('Core Calculation Logic', () => {
				it('should calculate average from total runtime and execution count', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 2,
							currentFailure: 1,
							currentRuntime: 600,
							currentTimeSaved: 50, // Should not influence average runtime
							previousSuccess: 1,
							previousFailure: 1,
							previousRuntime: 400,
							previousTimeSaved: 25, // Should not influence average runtime
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 200,
						unit: 'millisecond',
						deviation: 0,
					});
				});

				it('should calculate average runtime with success only', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 2,
							currentRuntime: 1600,
							previousSuccess: 5,
							previousRuntime: 2000,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 800,
						unit: 'millisecond',
						deviation: 400,
					});
				});

				it('should calculate average runtime with failure only', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentFailure: 2,
							currentRuntime: 1000,
							previousFailure: 1,
							previousRuntime: 1200,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 500,
						unit: 'millisecond',
						deviation: -700,
					});
				});

				it('should calculate average runtime with decimal values', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 3,
							currentFailure: 0,
							currentRuntime: 410,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					// Current: 410ms / 3 executions = 136.666... rounded to 136.67
					// No previous period data, so deviation is null
					expect(result.averageRunTime).toEqual({
						value: 136.67,
						unit: 'millisecond',
						deviation: null,
					});
				});
			});

			describe('Zero/Null Handling', () => {
				it('returns 0 when no executions exist', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 0,
							currentFailure: 0,
							currentRuntime: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 0,
						unit: 'millisecond',
						deviation: null,
					});
				});

				it('returns 0 when runtime data is null/undefined', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 2,
							// currentRuntime intentionally omitted (missing type)
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					// Even with executions, if runtime is missing, average should be 0
					expect(result.averageRunTime).toEqual({
						value: 0,
						unit: 'millisecond',
						deviation: null,
					});
				});

				it('returns 0 when total runtime is 0', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentFailure: 5,
							currentRuntime: 0, // All executions had 0ms runtime
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 0,
						unit: 'millisecond',
						deviation: null,
					});
				});

				it('returns null deviation when previous period has no executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 5,
							currentRuntime: 1000,
							previousSuccess: 0,
							previousFailure: 0,
							previousRuntime: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						startDate,
						endDate,
					});

					expect(result.averageRunTime).toEqual({
						value: 100,
						unit: 'millisecond',
						deviation: null,
					});
				});
			});
		});

		describe('failed', () => {});

		describe('failure rate', () => {});

		describe('time saved', () => {});

		describe('total', () => {});
	});
});
