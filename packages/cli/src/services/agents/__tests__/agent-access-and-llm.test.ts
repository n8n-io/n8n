/**
 * Tests for enforceAccessLevel and resolveLlmConfig on AgentsService.
 *
 * We construct a real AgentsService instance with all dependencies mocked,
 * then exercise the public enforceAccessLevel and the private resolveLlmConfig
 * (via executeAgentTask's error path for missing API key).
 */

import type { User } from '@n8n/db';

import { AgentsService } from '../agents.service';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

// Mock external modules to prevent real calls
jest.mock('../agent-llm-client');
jest.mock('../agent-external-client');

function makeUser(overrides: Partial<User> = {}): User {
	return {
		id: 'user-1',
		firstName: 'Test',
		lastName: 'User',
		email: 'test@test.com',
		type: 'member',
		agentAccessLevel: null,
		role: { slug: 'global:member' },
		...overrides,
	} as unknown as User;
}

function makeAgentUser(overrides: Partial<User> = {}): User {
	return makeUser({
		id: 'agent-1',
		firstName: 'AgentBot',
		type: 'agent',
		agentAccessLevel: 'external',
		...overrides,
	});
}

// Create mocked repositories and services
function createMockedService() {
	const mockUserRepository = {
		findOne: jest.fn(),
		findOneBy: jest.fn(),
		find: jest.fn(),
		save: jest.fn(),
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

	const mockWorkflowRunner = {
		run: jest.fn(),
	};

	const mockActiveExecutions = {
		getPostExecutePromise: jest.fn(),
		stopExecution: jest.fn(),
	};

	const mockPush = {
		broadcast: jest.fn(),
	};

	const mockPublicApiKeyService = {
		createPublicApiKeyForUser: jest.fn(),
		resolveUserFromApiKey: jest.fn(),
		apiKeyHasValidScopes: jest.fn(),
	};

	const mockCipher = {
		encrypt: jest.fn().mockReturnValue('encrypted'),
	};

	const service = new AgentsService(
		mockUserRepository as any,
		mockWorkflowRepository as any,
		mockWorkflowSharingService as any,
		mockCredentialsService as any,
		mockCredentialsHelper as any,
		mockProjectRelationRepository as any,
		mockProjectRepository as any,
		{ find: jest.fn().mockResolvedValue([]), findOneBy: jest.fn() } as any, // externalAgentRegistrationRepo
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
		mockProjectRelationRepository,
		mockCredentialsService,
		mockCredentialsHelper,
		mockWorkflowSharingService,
		mockWorkflowRepository,
		mockPush,
	};
}

describe('enforceAccessLevel', () => {
	it('should throw NotFoundError when agent does not exist', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(null);

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('nonexistent', caller)).rejects.toThrow(NotFoundError);
	});

	it('should throw NotFoundError for closed agent when caller is regular member', async () => {
		const { service, mockUserRepository, mockProjectRelationRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'closed' }));
		mockProjectRelationRepository.findAllByUser.mockResolvedValue([]);

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).rejects.toThrow(NotFoundError);
	});

	it('should allow global:owner to access closed agent', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'closed' }));

		const caller = makeUser({ role: { slug: 'global:owner' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should allow global:admin to access closed agent', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'closed' }));

		const caller = makeUser({ role: { slug: 'global:admin' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should allow project member to access closed agent', async () => {
		const { service, mockUserRepository, mockProjectRelationRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'closed' }));
		// Both caller and agent share project-1
		mockProjectRelationRepository.findAllByUser
			.mockResolvedValueOnce([{ projectId: 'project-1' }]) // caller
			.mockResolvedValueOnce([{ projectId: 'project-1' }]); // agent

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should allow any authenticated user to access external agent', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'external' }));

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should allow any authenticated user to access agent with null access level', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: null }));

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should throw ForbiddenError for internal agent when caller has no shared project', async () => {
		const { service, mockUserRepository, mockProjectRelationRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'internal' }));
		mockProjectRelationRepository.findAllByUser
			.mockResolvedValueOnce([{ projectId: 'project-A' }]) // caller
			.mockResolvedValueOnce([{ projectId: 'project-B' }]); // agent - different project

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).rejects.toThrow(ForbiddenError);
	});

	it('should allow admin to access internal agent without project membership', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'internal' }));

		const caller = makeUser({ role: { slug: 'global:admin' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});

	it('should allow project member to access internal agent', async () => {
		const { service, mockUserRepository, mockProjectRelationRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser({ agentAccessLevel: 'internal' }));
		mockProjectRelationRepository.findAllByUser
			.mockResolvedValueOnce([{ projectId: 'shared-project' }])
			.mockResolvedValueOnce([{ projectId: 'shared-project' }]);

		const caller = makeUser({ role: { slug: 'global:member' } } as any);
		await expect(service.enforceAccessLevel('agent-1', caller)).resolves.toBeUndefined();
	});
});

describe('resolveLlmConfig (via executeAgentTask)', () => {
	it('should return error when no API key is available', async () => {
		const { service, mockUserRepository, mockCredentialsService, mockWorkflowSharingService } =
			createMockedService();
		mockUserRepository.findOne.mockResolvedValue(makeAgentUser());
		mockCredentialsService.getMany.mockResolvedValue([]);
		mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		const result = await service.executeAgentTask('agent-1', 'test', { remaining: 5 });

		expect(result.status).toBe('error');
		expect(result.message).toContain('No LLM API key available');
	});

	it('should use BYOK key when provided', async () => {
		const { service, mockUserRepository, mockWorkflowSharingService, mockWorkflowRepository } =
			createMockedService();
		const agentUser = makeAgentUser();
		mockUserRepository.findOne.mockResolvedValue(agentUser);
		mockUserRepository.find.mockResolvedValue([]); // no other agents
		mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
		mockWorkflowRepository.findByIds.mockResolvedValue([]);

		// callLlm is mocked - make it return a complete action
		const { callLlm } = jest.requireMock('../agent-llm-client');
		(callLlm as jest.Mock)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

		const result = await service.executeAgentTask(
			'agent-1',
			'test',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-byok-test',
			},
		);

		expect(result.status).toBe('completed');
		// callLlm was invoked — meaning resolveLlmConfig returned the BYOK key
		expect(callLlm).toHaveBeenCalled();
	});

	it('should resolve API key from Anthropic credential', async () => {
		const {
			service,
			mockUserRepository,
			mockCredentialsService,
			mockCredentialsHelper,
			mockWorkflowSharingService,
			mockWorkflowRepository,
		} = createMockedService();
		const agentUser = makeAgentUser();
		mockUserRepository.findOne.mockResolvedValue(agentUser);
		mockUserRepository.find.mockResolvedValue([]);
		mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
		mockWorkflowRepository.findByIds.mockResolvedValue([]);
		mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
		]);
		mockCredentialsHelper.getDecrypted.mockResolvedValue({
			apiKey: 'sk-resolved-key',
			url: '',
		});

		// Mock getBase to return minimal additional data
		jest
			.spyOn(jest.requireActual('@/workflow-execute-additional-data'), 'getBase')
			.mockResolvedValue({});

		const { callLlm } = jest.requireMock('../agent-llm-client');
		(callLlm as jest.Mock)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

		const result = await service.executeAgentTask('agent-1', 'test', { remaining: 5 });

		expect(result.status).toBe('completed');
		expect(mockCredentialsHelper.getDecrypted).toHaveBeenCalledWith(
			expect.anything(),
			{ id: 'cred-1', name: 'My Anthropic' },
			'anthropicApi',
			'internal',
		);
	});

	it('should return error when credential has no apiKey', async () => {
		const {
			service,
			mockUserRepository,
			mockCredentialsService,
			mockCredentialsHelper,
			mockWorkflowSharingService,
		} = createMockedService();
		const agentUser = makeAgentUser();
		mockUserRepository.findOne.mockResolvedValue(agentUser);
		mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
		mockCredentialsService.getMany.mockResolvedValue([
			{ id: 'cred-1', name: 'My Anthropic', type: 'anthropicApi' },
		]);
		mockCredentialsHelper.getDecrypted.mockResolvedValue({ apiKey: '' });

		jest
			.spyOn(jest.requireActual('@/workflow-execute-additional-data'), 'getBase')
			.mockResolvedValue({});

		const result = await service.executeAgentTask('agent-1', 'test', { remaining: 5 });

		expect(result.status).toBe('error');
		expect(result.message).toContain('No LLM API key available');
	});

	it('should detect delegation cycle', async () => {
		const { service, mockPush } = createMockedService();

		const callChain = new Set(['agent-1']); // agent already in chain
		const result = await service.executeAgentTask(
			'agent-1',
			'test',
			{ remaining: 5 },
			{
				callChain,
			},
		);

		expect(result.status).toBe('error');
		expect(result.message).toContain('Delegation cycle detected');
		expect(mockPush.broadcast).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'agentTaskDone' }),
		);
	});

	it('should throw NotFoundError when agent user not found', async () => {
		const { service, mockUserRepository } = createMockedService();
		mockUserRepository.findOne.mockResolvedValue(null);

		await expect(service.executeAgentTask('nonexistent', 'test', { remaining: 5 })).rejects.toThrow(
			NotFoundError,
		);
	});
});
