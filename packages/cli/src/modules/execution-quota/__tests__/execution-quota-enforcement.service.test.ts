import { mockLogger } from '@n8n/backend-test-utils';
import type { SharedWorkflowRepository } from '@n8n/db';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';

import type { ExecutionQuotaConfig } from '../database/entities/execution-quota-config';
import { ExecutionQuotaEnforcementService } from '../execution-quota-enforcement.service';
import { ExecutionQuotaExceededError } from '../execution-quota.errors';
import type { ExecutionQuotaService, QuotaCheckResult } from '../execution-quota.service';

describe('ExecutionQuotaEnforcementService', () => {
	let service: ExecutionQuotaEnforcementService;
	let quotaService: MockProxy<ExecutionQuotaService>;
	let sharedWorkflowRepository: MockProxy<SharedWorkflowRepository>;

	beforeEach(() => {
		jest.clearAllMocks();

		quotaService = mock<ExecutionQuotaService>();
		sharedWorkflowRepository = mock<SharedWorkflowRepository>();

		service = new ExecutionQuotaEnforcementService(
			quotaService,
			sharedWorkflowRepository,
			mockLogger(),
		);
	});

	describe('enforceQuota', () => {
		it('should do nothing when workflow has no shared project', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValue(null);

			await expect(service.enforceQuota('wf-1', 'My Workflow')).resolves.toBeUndefined();
			expect(quotaService.checkQuota).not.toHaveBeenCalled();
		});

		it('should do nothing when quota check passes', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValue({
				projectId: 'proj-1',
				project: { name: 'Test Project' },
			} as never);

			quotaService.checkQuota.mockResolvedValue({ allowed: true });

			await expect(service.enforceQuota('wf-1', 'My Workflow')).resolves.toBeUndefined();
		});

		it('should throw ExecutionQuotaExceededError when enforcement mode is block', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValue({
				projectId: 'proj-1',
				project: { name: 'Test Project' },
			} as never);

			const exceededConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				enforcementMode: 'block',
				workflowId: null,
			});

			const result: QuotaCheckResult = {
				allowed: false,
				exceededConfig,
				currentCount: 100,
				periodStart: new Date(),
			};
			quotaService.checkQuota.mockResolvedValue(result);

			await expect(service.enforceQuota('wf-1', 'My Workflow')).rejects.toThrow(
				ExecutionQuotaExceededError,
			);
		});

		it('should not throw when enforcement mode is warn', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValue({
				projectId: 'proj-1',
				project: { name: 'Test Project' },
			} as never);

			const exceededConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				enforcementMode: 'warn',
				workflowId: null,
			});

			const result: QuotaCheckResult = {
				allowed: false,
				exceededConfig,
				currentCount: 100,
				periodStart: new Date(),
			};
			quotaService.checkQuota.mockResolvedValue(result);

			await expect(service.enforceQuota('wf-1', 'My Workflow')).resolves.toBeUndefined();
		});

		it('should not throw when enforcement mode is workflow', async () => {
			sharedWorkflowRepository.findOne.mockResolvedValue({
				projectId: 'proj-1',
				project: { name: 'Test Project' },
			} as never);

			const exceededConfig = mock<ExecutionQuotaConfig>({
				period: 'daily',
				limit: 100,
				enforcementMode: 'workflow',
				quotaWorkflowId: 'quota-wf-1',
				workflowId: null,
			});

			const result: QuotaCheckResult = {
				allowed: false,
				exceededConfig,
				currentCount: 100,
				periodStart: new Date(),
			};
			quotaService.checkQuota.mockResolvedValue(result);

			// Should not throw - just triggers workflow asynchronously
			await expect(service.enforceQuota('wf-1', 'My Workflow')).resolves.toBeUndefined();
		});
	});
});
