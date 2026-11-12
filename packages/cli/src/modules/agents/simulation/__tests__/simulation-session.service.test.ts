import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
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
		{ type: 'workflow', name: 'Create ticket', workflow: 'wf-1' },
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
}: {
	flagOn?: boolean;
	backend?: SimulationBackend;
	queueMode?: boolean;
} = {}) {
	const flagGate = mock<SafeTestingFlagGate>();
	flagGate.isEnabled.mockResolvedValue(flagOn);
	const registry = new SimulationBackendRegistry();
	if (backend) registry.register(backend);
	const agentRepository = mock<AgentRepository>();
	agentRepository.findByIdAndProjectId.mockResolvedValue({
		id: 'agent-1',
		schema: config,
		tools: { 'custom-1': { descriptor: { name: 'my_code', description: 'Code' } } },
		integrations: [],
	} as unknown as ProjectAgent);
	const skillRefs = mock<AgentSkillRefsService>();
	skillRefs.refsForDraft.mockResolvedValue([] as never);
	const executionRepository = mock<AgentExecutionRepository>();
	const service = new SimulationSessionService(
		mock<Logger>(),
		flagGate,
		registry,
		mock<ExecutionsConfig>({ mode: queueMode ? 'queue' : 'regular' }),
		agentRepository,
		skillRefs,
		executionRepository,
	);
	return { service, executionRepository, flagGate };
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
};

describe('SimulationSessionService', () => {
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
});
