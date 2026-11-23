import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { CredentialsFinderService } from '@n8n/backend-services';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { ChatIntegrationRegistry } from '../../integrations/agent-chat-integration';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { SafeTestingFlagGate } from '../safe-testing-flag-gate';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import { SimulationSessionService } from '../simulation-session.service';
import type {
	SimulatedAgent,
	SimulationBackend,
	SimulationWorld,
} from '../tool-simulation.contracts';

vi.mock('../../json-config/agent-document', () => ({
	toAgentDocument: (schema: AgentJsonConfig) => schema,
}));

const user = mock<User>({ id: 'user-1' });

const config = {
	name: 'Support bot',
	instructions: 'Help customers',
	model: 'anthropic/claude-sonnet-4-5',
	tools: [
		{
			type: 'node',
			name: 'Send Slack',
			node: { nodeType: 'n8n-nodes-base.slack', nodeTypeVersion: 2, nodeParameters: {} },
		},
		{
			type: 'node',
			name: 'Send Email',
			node: { nodeType: 'n8n-nodes-base.emailSend', nodeTypeVersion: 2, nodeParameters: {} },
		},
		{ type: 'workflow', name: 'Create ticket', workflow: 'Create ticket', workflowId: 'wf-1' },
		{ type: 'custom', id: 'custom-1' },
	],
	mcpServers: [
		{ name: 'linear', url: 'https://mcp.linear.app/mcp', transport: 'sse' },
		{ name: 'docs', url: 'https://mcp.example.com/mcp?key=s3cret-mcp-key' },
	],
	config: { webSearch: { enabled: true } },
} as unknown as AgentJsonConfig;

const world: SimulationWorld = {
	worldId: 'world-1',
	backend: 'llm-mock',
	handleRequest: vi.fn(),
};

function setup({
	flagOn = true,
	testChat,
	hasEarlierTurns = false,
	backend,
	engineV2 = false,
	agentConfig = config,
	integrations = [],
}: {
	flagOn?: boolean;
	/** Undefined: the thread does not exist yet. */
	testChat?: boolean;
	hasEarlierTurns?: boolean;
	backend?: SimulationBackend;
	engineV2?: boolean;
	agentConfig?: AgentJsonConfig;
	integrations?: unknown[];
} = {}) {
	const flagGate = mock<SafeTestingFlagGate>();
	flagGate.isEnabled.mockResolvedValue(flagOn);
	const registry = new SimulationBackendRegistry();
	if (backend) registry.register(backend);
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue({
		id: 'agent-1',
		schema: agentConfig,
		tools: { 'custom-1': { descriptor: { name: 'my_code', description: 'Code' } } },
		integrations,
	} as unknown as ProjectAgent);
	const skillRefs = mock<AgentSkillRefsService>();
	skillRefs.refsForDraft.mockResolvedValue([] as never);
	const threadRepository = mock<AgentExecutionThreadRepository>();
	threadRepository.findTestChatState.mockResolvedValue(
		testChat === undefined ? undefined : { testChat },
	);
	threadRepository.markTestChat.mockResolvedValue(true);
	const executionRepository = mock<AgentExecutionRepository>();
	executionRepository.hasFinishedByThread.mockResolvedValue(hasEarlierTurns);
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([
		{
			id: 'wf-1',
			name: 'Create ticket',
			settings: engineV2 ? { engineType: 'v2' } : {},
		} as WorkflowEntity,
	]);
	const chatIntegrations = mock<ChatIntegrationRegistry>();
	chatIntegrations.get.mockImplementation(
		(type: string) =>
			(type === 'telegram' ? { conversationTools: ['do_not_respond'] } : undefined) as never,
	);
	const service = new SimulationSessionService(
		mock<Logger>(),
		flagGate,
		registry,
		agentRepository,
		skillRefs,
		threadRepository,
		executionRepository,
		workflowRepository,
		chatIntegrations,
		mock<CredentialsFinderService>(),
	);
	return { service, threadRepository, executionRepository, flagGate, workflowRepository };
}

function llmBackend(): SimulationBackend {
	return {
		id: 'llm-mock',
		describeTools: vi.fn(async (agent: SimulatedAgent) =>
			agent.tools.map((tool) => ({
				toolName: tool.toolName,
				kind: tool.kind,
				testability: 'simulated' as const,
			})),
		),
		openWorld: vi.fn(async () => world),
	};
}

const openInput = {
	user,
	agentId: 'agent-1',
	projectId: 'project-1',
	testChatId: 'chat-1',
	message: 'Post the release note',
	testRunRequested: true,
};

describe('SimulationSessionService', () => {
	it('keeps a draft run live with the flag on when no test run was asked for', async () => {
		const backend = llmBackend();
		const { service, flagGate } = setup({ backend });

		await expect(
			service.openForDraftRun({ ...openInput, testRunRequested: false }),
		).resolves.toBeUndefined();
		expect(flagGate.isEnabled).not.toHaveBeenCalled();
		expect(backend.openWorld).not.toHaveBeenCalled();
	});

	it('fails a message that asks for a test run when the flag is off, instead of running it live', async () => {
		const backend = llmBackend();
		const { service } = setup({ flagOn: false, backend });

		await expect(service.openForDraftRun(openInput)).rejects.toThrow(
			'Test runs are not available, so this message did not run.',
		);
		await expect(
			service.openForDraftRun({ ...openInput, testRunRequested: false }),
		).resolves.toBeUndefined();
		expect(backend.openWorld).not.toHaveBeenCalled();
	});

	it('keeps a test chat simulated after the flag turns off', async () => {
		const backend = llmBackend();
		const { service } = setup({ flagOn: false, testChat: true, backend });

		const session = await service.openForDraftRun(openInput);

		expect(session?.worldId).toBe('world-1');
		expect(backend.openWorld).toHaveBeenCalledWith(
			expect.objectContaining({ testChatId: 'chat-1' }),
		);
	});

	it('opens one world for each test chat and reuses it on the next turn', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend });

		const first = await service.openForDraftRun(openInput);
		const second = await service.openForDraftRun({ ...openInput, message: 'And again' });
		const otherChat = await service.openForDraftRun({ ...openInput, testChatId: 'chat-2' });

		expect(second).toBe(first);
		expect(otherChat).not.toBe(first);
		expect(backend.openWorld).toHaveBeenCalledTimes(2);
		expect(backend.openWorld).toHaveBeenCalledWith(
			expect.objectContaining({ firstMessage: 'Post the release note' }),
		);
	});

	it('blocks every call with simulator_unavailable when no backend is registered', async () => {
		const { service } = setup();

		const session = await service.openForDraftRun(openInput);

		expect(session?.worldId).toBeUndefined();
	});

	it('blocks every call when the world fails to open, without falling back', async () => {
		const backend = llmBackend();
		vi.mocked(backend.openWorld).mockRejectedValue(new Error('mock model not configured'));
		const { service } = setup({ backend });

		const session = await service.openForDraftRun(openInput);

		expect(session).toBeDefined();
		expect(session?.worldId).toBeUndefined();
	});

	it('lists which tools can be tested, with n8n blocks before the backend sees them', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toEqual([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' },
			expect.objectContaining({
				toolName: 'Send_Email',
				testability: 'blocked',
				reason: 'not_simulatable',
			}),
			{ toolName: 'create-ticket', kind: 'workflow', testability: 'simulated' },
			expect.objectContaining({ toolName: 'my_code', kind: 'custom', testability: 'blocked' }),
			expect.objectContaining({ toolName: 'linear', kind: 'mcp', testability: 'blocked' }),
			{ toolName: 'docs', kind: 'mcp', testability: 'simulated' },
			{ toolName: 'web_search', kind: 'web_search', testability: 'simulated' },
		]);
		expect(backend.describeTools).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: [
					expect.objectContaining({ toolName: 'Send_Slack' }),
					expect.objectContaining({ toolName: 'create-ticket' }),
					expect.objectContaining({ toolName: 'docs' }),
					expect.objectContaining({ toolName: 'web_search' }),
				],
			}),
		);
	});

	it('blocks a workflow tool whose workflow runs on Engine v2', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend, engineV2: true });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toContainEqual({
			toolName: 'create-ticket',
			kind: 'workflow',
			testability: 'blocked',
			reason: 'not_simulatable',
			detail: 'Test runs and evaluations do not support Engine v2 workflows yet.',
		});
		expect(backend.describeTools).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: expect.not.arrayContaining([expect.objectContaining({ toolName: 'create-ticket' })]),
			}),
		);
	});

	it('blocks a legacy workflow ref without an id whose workflow runs on Engine v2', async () => {
		const legacy = {
			...config,
			tools: [{ type: 'workflow', name: 'Create ticket', workflow: 'Create ticket' }],
		} as unknown as AgentJsonConfig;
		const { service, workflowRepository } = setup({
			backend: llmBackend(),
			engineV2: true,
			agentConfig: legacy,
		});

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(workflowRepository.findManyByAgentToolReferences).toHaveBeenCalledWith(
			'project-1',
			[],
			['Create ticket'],
		);
		expect(tools).toContainEqual(
			expect.objectContaining({ toolName: 'create-ticket', testability: 'blocked' }),
		);
	});

	it('leaves disabled tools out of the list, as the runtime does', async () => {
		const withDisabled = {
			...config,
			tools: [
				...(config.tools ?? []),
				{
					type: 'node',
					name: 'Old Postgres',
					enabled: false,
					node: { nodeType: 'n8n-nodes-base.postgres', nodeTypeVersion: 2, nodeParameters: {} },
				},
			],
		} as unknown as AgentJsonConfig;
		const { service } = setup({ backend: llmBackend(), agentConfig: withDisabled });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools.map((tool) => tool.toolName)).not.toContain('Old_Postgres');
	});

	it('lists chat integration tools by the names the runtime gives them', async () => {
		const { service } = setup({
			backend: llmBackend(),
			integrations: [
				{ type: 'slack', credentialId: 'cred-a' },
				{ type: 'slack', credentialId: 'cred-b' },
			],
		});

		const tools = await service.describeTools('agent-1', 'project-1');

		const integrationTools = tools.filter((tool) => tool.kind === 'integration');
		expect(integrationTools.map((tool) => tool.toolName)).toEqual([
			'slack_context',
			'slack_action',
			'slack_2_context',
			'slack_2_action',
		]);
		expect(integrationTools.every((tool) => tool.testability === 'blocked')).toBe(true);
	});

	it('lists the conversation tools a chat integration adds as blocked', async () => {
		const { service } = setup({
			backend: llmBackend(),
			integrations: [
				{ type: 'telegram', credentialId: 'cred-a' },
				{ type: 'slack', credentialId: 'cred-b' },
			],
		});

		const tools = await service.describeTools('agent-1', 'project-1');

		const integrationTools = tools.filter((tool) => tool.kind === 'integration');
		expect(integrationTools.map((tool) => tool.toolName)).toEqual([
			'slack_context',
			'slack_action',
			'telegram_context',
			'telegram_action',
			'do_not_respond',
		]);
		expect(integrationTools.every((tool) => tool.testability === 'blocked')).toBe(true);
	});

	it('says the simulator is unavailable when it fails to describe the tools', async () => {
		const backend = llmBackend();
		vi.mocked(backend.describeTools).mockRejectedValue(new Error('timeout'));
		const { service } = setup({ backend });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools[0]).toMatchObject({
			toolName: 'Send_Slack',
			testability: 'blocked',
			reason: 'simulator_unavailable',
		});
	});

	it('lets the simulator describe a workflow tool that runs on the default engine', async () => {
		const { service } = setup({ backend: llmBackend() });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toContainEqual(
			expect.objectContaining({ toolName: 'create-ticket', testability: 'simulated' }),
		);
	});

	it('lists web search when it is enabled, also when the model would search natively', async () => {
		const { service } = setup({ backend: llmBackend() });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toContainEqual(
			expect.objectContaining({
				toolName: 'web_search',
				kind: 'web_search',
				testability: 'simulated',
			}),
		);
	});

	it('describes an MCP server to the simulator by name and origin, without its URL', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend });

		await service.describeTools('agent-1', 'project-1');

		const described = JSON.stringify(vi.mocked(backend.describeTools).mock.calls[0][0]);
		expect(described).not.toContain('s3cret-mcp-key');
		expect(described).not.toContain('https://mcp.example.com/mcp');
		expect(vi.mocked(backend.describeTools).mock.calls[0][0].tools).toContainEqual({
			toolName: 'docs',
			kind: 'mcp',
			origin: 'https://mcp.example.com',
		});
	});

	it('marks a tool the backend leaves out as unsupported by the simulator', async () => {
		const backend = llmBackend();
		vi.mocked(backend.describeTools).mockResolvedValue([]);
		const { service } = setup({ backend });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools[0]).toMatchObject({
			toolName: 'Send_Slack',
			testability: 'blocked',
			reason: 'unsupported_by_simulator',
		});
	});

	it('marks the thread as a test chat, also when no simulator is set up', async () => {
		const { service, threadRepository } = setup();
		const session = await service.openForDraftRun(openInput);

		await session!.markTestChat();

		expect(threadRepository.markTestChat).toHaveBeenCalledWith('chat-1');
	});

	it('keeps a marked chat a test run when a later message does not ask for one', async () => {
		const { service } = setup({ testChat: true });

		const session = await service.openForDraftRun({ ...openInput, testRunRequested: false });

		expect(session).toBeDefined();
	});

	it('keeps a marked chat a test run with the flag off', async () => {
		const { service } = setup({ flagOn: false, testChat: true });

		const session = await service.openForDraftRun(openInput);

		expect(session).toBeDefined();
		expect(session?.worldId).toBeUndefined();
	});

	it('fails the turn when the test chat marker matches no thread', async () => {
		const { service, threadRepository } = setup();
		threadRepository.markTestChat.mockResolvedValue(false);
		const session = await service.openForDraftRun(openInput);

		await expect(session!.markTestChat()).rejects.toThrow('Could not mark the test chat');
	});

	it('keeps a running test chat a test run when the flag reads off on a later turn', async () => {
		const backend = llmBackend();
		const { service, flagGate } = setup({ backend });
		const first = await service.openForDraftRun(openInput);
		flagGate.isEnabled.mockResolvedValue(false);

		await expect(service.openForDraftRun({ ...openInput, message: 'again' })).resolves.toBe(first);
		await expect(
			service.openForDraftRun({ ...openInput, testChatId: 'other-chat' }),
		).rejects.toThrow('Test runs are not available');
	});

	it('opens a new world for a test chat after a restart', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend, testChat: true, hasEarlierTurns: true });

		const session = await service.openForDraftRun({ ...openInput, testRunRequested: false });

		expect(session?.worldId).toBe('world-1');
		expect(backend.openWorld).toHaveBeenCalledOnce();
	});

	it('refuses a test run on a chat that already ran live', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend, hasEarlierTurns: true });

		await expect(service.openForDraftRun(openInput)).rejects.toThrow(
			'This chat runs live. Start a new chat to run a test.',
		);
		expect(backend.openWorld).not.toHaveBeenCalled();
	});

	it('opens one world when two turns of a new chat start together', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend });

		const [first, second] = await Promise.all([
			service.openForDraftRun(openInput),
			service.openForDraftRun({ ...openInput, message: 'and this' }),
		]);

		expect(second).toBe(first);
		expect(backend.openWorld).toHaveBeenCalledTimes(1);
	});

	it('never lets a live open that started first answer a test request for the same chat', async () => {
		const backend = llmBackend();
		const { service } = setup({ backend });

		const [live, test] = await Promise.all([
			service.openForDraftRun({ ...openInput, testRunRequested: false }),
			service.openForDraftRun(openInput),
		]);

		expect(live).toBeUndefined();
		expect(test?.worldId).toBe('world-1');
	});

	it('fails a test request that waited on a live open when the flag is off', async () => {
		const { service } = setup({ flagOn: false, backend: llmBackend() });

		const results = await Promise.allSettled([
			service.openForDraftRun({ ...openInput, testRunRequested: false }),
			service.openForDraftRun(openInput),
		]);

		expect(results[0]).toEqual({ status: 'fulfilled', value: undefined });
		expect(results[1]).toMatchObject({ status: 'rejected' });
	});

	it('keeps the sessions of two agents apart when they share a chat ID', async () => {
		const { service } = setup({ backend: llmBackend() });

		const first = await service.openForDraftRun(openInput);
		const second = await service.openForDraftRun({ ...openInput, agentId: 'agent-2' });

		expect(second).not.toBe(first);
	});
});
