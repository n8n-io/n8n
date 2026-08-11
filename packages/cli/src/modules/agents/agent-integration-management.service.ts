import { AgentIntegrationSchema, type AgentIntegrationConfig } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import type { Agent } from './entities/agent.entity';
import { ChatIntegrationRegistry } from './integrations/agent-chat-integration';
import { ChatIntegrationService } from './integrations/chat-integration.service';

@Service()
export class AgentIntegrationManagementService {
	constructor(
		private readonly persistenceService: AgentIntegrationPersistenceService,
		private readonly credentialsService: CredentialsService,
		private readonly chatService: ChatIntegrationService,
		private readonly registry: ChatIntegrationRegistry,
	) {}

	async validateConfig(input: unknown): Promise<AgentIntegrationConfig> {
		const parsed = await AgentIntegrationSchema.safeParseAsync(input);
		if (!parsed.success) throw new BadRequestError(parsed.error.message);

		const integration = parsed.data;
		this.registry.require(integration.type).validateConfig?.(integration);
		return integration;
	}

	async connect(options: {
		agent: Agent;
		user: User;
		integration: unknown;
		modifiedBy?: 'user' | 'mcp';
	}): Promise<{ integration: AgentIntegrationConfig; savedAgent: Agent }> {
		const integration = await this.validateConfig(options.integration);
		const implementation = this.registry.require(integration.type);
		const usableCredentials = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			options.user,
			{ projectId: options.agent.projectId },
		);
		const credential = usableCredentials.find((item) => item.id === integration.credentialId);
		if (!credential) {
			throw new NotFoundError(`Credential "${integration.credentialId}" not found`);
		}
		if (!implementation.credentialTypes.includes(credential.type)) {
			throw new BadRequestError(
				`${implementation.displayLabel} integrations do not support ${credential.type} credentials`,
			);
		}

		await this.chatService.validateBeforeConnect(
			options.agent.id,
			integration,
			options.agent.projectId,
		);

		const savedAgent = await this.persistenceService.saveCredentialIntegration(
			options.agent,
			integration,
			{ user: options.user, modifiedBy: options.modifiedBy ?? 'user', broadcast: false },
		);
		if (savedAgent.activeVersionId === null) return { integration, savedAgent };

		await this.chatService.connect(options.agent.id, integration, options.agent.projectId);
		await this.chatService.broadcastIntegrationChange(options.agent.id, integration, 'connect');
		return { integration, savedAgent };
	}

	async disconnect(options: {
		agent: Agent;
		user: User;
		type: string;
		credentialId: string;
		modifiedBy?: 'user' | 'mcp';
	}): Promise<{ savedAgent: Agent }> {
		const persisted = (options.agent.integrations ?? []).find(
			(item) => item.type === options.type && item.credentialId === options.credentialId,
		);
		const parsed = AgentIntegrationSchema.safeParse({
			type: options.type,
			credentialId: options.credentialId,
		});
		const integration = persisted ?? (parsed.success ? parsed.data : undefined);

		if (integration) {
			await this.chatService.disconnectChannel(options.agent.id, integration);
		} else {
			await this.chatService.disconnect(options.agent.id, {
				type: options.type,
				credentialId: options.credentialId,
			});
		}

		const savedAgent = await this.persistenceService.removeCredentialIntegration(
			options.agent,
			options.type,
			options.credentialId,
			{ user: options.user, modifiedBy: options.modifiedBy ?? 'user', broadcast: false },
		);
		return { savedAgent };
	}
}
