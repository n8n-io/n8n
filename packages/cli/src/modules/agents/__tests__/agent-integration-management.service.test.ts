/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import { AgentIntegrationManagementService } from '../agent-integration-management.service';
import type { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { Agent } from '../entities/agent.entity';
import type {
	AgentChatIntegration,
	ChatIntegrationRegistry,
} from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';

describe('AgentIntegrationManagementService', () => {
	const user = { id: 'user-1' };
	const integration = {
		type: 'slack',
		credentialId: 'credential-1',
	} satisfies AgentIntegrationConfig;
	const agent = {
		id: 'agent-1',
		projectId: 'project-1',
		activeVersionId: 'version-1',
		integrations: [],
	} as unknown as Agent;

	function makeService() {
		const persistenceService = mock<AgentIntegrationPersistenceService>();
		const credentialsService = mock<CredentialsService>();
		const chatService = mock<ChatIntegrationService>();
		const registry = mock<ChatIntegrationRegistry>();
		const implementation = mock<AgentChatIntegration>({
			type: 'slack',
			displayLabel: 'Slack',
			credentialTypes: ['slackApi'],
		});
		registry.require.mockReturnValue(implementation);
		return {
			service: new AgentIntegrationManagementService(
				persistenceService,
				credentialsService,
				chatService,
				registry,
			),
			persistenceService,
			credentialsService,
			chatService,
			implementation,
		};
	}

	it('persists, connects, and broadcasts for a published integration', async () => {
		const { service, persistenceService, credentialsService, chatService, implementation } =
			makeService();
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: integration.credentialId, type: 'slackApi' },
		] as never);
		persistenceService.saveCredentialIntegration.mockResolvedValue(agent);

		await service.connect({ agent, user: user as never, integration });

		expect(implementation.validateConfig).toHaveBeenCalledWith(integration);
		expect(chatService.validateBeforeConnect).toHaveBeenCalledWith(
			agent.id,
			integration,
			agent.projectId,
		);
		expect(persistenceService.saveCredentialIntegration).toHaveBeenCalledWith(agent, integration, {
			user,
			modifiedBy: 'user',
			broadcast: false,
		});
		expect(chatService.connect).toHaveBeenCalledWith(agent.id, integration, agent.projectId);
		expect(chatService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agent.id,
			integration,
			'connect',
		);
	});

	it('persists but does not initialize an unpublished integration', async () => {
		const { service, persistenceService, credentialsService, chatService } = makeService();
		const draftAgent = { ...agent, activeVersionId: null };
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: integration.credentialId, type: 'slackApi' },
		] as never);
		persistenceService.saveCredentialIntegration.mockResolvedValue(draftAgent);

		await service.connect({ agent: draftAgent, user: user as never, integration });

		expect(persistenceService.saveCredentialIntegration).toHaveBeenCalledWith(
			draftAgent,
			integration,
			{ user, modifiedBy: 'user', broadcast: false },
		);
		expect(chatService.validateBeforeConnect).toHaveBeenCalledWith(
			draftAgent.id,
			integration,
			draftAgent.projectId,
		);
		expect(chatService.connect).not.toHaveBeenCalled();
		expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('does not broadcast when live connection fails', async () => {
		const { service, persistenceService, credentialsService, chatService } = makeService();
		const connectionError = new Error('Slack connect failed');
		credentialsService.getCredentialsAUserCanUseInAWorkflow.mockResolvedValue([
			{ id: integration.credentialId, type: 'slackApi' },
		] as never);
		persistenceService.saveCredentialIntegration.mockResolvedValue(agent);
		chatService.connect.mockRejectedValue(connectionError);

		await expect(service.connect({ agent, user: user as never, integration })).rejects.toBe(
			connectionError,
		);

		expect(persistenceService.saveCredentialIntegration).toHaveBeenCalled();
		expect(chatService.connect).toHaveBeenCalled();
		expect(chatService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('disconnects the runtime channel before removing persistence', async () => {
		const { service, persistenceService, chatService } = makeService();
		const connectedAgent = { ...agent, integrations: [integration] } as Agent;
		persistenceService.removeCredentialIntegration.mockResolvedValue({
			...connectedAgent,
			integrations: [],
		});

		await service.disconnect({
			agent: connectedAgent,
			user: user as never,
			type: integration.type,
			credentialId: integration.credentialId,
			modifiedBy: 'mcp',
		});

		expect(chatService.disconnectChannel).toHaveBeenCalledWith(agent.id, integration);
		expect(persistenceService.removeCredentialIntegration).toHaveBeenCalledWith(
			connectedAgent,
			integration.type,
			integration.credentialId,
			{ user, modifiedBy: 'mcp', broadcast: false },
		);
	});
});
