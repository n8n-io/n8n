import { expect, it } from 'vitest';
import { z } from 'zod';

import { collectStreamChunks, describeIf, getModel } from './helpers';
import { Agent, AgentEvent, Tool, type AgentEventData } from '../../index';

const describe = describeIf('anthropic');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createSimpleAgent(provider: 'openai' | 'anthropic' = 'anthropic'): Agent {
	return new Agent('events-test-agent')
		.model(getModel(provider))
		.instructions('You are a concise assistant. Reply in one short sentence.');
}

function createAgentWithTool(provider: 'openai' | 'anthropic' = 'anthropic'): Agent {
	const addTool = new Tool('add_numbers')
		.description('Add two numbers together')
		.input(z.object({ a: z.number(), b: z.number() }))
		.handler(async ({ a, b }) => ({ result: a + b }));

	return new Agent('events-tool-agent')
		.model(getModel(provider))
		.instructions('You are a calculator. Use the add_numbers tool when asked to add.')
		.tool(addTool);
}

function createAgentWithAbortAwareTool({
	onToolStart,
	onToolAbort,
}: {
	onToolStart: () => void;
	onToolAbort: () => void;
}): Agent {
	const abortAwareTool = new Tool('wait_for_abort')
		.description(
			'Wait until the current run is aborted, then report whether the abort signal fired.',
		)
		.input(z.object({ reason: z.string().optional() }))
		.handler(async (_input, ctx) => {
			const signal = ctx.abortSignal;
			onToolStart();
			await new Promise<void>((resolve) => {
				signal?.addEventListener(
					'abort',
					() => {
						onToolAbort();
						resolve();
					},
					{ once: true },
				);
			});
			return { aborted: signal?.aborted === true };
		});

	return new Agent('events-abort-tool-agent')
		.model(getModel('anthropic'))
		.instructions(
			'You must call wait_for_abort exactly once before answering. Do not answer directly.',
		)
		.tool(abortAwareTool);
}

// ---------------------------------------------------------------------------
// Event system — generate path
// ---------------------------------------------------------------------------

describe('event system — generate', () => {
	it('emits AgentStart and AgentEnd around a generate() call', async () => {
		const agent = createSimpleAgent();

		const fired: AgentEvent[] = [];
		agent.on(AgentEvent.AgentStart, () => {
			fired.push(AgentEvent.AgentStart);
		});
		agent.on(AgentEvent.AgentEnd, () => {
			fired.push(AgentEvent.AgentEnd);
		});

		await agent.generate('Say hello');

		expect(fired).toContain(AgentEvent.AgentStart);
		expect(fired).toContain(AgentEvent.AgentEnd);
		expect(fired.indexOf(AgentEvent.AgentStart)).toBeLessThan(fired.indexOf(AgentEvent.AgentEnd));
	});

	it('emits TurnStart and TurnEnd for each LLM call', async () => {
		const agent = createSimpleAgent();

		const fired: AgentEvent[] = [];
		agent.on(AgentEvent.TurnStart, () => fired.push(AgentEvent.TurnStart));
		agent.on(AgentEvent.TurnEnd, () => fired.push(AgentEvent.TurnEnd));

		await agent.generate('Say hello');

		expect(fired).toContain(AgentEvent.TurnStart);
		expect(fired).toContain(AgentEvent.TurnEnd);
	});

	it('emits ToolExecutionStart and ToolExecutionEnd when a tool runs', async () => {
		const agent = createAgentWithTool();

		const toolEvents: AgentEventData[] = [];
		agent.on(AgentEvent.ToolExecutionStart, (data) => toolEvents.push(data));
		agent.on(AgentEvent.ToolExecutionEnd, (data) => toolEvents.push(data));

		await agent.generate('What is 7 plus 3?');

		const starts = toolEvents.filter((e) => e.type === AgentEvent.ToolExecutionStart);
		const ends = toolEvents.filter((e) => e.type === AgentEvent.ToolExecutionEnd);

		expect(starts.length).toBeGreaterThan(0);
		expect(ends.length).toBeGreaterThan(0);

		const start = starts[0] as AgentEventData & { type: AgentEvent.ToolExecutionStart };
		expect(start.toolName).toBe('add_numbers');

		const end = ends[0] as AgentEventData & { type: AgentEvent.ToolExecutionEnd };
		expect(end.isError).toBe(false);
		expect((end.result as { result: number }).result).toBe(10);
	});

	it('ToolExecutionEnd carries the correct toolCallId matching ToolExecutionStart', async () => {
		const agent = createAgentWithTool();

		const starts: Array<AgentEventData & { type: AgentEvent.ToolExecutionStart }> = [];
		const ends: Array<AgentEventData & { type: AgentEvent.ToolExecutionEnd }> = [];

		agent.on(AgentEvent.ToolExecutionStart, (data) => {
			starts.push(data as AgentEventData & { type: AgentEvent.ToolExecutionStart });
		});
		agent.on(AgentEvent.ToolExecutionEnd, (data) => {
			ends.push(data as AgentEventData & { type: AgentEvent.ToolExecutionEnd });
		});

		await agent.generate('What is 5 plus 5?');

		expect(starts.length).toBeGreaterThan(0);
		expect(ends.length).toBe(starts.length);
		expect(ends[0].toolCallId).toBe(starts[0].toolCallId);
	});

	it('multiple handlers on the same event are all called', async () => {
		const agent = createSimpleAgent();

		const calls: number[] = [];
		agent.on(AgentEvent.AgentEnd, () => calls.push(1));
		agent.on(AgentEvent.AgentEnd, () => calls.push(2));
		agent.on(AgentEvent.AgentEnd, () => calls.push(3));

		await agent.generate('Say hello');

		expect(calls).toEqual(expect.arrayContaining([1, 2, 3]));
	});

	it('AgentEnd data contains the response messages', async () => {
		const agent = createSimpleAgent();

		let capturedMessages: unknown[] = [];
		agent.on(AgentEvent.AgentEnd, (data) => {
			if (data.type === AgentEvent.AgentEnd) {
				capturedMessages = data.messages;
			}
		});

		await agent.generate('Say hello');

		expect(capturedMessages.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// Abort signal propagation — public Agent API
// ---------------------------------------------------------------------------

describe('abort signal propagation to tools', () => {
	it('passes an aborting signal to tool context during generate()', async () => {
		const external = new AbortController();
		let toolStarted!: () => void;
		const waitForToolStart = new Promise<void>((resolve) => {
			toolStarted = resolve;
		});
		let toolAborted!: () => void;
		const waitForToolAbort = new Promise<void>((resolve) => {
			toolAborted = resolve;
		});
		const agent = createAgentWithAbortAwareTool({
			onToolStart: toolStarted,
			onToolAbort: toolAborted,
		});

		const run = agent.generate('Call wait_for_abort now.', { abortSignal: external.signal });
		await waitForToolStart;

		external.abort();

		await waitForToolAbort;
		await run;
	});

	it('passes an aborting signal to tool context during stream()', async () => {
		const external = new AbortController();
		let toolStarted!: () => void;
		const waitForToolStart = new Promise<void>((resolve) => {
			toolStarted = resolve;
		});
		let toolAborted!: () => void;
		const waitForToolAbort = new Promise<void>((resolve) => {
			toolAborted = resolve;
		});
		const agent = createAgentWithAbortAwareTool({
			onToolStart: toolStarted,
			onToolAbort: toolAborted,
		});

		const { stream } = await agent.stream('Call wait_for_abort now.', {
			abortSignal: external.signal,
		});
		const drain = collectStreamChunks(stream);
		await waitForToolStart;

		external.abort();

		await waitForToolAbort;
		await drain;
	});
});

// ---------------------------------------------------------------------------
// Event system — stream path
// ---------------------------------------------------------------------------

describe('event system — stream', () => {
	it('emits AgentStart and AgentEnd around a stream() call', async () => {
		const agent = createSimpleAgent();

		const fired: AgentEvent[] = [];
		agent.on(AgentEvent.AgentStart, () => fired.push(AgentEvent.AgentStart));
		agent.on(AgentEvent.AgentEnd, () => fired.push(AgentEvent.AgentEnd));

		const { stream } = await agent.stream('Say hello');
		await collectStreamChunks(stream);

		expect(fired).toContain(AgentEvent.AgentStart);
		expect(fired).toContain(AgentEvent.AgentEnd);
		expect(fired.indexOf(AgentEvent.AgentStart)).toBeLessThan(fired.indexOf(AgentEvent.AgentEnd));
	});

	it('emits ToolExecutionStart and ToolExecutionEnd during streaming', async () => {
		const agent = createAgentWithTool();

		const toolEvents: AgentEventData[] = [];
		agent.on(AgentEvent.ToolExecutionStart, (data) => toolEvents.push(data));
		agent.on(AgentEvent.ToolExecutionEnd, (data) => toolEvents.push(data));

		const { stream } = await agent.stream('What is 4 plus 6?');
		await collectStreamChunks(stream);

		const starts = toolEvents.filter((e) => e.type === AgentEvent.ToolExecutionStart);
		expect(starts.length).toBeGreaterThan(0);

		const start = starts[0] as AgentEventData & { type: AgentEvent.ToolExecutionStart };
		expect(start.toolName).toBe('add_numbers');
	});
});

// ---------------------------------------------------------------------------
// Result getState()
// ---------------------------------------------------------------------------

describe('result getState()', () => {
	it('returns success after a successful generate()', async () => {
		const agent = createSimpleAgent();
		const result = await agent.generate('Say hello');
		const state = result.getState();
		expect(state.status).toBe('success');
	});

	it('returns success after a completed stream()', async () => {
		const agent = createSimpleAgent();
		const result = await agent.stream('Say hello');
		const { stream } = result;
		await collectStreamChunks(stream);
		const state = result.getState();
		expect(state.status).toBe('success');
	});

	it('stream result state is running before the stream is drained', async () => {
		const agent = createSimpleAgent();

		const result = await agent.stream('Say hello');
		expect(result.getState().status).toBe('running');

		await collectStreamChunks(result.stream);
		expect(result.getState().status).toBe('success');
	});

	it('reflects resourceId and threadId from RunOptions', async () => {
		const agent = createSimpleAgent();
		const result = await agent.generate('Say hello', {
			persistence: { resourceId: 'user-123', threadId: 'thread-abc' },
		});
		const state = result.getState();
		expect(state.persistence?.resourceId).toBe('user-123');
		expect(state.persistence?.threadId).toBe('thread-abc');
	});
});
