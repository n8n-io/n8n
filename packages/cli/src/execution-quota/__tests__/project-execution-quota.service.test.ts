import type {
	Project,
	ProjectExecutionCounterRepository,
	ProjectExecutionQuotaRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { UNLIMITED_LICENSE_QUOTA } from '@n8n/constants';
import { DateTime } from 'luxon';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { InsightsByPeriodRepository } from '@/modules/insights/database/repositories/insights-by-period.repository';

import { ProjectExecutionQuotaExceededError } from '../project-execution-quota.error';
import { ProjectExecutionQuotaService } from '../project-execution-quota.service';

describe('ProjectExecutionQuotaService.assertWithinQuotaAndIncrement', () => {
	const project = { id: 'project-1' } as Project;

	const sharedWorkflowRepository = mock<SharedWorkflowRepository>();
	const quotaRepository = mock<ProjectExecutionQuotaRepository>();
	const counterRepository = mock<ProjectExecutionCounterRepository>();
	const license = mock<License>();
	const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();

	const service = new ProjectExecutionQuotaService(
		sharedWorkflowRepository,
		quotaRepository,
		counterRepository,
		license,
		insightsByPeriodRepository,
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

describe('ProjectExecutionQuotaService.getSpikes', () => {
	it('flags a workflow whose today count exceeds 5x its trailing baseline', async () => {
		const counterRepository = mock<ProjectExecutionCounterRepository>();
		const insightsByPeriodRepository = mock<InsightsByPeriodRepository>();
		counterRepository.findByProjectId.mockResolvedValue([{ workflowId: 'workflow-1', count: 500 }]);
		// One trailing day (yesterday) with a baseline value of 10. Must not be
		// "today" — getSpikes strips today's bucket out of the baseline (it only
		// exists to be compared against, not counted as history), so a fixture
		// dated today would leave an empty baseline and never flag a spike.
		insightsByPeriodRepository.getTrailingHourlyRows.mockResolvedValue([
			{ periodStart: DateTime.utc().minus({ days: 1 }).toJSDate(), value: 10 },
		]);

		const service = new ProjectExecutionQuotaService(
			mock(),
			mock(),
			counterRepository,
			mock(),
			insightsByPeriodRepository,
		);

		const spikes = await service.getSpikes('project-1');

		expect(spikes).toEqual([
			expect.objectContaining({ workflowId: 'workflow-1', todayCount: 500 }),
		]);
	});
});
