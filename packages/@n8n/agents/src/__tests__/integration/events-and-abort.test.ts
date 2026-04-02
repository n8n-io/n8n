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
		const { stream } = await agent.stream('Say hello');
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
			persistence: { resourceId: 'user-123', threadId: 'thread-abc' },
		});
		const state = agent.getState();
		expect(state.persistence?.resourceId).toBe('user-123');
		expect(state.persistence?.threadId).toBe('thread-abc');
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
