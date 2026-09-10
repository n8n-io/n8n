/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentIntegrationManagementService } from '../../../agent-integration-management.service';
import type { Agent } from '../../../entities/agent.entity';
import type { AgentRepository } from '../../../repositories/agent.repository';
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
		const credentialsService = mock<CredentialsService>();
		const integrationManagementService = mock<AgentIntegrationManagementService>();
		const agentRepository = mock<AgentRepository>();
		const logger = mock<Logger>();

		return {
			service: new OpenAiCompatibleSetupService(
				credentialsService,
				integrationManagementService,
				agentRepository,
				logger,
			),
			credentialsService,
			integrationManagementService,
			agentRepository,
		};
	}

	describe('generateKey', () => {
		it('creates a managed credential, connects it, and returns the key once', async () => {
			const { service, credentialsService, integrationManagementService, agentRepository } =
				makeService();
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			credentialsService.createManagedCredential.mockResolvedValue({ id: 'credential-1' } as never);

			const result = await service.generateKey({
				agentId: agent.id,
				projectId: agent.projectId,
				type: 'openwebui',
				user: user as never,
			});

			expect(credentialsService.createManagedCredential).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'agentChatApiKeyApi',
					data: { apiKey: expect.stringMatching(/^n8n_agent_[0-9a-f]{64}$/) },
					projectId: agent.projectId,
				}),
				user,
			);
			expect(integrationManagementService.connect).toHaveBeenCalledWith({
				agent,
				user,
				integration: { type: 'openwebui', credentialId: 'credential-1', settings: {} },
			});
			expect(result.credentialId).toBe('credential-1');
			expect(result.apiKey).toMatch(/^n8n_agent_[0-9a-f]{64}$/);
		});

		it('deletes the credential it just created when the connect fails', async () => {
			const { service, credentialsService, integrationManagementService, agentRepository } =
				makeService();
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentRepository.findIntegrationState.mockResolvedValue({
				integrations: [],
				versionId: 'draft-1',
				activeVersionId: null,
			});
			credentialsService.createManagedCredential.mockResolvedValue({ id: 'credential-1' } as never);
			const connectError = new Error('connect failed');
			integrationManagementService.connect.mockRejectedValue(connectError);

			await expect(
				service.generateKey({
					agentId: agent.id,
					projectId: agent.projectId,
					type: 'openwebui',
					user: user as never,
				}),
			).rejects.toBe(connectError);

			expect(credentialsService.delete).toHaveBeenCalledWith(user, 'credential-1');
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
		it('disconnects the current credential and generates a fresh one', async () => {
			const { service, credentialsService, integrationManagementService, agentRepository } =
				makeService();
			const agent = makeAgent({
				integrations: [{ type: 'openwebui', credentialId: 'credential-old' }] as never,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			credentialsService.createManagedCredential.mockResolvedValue({
				id: 'credential-new',
			} as never);

			const result = await service.regenerateKey({
				agentId: agent.id,
				projectId: agent.projectId,
				type: 'openwebui',
				user: user as never,
			});

			expect(integrationManagementService.disconnect).toHaveBeenCalledWith({
				agent,
				user,
				type: 'openwebui',
				credentialId: 'credential-old',
			});
			expect(result.credentialId).toBe('credential-new');
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
