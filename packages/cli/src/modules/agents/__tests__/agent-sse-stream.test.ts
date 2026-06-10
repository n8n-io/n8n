import type { AgentSseEvent } from '@n8n/api-types';
import type { StreamChunk } from '@n8n/agents';

import { pumpChunks } from '../agent-sse-stream';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function* toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
	for (const item of items) {
		yield item;
	}
}

async function collectEvents(chunks: StreamChunk[]): Promise<AgentSseEvent[]> {
	const events: AgentSseEvent[] = [];
	await pumpChunks(toAsyncIterable(chunks), (e) => events.push(e));
	return events;
}

// ---------------------------------------------------------------------------
// stringifyError — tested through pumpChunks / emitChunkEvents
// ---------------------------------------------------------------------------

jest.mock('n8n-workflow', () => ({
	LoggerProxy: {
		warn: jest.fn(),
	},
}));

describe('agent-sse-stream — stringifyError (via pumpChunks error chunk)', () => {
	it('extracts .message from an Error instance', async () => {
		const events = await collectEvents([{ type: 'error', error: new Error('something broke') }]);
		expect(events).toEqual([{ type: 'error', message: 'something broke' }]);
	});

	it('JSON-stringifies a plain object error', async () => {
		const error = { code: 'TIMEOUT', retryAfter: 30 };
		const events = await collectEvents([{ type: 'error', error }]);
		expect(events).toEqual([{ type: 'error', message: JSON.stringify(error, null, 2) }]);
	});

	it('prefixes a string with "Error: "', async () => {
		const events = await collectEvents([{ type: 'error', error: 'rate limit exceeded' }]);
		expect(events).toEqual([{ type: 'error', message: 'Error: rate limit exceeded' }]);
	});

	it('prefixes a number with "Error: "', async () => {
		const events = await collectEvents([{ type: 'error', error: 42 }]);
		expect(events).toEqual([{ type: 'error', message: 'Error: 42' }]);
	});

	it('falls back to "Unknown error" when JSON.stringify throws (circular ref)', async () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		const events = await collectEvents([{ type: 'error', error: circular }]);
		expect(events).toEqual([{ type: 'error', message: 'Unknown error' }]);
	});

	it('handles null via JSON.stringify (typeof null === "object")', async () => {
		const events = await collectEvents([{ type: 'error', error: null }]);
		// null passes the typeof === 'object' branch → JSON.stringify(null) = 'null'
		expect(events).toEqual([{ type: 'error', message: 'null' }]);
	});
});

describe('agent-sse-stream — stream completion', () => {
	it('completes after the runtime stream closes even when a finish chunk is present', async () => {
		const events = await collectEvents([
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'text-end', id: 't-1' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		expect(events).toEqual([
			{ type: 'text-delta', id: 't-1', delta: 'hello' },
			{ type: 'text-end', id: 't-1' },
		]);
	});
});

describe('agent-sse-stream — tool execution lifecycle chunks', () => {
	it('forwards tool-execution-start with its server startTime', async () => {
		const events = await collectEvents([
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'delegate_subagent',
				startTime: 1_000,
			},
		]);

		expect(events).toEqual([
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-1',
				toolName: 'delegate_subagent',
				startTime: 1_000,
			},
		]);
	});

	it('forwards tool-execution-end with its server endTime', async () => {
		const events = await collectEvents([
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'delegate_subagent',
				isError: false,
				endTime: 1_014,
			},
		]);

		expect(events).toEqual([
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'delegate_subagent',
				isError: false,
				endTime: 1_014,
			},
		]);
	});
});
