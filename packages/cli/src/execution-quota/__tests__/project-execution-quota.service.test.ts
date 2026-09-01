import type {
	Project,
	ProjectExecutionCounterRepository,
	ProjectExecutionQuotaRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';

import { ProjectExecutionQuotaExceededError } from '../project-execution-quota.error';
import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

describe('ProjectExecutionQuotaService.assertWithinQuotaAndIncrement', () => {
	const project = { id: 'project-1' } as Project;

	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const quotaRepository = mock<ProjectExecutionQuotaRepository>();
	const counterRepository = mock<ProjectExecutionCounterRepository>();
	const license = mock<License>();

	const service = new ProjectExecutionQuotaService(
		sharedWorkflowRepository,
		quotaRepository,
		counterRepository,
		license,
	);

	beforeEach(() => {
		vi.clearAllMocks();
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(project);
	});

	it('skips the check entirely for modes Insights itself skips (e.g. manual)', async () => {
		await service.assertWithinQuotaAndIncrement('workflow-1', 'manual');

		expect(sharedWorkflowRepository.getWorkflowOwningProject).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('allows and increments when under quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(5);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalledWith(
			'project-1',
			'workflow-1',
			'day',
			expect.any(String),
		);
	});

	it('throws and does not increment when at quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(10);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});

	it('throws and does not increment when over quota', async () => {
		quotaRepository.findOneBy.mockResolvedValue({
			projectId: 'project-1',
			limit: 10,
			periodUnit: 'day',
		} as never);
		counterRepository.getProjectPeriodTotal.mockResolvedValue(15);

		await expect(service.assertWithinQuotaAndIncrement('workflow-1', 'webhook')).rejects.toThrow(
			ProjectExecutionQuotaExceededError,
		);
	});

	it('allows unconditionally when the resolved limit is unlimited', async () => {
		quotaRepository.findOneBy.mockResolvedValue(null);
		license.getValue.mockReturnValue(UNLIMITED_LICENSE_QUOTA);
		license.getPlanName.mockReturnValue('Enterprise');

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(counterRepository.getProjectPeriodTotal).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).toHaveBeenCalled();
	});

	it('does nothing when the workflow has no owning project', async () => {
		sharedWorkflowRepository.getWorkflowOwningProject.mockResolvedValue(undefined);

		await service.assertWithinQuotaAndIncrement('workflow-1', 'webhook');

		expect(quotaRepository.findOneBy).not.toHaveBeenCalled();
		expect(counterRepository.incrementWorkflowCount).not.toHaveBeenCalled();
	});
});
