import type { ContentReasoning } from '../../../types/sdk/message';
import {
	getReasoningReplayProviderOptions,
	hasReplayableReasoningProviderOptions,
	sanitizeProviderMetadataForReplay,
	sanitizeProviderOptionsForReplay,
} from '../provider-metadata-policy';

describe('provider metadata replay policy', () => {
	it('strips transient OpenAI Responses state but preserves reusable metadata', () => {
		expect(
			sanitizeProviderMetadataForReplay({
				openai: {
					itemId: 'msg_stateful',
					responseId: 'resp_stateful',
					phase: 'reasoning',
					reasoningEncryptedContent: 'encrypted',
					logprobs: [{ token: 'hello' }],
				},
				google: { thoughtSignature: 'google-signature' },
			}),
		).toEqual({
			openai: {
				reasoningEncryptedContent: 'encrypted',
				logprobs: [{ token: 'hello' }],
			},
			google: { thoughtSignature: 'google-signature' },
		});
	});

	it('drops empty OpenAI replay options after transient state is removed', () => {
		expect(
			sanitizeProviderOptionsForReplay({
				openai: {
					itemId: 'msg_stateful',
					responseId: 'resp_stateful',
					reasoningEncryptedContent: null,
				},
			}),
		).toBeUndefined();
	});

	it('copies provider metadata needed for reasoning replay into provider options', () => {
		const reasoning: ContentReasoning = {
			type: 'reasoning',
			text: 'thinking',
			providerMetadata: {
				openai: { reasoningEncryptedContent: 'encrypted' },
				anthropic: { signature: 'signature', redactedData: 'redacted' },
			},
		};

		const providerOptions = getReasoningReplayProviderOptions(reasoning);

		expect(providerOptions).toEqual({
			openai: { reasoningEncryptedContent: 'encrypted' },
			anthropic: { signature: 'signature', redactedData: 'redacted' },
		});
		expect(hasReplayableReasoningProviderOptions(providerOptions)).toBe(true);
	});

	it('treats provider-specific reasoning options as replayable only when useful data remains', () => {
		expect(
			hasReplayableReasoningProviderOptions({
				openai: { reasoningEncryptedContent: null },
				anthropic: {},
			}),
		).toBe(false);
		expect(hasReplayableReasoningProviderOptions({ otherProvider: { replayToken: 'token' } })).toBe(
			true,
		);
	});
});
