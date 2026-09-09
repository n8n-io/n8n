import type { AgentEmailProvisionResponse, AgentIntegrationConfig } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UrlService } from '@/services/url.service';

import { AgentIntegrationManagementService } from '../../../agent-integration-management.service';
import { AgentRepository } from '../../../repositories/agent.repository';
import { AgentEmailServiceClient } from './agent-email-service-client';

const AGENT_EMAIL_CREDENTIAL_TYPE = 'agentEmailApi';

@Service()
export class AgentEmailManagedSetupService {
	constructor(
		private readonly serviceClient: AgentEmailServiceClient,
		private readonly credentialsService: CredentialsService,
		private readonly integrationManagement: AgentIntegrationManagementService,
		private readonly agentRepository: AgentRepository,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async provision(options: {
		projectId: string;
		agentId: string;
		user: User;
	}): Promise<AgentEmailProvisionResponse> {
		const agent = await this.agentRepository.findByIdAndProjectId(
			options.agentId,
			options.projectId,
		);
		if (!agent) throw new NotFoundError(`Agent "${options.agentId}" not found`);

		const callbackUrl = `${this.urlService.getWebhookBaseUrl()}rest/projects/${options.projectId}/agents/v2/${options.agentId}/webhooks/email`;
		const channel = await this.serviceClient.provision(options.agentId, callbackUrl);
		const credential = await this.credentialsService.createManagedCredential(
			{
				name: channel.address,
				type: AGENT_EMAIL_CREDENTIAL_TYPE,
				data: channel,
				projectId: options.projectId,
			},
			options.user,
		);
		const integration = {
			type: 'email',
			credentialId: credential.id,
		} satisfies AgentIntegrationConfig;

		try {
			const { savedAgent } = await this.integrationManagement.connect({
				agent,
				user: options.user,
				integration,
			});
			return {
				credentialId: credential.id,
				address: channel.address,
				status: savedAgent.activeVersionId === null ? 'configured' : 'connected',
			};
		} catch (error) {
			await this.deleteUnreferencedCredential(agent.id, credential.id, options.user);
			throw error;
		}
	}

	private async deleteUnreferencedCredential(
		agentId: string,
		credentialId: string,
		user: User,
	): Promise<void> {
		try {
			const state = await this.agentRepository.findIntegrationState(agentId);
			const referenced = (state?.integrations ?? []).some(
				(entry) => entry.credentialId === credentialId,
			);
			if (!referenced) await this.credentialsService.delete(user, credentialId);
		} catch (error) {
			this.logger.warn('[AgentEmailManagedSetupService] Could not clean up credential', {
				agentId,
				credentialId,
				error,
			});
		}
	}
}
