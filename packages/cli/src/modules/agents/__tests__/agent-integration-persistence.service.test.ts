import { mock } from 'vitest-mock-extended';
import { UserError } from 'n8n-workflow';

import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import type { Agent } from '../entities/agent.entity';
import type { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
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
	const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);

	return {
		service: new AgentIntegrationPersistenceService(
			agentRepository,
			chatIntegrationService,
			runtimeCacheService,
			chatIntegrationRegistry,
		),
		agentRepository,
		chatIntegrationService,
		runtimeCacheService,
		chatIntegrationRegistry,
	};
}

describe('AgentIntegrationPersistenceService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('lists public descriptor metadata from the integration registry', () => {
		const { service, chatIntegrationRegistry } = makeService();
		chatIntegrationRegistry.list.mockReturnValue([
			{
				type: 'n8n_chat',
				displayLabel: 'n8n Chat',
				displayIcon: 'message-square',
				credentialTypes: [],
				internal: true,
			},
		] as never);
		chatIntegrationRegistry.listPublic.mockReturnValue([
			{
				type: 'slack',
				displayLabel: 'Slack',
				displayIcon: 'slack',
				credentialTypes: ['slackApi'],
				builderGuidance: { capabilities: ['respond'] },
			},
		] as never);

		expect(service.listChatIntegrations()).toEqual([
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
		expect(chatIntegrationRegistry.listPublic).toHaveBeenCalled();
		expect(chatIntegrationRegistry.list).not.toHaveBeenCalled();
	});

	it('appends a credential integration to an empty list and invalidates the runtime cache', async () => {
		const { service, agentRepository, chatIntegrationService, runtimeCacheService } = makeService();
		const agent = makeAgent();

		await service.saveCredentialIntegration(agent, { type: 'slack', credentialId: 'slack-1' });

		expect(agent.integrations).toEqual([{ type: 'slack', credentialId: 'slack-1' }]);
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.save).toHaveBeenCalledWith(agent);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agentId,
			{ type: 'slack', credentialId: 'slack-1' },
			'connect',
		);
	});

	it('appends new credential integrations while preserving existing siblings', async () => {
		const { service, agentRepository, chatIntegrationService, runtimeCacheService } = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'old' },
				{ type: 'linear', credentialId: 'linear-1' },
			],
		});

		await service.saveCredentialIntegration(agent, { type: 'slack', credentialId: 'new' });

		expect(agent.integrations).toEqual([
			{ type: 'slack', credentialId: 'old' },
			{ type: 'linear', credentialId: 'linear-1' },
			{ type: 'slack', credentialId: 'new' },
		]);
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.save).toHaveBeenCalledTimes(1);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agentId,
			{ type: 'slack', credentialId: 'new' },
			'connect',
		);
	});

	it('replaces an existing credential integration with the same type and credential id', async () => {
		const { service } = makeService();
		const agent = makeAgent({
			integrations: [
				{
					type: 'telegram',
					credentialId: 'telegram-1',
					settings: { accessMode: 'public', allowedUsers: [] },
				},
				{ type: 'linear', credentialId: 'linear-1' },
			],
		});

		await service.saveCredentialIntegration(agent, {
			type: 'telegram',
			credentialId: 'telegram-1',
			settings: { accessMode: 'private', allowedUsers: ['@alice'] },
		});

		expect(agent.integrations).toEqual([
			{
				type: 'telegram',
				credentialId: 'telegram-1',
				settings: { accessMode: 'private', allowedUsers: ['@alice'] },
			},
			{ type: 'linear', credentialId: 'linear-1' },
		]);
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

	it('returns the agent unchanged when removing from an empty list', async () => {
		const { service, agentRepository, chatIntegrationService } = makeService();
		const agent = makeAgent();

		await expect(service.removeCredentialIntegration(agent, 'slack', 'slack-1')).resolves.toBe(
			agent,
		);
		expect(agentRepository.save).not.toHaveBeenCalled();
		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('returns the agent unchanged when the integration to remove is missing', async () => {
		const { service, agentRepository, chatIntegrationService } = makeService();
		const agent = makeAgent({ integrations: [{ type: 'linear', credentialId: 'linear-1' }] });

		await expect(service.removeCredentialIntegration(agent, 'slack', 'slack-1')).resolves.toBe(
			agent,
		);
		expect(agentRepository.save).not.toHaveBeenCalled();
		expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
	});

	it('removes only the matching integration, invalidates cache, and broadcasts the disconnect', async () => {
		const { service, agentRepository, chatIntegrationService, runtimeCacheService } = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'slack-1' },
				{ type: 'linear', credentialId: 'linear-1' },
			],
		});

		await service.removeCredentialIntegration(agent, 'slack', 'slack-1');

		expect(agent.integrations).toEqual([{ type: 'linear', credentialId: 'linear-1' }]);
		expect(agent.versionId).not.toBe(agent.activeVersionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentRepository.save).toHaveBeenCalledWith(agent);
		expect(chatIntegrationService.broadcastIntegrationChange).toHaveBeenCalledWith(
			agentId,
			{ type: 'slack', credentialId: 'slack-1' },
			'disconnect',
		);
	});
});
