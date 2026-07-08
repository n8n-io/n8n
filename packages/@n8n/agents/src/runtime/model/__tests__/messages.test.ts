import type { ModelMessage } from 'ai';

import type { Message } from '../../../types/sdk/message';
import { fromAiMessages, toAiMessages } from '../messages';

describe('message provider metadata conversion', () => {
	it('strips OpenAI Responses state identifiers before replaying messages', () => {
		const message: Message = {
			role: 'assistant',
			providerOptions: {
				openai: {
					itemId: 'msg_stateful',
					responseId: 'resp_stateful',
					imageDetail: 'high',
				},
				anthropic: { cacheControl: { type: 'ephemeral' } },
			},
			content: [
				{
					type: 'text',
					text: 'Take an umbrella.',
					providerMetadata: {
						openai: {
							itemId: 'msg_123',
							responseId: 'resp_123',
							phase: 'final_answer',
							logprobs: [{ token: 'Take' }],
						},
						google: { thoughtSignature: 'google-signature' },
					},
					providerOptions: {
						openai: {
							itemId: 'msg_123',
							responseId: 'resp_123',
							imageDetail: 'low',
						},
						anthropic: { cacheControl: { type: 'ephemeral' } },
					},
				},
				{
					type: 'reasoning',
					text: 'The forecast shows rain.',
					providerMetadata: {
						openai: {
							itemId: 'rs_123',
							reasoningEncryptedContent: 'encrypted-reasoning',
						},
						anthropic: { signature: 'anthropic-signature' },
					},
				},
				{
					type: 'tool-call',
					toolCallId: 'call_123',
					toolName: 'get_weather',
					input: { city: 'Berlin' },
					state: 'resolved',
					output: { raining: true },
					providerMetadata: {
						openai: {
							itemId: 'fc_123',
							responseId: 'resp_123',
							namespace: 'weather',
						},
						google: { thoughtSignature: 'tool-signature' },
					},
					providerOptions: {
						openai: {
							itemId: 'fc_123',
							responseId: 'resp_123',
							strict: true,
						},
					},
				},
			],
		};

		const [assistantMessage] = toAiMessages([message]);

		expect(assistantMessage.providerOptions).toEqual({
			openai: { imageDetail: 'high' },
			anthropic: { cacheControl: { type: 'ephemeral' } },
		});
		expect(assistantMessage.content).toEqual([
			{
				type: 'text',
				text: 'Take an umbrella.',
				providerMetadata: {
					openai: { logprobs: [{ token: 'Take' }] },
					google: { thoughtSignature: 'google-signature' },
				},
				providerOptions: {
					openai: { imageDetail: 'low' },
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			},
			{
				type: 'reasoning',
				text: 'The forecast shows rain.',
				providerMetadata: {
					openai: { reasoningEncryptedContent: 'encrypted-reasoning' },
					anthropic: { signature: 'anthropic-signature' },
				},
				providerOptions: {
					openai: { reasoningEncryptedContent: 'encrypted-reasoning' },
					anthropic: { signature: 'anthropic-signature' },
				},
			},
			{
				type: 'tool-call',
				toolCallId: 'call_123',
				toolName: 'get_weather',
				input: { city: 'Berlin' },
				providerExecuted: undefined,
				providerMetadata: {
					openai: { namespace: 'weather' },
					google: { thoughtSignature: 'tool-signature' },
				},
				providerOptions: {
					openai: { strict: true },
				},
			},
		]);
	});

	it('strips OpenAI Responses state identifiers before storing AI SDK messages', () => {
		const messages = [
			{
				role: 'assistant',
				providerOptions: {
					openai: {
						responseId: 'resp_123',
						reasoningEffort: 'low',
					},
				},
				content: [
					{
						type: 'text',
						text: 'Done.',
						providerMetadata: {
							openai: {
								itemId: 'msg_123',
								responseId: 'resp_123',
								logprobs: [{ token: 'Done' }],
							},
						},
						providerOptions: {
							openai: {
								itemId: 'msg_123',
								customOption: 'keep',
							},
						},
					},
				],
			},
		] as unknown as ModelMessage[];

		const [storedMessage] = fromAiMessages(messages);

		if (!storedMessage || storedMessage.type === 'custom') {
			throw new Error('Expected an LLM message');
		}

		expect(storedMessage.providerOptions).toEqual({
			openai: { reasoningEffort: 'low' },
		});
		expect(storedMessage.content).toEqual([
			{
				type: 'text',
				text: 'Done.',
				providerMetadata: {
					openai: { logprobs: [{ token: 'Done' }] },
				},
				providerOptions: {
					openai: { customOption: 'keep' },
				},
			},
		]);
	});

	it.each(['', 'A concise reasoning summary.'])(
		'drops OpenAI reasoning part without encrypted replay content: %j',
		(text) => {
			const message: Message = {
				role: 'assistant',
				content: [
					{
						type: 'reasoning',
						text,
						providerMetadata: {
							openai: {
								itemId: 'rs_123',
								reasoningEncryptedContent: null,
							},
						},
						providerOptions: {
							openai: {
								reasoningEncryptedContent: null,
							},
						},
					},
				],
			};

			expect(toAiMessages([message])).toEqual([]);
		},
	);
});
