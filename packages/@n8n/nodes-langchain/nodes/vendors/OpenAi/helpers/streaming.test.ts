import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { Readable } from 'node:stream';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ChatResponse } from './interfaces';
import { collectStreamedResponse } from './streaming';

const completedResponse = {
	id: 'resp_1',
	status: 'completed',
	output: [{ type: 'message', content: [{ type: 'output_text', text: 'Hello' }] }],
	usage: { input_tokens: 5, output_tokens: 2 },
} as unknown as ChatResponse;

function sseStream(chunks: string[]) {
	return Readable.from(chunks.map((chunk) => Buffer.from(chunk)));
}

describe('collectStreamedResponse', () => {
	let ctx: IExecuteFunctions;

	beforeEach(() => {
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(
			mock<INode>({
				id: 'test-node',
				name: 'Test Node',
				type: 'n8n-nodes-langchain.openAi',
				typeVersion: 2.4,
			}),
		);
	});

	it('should return the response of the terminal event', async () => {
		const stream = sseStream([
			'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"He"}\n\n',
			'event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"llo"}\n\n',
			`event: response.completed\ndata: ${JSON.stringify({ type: 'response.completed', response: completedResponse })}\n\n`,
			'data: [DONE]\n\n',
		]);

		const response = await collectStreamedResponse(ctx, stream);

		expect(response).toEqual(completedResponse);
	});

	it('should read events that arrive split across chunks', async () => {
		const payload = JSON.stringify({ type: 'response.completed', response: completedResponse });
		const full = `data: ${payload}\n\n`;
		const stream = sseStream([full.slice(0, 20), full.slice(20)]);

		const response = await collectStreamedResponse(ctx, stream);

		expect(response).toEqual(completedResponse);
	});

	it('should keep the result of an incomplete response', async () => {
		const incomplete = { ...completedResponse, status: 'incomplete' } as ChatResponse;
		const stream = sseStream([
			`data: ${JSON.stringify({ type: 'response.incomplete', response: incomplete })}\n\n`,
		]);

		const response = await collectStreamedResponse(ctx, stream);

		expect(response.status).toBe('incomplete');
	});

	it('should throw when the stream reports a failed response', async () => {
		const stream = sseStream([
			`data: ${JSON.stringify({
				type: 'response.failed',
				response: { error: { message: 'Model failed' } },
			})}\n\n`,
		]);

		await expect(collectStreamedResponse(ctx, stream)).rejects.toThrow('Model failed');
	});

	it('should throw when the stream reports an error event', async () => {
		const stream = sseStream([
			`data: ${JSON.stringify({ type: 'error', error: { message: 'Rate limit reached' } })}\n\n`,
		]);

		await expect(collectStreamedResponse(ctx, stream)).rejects.toThrow('Rate limit reached');
	});

	it('should throw when the stream ends without a result', async () => {
		const stream = sseStream([
			'data: {"type":"response.output_text.delta","delta":"He"}\n\n',
			'data: [DONE]\n\n',
		]);

		await expect(collectStreamedResponse(ctx, stream)).rejects.toThrow(
			'The streamed response ended without a result',
		);
	});

	it('should skip events that are not valid JSON', async () => {
		const stream = sseStream([
			'data: not-json\n\n',
			`data: ${JSON.stringify({ type: 'response.completed', response: completedResponse })}\n\n`,
		]);

		const response = await collectStreamedResponse(ctx, stream);

		expect(response).toEqual(completedResponse);
	});
});
