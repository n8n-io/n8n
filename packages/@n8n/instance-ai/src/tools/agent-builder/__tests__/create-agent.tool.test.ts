import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { createReadConfigTool } from '../config-tools';
import { createCreateAgentTool } from '../create-agent.tool';

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

function createContext(
	service: InstanceAiAgentBuilderService,
	projectId?: string,
): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId,
		agentBuilderService: service,
		// No agentBuilderTarget — the create-first entry point.
	} as unknown as InstanceAiContext;
}

describe('create_agent tool', () => {
	it('creates an agent and binds the run target', async () => {
		const service = createService({
			createAgent: vi
				.fn()
				.mockResolvedValue({ agentId: 'agent-9', projectId: 'project-7', name: 'Triage' }),
		});
		const context = createContext(service, 'project-7');

		const result = await executeTool<{
			ok: boolean;
			agentId?: string;
			projectId?: string;
			name?: string;
		}>(createCreateAgentTool(context), { name: 'Triage' }, {});

		expect(service.createAgent).toHaveBeenCalledWith('Triage', 'project-7');
		expect(result).toEqual({
			ok: true,
			agentId: 'agent-9',
			projectId: 'project-7',
			name: 'Triage',
		});
		// The context is now bound, unlocking the config tools in the same run.
		expect(context.agentBuilderTarget).toEqual({ agentId: 'agent-9', projectId: 'project-7' });
	});

	it('unlocks read_config in the same run after creation', async () => {
		const service = createService({
			createAgent: vi
				.fn()
				.mockResolvedValue({ agentId: 'agent-9', projectId: 'project-7', name: 'Triage' }),
			getConfigSnapshot: vi
				.fn()
				.mockResolvedValue({ config: null, updatedAt: null, versionId: null }),
		});
		const context = createContext(service, 'project-7');

		const before = await executeTool<{ ok: boolean }>(createReadConfigTool(context), {}, {});
		expect(before.ok).toBe(false);

		await executeTool(createCreateAgentTool(context), { name: 'Triage' }, {});

		const after = await executeTool<{ ok: boolean }>(createReadConfigTool(context), {}, {});
		expect(after.ok).toBe(true);
		expect(service.getConfigSnapshot).toHaveBeenCalledWith('agent-9', 'project-7');
	});

	it('persists the target binding to thread metadata', async () => {
		const service = createService({
			createAgent: vi
				.fn()
				.mockResolvedValue({ agentId: 'agent-9', projectId: 'project-7', name: 'Triage' }),
		});
		const patchThread = vi.fn().mockResolvedValue({ id: 'thread-1' });
		const context = {
			userId: 'user-1',
			projectId: 'project-7',
			agentBuilderService: service,
			threadId: 'thread-1',
			threadMemory: { patchThread },
			logger: { debug: vi.fn(), warn: vi.fn() },
		} as unknown as InstanceAiContext;

		await executeTool(createCreateAgentTool(context), { name: 'Triage' }, {});

		expect(patchThread).toHaveBeenCalledWith(expect.objectContaining({ threadId: 'thread-1' }));
		const { update } = patchThread.mock.calls[0][0] as {
			update: (current: { metadata: Record<string, unknown> }) => {
				metadata: Record<string, unknown>;
			};
		};
		expect(update({ metadata: {} }).metadata.instanceAiAgentBuilderTarget).toEqual({
			agentId: 'agent-9',
			projectId: 'project-7',
		});
	});

	it('reports an error when the service throws', async () => {
		const service = createService({
			createAgent: vi.fn().mockRejectedValue(new Error('no project access')),
		});
		const result = await executeTool<{ ok: boolean; errors?: Array<{ message: string }> }>(
			createCreateAgentTool(createContext(service)),
			{ name: 'Triage' },
			{},
		);
		expect(result.ok).toBe(false);
		expect(result.errors?.[0].message).toBe('no project access');
	});
});
