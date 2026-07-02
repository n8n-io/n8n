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
		const result = await executeTool<{ ok: boolean; agentId?: string }>(
			createAgentBuilderRouterTool(context),
			{ action: 'create_agent', name: 'Triage' },
			{},
		);
		expect(service.createAgent).toHaveBeenCalledWith('Triage', 'project-1');
		expect(result).toEqual({ ok: true, agentId: 'agent-9', name: 'Triage' });
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
			{ action: 'list_workflows' },
			{},
		);
		expect(service.listAttachableWorkflows).toHaveBeenCalledWith('project-1');
		expect(result.workflows).toHaveLength(1);
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
		expect(routerTool.systemInstruction).toContain('placeholder skill');
		expect(routerTool.systemInstruction).toContain('placeholder objective');
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
