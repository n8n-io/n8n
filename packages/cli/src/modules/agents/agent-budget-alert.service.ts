import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { ProjectRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { UserManagementMailer } from '@/user-management/email';

import { AgentRepository } from './repositories/agent.repository';

export interface MonthlyBudgetAlertNotice {
	agentId: string;
	alertThresholdPercent: number;
}

/**
 * Emails the project creator when an agent crosses its monthly budget alert.
 * Cloud only. The guardrail calls this once for that crossing.
 * A later request in the same month does not cross the line again.
 * A mail error does not stop the run.
 */
@Service()
export class AgentBudgetAlertService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly agentRepository: AgentRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly mailer: UserManagementMailer,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	notifyMonthlyThreshold(notice: MonthlyBudgetAlertNotice): void {
		if (this.globalConfig.deployment.type !== 'cloud') return;
		void this.sendMonthlyThresholdEmail(notice).catch((error: unknown) => {
			this.logger.error('Failed to send the agent budget alert email', {
				agentId: notice.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private async sendMonthlyThresholdEmail(notice: MonthlyBudgetAlertNotice): Promise<void> {
		if (!this.mailer.isEmailSetUp) {
			this.logger.debug('Skipped the agent budget alert email because SMTP is not configured', {
				agentId: notice.agentId,
			});
			return;
		}

		const agent = await this.agentRepository.findBudgetAlertTarget(notice.agentId);
		if (!agent) {
			this.logger.debug('Skipped the agent budget alert email because the agent is gone', {
				agentId: notice.agentId,
			});
			return;
		}

		const owner = await this.projectRepository.findCreatorContact(agent.projectId);
		if (!owner) {
			this.logger.warn('Skipped the agent budget alert email because the project has no owner', {
				agentId: notice.agentId,
				projectId: agent.projectId,
			});
			return;
		}

		const baseUrl = this.urlService.getInstanceBaseUrl();
		const result = await this.mailer.agentBudgetAlert({
			email: owner.email,
			firstName: owner.firstName,
			agentName: agent.name,
			agentUrl: `${baseUrl}/projects/${agent.projectId}/agents/${notice.agentId}`,
			alertThresholdPercent: notice.alertThresholdPercent,
		});

		if (result.emailSent) {
			this.logger.info('Sent the agent budget alert email', {
				agentId: notice.agentId,
				projectId: agent.projectId,
			});
		}
	}
}
