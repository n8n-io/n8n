import { mockLogger } from '@n8n/backend-test-utils';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExecutionQuotaConfig } from '../database/entities/execution-quota-config';
import type { ExecutionQuotaConfigRepository } from '../database/repositories/execution-quota-config.repository';
import type { ExecutionQuotaCounterRepository } from '../database/repositories/execution-quota-counter.repository';
import type { ExecutionQuotaModuleConfig } from '../execution-quota.config';
import { ExecutionQuotaService } from '../execution-quota.service';

describe('ExecutionQuotaService', () => {
	let service: ExecutionQuotaService;
	let configRepository: MockProxy<ExecutionQuotaConfigRepository>;
	let counterRepository: MockProxy<ExecutionQuotaCounterRepository>;
	let moduleConfig: MockProxy<ExecutionQuotaModuleConfig>;

	beforeEach(() => {
		jest.clearAllMocks();

		configRepository = mock<ExecutionQuotaConfigRepository>();
		counterRepository = mock<ExecutionQuotaCounterRepository>();
		moduleConfig = mock<ExecutionQuotaModuleConfig>({
			cacheTtlMinutes: 0, // disable cache for testing
			retentionMonths: 3,
		});

		service = new ExecutionQuotaService(
			configRepository,
			counterRepository,
			moduleConfig,
			mockLogger(),
		);
	});

	describe('checkQuota', () => {
		it('should allow execution when no configs exist', async () => {
			configRepository.findApplicableConfigs.mockResolvedValue([]);

			const result = await service.checkQuota('wf-1', 'proj-1');

			expect(result.allowed).toBe(true);
			expect(result.exceededConfig).toBeUndefined();
		});

		it('should allow execution when count is below limit', async () => {
			const quotaConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				workflowId: null,
			});
			configRepository.findApplicableConfigs.mockResolvedValue([quotaConfig]);
			counterRepository.getCount.mockResolvedValue(50);

			const result = await service.checkQuota('wf-1', 'proj-1');

			expect(result.allowed).toBe(true);
		});

		it('should deny execution when count reaches limit', async () => {
			const quotaConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				workflowId: null,
			});
			configRepository.findApplicableConfigs.mockResolvedValue([quotaConfig]);
			counterRepository.getCount.mockResolvedValue(100);

			const result = await service.checkQuota('wf-1', 'proj-1');

			expect(result.allowed).toBe(false);
			expect(result.exceededConfig).toBe(quotaConfig);
			expect(result.currentCount).toBe(100);
		});

		it('should deny execution when count exceeds limit', async () => {
			const quotaConfig = mock<ExecutionQuotaConfig>({
				period: 'hourly',
				limit: 10,
				workflowId: null,
			});
			configRepository.findApplicableConfigs.mockResolvedValue([quotaConfig]);
			counterRepository.getCount.mockResolvedValue(15);

			const result = await service.checkQuota('wf-1', 'proj-1');

			expect(result.allowed).toBe(false);
			expect(result.currentCount).toBe(15);
		});

		it('should check workflow-level counter for workflow-scoped configs', async () => {
			const quotaConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 50,
				workflowId: 'wf-1',
			});
			configRepository.findApplicableConfigs.mockResolvedValue([quotaConfig]);
			counterRepository.getCount.mockResolvedValue(30);

			await service.checkQuota('wf-1', 'proj-1');

			// Should pass workflowId for workflow-level configs
			expect(counterRepository.getCount).toHaveBeenCalledWith('proj-1', 'wf-1', expect.any(Date));
		});

		it('should check project-level counter for project-scoped configs', async () => {
			const quotaConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 50,
				workflowId: null,
			});
			configRepository.findApplicableConfigs.mockResolvedValue([quotaConfig]);
			counterRepository.getCount.mockResolvedValue(30);

			await service.checkQuota('wf-1', 'proj-1');

			// Should pass null for project-level configs
			expect(counterRepository.getCount).toHaveBeenCalledWith('proj-1', null, expect.any(Date));
		});

		it('should return first exceeded config when multiple configs exist', async () => {
			const config1 = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				workflowId: null,
			});
			const config2 = mock<ExecutionQuotaConfig>({
				period: 'hourly',
				limit: 10,
				workflowId: null,
			});
			configRepository.findApplicableConfigs.mockResolvedValue([config1, config2]);
			// First config: under limit, second config: over limit
			counterRepository.getCount.mockResolvedValueOnce(50).mockResolvedValueOnce(15);

			const result = await service.checkQuota('wf-1', 'proj-1');

			expect(result.allowed).toBe(false);
			expect(result.exceededConfig).toBe(config2);
		});
	});

	describe('calculatePeriodStart', () => {
		it('should return start of current hour for hourly period', () => {
			const result = service.calculatePeriodStart('hourly');
			const now = new Date();
			expect(result.getMinutes()).toBe(0);
			expect(result.getSeconds()).toBe(0);
			expect(result.getMilliseconds()).toBe(0);
			expect(result.getUTCHours()).toBe(now.getUTCHours());
		});

		it('should return start of current day for daily period', () => {
			const result = service.calculatePeriodStart('daily');
			expect(result.getUTCHours()).toBe(0);
			expect(result.getUTCMinutes()).toBe(0);
		});

		it('should return start of current month for monthly period', () => {
			const result = service.calculatePeriodStart('monthly');
			expect(result.getUTCDate()).toBe(1);
			expect(result.getUTCHours()).toBe(0);
		});
	});

	describe('refreshCache', () => {
		it('should clear the config cache', async () => {
			// Populate cache
			configRepository.findApplicableConfigs.mockResolvedValue([]);
			await service.checkQuota('wf-1', 'proj-1');
			expect(configRepository.findApplicableConfigs).toHaveBeenCalledTimes(1);

			// Second call should use cache (even with TTL=0 since cache was just set)
			// but refreshCache should force a new lookup
			service.refreshCache();
			await service.checkQuota('wf-1', 'proj-1');

			expect(configRepository.findApplicableConfigs).toHaveBeenCalledTimes(2);
		});
	});

	describe('pruneOldCounters', () => {
		it('should call counterRepository.pruneOldCounters with correct date', async () => {
			counterRepository.pruneOldCounters.mockResolvedValue(5);

			const result = await service.pruneOldCounters();

			expect(result).toBe(5);
			expect(counterRepository.pruneOldCounters).toHaveBeenCalledWith(expect.any(Date));
		});

		it('should return 0 when no counters pruned', async () => {
			counterRepository.pruneOldCounters.mockResolvedValue(0);

			const result = await service.pruneOldCounters();

			expect(result).toBe(0);
		});
	});
});
