/**
 * Tests for the delegation visibility permission boundary.
 *
 * Codifies which agents appear in the system prompt (and therefore can be
 * delegated to) based on the executing agent's access level and whether the
 * call originated from an external A2A request.
 *
 * Visibility matrix:
 *
 *   Caller context          | Sees external | Sees internal | Sees closed
 *   ----------------------- | ------------- | ------------- | -----------
 *   A2A external call       | NO            | NO            | NO
 *   external agent (local)  | YES           | NO            | NO
 *   internal agent (local)  | YES           | YES           | NO
 *   closed agent  (local)   | YES           | YES           | NO
 *
 * These are code-level guardrails — the LLM never decides access control.
 * Even if the LLM hallucinated an agent ID, enforceAccessLevel blocks it.
 */

import type { User } from '@n8n/db';

import { AgentsService } from '../agents.service';
import { callLlm } from '../agent-llm-client';

jest.mock('../agent-llm-client');
jest.mock('../agent-external-client');

const mockedCallLlm = callLlm as jest.MockedFunction<typeof callLlm>;

function makeAgentUser(overrides: Partial<User> = {}): User {
	return {
		id: 'agent-1',
		firstName: 'TestBot',
		lastName: '',
		email: 'agent@test.com',
		type: 'agent',
		agentAccessLevel: 'external',
		role: { slug: 'global:member' },
		...overrides,
	} as unknown as User;
}

function createMockedService() {
	const mockUserRepository = {
		findOne: jest.fn(),
		findOneBy: jest.fn(),
		find: jest.fn().mockResolvedValue([]),
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
		run: jest.fn().mockResolvedValue('exec-1'),
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
		mockWorkflowSharingService,
	};
}

// Helper: set up agents and run a task, return the system prompt sent to LLM
async function getSystemPrompt(
	executingAgent: User,
	otherAgents: User[],
	isExternalCall?: boolean,
): Promise<string> {
	const mocks = createMockedService();

	mocks.mockUserRepository.findOne.mockResolvedValue(executingAgent);
	mocks.mockUserRepository.find.mockResolvedValue([executingAgent, ...otherAgents]);
	mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

	mockedCallLlm
		.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
		.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

	await mocks.service.executeAgentTask(
		executingAgent.id,
		'Test prompt',
		{ remaining: 5 },
		{
			byokApiKey: 'sk-test',
			isExternalCall,
		},
	);

	// System prompt is the first message in the first callLlm call
	const messages = mockedCallLlm.mock.calls[0][0];
	const systemMsg = messages.find((m: { role: string }) => m.role === 'system');
	return systemMsg?.content ?? '';
}

// Agents with different access levels used across tests
const externalBot = makeAgentUser({
	id: 'ext-agent',
	firstName: 'ExternalBot',
	agentAccessLevel: 'external',
});

const internalBot = makeAgentUser({
	id: 'int-agent',
	firstName: 'InternalBot',
	agentAccessLevel: 'internal',
});

const closedBot = makeAgentUser({
	id: 'closed-agent',
	firstName: 'ClosedBot',
	agentAccessLevel: 'closed',
});

const nullAccessBot = makeAgentUser({
	id: 'null-agent',
	firstName: 'NullBot',
	agentAccessLevel: null,
});

const allTargetAgents = [externalBot, internalBot, closedBot, nullAccessBot];

describe('delegation visibility — A2A external calls', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should not include ANY agents for delegation when isExternalCall is true', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'ReceiverBot',
			agentAccessLevel: 'external',
		});

		const prompt = await getSystemPrompt(executingAgent, allTargetAgents, true);

		expect(prompt).not.toContain('ExternalBot');
		expect(prompt).not.toContain('InternalBot');
		expect(prompt).not.toContain('ClosedBot');
		expect(prompt).not.toContain('NullBot');
		expect(prompt).not.toContain('delegate tasks to other agents');
	});
});

describe('delegation visibility — external agent (local call)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should see external agents only', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'MyExternalBot',
			agentAccessLevel: 'external',
		});

		const prompt = await getSystemPrompt(executingAgent, allTargetAgents, false);

		expect(prompt).toContain('ExternalBot');
		expect(prompt).toContain('NullBot'); // null defaults to external
		expect(prompt).not.toContain('InternalBot');
		expect(prompt).not.toContain('ClosedBot');
	});
});

describe('delegation visibility — internal agent (local call)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should see external and internal agents, but not closed', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'MyInternalBot',
			agentAccessLevel: 'internal',
		});

		const prompt = await getSystemPrompt(executingAgent, allTargetAgents, false);

		expect(prompt).toContain('ExternalBot');
		expect(prompt).toContain('InternalBot');
		expect(prompt).toContain('NullBot');
		expect(prompt).not.toContain('ClosedBot');
	});
});

describe('delegation visibility — closed agent (local call)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should see external and internal agents, but not other closed agents', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'SecureBot',
			agentAccessLevel: 'closed',
		});

		const prompt = await getSystemPrompt(executingAgent, allTargetAgents, false);

		expect(prompt).toContain('ExternalBot');
		expect(prompt).toContain('InternalBot');
		expect(prompt).toContain('NullBot');
		expect(prompt).not.toContain('ClosedBot');
	});
});

describe('delegation visibility — null access level defaults', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should treat null access level as external (sees only external targets)', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'DefaultBot',
			agentAccessLevel: null,
		});

		const prompt = await getSystemPrompt(executingAgent, allTargetAgents, false);

		expect(prompt).toContain('ExternalBot');
		expect(prompt).toContain('NullBot'); // null treated as external
		expect(prompt).not.toContain('InternalBot');
		expect(prompt).not.toContain('ClosedBot');
	});
});

describe('delegation visibility — agent never sees itself', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should not include the executing agent in its own delegation list', async () => {
		const executingAgent = makeAgentUser({
			id: 'agent-1',
			firstName: 'SelfBot',
			agentAccessLevel: 'internal',
		});

		const sameNameAgent = makeAgentUser({
			id: 'agent-1', // Same ID
			firstName: 'SelfBot',
			agentAccessLevel: 'external',
		});

		const prompt = await getSystemPrompt(executingAgent, [sameNameAgent, externalBot], false);

		// Should not see itself, but should see other agents
		expect(prompt).toContain('ExternalBot');
		// The executing agent's name appears in the system prompt intro, but not in the delegation list
		const delegationSection = prompt.split('delegate tasks to other agents')[1] ?? '';
		expect(delegationSection).not.toContain('SelfBot');
	});
});
