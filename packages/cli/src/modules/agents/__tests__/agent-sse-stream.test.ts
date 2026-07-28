import type { StreamChunk } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import { EventEmitter } from 'node:events';

import { initSseStream, pumpChunks, type FlushableResponse } from '../agent-sse-stream';

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

function createResponse() {
	const socket = {
		setTimeout: vi.fn(),
		setNoDelay: vi.fn(),
		setKeepAlive: vi.fn(),
	};
	const res = Object.assign(new EventEmitter(), {
		setHeader: vi.fn(),
		flushHeaders: vi.fn(),
		write: vi.fn(),
		flush: vi.fn(),
		socket,
		writableEnded: false,
		destroyed: false,
	}) as unknown as FlushableResponse;

	return { res, socket };
}

describe('agent-sse-stream — connection setup', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('configures the response to remain open through reverse proxies', () => {
		const { res, socket } = createResponse();

		initSseStream(res);

		expect(socket.setTimeout).toHaveBeenCalledWith(0);
		expect(socket.setNoDelay).toHaveBeenCalledWith(true);
		expect(socket.setKeepAlive).toHaveBeenCalledWith(true);
		expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform');
		expect(res.write).toHaveBeenCalledWith(':ok\n\n');
		expect(res.flush).toHaveBeenCalled();
		res.emit('close');
	});

	it('writes an SSE heartbeat after 30 seconds of inactivity', () => {
		vi.useFakeTimers();
		const { res } = createResponse();
		initSseStream(res);
		vi.mocked(res.write).mockClear();
		vi.mocked(res.flush).mockClear();

		vi.advanceTimersByTime(29_999);
		expect(res.write).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		expect(res.write).toHaveBeenCalledWith(':ping\n\n');
		expect(res.flush).toHaveBeenCalled();
	});

	it.each(['finish', 'close'])('stops the heartbeat after the response emits %s', (event) => {
		vi.useFakeTimers();
		const { res } = createResponse();
		initSseStream(res);
		vi.mocked(res.write).mockClear();

		res.emit(event);
		vi.advanceTimersByTime(30_000);

		expect(res.write).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// stringifyError — tested through pumpChunks / emitChunkEvents
// ---------------------------------------------------------------------------

vi.mock('n8n-workflow', () => ({
	LoggerProxy: {
		warn: vi.fn(),
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

	it('drains every suspension chunk before reporting that the run paused', async () => {
		const chunks: StreamChunk[] = [
			{
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tc-1',
				toolName: 'ask_questions',
				suspendPayload: { question: 'First question' },
			},
			{
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tc-2',
				toolName: 'ask_questions',
				suspendPayload: { question: 'Second question' },
			},
			{ type: 'finish', finishReason: 'other' },
		];
		const events: AgentSseEvent[] = [];

		const suspended = await pumpChunks(toAsyncIterable(chunks), (event) => events.push(event));

		expect(suspended).toBe(true);
		expect(events).toEqual([
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-1',
					toolName: 'ask_questions',
					input: { question: 'First question' },
				},
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-2',
					runId: 'run-1',
					toolName: 'ask_questions',
					input: { question: 'Second question' },
				},
			},
		]);
	});
});

describe('agent-sse-stream — warning chunks', () => {
	it('forwards warning chunks as non-fatal warning SSE events', async () => {
		const events = await collectEvents([
			{
				type: 'warning',
				message: 'fetch failed',
				code: 'mcp_connection_failed',
				source: 'mcp',
				server: 'dead',
			},
		]);

		expect(events).toEqual([
			{
				type: 'warning',
				message: 'fetch failed',
				code: 'mcp_connection_failed',
				source: 'mcp',
				server: 'dead',
			},
		]);
	});

	it('omits optional warning fields when absent', async () => {
		const events = await collectEvents([{ type: 'warning', message: 'something' }]);
		expect(events).toEqual([{ type: 'warning', message: 'something' }]);
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
