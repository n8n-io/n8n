import { executeTool } from '../../../__tests__/tool-test-utils';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type { InstanceAiAgentBuilderService, InstanceAiContext } from '../../../types';
import { resolveAgentBuilderTarget, saveAgentBuilderTarget } from '../agent-target-binding';
import { createReadConfigTool } from '../config-tools';
import { createListAgentsTool, createListWorkflowsTool } from '../creation-tools';

/** In-memory thread store shared across "turns" (fresh contexts). */
function createThreadMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata: initialMetadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		getThread: vi.fn().mockResolvedValue(thread),
		patchThread: vi.fn().mockImplementation(
			async (args: {
				update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
			}) => {
				const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return await Promise.resolve(thread);
			},
		),
	};
}

function createContext(overrides: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: 'thread-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

const TARGET = { agentId: 'agent-1', projectId: 'project-1' };

describe('agent-builder target binding', () => {
	it('round-trips the target through thread metadata across contexts', async () => {
		const threadMemory = createThreadMemory();
		await saveAgentBuilderTarget(createContext({ threadMemory }), TARGET);

		// A fresh context (next turn) resolves the persisted target and hydrates itself.
		const nextTurn = createContext({ threadMemory });
		await expect(resolveAgentBuilderTarget(nextTurn)).resolves.toEqual(TARGET);
		expect(nextTurn.agentBuilderTarget).toEqual(TARGET);
	});

	it('prefers the in-memory context target over the persisted binding', async () => {
		const threadMemory = createThreadMemory({
			instanceAiAgentBuilderTarget: { agentId: 'agent-old', projectId: 'project-1' },
		});
		const context = createContext({ threadMemory, agentBuilderTarget: TARGET });
		await expect(resolveAgentBuilderTarget(context)).resolves.toEqual(TARGET);
	});

	it('returns undefined for missing or invalid metadata', async () => {
		const missing = createContext({ threadMemory: createThreadMemory() });
		await expect(resolveAgentBuilderTarget(missing)).resolves.toBeUndefined();

		const invalid = createContext({
			threadMemory: createThreadMemory({ instanceAiAgentBuilderTarget: { agentId: 42 } }),
		});
		await expect(resolveAgentBuilderTarget(invalid)).resolves.toBeUndefined();
	});

	it('falls back to in-memory storage when thread memory is unavailable', async () => {
		const context = createContext();
		await saveAgentBuilderTarget(context, TARGET);
		context.agentBuilderTarget = undefined;
		await expect(resolveAgentBuilderTarget(context)).resolves.toEqual(TARGET);
	});

	it('lets read_config resolve the agent in a later turn from the persisted binding', async () => {
		const threadMemory = createThreadMemory({ instanceAiAgentBuilderTarget: TARGET });
		const getConfigSnapshot = vi
			.fn()
			.mockResolvedValue({ config: null, updatedAt: null, versionId: null });
		const context = createContext({
			threadMemory,
			agentBuilderService: { getConfigSnapshot } as unknown as InstanceAiAgentBuilderService,
		});

		const result = await executeTool<{ ok: boolean }>(createReadConfigTool(context), {}, {});

		expect(result.ok).toBe(true);
		expect(getConfigSnapshot).toHaveBeenCalledWith('agent-1', 'project-1');
	});

	it('scopes list_workflows and list_agents to the binding project on a later turn', async () => {
		// Binding says project-1; the fresh run's context.projectId is a different
		// project. Both listing tools must use the binding's project, not the run's.
		const threadMemory = createThreadMemory({ instanceAiAgentBuilderTarget: TARGET });
		const listAttachableWorkflows = vi.fn().mockResolvedValue([]);
		const listAllProjectAgents = vi.fn().mockResolvedValue([]);
		const service = {
			listAttachableWorkflows,
			listAllProjectAgents,
		} as unknown as InstanceAiAgentBuilderService;
		const context = createContext({
			threadMemory,
			projectId: 'other-project',
			agentBuilderService: service,
		});

		await executeTool(createListWorkflowsTool(context), {}, {});
		expect(listAttachableWorkflows).toHaveBeenCalledWith('project-1', undefined);

		await executeTool(createListAgentsTool(context), {}, {});
		expect(listAllProjectAgents).toHaveBeenCalledWith('project-1');
	});
});
