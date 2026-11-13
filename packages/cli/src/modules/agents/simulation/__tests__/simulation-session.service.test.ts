import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { AgentSkillRefsService } from '../../agent-skill-refs.service';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { SafeTestingFlagGate } from '../safe-testing-flag-gate';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import { SimulationBlockedError, type SimulationSession } from '../simulation-session';
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
	mcpServers: [{ name: 'linear', url: 'https://mcp.linear.app/mcp', transport: 'sse' }],
} as unknown as AgentJsonConfig;

const world: SimulationWorld = {
	worldId: 'world-1',
	backend: 'llm-mock',
	handleRequest: vi.fn(),
};

function setup({
	flagOn = true,
	backend,
	queueMode = false,
	engineV2 = false,
	agentConfig = config,
	integrations = [],
}: {
	flagOn?: boolean;
	backend?: SimulationBackend;
	queueMode?: boolean;
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
	const executionRepository = mock<AgentExecutionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	workflowRepository.findManyByAgentToolReferences.mockResolvedValue([
		{
			id: 'wf-1',
			name: 'Create ticket',
			settings: engineV2 ? { engineType: 'v2' } : {},
		} as WorkflowEntity,
	]);
	const service = new SimulationSessionService(
		mock<Logger>(),
		flagGate,
		registry,
		mock<ExecutionsConfig>({ mode: queueMode ? 'queue' : 'regular' }),
		agentRepository,
		skillRefs,
		executionRepository,
		workflowRepository,
	);
	return { service, executionRepository, flagGate, workflowRepository };
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

	it('returns no session when the flag is off, so the draft run stays live', async () => {
		const backend = llmBackend();
		const { service } = setup({ flagOn: false, backend });

		await expect(service.openForDraftRun(openInput)).resolves.toBeUndefined();
		expect(backend.openWorld).not.toHaveBeenCalled();
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
		const { service } = setup({ backend, queueMode: true });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toEqual([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' },
			expect.objectContaining({
				toolName: 'Send_Email',
				testability: 'blocked',
				reason: 'not_simulatable',
			}),
			expect.objectContaining({
				toolName: 'create-ticket',
				kind: 'workflow',
				testability: 'blocked',
				detail: 'Workflow tools cannot run in a test run in queue mode yet.',
			}),
			expect.objectContaining({ toolName: 'my_code', kind: 'custom', testability: 'blocked' }),
			expect.objectContaining({ toolName: 'linear', kind: 'mcp', testability: 'blocked' }),
		]);
		expect(backend.describeTools).toHaveBeenCalledWith(
			expect.objectContaining({ tools: [expect.objectContaining({ toolName: 'Send_Slack' })] }),
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
			detail: 'Workflows that run on Engine v2 cannot run in a test run yet.',
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

	it('gives a reason to a tool the backend blocks without one', async () => {
		const backend = llmBackend();
		vi.mocked(backend.describeTools).mockResolvedValue([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'blocked' },
		]);
		const { service } = setup({ backend });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools[0]).toMatchObject({ testability: 'blocked', reason: 'unsupported_by_simulator' });
	});

	it('lets the simulator describe a workflow tool that runs on the default engine', async () => {
		const { service } = setup({ backend: llmBackend() });

		const tools = await service.describeTools('agent-1', 'project-1');

		expect(tools).toContainEqual(
			expect.objectContaining({ toolName: 'create-ticket', testability: 'simulated' }),
		);
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

	it('marks the execution as a test run', async () => {
		const { service, executionRepository } = setup({ backend: llmBackend() });

		await service.markExecutionSimulated('execution-1');

		expect(executionRepository.update).toHaveBeenCalledWith(
			{ id: 'execution-1' },
			{ simulated: true },
		);
	});

	it('blocks a workflow tool in queue mode, also after the tool list refreshes', async () => {
		const { service } = setup({ backend: llmBackend(), queueMode: true });
		const handler = vi.fn();
		const tool = {
			name: 'create-ticket',
			description: '',
			metadata: { kind: 'workflow' },
			handler,
		};
		const run = async (session: SimulationSession, toolCallId: string) =>
			await session.interceptor({ tool, toolCallId, input: {} }, async () => await handler());

		const session = await service.openForDraftRun(openInput);
		await expect(run(session!, 'tc-1')).rejects.toThrow(SimulationBlockedError);
		const refreshed = await service.openForDraftRun({ ...openInput, message: 'again' });
		await expect(run(refreshed!, 'tc-2')).rejects.toThrow(SimulationBlockedError);

		expect(handler).not.toHaveBeenCalled();
		expect(refreshed!.takeDecision('tc-2')).toMatchObject({
			route: 'blocked',
			detail: 'Workflow tools cannot run in a test run in queue mode yet.',
		});
	});

	it('keeps a running test chat a test run when the flag reads off on a later turn', async () => {
		const backend = llmBackend();
		const { service, flagGate } = setup({ backend });
		const first = await service.openForDraftRun(openInput);
		flagGate.isEnabled.mockResolvedValue(false);

		await expect(service.openForDraftRun({ ...openInput, message: 'again' })).resolves.toBe(first);
		await expect(
			service.openForDraftRun({ ...openInput, testChatId: 'other-chat' }),
		).resolves.toBeUndefined();
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

	it('blocks a workflow tool of a test chat in queue mode, where the hooks do not reach workers', async () => {
		const { service } = setup({ backend: llmBackend(), queueMode: true });
		const session = await service.openForDraftRun(openInput);
		const handler = vi.fn();

		await expect(
			session!.interceptor(
				{
					tool: { name: 'Create_ticket', description: '', metadata: { kind: 'workflow' }, handler },
					toolCallId: 'tc-1',
					input: {},
				},
				async () => await handler(),
			),
		).rejects.toThrow(SimulationBlockedError);
		expect(handler).not.toHaveBeenCalled();
	});

	it('keeps the sessions of two agents apart when they share a chat ID', async () => {
		const { service } = setup({ backend: llmBackend() });

		const first = await service.openForDraftRun(openInput);
		const second = await service.openForDraftRun({ ...openInput, agentId: 'agent-2' });

		expect(second).not.toBe(first);
	});
});
