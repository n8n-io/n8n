/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentIntegrationManagementService } from '../../../agent-integration-management.service';
import type { Agent } from '../../../entities/agent.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
import type { OpenAiCompatibleChatService } from '../openai-compatible-chat.service';
import { OpenAiCompatibleSetupService } from '../openai-compatible-setup.service';

describe('OpenAiCompatibleSetupService', () => {
	const user = { id: 'user-1' };

	function makeAgent(overrides: Partial<Agent> = {}): Agent {
		return {
			id: 'agent-1',
			name: 'My Agent',
			projectId: 'project-1',
			integrations: [],
			...overrides,
		} as Agent;
	}

	function makeService() {
		const integrationManagementService = mock<AgentIntegrationManagementService>();
		const agentRepository = mock<AgentRepository>();
		const chatService = mock<OpenAiCompatibleChatService>();
		chatService.deriveToken.mockReturnValue('n8n_agent_derived_token');

		return {
			service: new OpenAiCompatibleSetupService(
				integrationManagementService,
				agentRepository,
				chatService,
			),
			integrationManagementService,
			agentRepository,
			chatService,
		};
	}

	describe('generateKey', () => {
		it('connects the channel and returns the derived token once', async () => {
			const { service, integrationManagementService, agentRepository, chatService } = makeService();
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.generateKey({
				agentId: agent.id,
				projectId: agent.projectId,
				type: 'openwebui',
				user: user as never,
			});

			expect(integrationManagementService.connect).toHaveBeenCalledWith({
				agent,
				user,
				integration: {
					type: 'openwebui',
					credentialId: result.connectionId,
					settings: {},
				},
			});
			expect(chatService.deriveToken).toHaveBeenCalledWith(agent.id, result.connectionId);
			expect(result.connectionId).toMatch(/^[0-9a-f]{32}$/);
			expect(result.apiKey).toBe('n8n_agent_derived_token');
		});

		it('replaces an existing connection of the same type instead of appending', async () => {
			const { service, integrationManagementService, agentRepository } = makeService();
			const agent = makeAgent({
				integrations: [{ type: 'openwebui', credentialId: 'connection-old' }] as never,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.generateKey({
				agentId: agent.id,
				projectId: agent.projectId,
				type: 'openwebui',
				user: user as never,
			});

			// A second generate must not leave the previous entry (and its derived
			// token) valid, so it swaps in the same write rather than appending.
			expect(integrationManagementService.connect).toHaveBeenCalledWith({
				agent,
				user,
				integration: { type: 'openwebui', credentialId: result.connectionId, settings: {} },
				replaces: { type: 'openwebui', credentialId: 'connection-old' },
			});
		});

		it('throws when the agent does not exist', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(
				service.generateKey({
					agentId: 'missing',
					projectId: 'project-1',
					type: 'openwebui',
					user: user as never,
				}),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('regenerateKey', () => {
		it('swaps the current connection for a fresh one in a single write', async () => {
			const { service, integrationManagementService, agentRepository } = makeService();
			const agent = makeAgent({
				integrations: [{ type: 'openwebui', credentialId: 'connection-old' }] as never,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.regenerateKey({
				agentId: agent.id,
				projectId: agent.projectId,
				type: 'openwebui',
				user: user as never,
			});

			// The old entry is removed and the new one added in one write, so the old
			// key keeps validating until the new one is durable.
			expect(integrationManagementService.connect).toHaveBeenCalledWith({
				agent,
				user,
				integration: { type: 'openwebui', credentialId: result.connectionId, settings: {} },
				replaces: { type: 'openwebui', credentialId: 'connection-old' },
			});
			expect(integrationManagementService.disconnect).not.toHaveBeenCalled();
			expect(result.connectionId).toMatch(/^[0-9a-f]{32}$/);
			expect(result.connectionId).not.toBe('connection-old');
		});

		it('throws when the channel is not currently connected', async () => {
			const { service, agentRepository } = makeService();
			const agent = makeAgent({ integrations: [] });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await expect(
				service.regenerateKey({
					agentId: agent.id,
					projectId: agent.projectId,
					type: 'openwebui',
					user: user as never,
				}),
			).rejects.toThrow(NotFoundError);
		});
	});
});
