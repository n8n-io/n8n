import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { UserError } from 'n8n-workflow';

import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId: 'version-1',
		activeVersionId: 'version-1',
		integrations: [],
		updatedAt: new Date('2025-01-01T00:00:00Z'),
		...overrides,
	} as Agent;
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);

	return {
		service: new AgentIntegrationPersistenceService(
			agentRepository,
			chatIntegrationService,
			runtimeCacheService,
		),
		agentRepository,
		chatIntegrationService,
		runtimeCacheService,
	};
}

describe('AgentIntegrationPersistenceService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('lists public descriptor metadata from the integration registry', () => {
		const registry = mock<ChatIntegrationRegistry>();
		registry.list.mockReturnValue([
			{
				type: 'slack',
				displayLabel: 'Slack',
				displayIcon: 'slack',
				credentialTypes: ['slackApi'],
				builderGuidance: { capabilities: ['respond'] },
			},
		] as never);
		Container.set(ChatIntegrationRegistry, registry);

		expect(makeService().service.listChatIntegrations()).toEqual([
			{
				type: 'slack',
				label: 'Slack',
				icon: 'slack',
				credentialTypes: ['slackApi'],
				capabilities: ['respond'],
				useIntegrationWhen: undefined,
				useNodeToolWhen: undefined,
			},
		]);
	});

	it('adds or replaces credential integrations and invalidates the runtime cache', async () => {
		const { service, agentRepository, chatIntegrationService, runtimeCacheService } = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'old' },
				{ type: 'linear', credentialId: 'linear-1' },
			],
		});

		await service.saveCredentialIntegration(agent, { type: 'slack', credentialId: 'new' });
		await service.saveCredentialIntegration(agent, { type: 'linear', credentialId: 'linear-1' });

		expect(agent.integrations).toEqual([
			{ type: 'slack', credentialId: 'old' },
			{ type: 'linear', credentialId: 'linear-1' },
			{ type: 'slack', credentialId: 'new' },
		]);
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.save).toHaveBeenCalledTimes(2);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agentId,
			{ type: 'slack', credentialId: 'new' },
			'connect',
		);
	});

	it('can save without broadcasting after an explicit live connection', async () => {
		const { service, chatIntegrationService } = makeService();

		await service.saveCredentialIntegration(
			makeAgent(),
			{ type: 'slack', credentialId: 'cred-1' },
			{ broadcast: false },
		);

		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('rejects invalid credential integration payloads', async () => {
		const { service } = makeService();

		await expect(
			service.saveCredentialIntegration(makeAgent(), { type: 'slack', credentialId: '' }),
		).rejects.toThrow(UserError);
	});

	it('removes only the matching integration and broadcasts the disconnect', async () => {
		const { service, chatIntegrationService } = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'slack-1' },
				{ type: 'linear', credentialId: 'linear-1' },
			],
		});

		await service.removeCredentialIntegration(agent, 'slack', 'slack-1');

		expect(agent.integrations).toEqual([{ type: 'linear', credentialId: 'linear-1' }]);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agentId,
			{ type: 'slack', credentialId: 'slack-1' },
			'disconnect',
		);
	});
});
