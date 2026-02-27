/**
 * Integration tests for the agent execution loop (executeAgentTaskInner).
 *
 * These test the full loop: LLM response → parse → action dispatch → observation → next iteration.
 * All external dependencies are mocked: callLlm, callExternalAgent, runWorkflow (via WorkflowFinderService).
 */

import type { User } from '@n8n/db';

import { AgentsService } from '../agents.service';
import { callLlm } from '../agent-llm-client';
import { callExternalAgent } from '../agent-external-client';

jest.mock('../agent-llm-client');
jest.mock('../agent-external-client');

const mockedCallLlm = callLlm as jest.MockedFunction<typeof callLlm>;
const mockedCallExternalAgent = callExternalAgent as jest.MockedFunction<typeof callExternalAgent>;

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
		mockWorkflowSharingService,
		mockWorkflowRepository,
		mockWorkflowFinderService,
		mockWorkflowRunner,
		mockActiveExecutions,
		mockPush,
		mockProjectRelationRepository,
	};
}

/** Setup agent to have BYOK key and resolve past the config phase */
function setupAgent(mocks: ReturnType<typeof createMockedService>, agentUser?: User) {
	const agent = agentUser ?? makeAgentUser();
	mocks.mockUserRepository.findOne.mockResolvedValue(agent);
	mocks.mockUserRepository.find.mockResolvedValue([]);
	mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);
	return agent;
}

describe('execution loop - complete action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should complete immediately when LLM returns complete', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		// First call: complete action. Second call (reflection): confirm.
		mockedCallLlm
			.mockResolvedValueOnce('{"action": "complete", "summary": "All done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "All done"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do stuff',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('All done');
		expect(result.steps).toHaveLength(0);
	});

	it('should treat unparseable LLM response as completed summary', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mockedCallLlm.mockResolvedValueOnce('This is just plain text, no JSON here');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do stuff',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('This is just plain text, no JSON here');
	});

	it('should extract JSON from LLM response with preamble text', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mockedCallLlm
			.mockResolvedValueOnce('Let me think... {"action": "complete", "summary": "Parsed it"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Parsed it"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do stuff',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Parsed it');
	});

	it('should handle markdown-fenced JSON response', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mockedCallLlm
			.mockResolvedValueOnce('```json\n{"action": "complete", "summary": "Fenced"}\n```')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Fenced"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do stuff',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Fenced');
	});

	it('should return max iterations message when budget exhausted', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		// Return unknown actions to consume budget
		mockedCallLlm.mockResolvedValue('{"action": "unknown_thing"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do stuff',
			{ remaining: 2 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.summary).toBe('Reached maximum iterations');
	});
});

describe('execution loop - workflow execution', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should execute a workflow and record observation', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		// Share a workflow with the agent
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Deploy', active: true, nodes: [] },
		]);

		// LLM: execute workflow → reflection confirm
		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "execute_workflow", "workflowId": "wf-1", "reasoning": "Need to deploy"}',
			)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Deployed successfully"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Deployed successfully"}');

		// Mock the workflow execution chain
		mocks.mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			name: 'Deploy',
			nodes: [
				{
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					disabled: false,
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});
		mocks.mockWorkflowRunner.run.mockResolvedValue('exec-1');
		mocks.mockActiveExecutions.getPostExecutePromise.mockResolvedValue({
			status: 'success',
			data: { resultData: { runData: {} } },
		});

		const onStep = jest.fn();
		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Deploy to prod',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
				onStep,
			},
		);

		expect(result.status).toBe('completed');
		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].action).toBe('execute_workflow');
		expect(result.steps[0].workflowName).toBe('Deploy');
		expect(result.steps[0].result).toBe('success');

		// Verify step callback was called for the execution step
		expect(onStep).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'step',
				action: 'execute_workflow',
				workflowName: 'Deploy',
			}),
		);
	});

	it('should record error when workflow execution fails', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Deploy', active: true, nodes: [] },
		]);

		mockedCallLlm
			.mockResolvedValueOnce('{"action": "execute_workflow", "workflowId": "wf-1"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Failed but done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Failed but done"}');

		mocks.mockWorkflowFinderService.findWorkflowForUser.mockRejectedValue(
			new Error('Permission denied'),
		);

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Deploy',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.steps[0].result).toBe('error');
	});
});

describe('execution loop - delegation', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should delegate to another internal agent', async () => {
		const mocks = createMockedService();
		const primaryAgent = makeAgentUser({ id: 'agent-1', firstName: 'Primary' });
		const helperAgent = makeAgentUser({
			id: 'agent-2',
			firstName: 'Helper',
			agentAccessLevel: 'external',
		});

		// Primary agent findOne
		mocks.mockUserRepository.findOne.mockImplementation(async (opts: any) => {
			const id = opts?.where?.id;
			if (id === 'agent-1') return primaryAgent;
			if (id === 'agent-2') return helperAgent;
			return null;
		});
		// List all agents
		mocks.mockUserRepository.find.mockResolvedValue([primaryAgent, helperAgent]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		// Primary: delegate to agent-2 → complete
		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "send_message", "toAgentId": "agent-2", "message": "Help me"}',
			)
			// Helper agent's inner loop: complete immediately
			.mockResolvedValueOnce('{"action": "complete", "summary": "Helped!"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Helped!"}') // reflection
			// Primary completes after delegation
			.mockResolvedValueOnce('{"action": "complete", "summary": "All done with help"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "All done with help"}'); // reflection

		// Access control: agent-2 shares a project with agent-1
		mocks.mockProjectRelationRepository.findAllByUser
			.mockResolvedValueOnce([{ projectId: 'shared' }])
			.mockResolvedValueOnce([{ projectId: 'shared' }]);

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Do complex task',
			{ remaining: 10 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		expect(result.steps.some((s) => s.action === 'send_message' && s.toAgent === 'Helper')).toBe(
			true,
		);
	});

	it('should record error when target agent not found', async () => {
		const mocks = createMockedService();
		const primaryAgent = makeAgentUser({ id: 'agent-1', firstName: 'Primary' });
		const fakeHelper = makeAgentUser({
			id: 'agent-2',
			firstName: 'Ghost',
			agentAccessLevel: 'external',
		});

		mocks.mockUserRepository.findOne.mockImplementation(async (opts: any) => {
			const id = opts?.where?.id;
			if (id === 'agent-1') return primaryAgent;
			// agent-2 found in listing but not when fetching for delegation
			if (id === 'agent-2') return null;
			return null;
		});
		mocks.mockUserRepository.find.mockResolvedValue([primaryAgent, fakeHelper]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "send_message", "toAgentId": "agent-2", "message": "Help"}',
			)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done despite error"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done despite error"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		const delegationStep = result.steps.find((s) => s.action === 'send_message');
		expect(delegationStep?.result).toBe('error');
	});

	it('should record error when target agent is closed', async () => {
		const mocks = createMockedService();
		const primaryAgent = makeAgentUser({ id: 'agent-1', firstName: 'Primary' });
		// Agent-2 appears as open in listing, but is closed when fetched for delegation
		const openAgent2 = makeAgentUser({
			id: 'agent-2',
			firstName: 'Closed',
			agentAccessLevel: 'external',
		});
		const closedAgent2 = makeAgentUser({
			id: 'agent-2',
			firstName: 'Closed',
			agentAccessLevel: 'closed',
		});

		let findOneCallCount = 0;
		mocks.mockUserRepository.findOne.mockImplementation(async (opts: any) => {
			findOneCallCount++;
			const id = opts?.where?.id;
			if (id === 'agent-1') return primaryAgent;
			// First findOne for agent-2 (enforceAccessLevel check) returns closed
			if (id === 'agent-2') return closedAgent2;
			return null;
		});
		// Listing returns agent-2 as open so canDelegate is true
		mocks.mockUserRepository.find.mockResolvedValue([primaryAgent, openAgent2]);
		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue([]);

		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "send_message", "toAgentId": "agent-2", "message": "Help"}',
			)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		const delegationStep = result.steps.find((s) => s.action === 'send_message');
		expect(delegationStep?.result).toBe('error');
	});

	it('should delegate to external agent via callExternalAgent', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		const externalAgents = [
			{
				name: 'ExtBot',
				description: 'External helper',
				url: 'https://ext.bot/task',
				apiKey: 'ext-key',
			},
		];

		mockedCallExternalAgent.mockResolvedValue({
			status: 'completed',
			summary: 'External task done',
			steps: [],
		});

		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "send_message", "toAgentId": "external:ExtBot", "message": "Help externally"}',
			)
			.mockResolvedValueOnce('{"action": "complete", "summary": "External help received"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "External help received"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
				externalAgents,
			},
		);

		expect(mockedCallExternalAgent).toHaveBeenCalledWith(externalAgents[0], 'Help externally');
		expect(result.steps.some((s) => s.action === 'send_message')).toBe(true);
	});

	it('should record error when external agent fails', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		const externalAgents = [
			{ name: 'ExtBot', description: '', url: 'https://ext.bot/task', apiKey: 'ext-key' },
		];

		mockedCallExternalAgent.mockRejectedValue(new Error('Connection refused'));

		mockedCallLlm
			.mockResolvedValueOnce(
				'{"action": "send_message", "toAgentId": "external:ExtBot", "message": "Help"}',
			)
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done despite error"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done despite error"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
				externalAgents,
			},
		);

		const delegationStep = result.steps.find((s) => s.action === 'send_message');
		expect(delegationStep?.result).toBe('error');
	});
});

describe('execution loop - unknown actions and edge cases', () => {
	beforeEach(() => jest.clearAllMocks());

	it('should push observation for unknown action and continue loop', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mockedCallLlm
			.mockResolvedValueOnce('{"action": "fly_to_moon"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Gave up on flying"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Gave up on flying"}');

		const result = await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(result.status).toBe('completed');
		// callLlm called 3 times: unknown action → complete → reflection confirm
		expect(mockedCallLlm).toHaveBeenCalledTimes(3);
	});

	it('should broadcast step and done events', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mockedCallLlm
			.mockResolvedValueOnce('{"action": "complete", "summary": "Quick"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Quick"}');

		await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
			},
		);

		expect(mocks.mockPush.broadcast).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'agentTaskDone' }),
		);
	});

	it('should propagate unhandled errors and broadcast done', async () => {
		const mocks = createMockedService();
		// findOne returns null to trigger NotFoundError from executeAgentTaskInner
		mocks.mockUserRepository.findOne.mockResolvedValue(null);

		await expect(
			mocks.service.executeAgentTask(
				'agent-1',
				'Task',
				{ remaining: 5 },
				{
					byokApiKey: 'sk-test',
				},
			),
		).rejects.toThrow();

		expect(mocks.mockPush.broadcast).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'agentTaskDone',
				data: expect.objectContaining({ status: 'error' }),
			}),
		);
	});

	it('should call onStep callback for each step event', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Test', active: true, nodes: [] },
		]);
		mocks.mockWorkflowFinderService.findWorkflowForUser.mockResolvedValue({
			id: 'wf-1',
			name: 'Test',
			nodes: [
				{
					name: 'Manual Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					disabled: false,
					parameters: {},
					typeVersion: 1,
				},
			],
			connections: {},
		});
		mocks.mockWorkflowRunner.run.mockResolvedValue('exec-1');
		mocks.mockActiveExecutions.getPostExecutePromise.mockResolvedValue({
			status: 'success',
			data: { resultData: { runData: {} } },
		});

		mockedCallLlm
			.mockResolvedValueOnce('{"action": "execute_workflow", "workflowId": "wf-1"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

		const onStep = jest.fn();
		await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: 'sk-test',
				onStep,
			},
		);

		// step event + observation event + agentTaskDone broadcast
		const stepCalls = onStep.mock.calls.filter((c) => c[0].type === 'step');
		const observationCalls = onStep.mock.calls.filter((c) => c[0].type === 'observation');
		expect(stepCalls).toHaveLength(1);
		expect(observationCalls).toHaveLength(1);
	});

	it('should scrub secrets from observation messages', async () => {
		const mocks = createMockedService();
		setupAgent(mocks);

		mocks.mockWorkflowSharingService.getSharedWorkflowIds.mockResolvedValue(['wf-1']);
		mocks.mockWorkflowRepository.findByIds.mockResolvedValue([
			{ id: 'wf-1', name: 'Test', active: true, nodes: [] },
		]);
		const secretKey = 'sk-ant-super-secret-12345';
		mocks.mockWorkflowFinderService.findWorkflowForUser.mockRejectedValue(
			new Error(`Auth failed: ${secretKey} leaked in error`),
		);

		mockedCallLlm
			.mockResolvedValueOnce('{"action": "execute_workflow", "workflowId": "wf-1"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}')
			.mockResolvedValueOnce('{"action": "complete", "summary": "Done"}');

		await mocks.service.executeAgentTask(
			'agent-1',
			'Task',
			{ remaining: 5 },
			{
				byokApiKey: secretKey,
			},
		);

		// The LLM messages should have the secret scrubbed
		const llmCalls = mockedCallLlm.mock.calls;
		// Second LLM call has the observation in messages
		const messagesAtSecondCall = llmCalls[1][0];
		const observationMsg = messagesAtSecondCall.find((m: { role: string; content: string }) =>
			m.content.includes('Observation:'),
		);
		expect(observationMsg).toBeDefined();
		expect(observationMsg!.content).not.toContain(secretKey);
		expect(observationMsg!.content).toContain('*****345');
	});
});
