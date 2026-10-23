import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { ProjectRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UserManagementMailer } from '@/user-management/email';

import { AgentBudgetAlertService } from '../agent-budget-alert.service';
import type { AgentRepository } from '../repositories/agent.repository';

const notice = { agentId: 'agent-1', alertThresholdPercent: 80 };

function makeService(deploymentType: string, isEmailSetUp = true) {
	const agentRepository = mock<AgentRepository>();
	const projectRepository = mock<ProjectRepository>();
	const mailer = mock<UserManagementMailer>({ isEmailSetUp });
	const urlService = mock<UrlService>();
	urlService.getInstanceBaseUrl.mockReturnValue('https://app.n8n.cloud');
	const logger = mock<Logger>();
	const service = new AgentBudgetAlertService(
		mock<GlobalConfig>({ deployment: { type: deploymentType } }),
		agentRepository,
		projectRepository,
		mailer,
		urlService,
		logger,
	);
	return { service, agentRepository, projectRepository, mailer, logger };
}

describe('AgentBudgetAlertService', () => {
	it('sends no email when the deployment type is not cloud', async () => {
		const { service, agentRepository, mailer } = makeService('default');

		service.notifyMonthlyThreshold(notice);
		await Promise.resolve();

		expect(agentRepository.findBudgetAlertTarget).not.toHaveBeenCalled();
		expect(mailer.agentBudgetAlert).not.toHaveBeenCalled();
	});

	it('sends one email to the project owner when the threshold is crossed on cloud', async () => {
		const { service, agentRepository, projectRepository, mailer } = makeService('cloud');
		agentRepository.findBudgetAlertTarget.mockResolvedValue({
			name: 'Support Agent',
			projectId: 'project-1',
		});
		projectRepository.findCreatorContact.mockResolvedValue({
			email: 'owner@example.com',
			firstName: 'Ada',
		});
		mailer.agentBudgetAlert.mockResolvedValue({ emailSent: true });

		service.notifyMonthlyThreshold(notice);

		await vi.waitFor(() => {
			expect(mailer.agentBudgetAlert).toHaveBeenCalledOnce();
		});
		expect(mailer.agentBudgetAlert).toHaveBeenCalledWith({
			email: 'owner@example.com',
			firstName: 'Ada',
			agentName: 'Support Agent',
			agentUrl: 'https://app.n8n.cloud/projects/project-1/agents/agent-1',
			alertThresholdPercent: 80,
		});
	});

	it('sends no email when SMTP is not configured', async () => {
		const { service, agentRepository, mailer } = makeService('cloud', false);

		service.notifyMonthlyThreshold(notice);
		await Promise.resolve();

		expect(agentRepository.findBudgetAlertTarget).not.toHaveBeenCalled();
		expect(mailer.agentBudgetAlert).not.toHaveBeenCalled();
	});

	it('sends no email when the agent or the project owner is missing', async () => {
		const missingAgent = makeService('cloud');
		missingAgent.agentRepository.findBudgetAlertTarget.mockResolvedValue(null);
		missingAgent.service.notifyMonthlyThreshold(notice);
		await vi.waitFor(() => {
			expect(missingAgent.agentRepository.findBudgetAlertTarget).toHaveBeenCalledOnce();
		});
		expect(missingAgent.mailer.agentBudgetAlert).not.toHaveBeenCalled();

		const missingOwner = makeService('cloud');
		missingOwner.agentRepository.findBudgetAlertTarget.mockResolvedValue({
			name: 'Support Agent',
			projectId: 'project-1',
		});
		missingOwner.projectRepository.findCreatorContact.mockResolvedValue(null);
		missingOwner.service.notifyMonthlyThreshold(notice);
		await vi.waitFor(() => {
			expect(missingOwner.projectRepository.findCreatorContact).toHaveBeenCalledOnce();
		});
		expect(missingOwner.mailer.agentBudgetAlert).not.toHaveBeenCalled();
	});

	it('does not throw when the mailer fails', async () => {
		const { service, agentRepository, projectRepository, mailer, logger } = makeService('cloud');
		agentRepository.findBudgetAlertTarget.mockResolvedValue({
			name: 'Support Agent',
			projectId: 'project-1',
		});
		projectRepository.findCreatorContact.mockResolvedValue({
			email: 'owner@example.com',
			firstName: null,
		});
		mailer.agentBudgetAlert.mockRejectedValue(new Error('smtp down'));

		expect(() => service.notifyMonthlyThreshold(notice)).not.toThrow();
		await vi.waitFor(() => {
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to send the agent budget alert email',
				expect.objectContaining({ agentId: 'agent-1', error: 'smtp down' }),
			);
		});
	});
});
