/**
 * select-agent target addressing against the REAL binding module, with real
 * thread persistence, so a create actually writes the key it later resolves by.
 */
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type {
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createSelectAgentTool } from '../select-agent.tool';

const THREAD_ID = 'thread-1';

interface SelectAgentResult {
	ok: boolean;
	error?: string;
	agentId?: string;
	agentRef?: string;
	mode?: string;
	previewPath?: string;
}

function createThreadMemory() {
	const thread: ThreadRecord = {
		id: THREAD_ID,
		metadata: {},
		resourceId: 'resource-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	return {
		thread,
		memory: {
			getThread: async () => await Promise.resolve(thread),
			patchThread: async (args: {
				update: (current: ThreadRecord) => { metadata?: Record<string, unknown> };
			}) => {
				const patch = args.update({ ...thread, metadata: { ...(thread.metadata ?? {}) } });
				if (patch?.metadata) thread.metadata = patch.metadata;
				return await Promise.resolve(thread);
			},
		},
	};
}

function makeContext(threadMemory: unknown) {
	const delegate = mock<InstanceAiBuilderDelegate>();
	delegate.getAgentPreviewPath.mockImplementation((agentId) => `/preview/${agentId}`);
	const domainContext = mock<InstanceAiContext>();
	domainContext.builderDelegate = delegate;
	domainContext.projectId = 'proj-1';
	domainContext.threadMemory = threadMemory as InstanceAiContext['threadMemory'];
	domainContext.threadId = THREAD_ID;
	domainContext.agentBuilderTarget = undefined;

	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as unknown as OrchestrationContext['logger'];
	domainContext.logger = logger;

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	context.threadId = THREAD_ID;
	context.runId = 'run-1';
	context.userId = 'user-1';
	context.abortSignal = new AbortController().signal;
	context.eventBus = mock<InstanceAiEventBus>();
	context.logger = logger;
	context.tracing = undefined;
	context.trackTelemetry = undefined;

	return { context, delegate, domainContext };
}

describe('select-agent', () => {
	it('resolves a replayed create call to the agent created on the earlier turn', async () => {
		const { thread, memory } = createThreadMemory();
		const { context, delegate } = makeContext(memory);
		delegate.createAgent.mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });

		const created = await executeTool<SelectAgentResult>(createSelectAgentTool(context), {
			name: 'Support Triage',
		});

		expect(created).toMatchObject({
			ok: true,
			agentId: 'agent-1',
			agentRef: 'support-triage',
			mode: 'create',
			previewPath: '/preview/agent-1',
		});
		expect(thread.metadata?.instanceAiAgentBuilderTargets).toMatchObject({
			'support-triage': { agentId: 'agent-1', ref: 'support-triage' },
		});

		// Next turn: fresh context (nothing in memory), model replays its call.
		const replay = makeContext(memory);
		replay.delegate.createAgent.mockResolvedValue({ agentId: 'agent-2', projectId: 'proj-1' });

		const result = await executeTool<SelectAgentResult>(createSelectAgentTool(replay.context), {
			name: 'Support Triage',
		});

		expect(replay.delegate.createAgent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentRef: 'support-triage' });
	});

	it('addresses an agent whose name carries no Latin characters', async () => {
		const { thread, memory } = createThreadMemory();
		const { context, delegate } = makeContext(memory);
		delegate.createAgent.mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });

		await executeTool(createSelectAgentTool(context), { name: '支持代理' });

		expect(thread.metadata?.instanceAiAgentBuilderTargets).toMatchObject({
			支持代理: { agentId: 'agent-1' },
		});

		const replay = makeContext(memory);
		const result = await executeTool<SelectAgentResult>(createSelectAgentTool(replay.context), {
			agentRef: '支持代理',
		});

		expect(replay.delegate.createAgent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, agentId: 'agent-1' });
	});

	it('continues the persisted target when a later turn names a new agent without createNew', async () => {
		const { memory } = createThreadMemory();
		const first = makeContext(memory);
		first.delegate.createAgent.mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });

		await executeTool(createSelectAgentTool(first.context), { name: 'New agent' });

		// Fresh context: the binding has to come back from thread metadata.
		const second = makeContext(memory);
		const result = await executeTool<SelectAgentResult>(createSelectAgentTool(second.context), {
			name: 'Support Triage',
		});

		expect(second.delegate.createAgent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, agentId: 'agent-1', mode: 'continued' });
	});

	it('creates a separate agent for a different name with createNew', async () => {
		const { memory } = createThreadMemory();
		const first = makeContext(memory);
		first.delegate.createAgent.mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });

		await executeTool(createSelectAgentTool(first.context), { name: 'Support Triage' });

		const second = makeContext(memory);
		second.delegate.createAgent.mockResolvedValue({ agentId: 'agent-2', projectId: 'proj-1' });

		const result = await executeTool<SelectAgentResult>(createSelectAgentTool(second.context), {
			name: 'Docs Helper',
			createNew: true,
		});

		expect(second.delegate.createAgent).toHaveBeenCalledWith('Docs Helper', undefined);
		expect(result).toMatchObject({ agentId: 'agent-2', agentRef: 'docs-helper' });
	});
});
