import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { resolveAgentBuilderTarget } from '../agent-target-binding';
import { createSelectAgentTool } from '../select-agent.tool';

function createThreadMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread: ThreadRecord = {
		id: 'thread-1',
		metadata: initialMetadata,
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		getThread: vi.fn<() => Promise<ThreadRecord>>().mockResolvedValue(thread),
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

function setup(domainOverrides: Partial<InstanceAiContext> = {}) {
	const delegate = mock<InstanceAiBuilderDelegate>();
	delegate.getBuilderSessionContext.mockResolvedValue('## Session context');
	const threadMemory = createThreadMemory();
	const onArtifactChanged = vi.fn();
	const domainContext = {
		userId: 'user-1',
		threadId: 'thread-1',
		projectId: 'project-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		threadMemory,
		builderDelegate: delegate,
		onArtifactChanged,
		...domainOverrides,
	} as unknown as InstanceAiContext;
	const trackTelemetry = vi.fn();
	const context = {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		logger: { debug: vi.fn(), warn: vi.fn() },
		trackTelemetry,
		domainContext,
	} as unknown as OrchestrationContext;
	return {
		tool: createSelectAgentTool(context),
		delegate,
		domainContext,
		onArtifactChanged,
		trackTelemetry,
	};
}

const BOUND = { agentId: 'agent-1', projectId: 'project-1', name: 'Support', ref: 'support' };

describe('agent_builder_select_agent', () => {
	it('returns an error when agent building is not available', async () => {
		const { tool } = setup({ builderDelegate: undefined });

		await expect(executeTool(tool, { name: 'Support' })).resolves.toEqual({
			ok: false,
			error: 'Agent building is not available on this instance.',
		});
	});

	it('creates a new agent, binds it, and returns the session context', async () => {
		const { tool, delegate, domainContext, onArtifactChanged, trackTelemetry } = setup();
		delegate.createAgent.mockResolvedValue({ agentId: 'agent-9', projectId: 'project-1' });

		const result = await executeTool(tool, { name: 'Support Triage' });

		expect(delegate.createAgent).toHaveBeenCalledWith('Support Triage', undefined);
		expect(result).toEqual({
			ok: true,
			agentId: 'agent-9',
			projectId: 'project-1',
			agentRef: 'support-triage',
			agentName: 'Support Triage',
			agentChange: 'created',
			sessionContext: '## Session context',
		});
		expect(delegate.getBuilderSessionContext).toHaveBeenCalledWith('agent-9');
		expect(onArtifactChanged).toHaveBeenCalledWith({
			type: 'agent',
			id: 'agent-9',
			projectId: 'project-1',
			name: 'Support Triage',
		});
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_agent_build_route',
			expect.objectContaining({ mode: 'create', agent_id: 'agent-9' }),
		);

		const nextTurn = { ...domainContext, agentBuilderTarget: undefined };
		await expect(resolveAgentBuilderTarget(nextTurn)).resolves.toMatchObject({
			agentId: 'agent-9',
			ref: 'support-triage',
		});
	});

	it('adopts an existing agent by id after it confirms the agent exists', async () => {
		const { tool, delegate, onArtifactChanged } = setup();
		delegate.resolveAgentName.mockResolvedValue('Existing Bot');

		const result = await executeTool(tool, { agentId: 'agent-7' });

		expect(result).toMatchObject({
			ok: true,
			agentId: 'agent-7',
			agentName: 'Existing Bot',
			agentRef: 'existing-bot',
			agentChange: 'none',
		});
		expect(delegate.createAgent).not.toHaveBeenCalled();
		expect(onArtifactChanged).not.toHaveBeenCalled();
	});

	it('does not bind an agent id that does not exist', async () => {
		const { tool, delegate, domainContext } = setup();
		delegate.resolveAgentName.mockResolvedValue(undefined);

		await expect(executeTool(tool, { agentId: 'agent-missing' })).resolves.toEqual({
			ok: false,
			error: 'Agent agent-missing was not found in this project.',
		});
		await expect(resolveAgentBuilderTarget(domainContext)).resolves.toBeUndefined();
	});

	it('continues the bound agent when a new name arrives without createNew', async () => {
		const { tool, delegate } = setup({ agentBuilderTarget: BOUND });

		const result = await executeTool(tool, { name: 'Ticket Router' });

		expect(delegate.createAgent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentChange: 'none' });
	});

	it('creates a second agent beside the bound one when createNew is set', async () => {
		const { tool, delegate } = setup({ agentBuilderTarget: BOUND });
		delegate.createAgent.mockResolvedValue({ agentId: 'agent-2', projectId: 'project-1' });

		const result = await executeTool(tool, { name: 'Ticket Router', createNew: true });

		expect(delegate.createAgent).toHaveBeenCalledWith('Ticket Router', undefined);
		expect(result).toMatchObject({ ok: true, agentId: 'agent-2', agentChange: 'created' });
	});

	it('keeps the bound agent when called without arguments', async () => {
		const { tool, delegate } = setup({ agentBuilderTarget: BOUND });

		const result = await executeTool(tool, {});

		expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentRef: 'support' });
		expect(delegate.resolveAgentName).not.toHaveBeenCalled();
	});

	it('asks for a name or id when nothing is bound and no target is given', async () => {
		const { tool, trackTelemetry } = setup();

		const result = await executeTool(tool, {});

		expect(result).toMatchObject({ ok: false });
		expect(trackTelemetry).toHaveBeenCalledWith(
			'instance_ai_agent_build_route',
			expect.objectContaining({ mode: 'resolution_failed' }),
		);
	});
});
