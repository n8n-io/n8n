import { summarize, type TimedEvent } from '../agent';

const usage = (input: number, output: number, cost: number) => ({
	input,
	output,
	cacheRead: 100,
	cacheWrite: 10,
	cost: { total: cost },
});

const assistant = (at: number, input: number, output: number, cost: number): TimedEvent => ({
	at,
	event: { type: 'message_end', message: { role: 'assistant', usage: usage(input, output, cost) } },
});

const tool = (id: string, command: string, start: number, end: number, isError = false) => [
	{
		at: start,
		event: { type: 'tool_execution_start', toolCallId: id, toolName: 'bash', args: { command } },
	},
	{ at: end, event: { type: 'tool_execution_end', toolCallId: id, toolName: 'bash', isError } },
];

describe('summarize', () => {
	it('folds the pi event stream into usage, tool, and command metrics', () => {
		const events: TimedEvent[] = [
			{ at: 0, event: { type: 'message_end', message: { role: 'user' } } },
			assistant(1_000, 5, 50, 0.01),
			...tool('a', 'curl -s http://127.0.0.1:18090/acme-tasks/docs', 1_000, 1_500),
			{ at: 1_600, event: { type: 'turn_end' } },
			assistant(3_000, 7, 70, 0.02),
			...tool('b', 'npx n8n-node build', 3_000, 7_000, true),
			{ at: 7_100, event: { type: 'turn_end' } },
			assistant(8_000, 9, 90, 0.03),
			...tool('c', 'npx n8n-node build && npx n8n-node lint', 8_000, 12_000),
			{ at: 12_100, event: { type: 'turn_end' } },
		];
		const metrics = summarize(events, { seconds: 13, exitCode: 0, timedOut: false });
		expect(metrics).toMatchObject({
			turns: 3,
			toolCalls: 3,
			tools: { bash: { count: 3, seconds: 8.5 } },
			commands: { build: 2, check: 1, test: 0, run: 0, curl: 1 },
			firstPassTurn: 3,
		});
		expect(metrics.tokens).toEqual({
			input: 21,
			output: 210,
			cacheRead: 300,
			cacheWrite: 30,
			cost: expect.closeTo(0.06, 6),
		});
		expect(metrics.turnTokens.map(({ output }) => output)).toEqual([50, 70, 90]);
	});
});
