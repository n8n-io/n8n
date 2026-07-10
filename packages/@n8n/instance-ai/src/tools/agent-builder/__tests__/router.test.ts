import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { createAgentBuilderRouterTool } from '../router';

function createService(
	overrides: Partial<InstanceAiAgentBuilderService> = {},
): InstanceAiAgentBuilderService {
	return {
		createAgent: vi.fn(),
		getConfigSnapshot: vi.fn(),
		updateConfig: vi.fn(),
		createSkill: vi.fn(),
		createTask: vi.fn(),
		describeCustomTool: vi.fn(),
		buildCustomTool: vi.fn(),
		listChatIntegrations: vi.fn(),
		listProjectAgents: vi.fn(),
		listAllProjectAgents: vi.fn(),
		listModels: vi.fn(),
		searchMcpServers: vi.fn(),
		verifyMcpServer: vi.fn(),
		searchNodes: vi.fn(),
		resolveResourceLocatorOptions: vi.fn(),
		listAttachableWorkflows: vi.fn(),
		...overrides,
	};
}

function createContext(service: InstanceAiAgentBuilderService): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: 'project-1',
		agentBuilderService: service,
		agentBuilderTarget: { agentId: 'agent-1', projectId: 'project-1' },
	} as unknown as InstanceAiContext;
}

describe('agent_builder router', () => {
	it('routes create_agent to the create-agent handler and binds the target', async () => {
		const service = createService({
			createAgent: vi
				.fn()
				.mockResolvedValue({ agentId: 'agent-9', projectId: 'project-1', name: 'Triage' }),
		});
		const context = createContext(service);
		const result = await executeTool<{
			ok: boolean;
			agentId?: string;
			projectId?: string;
			name?: string;
		}>(createAgentBuilderRouterTool(context), { action: 'create_agent', name: 'Triage' }, {});
		expect(service.createAgent).toHaveBeenCalledWith('Triage', 'project-1');
		expect(result).toEqual({
			ok: true,
			agentId: 'agent-9',
			projectId: 'project-1',
			name: 'Triage',
		});
	});

	it('routes read_config to the read-config handler', async () => {
		const service = createService({
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
		});
		const result = await executeTool<{ ok: boolean }>(
			createAgentBuilderRouterTool(createContext(service)),
			{ action: 'read_config' },
			{},
		);
		expect(result.ok).toBe(true);
		expect(service.getConfigSnapshot).toHaveBeenCalledWith('agent-1', 'project-1');
	});

	it('routes list_workflows to the host adapter', async () => {
		const service = createService({
			listAttachableWorkflows: vi
				.fn()
				.mockResolvedValue([{ name: 'Send Email', active: true, triggerType: 'manual' }]),
		});
		const result = await executeTool<{ workflows: unknown[] }>(
			createAgentBuilderRouterTool(createContext(service)),
			{ action: 'list_workflows', searchTerm: 'billing' },
			{},
		);
		expect(service.listAttachableWorkflows).toHaveBeenCalledWith('project-1', 'billing');
		expect(result.workflows).toHaveLength(1);
	});

	it('routes list_agents to the host adapter with the resolved project', async () => {
		const service = createService({
			listAllProjectAgents: vi.fn().mockResolvedValue([{ agentId: 'agent-2', name: 'Triage' }]),
		});
		const result = await executeTool<{ agents: Array<{ agentId: string; name: string }> }>(
			createAgentBuilderRouterTool(createContext(service)),
			{ action: 'list_agents' },
			{},
		);
		expect(service.listAllProjectAgents).toHaveBeenCalledWith('project-1');
		expect(result.agents).toEqual([{ agentId: 'agent-2', name: 'Triage' }]);
	});

	it('routes build_agent to the build-agent handler', async () => {
		// No workspace on the context → the handler reports it unavailable.
		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createAgentBuilderRouterTool(createContext(createService())),
			{ action: 'build_agent', filePath: 'src/agents/a.agent.json', baseConfigHash: null },
			{},
		);
		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('workspace');
	});

	it('no longer exposes write_config or patch_config as actions', async () => {
		for (const action of ['write_config', 'patch_config']) {
			const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
				createAgentBuilderRouterTool(createContext(createService())),
				{ action },
				{},
			);
			expect(result.ok).toBe(false);
			expect(result.errors?.[0].message).toContain('Unknown agent_builder action');
		}
	});

	it('rejects an unknown action', async () => {
		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createAgentBuilderRouterTool(createContext(createService())),
			{ action: 'not_a_real_action' },
			{},
		);
		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toContain('Unknown agent_builder action');
	});

	it('surfaces the wrapped tools’ systemInstructions on the router tool', () => {
		// Only the router is registered, so the runtime injects only ITS
		// systemInstruction — the create_skill/create_task guidance must ride along.
		const routerTool = createAgentBuilderRouterTool(createContext(createService()));
		expect(routerTool.systemInstruction).toContain('create_skill:');
		expect(routerTool.systemInstruction).toContain('create_task:');
		expect(routerTool.systemInstruction).toContain('concrete routing contract');
		expect(routerTool.systemInstruction).toContain('concrete and self-contained');
	});

	it('does not expose interactive tools as router actions', async () => {
		const result = await executeTool<{ ok: boolean }>(
			createAgentBuilderRouterTool(createContext(createService())),
			{ action: 'ask_credential' },
			{},
		);
		expect(result.ok).toBe(false);
	});
});
