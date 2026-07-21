import type { FetchFn } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { createAgentModelTurnRecorder } from '../agent-model-turn-recorder';

const logger = mock<Logger>();

describe('createAgentModelTurnRecorder', () => {
	it('passes the response through and records the turn', async () => {
		const baseFetch: FetchFn = vi.fn().mockResolvedValue(
			new Response('{"choices":[{"message":{"content":"hi"}}]}', {
				status: 200,
				headers: { 'content-type': 'application/json' },
			}),
		);
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		const response = await recorder.fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			body: JSON.stringify({ model: 'gpt-x', messages: [] }),
		});

		// The live consumer still reads the full body.
		await expect(response.json()).resolves.toEqual({
			choices: [{ message: { content: 'hi' } }],
		});

		await recorder.flush();
		expect(recorder.turns).toHaveLength(1);
		const turn = recorder.turns[0];
		expect(turn.provider).toBe('openai');
		expect(turn.status).toBe(200);
		expect(turn.streamed).toBe(false);
		expect(turn.durationMs).toBeGreaterThanOrEqual(0);
		expect(turn.requestBody).toEqual({ model: 'gpt-x', messages: [] });
		expect(turn.responseBody).toContain('choices');
	});

	it('never records secret-looking request fields', async () => {
		const baseFetch: FetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		await recorder.fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			body: JSON.stringify({ api_key: 'sk-super-secret', messages: [] }),
		});

		await recorder.flush();
		expect(JSON.stringify(recorder.turns[0].requestBody)).not.toContain('sk-super-secret');
	});

	it('marks event-stream responses as streamed and tees the body', async () => {
		const sse = 'data: {"type":"content_block_delta"}\n\ndata: [DONE]\n\n';
		const baseFetch: FetchFn = vi
			.fn()
			.mockResolvedValue(
				new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
			);
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		const response = await recorder.fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
		});
		await expect(response.text()).resolves.toBe(sse);

		await recorder.flush();
		expect(recorder.turns[0].streamed).toBe(true);
		expect(recorder.turns[0].responseBody).toContain('content_block_delta');
	});

	it('records and rethrows transport errors', async () => {
		const baseFetch: FetchFn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		await expect(recorder.fetch('https://api.openai.com/v1/chat/completions')).rejects.toThrow(
			'ECONNRESET',
		);
		expect(recorder.turns[0].error).toBe('ECONNRESET');
		expect(recorder.turns[0].status).toBeUndefined();
	});

	it('keeps a truncated string when an oversized request body no longer parses as JSON', async () => {
		const baseFetch: FetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		await recorder.fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			body: JSON.stringify({
				model: 'gpt-x',
				messages: [{ role: 'user', content: 'y'.repeat(20_000) }],
			}),
		});

		const recorded = recorder.turns[0].requestBody;
		expect(typeof recorded).toBe('string');
		expect(recorded).toContain('gpt-x');
	});

	it('truncates oversized recorded bodies', async () => {
		const huge = 'x'.repeat(50_000);
		const baseFetch: FetchFn = vi.fn().mockResolvedValue(new Response(huge, { status: 200 }));
		const recorder = createAgentModelTurnRecorder(baseFetch, logger);

		await recorder.fetch('https://api.openai.com/v1/chat/completions');
		await recorder.flush();

		const recorded = recorder.turns[0].responseBody as string;
		expect(recorded.length).toBeLessThan(20_000);
	});
});
