/**
 * build-agent target addressing against the REAL binding module.
 *
 * `build-agent.tool.test.ts` mocks `agent-target-binding`, so it proves the
 * resolver's behaviour given a registry hit but not that a create actually
 * writes the key it later resolves by. This file wires real thread persistence
 * so the create -> cancel -> replay round trip is covered end to end.
 */
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { ThreadRecord } from '../../../storage/thread-patch';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createBuildAgentTool } from '../build-agent.tool';

const THREAD_ID = 'thread-1';

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

function streamOf(chunks: unknown[], text: string): BuilderTurnStream {
	return {
		fullStream: (async function* () {
			await Promise.resolve();
			for (const chunk of chunks) {
				yield chunk;
			}
		})(),
		text: Promise.resolve(text),
	};
}

function completedStream(text: string): BuilderTurnStream {
	return streamOf([], text);
}

/** A stream that aborts the run mid-consumption, as a user Stop does. */
function abortingStream(controller: AbortController): BuilderTurnStream {
	return {
		fullStream: (async function* () {
			await Promise.resolve();
			controller.abort();
			yield { type: 'text-delta', id: 'a', delta: '' };
		})(),
		text: Promise.resolve(''),
	};
}

function makeContext(threadMemory: unknown) {
	const delegate = mock<InstanceAiBuilderDelegate>();
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
	context.modelId = 'anthropic/claude-sonnet';
	context.tracing = undefined;
	context.claimSubAgentUsage = undefined;
	context.trackTelemetry = undefined;

	return { context, delegate };
}

describe('build-agent target registry (real binding)', () => {
	it('resolves a replayed create call to the agent created before the stop', async () => {
		const { thread, memory } = createThreadMemory();
		const { context, delegate } = makeContext(memory);
		vi.mocked(delegate.createAgent).mockResolvedValue({
			agentId: 'agent-1',
			projectId: 'proj-1',
		});
		vi.mocked(delegate.resolveAgentName).mockResolvedValue('Support Triage');

		const controller = new AbortController();
		context.abortSignal = controller.signal;
		vi.mocked(delegate.streamBuild).mockResolvedValue(abortingStream(controller));

		await expect(
			executeTool(createBuildAgentTool(context), {
				message: 'Build it',
				name: 'Support Triage',
			}),
		).rejects.toMatchObject({ name: 'AbortError' });

		expect(delegate.createAgent).toHaveBeenCalledTimes(1);
		expect(thread.metadata?.instanceAiAgentBuilderTargets).toMatchObject({
			'support-triage': { agentId: 'agent-1', ref: 'support-triage' },
		});

		// Next turn: fresh context (nothing in memory), model replays its call.
		const replay = makeContext(memory);
		vi.mocked(replay.delegate.createAgent).mockResolvedValue({
			agentId: 'agent-2',
			projectId: 'proj-1',
		});
		vi.mocked(replay.delegate.resolveAgentName).mockResolvedValue('Support Triage');
		vi.mocked(replay.delegate.streamBuild).mockResolvedValue(completedStream('Continuing.'));

		const result = await executeTool<{ ok: boolean; agentId?: string; agentRef?: string }>(
			createBuildAgentTool(replay.context),
			{ message: 'Build it', name: 'Support Triage' },
		);

		expect(replay.delegate.createAgent).not.toHaveBeenCalled();
		expect(result).toMatchObject({ ok: true, agentId: 'agent-1', agentRef: 'support-triage' });
		expect(replay.delegate.streamBuild).toHaveBeenCalledWith(
			'agent-1',
			'Build it',
			expect.objectContaining({ threadId: `ia-builder:${THREAD_ID}:agent-1` }),
		);
	});

	it('addresses an agent whose name carries no Latin characters', async () => {
		const { thread, memory } = createThreadMemory();
		const { context, delegate } = makeContext(memory);
		vi.mocked(delegate.createAgent).mockResolvedValue({
			agentId: 'agent-1',
			projectId: 'proj-1',
		});
		vi.mocked(delegate.resolveAgentName).mockResolvedValue('支持代理');
		vi.mocked(delegate.streamBuild).mockResolvedValue(completedStream('Created it.'));

		await executeTool(createBuildAgentTool(context), { message: 'Build it', name: '支持代理' });

		expect(delegate.createAgent).toHaveBeenCalledTimes(1);
		expect(thread.metadata?.instanceAiAgentBuilderTargets).toMatchObject({
			支持代理: { agentId: 'agent-1' },
		});

		const replay = makeContext(memory);
		vi.mocked(replay.delegate.streamBuild).mockResolvedValue(completedStream('Continuing.'));
		vi.mocked(replay.delegate.resolveAgentName).mockResolvedValue('支持代理');

		await executeTool(createBuildAgentTool(replay.context), {
			message: 'Add a tool',
			name: '支持代理',
		});

		expect(replay.delegate.createAgent).not.toHaveBeenCalled();
		expect(replay.delegate.streamBuild).toHaveBeenCalledWith(
			'agent-1',
			'Add a tool',
			expect.objectContaining({ threadId: `ia-builder:${THREAD_ID}:agent-1` }),
		);
	});

	it('creates a separate agent for a different name in the same thread', async () => {
		const { memory } = createThreadMemory();
		const first = makeContext(memory);
		vi.mocked(first.delegate.createAgent).mockResolvedValue({
			agentId: 'agent-1',
			projectId: 'proj-1',
		});
		vi.mocked(first.delegate.resolveAgentName).mockResolvedValue('Support Triage');
		vi.mocked(first.delegate.streamBuild).mockResolvedValue(completedStream('Created it.'));

		await executeTool(createBuildAgentTool(first.context), {
			message: 'Build it',
			name: 'Support Triage',
		});

		const second = makeContext(memory);
		vi.mocked(second.delegate.createAgent).mockResolvedValue({
			agentId: 'agent-2',
			projectId: 'proj-1',
		});
		vi.mocked(second.delegate.resolveAgentName).mockResolvedValue('Docs Helper');
		vi.mocked(second.delegate.streamBuild).mockResolvedValue(completedStream('Created it.'));

		const result = await executeTool<{ agentId?: string; agentRef?: string }>(
			createBuildAgentTool(second.context),
			{ message: 'Build another', name: 'Docs Helper' },
		);

		expect(second.delegate.createAgent).toHaveBeenCalledWith('Docs Helper');
		expect(result).toMatchObject({ agentId: 'agent-2', agentRef: 'docs-helper' });
	});
});
