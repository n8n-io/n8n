import type { BuiltTool, ToolContext } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createAgentBuilderTools } from '../builder-tools';

const BOUND = { agentId: 'agent-1', projectId: 'project-1', name: 'Support', ref: 'support' };

function setup(toolResult: unknown, domainOverrides: Partial<InstanceAiContext> = {}) {
	const delegate = mock<InstanceAiBuilderDelegate>();
	const handler = vi.fn().mockResolvedValue(toolResult);
	const builderTool: BuiltTool = {
		name: 'agent_builder_patch_config',
		description: 'Patch config',
		handler,
	};
	delegate.getBuilderTools.mockReturnValue([builderTool]);
	const onArtifactChanged = vi.fn();
	const domainContext = {
		userId: 'user-1',
		threadId: 'thread-1',
		projectId: 'project-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		agentBuilderTarget: BOUND,
		onArtifactChanged,
		...domainOverrides,
	} as unknown as InstanceAiContext;
	const context = {
		threadId: 'thread-1',
		runId: 'run-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		domainContext,
	} as unknown as OrchestrationContext;

	const [tool] = createAgentBuilderTools(context, delegate);
	const run = async () => await tool.handler!({ op: 'replace' }, mock<ToolContext>());
	return { delegate, domainContext, onArtifactChanged, run, tool };
}

describe('createAgentBuilderTools', () => {
	it('resolves the target agent from the thread binding', async () => {
		const { delegate } = setup({ ok: true });

		const [resolveTarget, session] = delegate.getBuilderTools.mock.calls[0];

		await expect(resolveTarget()).resolves.toBe('agent-1');
		expect(session).toEqual({ threadId: 'thread-1', runId: 'run-1' });
	});

	it('returns a non-mutating result unchanged', async () => {
		const { run, onArtifactChanged } = setup({ ok: true, configHash: 'abc' });

		await expect(run()).resolves.toEqual({ ok: true, configHash: 'abc' });
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	it('refreshes the name and shows the artifact after a config change', async () => {
		const { run, delegate, domainContext, onArtifactChanged } = setup({
			ok: true,
			configMutated: true,
			agentId: 'agent-1',
		});
		delegate.resolveAgentName.mockResolvedValue('Support Triage');

		await expect(run()).resolves.toEqual({
			ok: true,
			configMutated: true,
			agentId: 'agent-1',
			agentName: 'Support Triage',
			projectId: 'project-1',
		});
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'agent',
			id: 'agent-1',
			projectId: 'project-1',
			name: 'Support Triage',
		});
		expect(domainContext.agentBuilderTarget).toMatchObject({ name: 'Support Triage' });
	});

	it('ignores a config change stamped for an agent that is not selected', async () => {
		const { run, onArtifactChanged } = setup({
			ok: true,
			configMutated: true,
			agentId: 'agent-other',
		});

		await expect(run()).resolves.toEqual({
			ok: true,
			configMutated: true,
			agentId: 'agent-other',
		});
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});
});
