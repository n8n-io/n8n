/**
 * Tests for agent CRUD operations (create, update, delete, list)
 * and getAgentCard / getCapabilities.
 */

import type { User } from '@n8n/db';

import { AgentsService } from '../agents.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

jest.mock('../agent-llm-client');
jest.mock('../agent-external-client');

function makeAgentUser(overrides: Partial<User> = {}): User {
	return {
		id: 'agent-1',
		firstName: 'TestBot',
		lastName: '',
		email: 'agent@test.com',
		type: 'agent',
		agentAccessLevel: 'external',
		avatar: null,
		description: 'A test agent',
		role: { slug: 'global:member' },
		...overrides,
	} as unknown as User;
}

function createMockedService() {
	const mockUserRepository = {
		findOne: jest.fn(),
		findOneBy: jest.fn(),
		find: jest.fn().mockResolvedValue([]),
		save: jest.fn().mockImplementation(async (u: User) => u),
		delete: jest.fn(),
		createUserWithProject: jest.fn(),
	};

	const mockWorkflowRepository = {
		findByIds: jest.fn().mockResolvedValue([]),
	};

	const mockWorkflowSharingService = {
		getSharedWorkflowIds: jest.fn().mockResolvedValue([]),
	};

	const mockCredentialsService = {
		getMany: jest.fn().mockResolvedValue([]),
	};

	const mockCredentialsHelper = {
		getDecrypted: jest.fn(),
	};

	const mockProjectRelationRepository = {
		findAllByUser: jest.fn().mockResolvedValue([]),
	};

	const mockProjectRepository = {
		findByIds: jest.fn().mockResolvedValue([]),
	};

	const mockWorkflowFinderService = {
		findWorkflowForUser: jest.fn(),
	};

	const mockWorkflowRunner = { run: jest.fn() };
	const mockActiveExecutions = { getPostExecutePromise: jest.fn(), stopExecution: jest.fn() };
	const mockPush = { broadcast: jest.fn() };

	const mockPublicApiKeyService = {
		createPublicApiKeyForUser: jest.fn().mockResolvedValue({ apiKey: 'n8n_api_new-key' }),
		resolveUserFromApiKey: jest.fn(),
		apiKeyHasValidScopes: jest.fn(),
	};

	const mockCipher = { encrypt: jest.fn().mockReturnValue('encrypted') };

	const service = new AgentsService(
		mockUserRepository as any,
		mockWorkflowRepository as any,
		mockWorkflowSharingService as any,
		mockCredentialsService as any,
		mockCredentialsHelper as any,
		mockProjectRelationRepository as any,
		mockProjectRepository as any,
		mockWorkflowFinderService as any,
		mockWorkflowRunner as any,
		mockActiveExecutions as any,
		mockPush as any,
		mockPublicApiKeyService as any,
		mockCipher as any,
	);

	return {
		service,
		mockUserRepository,
		mockPublicApiKeyService,
		mockWorkflowSharingService,
		mockWorkflowRepository,
		mockCredentialsService,
		mockProjectRelationRepository,
		mockProjectRepository,
	};
}

describe('createAgent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should create agent user and return DTO with apiKey', async () => {
		const mocks = createMockedService();
		const createdUser = makeAgentUser({ id: 'new-agent' });
		mocks.mockUserRepository.createUserWithProject.mockResolvedValue({ user: createdUser });

		const result = await mocks.service.createAgent({
			firstName: 'NewBot',
			description: 'A new bot',
			agentAccessLevel: 'internal',
		});

		expect(result.id).toBe('new-agent');
		expect(result.firstName).toBe('TestBot'); // from makeAgentUser
		expect(result.apiKey).toBe('n8n_api_new-key');
		expect(mocks.mockPublicApiKeyService.createPublicApiKeyForUser).toHaveBeenCalledWith(
			createdUser,
			expect.objectContaining({
				scopes: ['agent:read', 'agent:receive', 'agent:execute'],
			}),
		);
	});

	it('should save description and access level when provided', async () => {
		const mocks = createMockedService();
		const createdUser = makeAgentUser();
		mocks.mockUserRepository.createUserWithProject.mockResolvedValue({ user: createdUser });

		await mocks.service.createAgent({
			firstName: 'Bot',
			description: 'Desc',
			agentAccessLevel: 'closed',
		});

		expect(mocks.mockUserRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				description: 'Desc',
				agentAccessLevel: 'closed',
			}),
		);
	});

	it('should not save when no description or access level provided', async () => {
		const mocks = createMockedService();
		const createdUser = makeAgentUser();
		mocks.mockUserRepository.createUserWithProject.mockResolvedValue({ user: createdUser });

		await mocks.service.createAgent({ firstName: 'Bot' });

		expect(mocks.mockUserRepository.save).not.toHaveBeenCalled();
	});
});

describe('updateAgent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should update agent fields and return DTO', async () => {
		const mocks = createMockedService();
		const existing = makeAgentUser();
		mocks.mockUserRepository.findOneBy.mockResolvedValue(existing);
		mocks.mockUserRepository.save.mockImplementation(async (u: User) => u);

		const result = await mocks.service.updateAgent('agent-1', {
			firstName: 'UpdatedBot',
			description: 'Updated desc',
			agentAccessLevel: 'internal',
			avatar: 'https://avatar.url',
		});

		expect(result.firstName).toBe('UpdatedBot');
		expect(mocks.mockUserRepository.save).toHaveBeenCalled();
	});

	it('should throw NotFoundError when agent does not exist', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOneBy.mockResolvedValue(null);

		await expect(mocks.service.updateAgent('nonexistent', { firstName: 'X' })).rejects.toThrow(
			NotFoundError,
		);
	});

	it('should throw NotFoundError when user is not an agent', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOneBy.mockResolvedValue(makeAgentUser({ type: 'member' } as any));

		await expect(mocks.service.updateAgent('user-1', { firstName: 'X' })).rejects.toThrow(
			NotFoundError,
		);
	});
});

describe('deleteAgent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should delete agent', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOneBy.mockResolvedValue(makeAgentUser());

		await mocks.service.deleteAgent('agent-1');

		expect(mocks.mockUserRepository.delete).toHaveBeenCalledWith({ id: 'agent-1' });
	});

	it('should throw NotFoundError when agent does not exist', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOneBy.mockResolvedValue(null);

		await expect(mocks.service.deleteAgent('nonexistent')).rejects.toThrow(NotFoundError);
	});
});

describe('listAgents', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should return all agents as DTOs', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.find.mockResolvedValue([
			makeAgentUser({ id: 'a1', firstName: 'Bot1' }),
			makeAgentUser({ id: 'a2', firstName: 'Bot2' }),
		]);

		const result = await mocks.service.listAgents();

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('a1');
		expect(result[1].id).toBe('a2');
	});

	it('should return empty array when no agents exist', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.find.mockResolvedValue([]);

		const result = await mocks.service.listAgents();
		expect(result).toEqual([]);
	});
});

describe('getCapabilities', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should return capabilities with workflows and credentials', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Deploy', active: true },
		]);
		mocks.mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'Anthropic', type: 'anthropicApi' },
		]);
		mocks.mockProjectRelationRepository.findAllByUser.mockResolvedValue([{ projectId: 'proj-1' }]);
		mocks.mockProjectRepository.findByIds.mockResolvedValue([{ id: 'proj-1', name: 'My Project' }]);

		const result = await mocks.service.getCapabilities('agent-1');

		expect(result.agentId).toBe('agent-1');
		expect(result.llmConfigured).toBe(true);
		expect(result.workflows).toHaveLength(1);
		expect(result.credentials).toHaveLength(1);
		expect(result.projects).toHaveLength(1);
	});

	it('should throw NotFoundError when agent not found', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(null);

		await expect(mocks.service.getCapabilities('nonexistent')).rejects.toThrow(NotFoundError);
	});

	it('should report llmConfigured as false when no anthropic credential', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
		mocks.mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'Slack', type: 'slackApi' },
		]);

		const result = await mocks.service.getCapabilities('agent-1');

		expect(result.llmConfigured).toBe(false);
	});
});

describe('getAgentCard', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should return agent card with capabilities', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mocks.mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'Anthropic Key', type: 'anthropicApi' },
		]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		const result = await mocks.service.getAgentCard('agent-1', 'https://n8n.example.com');

		expect(result.id).toBe('agent-1');
		expect(result.name).toBe('TestBot');
		expect(result.capabilities.streaming).toBe(true);
		expect(result.securitySchemes.apiKey.name).toBe('x-n8n-api-key');
		expect(result.interfaces[0].url).toContain('https://n8n.example.com');
		expect(result.requiredCredentials).toHaveLength(1);
	});

	it('should throw NotFoundError when agent not found', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(null);

		await expect(mocks.service.getAgentCard('nonexistent', 'https://example.com')).rejects.toThrow(
			NotFoundError,
		);
	});

	it('should throw NotFoundError when agent is closed', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(
			makeAgentUser({ agentAccessLevel: 'closed' }),
		);

		await expect(mocks.service.getAgentCard('agent-1', 'https://example.com')).rejects.toThrow(
			NotFoundError,
		);
	});

	it('should deduplicate credential types in requiredCredentials', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mocks.mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'Key 1', type: 'anthropicApi' },
			{ id: 'cred-2', name: 'Key 2', type: 'anthropicApi' },
			{ id: 'cred-3', name: 'Slack', type: 'slackApi' },
		]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		const result = await mocks.service.getAgentCard('agent-1', 'https://example.com');

		expect(result.requiredCredentials).toHaveLength(2);
		const types = result.requiredCredentials.map((c) => c.type);
		expect(types).toContain('anthropicApi');
		expect(types).toContain('slackApi');
	});

	it('should include skills from workflows with Execute Workflow Trigger', async () => {
		const mocks = createMockedService();
		mocks.mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mocks.mockCredentialsService.getMany.mockResolvedValue([]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{
				id: 'wf-1',
				name: 'Typed Workflow',
				nodes: [
					{
						name: 'Execute Workflow Trigger',
						type: 'n8n-nodes-base.executeWorkflowTrigger',
						disabled: false,
						typeVersion: 1.1,
						parameters: {
							inputSource: 'jsonExample',
							jsonExample: '{"query": "search term"}',
						},
					},
				],
			},
		]);

		const result = await mocks.service.getAgentCard('agent-1', 'https://example.com');

		expect(result.skills).toHaveLength(1);
		expect(result.skills[0].name).toBe('Typed Workflow');
		expect(result.skills[0].inputs).toEqual([{ name: 'query', type: 'string' }]);
	});
});
