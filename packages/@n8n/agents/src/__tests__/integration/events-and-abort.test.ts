import { expect, it } from 'vitest';
import { z } from 'zod';

import { collectStreamChunks, describeIf, getModel } from './helpers';
import { Agent, AgentEvent, Tool, type AgentEventData, type StreamChunk } from '../../index';

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
// Event system — stream path
// ---------------------------------------------------------------------------

describe('event system — stream', () => {
	it('emits AgentStart and AgentEnd around a stream() call', async () => {
		const agent = createSimpleAgent();

		const fired: AgentEvent[] = [];
		agent.on(AgentEvent.AgentStart, () => fired.push(AgentEvent.AgentStart));
		agent.on(AgentEvent.AgentEnd, () => fired.push(AgentEvent.AgentEnd));

		const stream = await agent.stream('Say hello');
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

		const stream = await agent.stream('What is 4 plus 6?');
		await collectStreamChunks(stream);

		const starts = toolEvents.filter((e) => e.type === AgentEvent.ToolExecutionStart);
		expect(starts.length).toBeGreaterThan(0);

		const start = starts[0] as AgentEventData & { type: AgentEvent.ToolExecutionStart };
		expect(start.toolName).toBe('add_numbers');
	});
});

// ---------------------------------------------------------------------------
// getState()
// ---------------------------------------------------------------------------

describe('getState()', () => {
	it('returns idle before first run', () => {
		const agent = createSimpleAgent();
		const state = agent.getState();
		expect(state.status).toBe('idle');
		expect(state.messageList.messages).toHaveLength(0);
	});

	it('returns success after a successful generate()', async () => {
		const agent = createSimpleAgent();
		await agent.generate('Say hello');
		const state = agent.getState();
		expect(state.status).toBe('success');
	});

	it('returns success after a completed stream()', async () => {
		const agent = createSimpleAgent();
		const stream = await agent.stream('Say hello');
		await collectStreamChunks(stream);
		const state = agent.getState();
		expect(state.status).toBe('success');
	});

	it('state is running during the generate loop (observed via event)', async () => {
		const agent = createSimpleAgent();

		let stateWhileRunning: string | undefined;
		agent.on(AgentEvent.TurnStart, () => {
			stateWhileRunning = agent.getState().status;
		});

		await agent.generate('Say hello');

		expect(stateWhileRunning).toBe('running');
	});

	it('reflects resourceId and threadId from RunOptions', async () => {
		const agent = createSimpleAgent();
		await agent.generate('Say hello', {
			resourceId: 'user-123',
			threadId: 'thread-abc',
		});
		const state = agent.getState();
		expect(state.resourceId).toBe('user-123');
		expect(state.threadId).toBe('thread-abc');
	});
});

// ---------------------------------------------------------------------------
// abort()
// ---------------------------------------------------------------------------

describe('abort() — generate path', () => {
	it('abort() before generate() starts returns an error result (never throws)', async () => {
		const agent = createAgentWithTool();

		// Abort as soon as the first TurnStart fires (before LLM is called the second time)
		agent.on(AgentEvent.TurnStart, () => agent.abort());

		const result = await agent.generate('What is 2 plus 2?');

		expect(result.finishReason).toBe('error');
		expect(String(result.error)).toMatch(/aborted/i);
		expect(agent.getState().status).toBe('cancelled');
	});

	it('abort() sets state to cancelled and surfaces error in result', async () => {
		const agent = createAgentWithTool();

		agent.on(AgentEvent.TurnStart, () => agent.abort());

		const result = await agent.generate('What is 2 plus 2?');

		expect(result.error).toBeDefined();
		expect(agent.getState().status).toBe('cancelled');
	});

	it('abort() via controls inside an event handler returns an error result', async () => {
		const agent = createAgentWithTool();

		agent.on(AgentEvent.TurnStart, (_data, controls) => {
			void controls.abort();
		});

		const result = await agent.generate('What is 2 plus 2?');

		expect(result.finishReason).toBe('error');
		expect(String(result.error)).toMatch(/aborted/i);
	});

	it('agent is reusable after abort — next generate succeeds', async () => {
		const agent = createSimpleAgent();

		let aborted = false;
		agent.on(AgentEvent.AgentStart, () => {
			if (!aborted) {
				aborted = true;
				agent.abort();
			}
		});

		// First call is aborted — returns error result, never throws
		const first = await agent.generate('Say hello');
		expect(first.finishReason).toBe('error');

		// Remove the aborting handler by re-registering a no-op... but since we
		// can't unregister, use a flag guard (already done above).
		// Second call should succeed
		const result = await agent.generate('Say hello');
		expect(result.messages.length).toBeGreaterThan(0);
	});
});

describe('abort() — stream path', () => {
	it('abort() mid-stream produces an error chunk and closes the stream', async () => {
		const agent = createSimpleAgent();

		// Abort as soon as the first TurnStart fires
		agent.on(AgentEvent.TurnStart, () => agent.abort());

		const stream = await agent.stream('Say hello');
		const chunks = await collectStreamChunks(stream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);

		const errorChunk = errorChunks[0] as StreamChunk & { type: 'error'; error: unknown };
		expect(String(errorChunk.error)).toMatch(/aborted/i);
	});

	it('abort() sets state to cancelled after stream aborts', async () => {
		const agent = createSimpleAgent();

		agent.on(AgentEvent.TurnStart, () => agent.abort());

		const stream = await agent.stream('Say hello');
		await collectStreamChunks(stream);

		expect(agent.getState().status).toBe('cancelled');
	});

	it('abort() called externally after stream starts cancels mid-run', async () => {
		const agent = createSimpleAgent();

		// Kick off the stream, let it start, then abort from outside
		const stream = await agent.stream('Tell me a long story');

		// Abort slightly after the stream starts by watching the first chunk
		const reader = stream.getReader();
		const firstChunk = await reader.read();
		expect(firstChunk.done).toBe(false);

		// Abort externally
		agent.abort();

		// Drain remaining chunks
		const remaining: StreamChunk[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			remaining.push(value);
		}

		// Stream should have been closed (possibly with an error chunk)
		// Either the error chunk is in remaining, or the stream ended normally
		// (if chunks already flushed). The key assertion: state is cancelled OR success.
		// In practice abort races with stream completion so we accept both.
		const status = agent.getState().status;
		expect(['cancelled', 'success']).toContain(status);
	});

	it('event handler abort via controls closes the stream', async () => {
		const agent = createSimpleAgent();

		agent.on(AgentEvent.TurnStart, (_data, controls) => {
			void controls.abort();
		});

		const stream = await agent.stream('Say hello');
		const chunks = await collectStreamChunks(stream);

		const errorChunks = chunks.filter((c) => c.type === 'error');
		expect(errorChunks.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// asTool()
// ---------------------------------------------------------------------------

describe('asTool()', () => {
	it('wraps the agent as a BuiltTool with the correct name and description', () => {
		const agent = createSimpleAgent();
		const tool = agent.asTool('A helpful assistant tool');

		expect(tool.name).toBe('events-test-agent');
		expect(tool.description).toBe('A helpful assistant tool');
		expect(tool.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	it('asTool handler calls the agent and returns text result', async () => {
		const agent = createSimpleAgent();
		const tool = agent.asTool('A helpful assistant tool');

		const result = await tool.handler!({ input: 'Say "pong"' }, {});

		expect(result).toHaveProperty('result');
		expect(typeof (result as { result: string }).result).toBe('string');
		expect((result as { result: string }).result.length).toBeGreaterThan(0);
	});

	it('coordinator agent can use sub-agent via asTool', async () => {
		const specialist = new Agent('specialist')
			.model(getModel('anthropic'))
			.instructions('You are a specialist. When asked, reply with exactly "SPECIALIST_RESPONSE".');

		const coordinator = new Agent('coordinator')
			.model(getModel('anthropic'))
			.instructions(
				'You coordinate tasks. Use the specialist tool to answer questions. Relay the exact response.',
			)
			.tool(specialist.asTool('A specialist agent'));

		const result = await coordinator.generate(
			'Ask the specialist for their response and tell me what they said.',
		);

		const text = result.messages
			.filter((m) => 'role' in m && m.role === 'assistant')
			.flatMap((m) => ('content' in m ? m.content : []))
			.filter((c) => c.type === 'text')
			.map((c) => ('text' in c ? c.text : ''))
			.join('');

		expect(text.length).toBeGreaterThan(0);
	});
});
