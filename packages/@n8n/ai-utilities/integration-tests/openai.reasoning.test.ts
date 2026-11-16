import nock from 'nock';

import type { Message } from 'src';

import { OpenAIChatModel } from './fixtures/openai';
import { mockFinalResponse } from './fixtures/openai.fixtures';
import { baseURL, userMessage, createModel, sseEvents, collect } from './fixtures/openai.helpers';

describe('OpenAIChatModel reasoning', () => {
	afterEach(() => {
		nock.abortPendingRequests();
		nock.cleanAll();
	});

	const encryptedContent = 'gAAAA-encrypted';
	const reasoningItem = {
		type: 'reasoning',
		id: 'rs_1',
		summary: [{ type: 'summary_text', text: 'Compare both cities.' }],
		encrypted_content: encryptedContent,
	};
	const replyText = { type: 'text', text: 'Hello' } as const;
	const captureInput = () => {
		const captured: { input?: unknown } = {};
		nock(baseURL)
			.post('/responses', (body: { input: unknown }) => {
				captured.input = body.input;
				return true;
			})
			.reply(200, mockFinalResponse);
		return captured;
	};

	it('should request the encrypted reasoning and return it with the reasoning', async () => {
		let include: unknown;
		nock(baseURL)
			.post('/responses', (body: { include: unknown }) => {
				include = body.include;
				return true;
			})
			.reply(200, { ...mockFinalResponse, output: [reasoningItem, ...mockFinalResponse.output] });

		const result = await createModel().generate([userMessage]);

		expect(include).toEqual(['reasoning.encrypted_content']);
		expect(result.message.content[0]).toEqual({
			type: 'reasoning',
			text: 'Compare both cities.',
			providerMetadata: { encryptedContent },
		});
	});

	it('should stream the complete reasoning with its encrypted payload', async () => {
		nock(baseURL)
			.post('/responses')
			.reply(
				...sseEvents(
					{
						type: 'response.output_item.added',
						output_index: 0,
						item: { ...reasoningItem, summary: [] },
					},
					{ type: 'response.reasoning_summary_text.delta', delta: 'Compare both cities.' },
					{ type: 'response.output_item.done', output_index: 0, item: reasoningItem },
					{ type: 'response.completed', response: { status: 'completed' } },
				),
			);

		const chunks = await collect(createModel().stream([userMessage]));

		expect(chunks.slice(0, 2)).toEqual([
			{ type: 'reasoning-delta', delta: 'Compare both cities.' },
			{
				type: 'content',
				content: {
					type: 'reasoning',
					text: 'Compare both cities.',
					providerMetadata: { encryptedContent },
				},
			},
		]);
	});

	it('should send reasoning with its encrypted payload back as a reasoning item', async () => {
		const captured = captureInput();

		await createModel().generate([
			userMessage,
			{
				role: 'assistant',
				content: [
					{
						type: 'reasoning',
						text: 'Compare both cities.',
						providerMetadata: { encryptedContent },
					},
					replyText,
				],
			},
		]);

		expect(captured.input).toEqual([
			{ role: 'user', content: 'Hi' },
			{
				type: 'reasoning',
				summary: [{ type: 'summary_text', text: 'Compare both cities.' }],
				encrypted_content: encryptedContent,
			},
			{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
		]);
	});

	describe('when OpenAI rejects the replayed reasoning', () => {
		type Requests = ConstructorParameters<typeof OpenAIChatModel>[1];
		const rejection = new Error('Request failed with status code 400');
		const history: Message[] = [
			userMessage,
			{
				role: 'assistant',
				content: [
					{
						type: 'reasoning',
						text: 'Compare both cities.',
						providerMetadata: { encryptedContent },
					},
					replyText,
				],
			},
		];
		const historyWithoutReasoning = [
			{ role: 'user', content: 'Hi' },
			{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
		];
		const createRequests = () => ({
			httpRequest: vi
				.fn<Requests['httpRequest']>()
				.mockRejectedValueOnce(rejection)
				.mockResolvedValueOnce({ body: mockFinalResponse }),
			openStream: vi
				.fn<Requests['openStream']>()
				.mockRejectedValueOnce(rejection)
				.mockResolvedValueOnce({
					body: (async function* () {
						yield Buffer.from(
							`data: ${JSON.stringify({ type: 'response.completed', response: { status: 'completed' } })}\n\n`,
						);
					})(),
				}),
		});

		it('should send the request once more without reasoning', async () => {
			const requests = createRequests();

			const result = await new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate(history);

			expect(result.finishReason).toBe('stop');
			expect(requests.httpRequest).toHaveBeenCalledTimes(2);
			expect(requests.httpRequest).toHaveBeenLastCalledWith(
				'POST',
				`${baseURL}/responses`,
				expect.objectContaining({ input: historyWithoutReasoning }),
				undefined,
				undefined,
			);
		});

		it('should open the stream once more without reasoning', async () => {
			const requests = createRequests();

			const chunks = await collect(
				new OpenAIChatModel('gpt-4o', requests, { baseURL }).stream(history),
			);

			expect(chunks).toEqual([{ type: 'finish', finishReason: 'stop', usage: undefined }]);
			expect(requests.openStream).toHaveBeenLastCalledWith(
				'POST',
				`${baseURL}/responses`,
				expect.objectContaining({ input: historyWithoutReasoning }),
				undefined,
				undefined,
			);
		});

		it('should not retry a request that replays no reasoning', async () => {
			const requests = createRequests();

			const result = new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate([userMessage]);

			await expect(result).rejects.toBe(rejection);
			expect(requests.httpRequest).toHaveBeenCalledTimes(1);
		});

		it('should not retry an aborted request', async () => {
			const requests = createRequests();
			const controller = new AbortController();
			const reason = new Error('Stopped by the caller');
			controller.abort(reason);

			const result = new OpenAIChatModel('gpt-4o', requests, { baseURL }).generate(history, {
				abortSignal: controller.signal,
			});

			await expect(result).rejects.toBe(reason);
			expect(requests.httpRequest).toHaveBeenCalledTimes(1);
		});
	});

	it('should leave out reasoning without an encrypted payload', async () => {
		const captured = captureInput();

		await createModel().generate([
			userMessage,
			{
				role: 'assistant',
				content: [{ type: 'reasoning', text: 'Thinking about it' }, replyText],
			},
			{ role: 'user', content: [{ type: 'text', text: 'Again' }] },
		]);

		expect(captured.input, 'reasoning text must not become assistant text').toEqual([
			{ role: 'user', content: 'Hi' },
			{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello' }] },
			{ role: 'user', content: 'Again' },
		]);
	});
});
