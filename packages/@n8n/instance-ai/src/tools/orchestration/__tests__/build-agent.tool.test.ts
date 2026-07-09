import type { InstanceAiEvent } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type {
	BuilderTurnStream,
	InstanceAiBuilderDelegate,
	InstanceAiContext,
	OrchestrationContext,
} from '../../../types';
import { createBuildAgentTool } from '../build-agent.tool';

interface BuildAgentOutput {
	ok: boolean;
	builderReply?: string;
	configUpdated?: boolean;
	error?: string;
}

function fakeStream(chunks: unknown[], text: string): BuilderTurnStream {
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

function makeContext(overrides: { delegate?: InstanceAiBuilderDelegate } = {}): {
	context: OrchestrationContext;
	delegate: InstanceAiBuilderDelegate;
	publishedEvents: InstanceAiEvent[];
} {
	const publishedEvents: InstanceAiEvent[] = [];
	const delegate = overrides.delegate ?? mock<InstanceAiBuilderDelegate>();

	const domainContext = mock<InstanceAiContext>();
	domainContext.builderDelegate = delegate;
	domainContext.projectId = 'proj-1';
	// Force resolveAgentBuilderTarget/saveAgentBuilderTarget onto the in-memory
	// fallback path (no thread-persistence plumbing needed for these tests).
	domainContext.threadMemory = undefined;
	domainContext.threadId = undefined;
	domainContext.agentBuilderTarget = undefined;

	const eventBus = mock<InstanceAiEventBus>();
	eventBus.publish.mockImplementation((_threadId: string, event: InstanceAiEvent) => {
		publishedEvents.push(event);
	});

	const context = mock<OrchestrationContext>();
	context.domainContext = domainContext;
	context.threadId = 'thread-1';
	context.runId = 'run-1';
	context.orchestratorAgentId = 'root-agent';
	context.abortSignal = new AbortController().signal;
	context.eventBus = eventBus;
	context.logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as unknown as OrchestrationContext['logger'];

	return { context, delegate, publishedEvents };
}

async function runTool(context: OrchestrationContext, input: Record<string, unknown>) {
	const tool = createBuildAgentTool(context);
	return await executeTool<BuildAgentOutput>(tool, input);
}

describe('build-agent tool', () => {
	it('creates and binds a new agent when name is given, keying the session to the instance thread', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Created it.'));

		await runTool(context, { message: 'Build me a support agent', name: 'Support Agent' });

		expect(delegate.createAgent).toHaveBeenCalledWith('Support Agent');
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-1', 'Build me a support agent', {
			threadId: 'ia-builder:thread-1:agent-1',
		});
	});

	it('returns the accumulated builder reply on completion', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream(
				[
					{ type: 'text-delta', id: 'a', delta: 'Hello ' },
					{ type: 'text-delta', id: 'a', delta: 'world' },
				],
				'Hello world',
			),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result.ok).toBe(true);
		expect(result.builderReply).toBe('Hello world');
	});

	it('publishes agent-spawned, then stream chunk events, then agent-completed in order', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream([{ type: 'text-delta', id: 'a', delta: 'hi' }], 'hi'),
		);

		await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(publishedEvents.map((event) => event.type)).toEqual([
			'agent-spawned',
			'text-delta',
			'agent-completed',
		]);
		const spawned = publishedEvents[0];
		expect(spawned).toMatchObject({ type: 'agent-spawned', agentId: 'agent-builder:agent-1' });
		expect(spawned && 'payload' in spawned ? spawned.payload : undefined).toMatchObject({
			role: 'agent-builder',
			kind: 'agent-builder',
			title: 'Building agent',
			targetResource: { type: 'agent', id: 'agent-1' },
		});

		const completed = publishedEvents[2];
		expect(completed).toMatchObject({ type: 'agent-completed', agentId: 'agent-builder:agent-1' });
		expect(completed && 'payload' in completed ? completed.payload : undefined).toMatchObject({
			role: 'agent-builder',
			result: 'hi',
		});
	});

	it('errors when there is no bound target and neither name nor agentId is given', async () => {
		const { context, delegate } = makeContext();

		const result = await runTool(context, { message: 'Do something' });

		expect(result).toEqual({
			ok: false,
			error: 'Pass name to create a new agent or agentId to edit an existing one.',
		});
		expect(delegate.streamBuild).not.toHaveBeenCalled();
	});

	it('maps a thrown builder-not-configured error to a friendly message', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockRejectedValue(
			Object.assign(new Error('not configured'), { code: 'BUILDER_NOT_CONFIGURED' }),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'The agent builder model is not configured. Set it up in the agents module settings.',
		});
	});

	it('appends the session-workflows envelope to the outbound message when workflowContext is passed', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'ok'));

		await runTool(context, {
			message: 'Attach the workflow',
			name: 'New Agent',
			workflowContext: [
				{ id: 'wf-1', name: 'Send Reminder', description: 'Sends a reminder email' },
			],
		});

		const [, message] = vi.mocked(delegate.streamBuild).mock.calls[0];
		expect(message).toContain('Attach the workflow');
		expect(message).toContain('<session-workflows>');
		expect(message).toContain(
			'Workflows built in this session (attachable as {"type":"workflow"} tools):',
		);
		expect(message).toContain('- Send Reminder (id: wf-1): Sends a reminder email');
		expect(message).toContain('</session-workflows>');
	});

	it('binds directly to an existing agentId without creating a new agent', async () => {
		const { context, delegate } = makeContext();
		vi.mocked(delegate.streamBuild).mockResolvedValue(fakeStream([], 'Editing it.'));

		await runTool(context, { message: 'Add a tool', agentId: 'agent-existing' });

		expect(delegate.createAgent).not.toHaveBeenCalled();
		expect(delegate.streamBuild).toHaveBeenCalledWith('agent-existing', 'Add a tool', {
			threadId: 'ia-builder:thread-1:agent-existing',
		});
	});

	it('returns a failure result when the builder run does not complete', async () => {
		const { context, delegate, publishedEvents } = makeContext();
		vi.mocked(delegate.createAgent).mockResolvedValue({ agentId: 'agent-1', projectId: 'proj-1' });
		vi.mocked(delegate.streamBuild).mockResolvedValue(
			fakeStream([{ type: 'error', error: 'boom' }], ''),
		);

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result.ok).toBe(false);
		expect(result.error).toBe('The agent builder run errored.');
		const last = publishedEvents.at(-1);
		expect(last).toMatchObject({ type: 'agent-completed' });
		expect(last && 'payload' in last ? last.payload : undefined).toMatchObject({
			role: 'agent-builder',
			error: 'The agent builder run errored.',
		});
	});

	it('reports that the agent is not available on this instance when no builder delegate is configured', async () => {
		const { context } = makeContext();
		context.domainContext!.builderDelegate = undefined;

		const result = await runTool(context, { message: 'Build it', name: 'New Agent' });

		expect(result).toEqual({
			ok: false,
			error: 'Agent building is not available on this instance.',
		});
	});
});
