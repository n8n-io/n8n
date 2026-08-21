import type { LicenseState } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { TypeToNumber } from '../database/entities/insights-shared';
import type { InsightsByPeriodRepository } from '../database/repositories/insights-by-period.repository';
import type { InsightsCompactionService } from '../insights-compaction.service';
import type { InsightsPruningService } from '../insights-pruning.service';
import { InsightsService } from '../insights.service';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });

describe('InsightsService', () => {
	let insightsService: InsightsService;

	let mockInsightsByPeriodRepository: MockProxy<InsightsByPeriodRepository>;
	let mockCompactionService: MockProxy<InsightsCompactionService>;
	let mockPruningService: MockProxy<InsightsPruningService>;
	let mockLicenseState: MockProxy<LicenseState>;
	let mockInstanceSettings: MockProxy<InstanceSettings>;
	let mockWorkflowSharingService: MockProxy<WorkflowSharingService>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockInsightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		mockCompactionService = mock<InsightsCompactionService>();
		mockPruningService = mock<InsightsPruningService>();
		mockLicenseState = mock<LicenseState>();
		mockInstanceSettings = mock<InstanceSettings>();
		mockWorkflowSharingService = mock<WorkflowSharingService>();
		vi.mocked(userHasScopes).mockResolvedValue(true);

		insightsService = new InsightsService(
			mockInsightsByPeriodRepository,
			mockCompactionService,
			mockPruningService,
			mockLicenseState,
			mockInstanceSettings,
			mockLogger(),
			mockWorkflowSharingService,
		);
	});

	describe('getInsightsSummary', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		it('should return complete summary with all metrics', async () => {
			mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue([
				{ period: 'current', type: TypeToNumber.success, total_value: 8 },
				{ period: 'current', type: TypeToNumber.failure, total_value: 12 },
				{ period: 'current', type: TypeToNumber.runtime_ms, total_value: 4000 },
				{ period: 'current', type: TypeToNumber.time_saved_min, total_value: 120 },
				{ period: 'previous', type: TypeToNumber.success, total_value: 14 },
				{ period: 'previous', type: TypeToNumber.failure, total_value: 6 },
				{ period: 'previous', type: TypeToNumber.runtime_ms, total_value: 6000 },
				{ period: 'previous', type: TypeToNumber.time_saved_min, total_value: 80 },
			]);

			const result = await insightsService.getInsightsSummary({
				user,
				startDate,
				endDate,
			});

			expect(result).toEqual({
				averageRunTime: {
					value: 200,
					unit: 'millisecond',
					deviation: -100,
				},
				failed: {
					value: 12,
					unit: 'count',
					deviation: 6,
				},
				failureRate: {
					value: 0.6,
					unit: 'ratio',
					deviation: 0.3,
				},
				timeSaved: {
					value: 120,
					unit: 'minute',
					deviation: 40,
				},
				total: {
					value: 20,
					unit: 'count',
					deviation: 0,
				},
				billable: {
					value: 0,
					unit: 'count',
					deviation: 0,
				},
			});
		});

		const createMockAggregates = (config: {
			currentRuntime?: number;
			currentSuccess?: number;
			currentFailure?: number;
			currentTimeSaved?: number;
			currentBillable?: number;
			previousRuntime?: number;
			previousSuccess?: number;
			previousFailure?: number;
			previousTimeSaved?: number;
			previousBillable?: number;
		}) => {
			const aggregates: Array<{
				period: 'previous' | 'current';
				type: (typeof TypeToNumber)[keyof typeof TypeToNumber];
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

			if (config.previousBillable !== undefined) {
				aggregates.push({
					period: 'previous',
					type: TypeToNumber.billable,
					total_value: config.previousBillable,
				});
			}

			if (config.currentBillable !== undefined) {
				aggregates.push({
					period: 'current',
					type: TypeToNumber.billable,
					total_value: config.currentBillable,
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
							currentTimeSaved: 50,
							previousSuccess: 1,
							previousFailure: 1,
							previousRuntime: 400,
							previousTimeSaved: 25,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
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
						user,
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
						user,
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
						user,
						startDate,
						endDate,
					});

					// Current: 410ms / 3 executions = 136.666... rounded to 136.67
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
						user,
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
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

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
							currentRuntime: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
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
						user,
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

		describe('failure rate', () => {
			describe('Core Calculation Logic', () => {
				it('should calculate failure rate from failures and total executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 6,
							currentFailure: 4,
							previousSuccess: 8,
							previousFailure: 2,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 0.4,
						unit: 'ratio',
						deviation: 0.2,
					});
				});

				it('should handle decimal values with 3 decimal rounding', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 2,
							previousSuccess: 8,
							previousFailure: 1,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					// Current: 2 / 7 = 0.285714... rounded to 0.286
					// Previous: 1 / 9 = 0.111111... rounded to 0.111
					expect(result.failureRate).toEqual({
						value: 0.286,
						unit: 'ratio',
						deviation: 0.175,
					});
				});

				it('should calculate 0% failure rate with only successes', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentFailure: 0,
							previousSuccess: 5,
							previousFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 0,
						unit: 'ratio',
						deviation: 0,
					});
				});

				it('should calculate 100% failure rate with only failures', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 0,
							currentFailure: 5,
							previousSuccess: 0,
							previousFailure: 3,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 1,
						unit: 'ratio',
						deviation: 0,
					});
				});
			});

			describe('Zero/Null Handling', () => {
				it('returns 0 when no executions exist', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 0,
							currentFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 0,
						unit: 'ratio',
						deviation: null,
					});
				});

				it('returns 0 when failure data is null/undefined', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 0,
						unit: 'ratio',
						deviation: null,
					});
				});

				it('handles all failures correctly', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 0,
							currentFailure: 10,
							previousSuccess: 0,
							previousFailure: 5,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate).toEqual({
						value: 1,
						unit: 'ratio',
						deviation: 0,
					});
				});

				it('returns null deviation when previous period has no executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 7,
							currentFailure: 3,
							previousSuccess: 0,
							previousFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failureRate.value).toBe(0.3);
					expect(result.failureRate.deviation).toBeNull();
				});
			});
		});

		describe('failed', () => {
			describe('Core Logic', () => {
				it('should extract failure count correctly', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentFailure: 5,
							previousSuccess: 8,
							previousFailure: 3,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failed).toEqual({
						value: 5,
						unit: 'count',
						deviation: 2,
					});
				});

				it('should calculate deviation with previous period data', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 15,
							previousSuccess: 10,
							previousFailure: 20,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failed).toEqual({
						value: 15,
						unit: 'count',
						deviation: -5,
					});
				});
			});

			describe('Zero/Null Handling', () => {
				it('returns 0 when no failures exist', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failed).toEqual({
						value: 0,
						unit: 'count',
						deviation: null,
					});
				});

				it('returns null deviation when previous period has no executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 3,
							previousSuccess: 0,
							previousFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.failed.value).toBe(3);
					expect(result.failed.deviation).toBeNull();
				});
			});
		});

		describe('total', () => {
			describe('Core Logic', () => {
				it('should sum success and failure counts correctly', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 12,
							currentFailure: 8,
							previousSuccess: 10,
							previousFailure: 5,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.total).toEqual({
						value: 20,
						unit: 'count',
						deviation: 5,
					});
				});

				it('should calculate deviation with previous period data', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentFailure: 5,
							previousSuccess: 15,
							previousFailure: 10,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.total).toEqual({
						value: 10,
						unit: 'count',
						deviation: -15,
					});
				});
			});

			describe('Zero/Null Handling', () => {
				it('returns 0 when no executions exist', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 0,
							currentFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.total).toEqual({
						value: 0,
						unit: 'count',
						deviation: null,
					});
				});

				it('returns null deviation when previous period has no executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentFailure: 5,
							previousSuccess: 0,
							previousFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.total.value).toBe(15);
					expect(result.total.deviation).toBeNull();
				});
			});
		});

		describe('time saved', () => {
			describe('Core Logic', () => {
				it('should extract time saved value correctly', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentTimeSaved: 150,
							previousSuccess: 8,
							previousTimeSaved: 100,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.timeSaved).toEqual({
						value: 150,
						unit: 'minute',
						deviation: 50,
					});
				});

				it('should calculate deviation with previous period data', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 5,
							currentTimeSaved: 75,
							previousSuccess: 10,
							previousTimeSaved: 200,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.timeSaved).toEqual({
						value: 75,
						unit: 'minute',
						deviation: -125,
					});
				});
			});

			describe('Zero/Null Handling', () => {
				it('returns 0 when no time saved data exists', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.timeSaved).toEqual({
						value: 0,
						unit: 'minute',
						deviation: null,
					});
				});

				it('returns null deviation when previous period has no executions', async () => {
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
						createMockAggregates({
							currentSuccess: 10,
							currentTimeSaved: 120,
							previousSuccess: 0,
							previousFailure: 0,
						}),
					);

					const result = await insightsService.getInsightsSummary({
						user,
						startDate,
						endDate,
					});

					expect(result.timeSaved.value).toBe(120);
					expect(result.timeSaved.deviation).toBeNull();
				});
			});
		});

		describe('billable', () => {
			it('should return billable independently of total', async () => {
				mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					createMockAggregates({
						currentSuccess: 8,
						currentFailure: 4,
						currentBillable: 10,
						previousSuccess: 6,
						previousFailure: 2,
						previousBillable: 7,
					}),
				);

				const result = await insightsService.getInsightsSummary({
					user,
					startDate,
					endDate,
				});

				expect(result.total).toEqual({
					value: 12,
					unit: 'count',
					deviation: 4,
				});
				expect(result.billable).toEqual({
					value: 10,
					unit: 'count',
					deviation: 3,
				});
			});

			it('returns 0 when no billable data exists', async () => {
				mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					createMockAggregates({
						currentSuccess: 10,
						currentFailure: 2,
						previousSuccess: 8,
						previousFailure: 1,
					}),
				);

				const result = await insightsService.getInsightsSummary({
					user,
					startDate,
					endDate,
				});

				expect(result.billable).toEqual({
					value: 0,
					unit: 'count',
					deviation: 0,
				});
			});

			it('returns null deviation when previous period has no executions', async () => {
				mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					createMockAggregates({
						currentSuccess: 10,
						currentBillable: 8,
						previousSuccess: 0,
						previousFailure: 0,
					}),
				);

				const result = await insightsService.getInsightsSummary({
					user,
					startDate,
					endDate,
				});

				expect(result.billable.value).toBe(8);
				expect(result.billable.deviation).toBeNull();
			});
		});

		describe('project access', () => {
			beforeEach(() => {
				mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
					[],
				);
			});

			it('should not check project access when no project is requested', async () => {
				await insightsService.getInsightsSummary({ user, startDate, endDate });

				expect(userHasScopes).not.toHaveBeenCalled();
			});

			it('should throw a forbidden error when the requested project is not accessible', async () => {
				vi.mocked(userHasScopes).mockResolvedValue(false);

				await expect(
					insightsService.getInsightsSummary({ user, startDate, endDate, projectId: 'project-1' }),
				).rejects.toThrow('You do not have access to insights for this project.');

				expect(
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).not.toHaveBeenCalled();
			});

			it('should query the requested project when it is accessible', async () => {
				await insightsService.getInsightsSummary({
					user,
					startDate,
					endDate,
					projectId: 'project-1',
				});

				expect(userHasScopes).toHaveBeenCalledWith(user, ['workflow:read'], false, {
					projectId: 'project-1',
				});
				expect(
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project-1' }));
			});

			it('should query without an access filter for users with the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue(undefined);

				await insightsService.getInsightsSummary({ user, startDate, endDate });

				expect(
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith(expect.objectContaining({ accessFilter: undefined }));
			});

			it('should query with an access filter for users without the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue({
					projectRoles: ['project:viewer'],
					workflowRoles: ['workflow:owner'],
				});

				await insightsService.getInsightsSummary({ user, startDate, endDate });

				expect(
					mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
				).toHaveBeenCalledWith(
					expect.objectContaining({
						accessFilter: {
							user,
							projectRoles: ['project:viewer'],
							workflowRoles: ['workflow:owner'],
						},
					}),
				);
			});
		});
	});

	describe('timeZone forwarding', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		it('forwards timeZone to getPreviousAndCurrentPeriodTypeAggregates', async () => {
			mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates.mockResolvedValue(
				[],
			);

			await insightsService.getInsightsSummary({
				user,
				startDate,
				endDate,
				timeZone: 'Europe/Berlin',
			});

			expect(
				mockInsightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates,
			).toHaveBeenCalledWith(expect.objectContaining({ timeZone: 'Europe/Berlin' }));
		});

		it('forwards timeZone to getInsightsByWorkflow', async () => {
			mockInsightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: 0,
				rows: [],
			});
			mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

			await insightsService.getInsightsByWorkflow({
				user: mock<User>(),
				startDate,
				endDate,
				timeZone: 'Europe/Berlin',
			});

			expect(mockInsightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith(
				expect.objectContaining({ timeZone: 'Europe/Berlin' }),
			);
		});

		it('forwards timeZone to getInsightsByTime', async () => {
			mockInsightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);

			await insightsService.getInsightsByTime({
				user,
				startDate,
				endDate,
				timeZone: 'Europe/Berlin',
			});

			expect(mockInsightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith(
				expect.objectContaining({ timeZone: 'Europe/Berlin' }),
			);
		});
	});

	describe('getInsightsByWorkflow', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		const makeRow = (workflowId: string | null) => ({
			workflowId,
			workflowName: workflowId ? `Workflow ${workflowId}` : 'Deleted workflow',
			projectId: 'project-1',
			projectName: 'Project 1',
			total: 10,
			succeeded: 8,
			failed: 2,
			failureRate: 0.2,
			runTime: 1000,
			averageRunTime: 100,
			timeSaved: 60,
		});

		const makeUser = (scopes: string[]) =>
			({ role: { scopes: scopes.map((slug) => ({ slug })) } }) as unknown as User;

		beforeEach(() => {
			mockInsightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: 0,
				rows: [],
			});
		});

		it('sets hasReadAccess true for a row with a workflowId', async () => {
			const user = makeUser([]);
			mockInsightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: 1,
				rows: [makeRow('wf-1')],
			});

			const result = await insightsService.getInsightsByWorkflow({ user, startDate, endDate });

			expect(result.data[0].hasReadAccess).toBe(true);
		});

		it('sets hasReadAccess false for a row with a null workflowId (deleted workflow)', async () => {
			const user = makeUser(['workflow:read']);
			mockInsightsByPeriodRepository.getInsightsByWorkflow.mockResolvedValue({
				count: 1,
				rows: [makeRow(null)],
			});

			const result = await insightsService.getInsightsByWorkflow({ user, startDate, endDate });

			expect(result.data[0].hasReadAccess).toBe(false);
		});

		describe('project access', () => {
			it('should not check project access when no project is requested', async () => {
				await insightsService.getInsightsByWorkflow({ user, startDate, endDate });

				expect(userHasScopes).not.toHaveBeenCalled();
			});

			it('should throw a forbidden error when the requested project is not accessible', async () => {
				vi.mocked(userHasScopes).mockResolvedValue(false);

				await expect(
					insightsService.getInsightsByWorkflow({
						user,
						startDate,
						endDate,
						projectId: 'project-1',
					}),
				).rejects.toThrow('You do not have access to insights for this project.');

				expect(mockInsightsByPeriodRepository.getInsightsByWorkflow).not.toHaveBeenCalled();
			});

			it('should query without an access filter for users with the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue(undefined);

				await insightsService.getInsightsByWorkflow({ user, startDate, endDate });

				expect(mockInsightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith(
					expect.objectContaining({ accessFilter: undefined }),
				);
			});

			it('should query with an access filter for users without the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue({
					projectRoles: ['project:viewer'],
					workflowRoles: ['workflow:owner'],
				});

				await insightsService.getInsightsByWorkflow({ user, startDate, endDate });

				expect(mockInsightsByPeriodRepository.getInsightsByWorkflow).toHaveBeenCalledWith(
					expect.objectContaining({
						accessFilter: {
							user,
							projectRoles: ['project:viewer'],
							workflowRoles: ['workflow:owner'],
						},
					}),
				);
			});
		});
	});

	describe('getInsightsByTime', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		beforeEach(() => {
			mockInsightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);
		});

		it('does not request billable in the default by-time insight types', async () => {
			await insightsService.getInsightsByTime({
				user,
				startDate,
				endDate,
			});

			expect(mockInsightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith(
				expect.objectContaining({
					insightTypes: ['time_saved_min', 'runtime_ms', 'success', 'failure'],
				}),
			);
		});

		describe('project access', () => {
			it('should not check project access when no project is requested', async () => {
				await insightsService.getInsightsByTime({ user, startDate, endDate });

				expect(userHasScopes).not.toHaveBeenCalled();
			});

			it('should throw a forbidden error when the requested project is not accessible', async () => {
				vi.mocked(userHasScopes).mockResolvedValue(false);

				await expect(
					insightsService.getInsightsByTime({
						user,
						startDate,
						endDate,
						projectId: 'project-1',
					}),
				).rejects.toThrow('You do not have access to insights for this project.');

				expect(mockInsightsByPeriodRepository.getInsightsByTime).not.toHaveBeenCalled();
			});

			it('should query without an access filter for users with the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue(undefined);

				await insightsService.getInsightsByTime({ user, startDate, endDate });

				expect(mockInsightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith(
					expect.objectContaining({ accessFilter: undefined }),
				);
			});

			it('should query with an access filter for users without the global workflow read scope', async () => {
				mockWorkflowSharingService.rolesGrantingScope.mockResolvedValue({
					projectRoles: ['project:viewer'],
					workflowRoles: ['workflow:owner'],
				});

				await insightsService.getInsightsByTime({ user, startDate, endDate });

				expect(mockInsightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith(
					expect.objectContaining({
						accessFilter: {
							user,
							projectRoles: ['project:viewer'],
							workflowRoles: ['workflow:owner'],
						},
					}),
				);
			});
		});
	});

	describe('getTimeSavedInsightsByTime', () => {
		const startDate = new Date('2024-01-01');
		const endDate = new Date('2024-01-07');

		beforeEach(() => {
			mockInsightsByPeriodRepository.getInsightsByTime.mockResolvedValue([]);
		});

		it('requests only time saved', async () => {
			await insightsService.getTimeSavedInsightsByTime({
				user,
				startDate,
				endDate,
			});

			expect(mockInsightsByPeriodRepository.getInsightsByTime).toHaveBeenCalledWith(
				expect.objectContaining({
					insightTypes: ['time_saved_min'],
				}),
			);
		});
	});
});
