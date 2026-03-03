import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { v4 as uuid } from 'uuid';

import type { ChatHubAgent } from '../chat-hub-agent.entity';
import type { ChatHubAgentRepository } from '../chat-hub-agent.repository';
import { ChatHubAgentService } from '../chat-hub-agent.service';
import type { ChatHubCredentialsService } from '../chat-hub-credentials.service';
import type { ChatHubToolService } from '../chat-hub-tool.service';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

const mockUserId = uuid();

function makeAgent(overrides: Partial<ChatHubAgent> = {}): ChatHubAgent {
	return {
		id: uuid(),
		name: 'Test Agent',
		description: 'A test agent',
		icon: { type: 'emoji', value: '🤖' },
		suggestedPrompts: [],
		systemPrompt: 'You are a helpful assistant',
		ownerId: mockUserId,
		credentialId: 'cred-1',
		provider: 'openai',
		model: 'gpt-4',
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01'),
		...overrides,
	} as ChatHubAgent;
}

describe('ChatHubAgentService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const agentRepository = mock<ChatHubAgentRepository>();
	const credentialsService = mock<ChatHubCredentialsService>();
	const toolService = mock<ChatHubToolService>();
	const mockUser = mock<User>({ id: mockUserId });

	let service: ChatHubAgentService;

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnValue(logger);

		service = new ChatHubAgentService(logger, agentRepository, credentialsService, toolService);
	});

	describe('createAgent', () => {
		it('should verify credential access, persist agent, and return DTO', async () => {
			const agent = makeAgent();
			agentRepository.createAgent.mockResolvedValue(agent);

			const dto = await service.createAgent(mockUser, {
				name: 'Test Agent',
				description: 'A test agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds: [],
			});

			expect(credentialsService.ensureCredentialAccess).toHaveBeenCalledWith(mockUser, 'cred-1');
			expect(agentRepository.createAgent).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'Test Agent',
					description: 'A test agent',
					systemPrompt: 'You are helpful',
					icon: { type: 'emoji', value: '🤖' },
					credentialId: 'cred-1',
					provider: 'openai',
					model: 'gpt-4',
					ownerId: mockUserId,
				}),
			);
			expect(dto.id).toBe(agent.id);
			expect(dto.name).toBe('Test Agent');
			expect(dto.provider).toBe('openai');
			expect(dto.model).toBe('gpt-4');
			expect(dto.toolIds).toEqual([]);
		});

		it('should set description to null when not provided', async () => {
			const agent = makeAgent({ description: null });
			agentRepository.createAgent.mockResolvedValue(agent);

			await service.createAgent(mockUser, {
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds: [],
			});

			expect(agentRepository.createAgent).toHaveBeenCalledWith(
				expect.objectContaining({ description: null }),
			);
		});

		it('should assign tools when toolIds are provided', async () => {
			const toolIds = [uuid(), uuid()];
			const agent = makeAgent();
			agentRepository.createAgent.mockResolvedValue(agent);

			const dto = await service.createAgent(mockUser, {
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds,
			});

			expect(toolService.setAgentTools).toHaveBeenCalledWith(expect.any(String), toolIds);
			expect(dto.toolIds).toEqual(toolIds);
		});

		it('should not call setAgentTools when toolIds is empty', async () => {
			const agent = makeAgent();
			agentRepository.createAgent.mockResolvedValue(agent);

			await service.createAgent(mockUser, {
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds: [],
			});

			expect(toolService.setAgentTools).not.toHaveBeenCalled();
		});

		it('should persist suggestedPrompts when provided', async () => {
			const prompts = [{ text: 'Hello', icon: { type: 'icon' as const, value: 'comment' } }];
			const agent = makeAgent({ suggestedPrompts: prompts });
			agentRepository.createAgent.mockResolvedValue(agent);

			const dto = await service.createAgent(mockUser, {
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				suggestedPrompts: prompts,
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds: [],
			});

			expect(agentRepository.createAgent).toHaveBeenCalledWith(
				expect.objectContaining({ suggestedPrompts: prompts }),
			);
			expect(dto.suggestedPrompts).toEqual(prompts);
		});

		it('should persist empty suggestedPrompts when not provided', async () => {
			const agent = makeAgent();
			agentRepository.createAgent.mockResolvedValue(agent);

			await service.createAgent(mockUser, {
				name: 'Test Agent',
				systemPrompt: 'You are helpful',
				icon: { type: 'emoji', value: '🤖' },
				credentialId: 'cred-1',
				provider: 'openai',
				model: 'gpt-4',
				toolIds: [],
			});

			expect(agentRepository.createAgent).toHaveBeenCalledWith(
				expect.objectContaining({ suggestedPrompts: [] }),
			);
		});
	});

	describe('updateAgent', () => {
		it('should throw NotFoundError when agent does not exist', async () => {
			agentRepository.getOneById.mockResolvedValue(null);

			await expect(
				service.updateAgent('nonexistent', mockUser, { name: 'New Name' }),
			).rejects.toThrow(NotFoundError);
		});

		it('should verify credential access when credentialId is updated', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			await service.updateAgent(agent.id, mockUser, { credentialId: 'new-cred' });

			expect(credentialsService.ensureCredentialAccess).toHaveBeenCalledWith(mockUser, 'new-cred');
		});

		it('should not verify credential access when credentialId is not updated', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			await service.updateAgent(agent.id, mockUser, { name: 'New Name' });

			expect(credentialsService.ensureCredentialAccess).not.toHaveBeenCalled();
		});

		it('should only pass provided fields to repository', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue({ ...agent, name: 'New Name' });
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			await service.updateAgent(agent.id, mockUser, { name: 'New Name' });

			expect(agentRepository.updateAgent).toHaveBeenCalledWith(agent.id, { name: 'New Name' });
		});

		it('should update multiple fields at once', async () => {
			const agent = makeAgent();
			const updated = {
				...agent,
				name: 'Updated',
				description: 'New desc',
				systemPrompt: 'New prompt',
			};
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(updated as ChatHubAgent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			const dto = await service.updateAgent(agent.id, mockUser, {
				name: 'Updated',
				description: 'New desc',
				systemPrompt: 'New prompt',
			});

			expect(agentRepository.updateAgent).toHaveBeenCalledWith(agent.id, {
				name: 'Updated',
				description: 'New desc',
				systemPrompt: 'New prompt',
			});
			expect(dto.name).toBe('Updated');
		});

		it('should set tools when toolIds are provided', async () => {
			const agent = makeAgent();
			const toolIds = [uuid()];
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue(toolIds);

			await service.updateAgent(agent.id, mockUser, { toolIds });

			expect(toolService.setAgentTools).toHaveBeenCalledWith(agent.id, toolIds);
		});

		it('should not set tools when toolIds is not provided', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			await service.updateAgent(agent.id, mockUser, { name: 'New Name' });

			expect(toolService.setAgentTools).not.toHaveBeenCalled();
		});

		it('should update suggestedPrompts when provided', async () => {
			const prompts = [{ text: 'Updated prompt' }];
			const agent = makeAgent({ suggestedPrompts: prompts });
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			const dto = await service.updateAgent(agent.id, mockUser, {
				suggestedPrompts: prompts,
			});

			expect(agentRepository.updateAgent).toHaveBeenCalledWith(
				agent.id,
				expect.objectContaining({ suggestedPrompts: prompts }),
			);
			expect(dto.suggestedPrompts).toEqual(prompts);
		});

		it('should not update suggestedPrompts when not provided', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			agentRepository.updateAgent.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			await service.updateAgent(agent.id, mockUser, { name: 'New Name' });

			expect(agentRepository.updateAgent).toHaveBeenCalledWith(
				agent.id,
				expect.not.objectContaining({ suggestedPrompts: expect.anything() }),
			);
		});
	});

	describe('deleteAgent', () => {
		it('should throw NotFoundError when agent does not exist', async () => {
			agentRepository.getOneById.mockResolvedValue(null);

			await expect(service.deleteAgent('nonexistent', mockUserId)).rejects.toThrow(NotFoundError);
			expect(agentRepository.deleteAgent).not.toHaveBeenCalled();
		});

		it('should delete the agent', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);

			await service.deleteAgent(agent.id, mockUserId);

			expect(agentRepository.deleteAgent).toHaveBeenCalledWith(agent.id);
		});
	});

	describe('getAgentById', () => {
		it('should return agent when found', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);

			const result = await service.getAgentById(agent.id, mockUserId);

			expect(result).toBe(agent);
		});

		it('should throw NotFoundError when agent not found', async () => {
			agentRepository.getOneById.mockResolvedValue(null);

			await expect(service.getAgentById('nonexistent', mockUserId)).rejects.toThrow(NotFoundError);
		});
	});

	describe('convertAgentEntityToModel', () => {
		it('should return correct ChatModelDto shape', () => {
			const agent = makeAgent();

			const model = service.convertAgentEntityToModel(agent);

			expect(model).toEqual(
				expect.objectContaining({
					name: 'Test Agent',
					description: 'A test agent',
					icon: { type: 'emoji', value: '🤖' },
					model: { provider: 'custom-agent', agentId: agent.id },
					createdAt: '2025-01-01T00:00:00.000Z',
					updatedAt: '2025-01-01T00:00:00.000Z',
					groupName: null,
					groupIcon: null,
				}),
			);
			expect(model.metadata).toBeDefined();
		});

		it('should include suggestedPrompts when agent has non-empty prompts', () => {
			const agent = makeAgent({
				suggestedPrompts: [
					{ text: 'Hello', icon: { type: 'icon', value: 'comment' } },
					{ text: 'Help me', icon: { type: 'emoji', value: '👋' } },
				],
			});

			const model = service.convertAgentEntityToModel(agent);

			expect(model.suggestedPrompts).toEqual([
				{ text: 'Hello', icon: { type: 'icon', value: 'comment' } },
				{ text: 'Help me', icon: { type: 'emoji', value: '👋' } },
			]);
		});

		it('should omit suggestedPrompts when agent has none', () => {
			const model = service.convertAgentEntityToModel(makeAgent());

			expect(model).not.toHaveProperty('suggestedPrompts');
		});

		it('should omit suggestedPrompts when all prompts are empty', () => {
			const agent = makeAgent({
				suggestedPrompts: [{ text: '  ' }, { text: '' }],
			});

			const model = service.convertAgentEntityToModel(agent);

			expect(model).not.toHaveProperty('suggestedPrompts');
		});

		it('should filter out empty prompts from suggestedPrompts', () => {
			const agent = makeAgent({
				suggestedPrompts: [{ text: 'Hello' }, { text: '' }, { text: 'Help me' }],
			});

			const model = service.convertAgentEntityToModel(agent);

			expect(model.suggestedPrompts).toEqual([{ text: 'Hello' }, { text: 'Help me' }]);
		});
	});

	describe('getAgentByIdAsDto', () => {
		it('should return full DTO with tool ids', async () => {
			const toolIds = [uuid(), uuid()];
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue(toolIds);

			const dto = await service.getAgentByIdAsDto(agent.id, mockUserId);

			expect(dto.id).toBe(agent.id);
			expect(dto.name).toBe('Test Agent');
			expect(dto.description).toBe('A test agent');
			expect(dto.systemPrompt).toBe('You are a helpful assistant');
			expect(dto.provider).toBe('openai');
			expect(dto.model).toBe('gpt-4');
			expect(dto.toolIds).toEqual(toolIds);
			expect(dto.createdAt).toBe('2025-01-01T00:00:00.000Z');
			expect(dto.updatedAt).toBe('2025-01-01T00:00:00.000Z');
		});

		it('should include suggestedPrompts in DTO', async () => {
			const prompts = [{ text: 'Hello', icon: { type: 'icon' as const, value: 'comment' } }];
			const agent = makeAgent({ suggestedPrompts: prompts });
			agentRepository.getOneById.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			const dto = await service.getAgentByIdAsDto(agent.id, mockUserId);

			expect(dto.suggestedPrompts).toEqual(prompts);
		});

		it('should return empty suggestedPrompts when agent has none', async () => {
			const agent = makeAgent();
			agentRepository.getOneById.mockResolvedValue(agent);
			toolService.getToolIdsForAgent.mockResolvedValue([]);

			const dto = await service.getAgentByIdAsDto(agent.id, mockUserId);

			expect(dto.suggestedPrompts).toEqual([]);
		});
	});
});
