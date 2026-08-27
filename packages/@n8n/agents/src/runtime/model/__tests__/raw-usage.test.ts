import { AnthropicRawUsageReader, createRawUsageReader } from '../raw-usage';

describe('AnthropicRawUsageReader', () => {
	it('derives usage from a message_start event', () => {
		const reader = new AnthropicRawUsageReader();
		reader.capture({
			type: 'message_start',
			message: {
				usage: {
					input_tokens: 5,
					cache_creation_input_tokens: 100,
					cache_read_input_tokens: 10,
					output_tokens: 7,
				},
			},
		});

		// input(5) + cache_creation(100) + cache_read(10) = 115 prompt tokens.
		expect(reader.getUsage()).toEqual({
			promptTokens: 115,
			completionTokens: 7,
			totalTokens: 122,
			inputTokenDetails: { noCache: 5, cacheRead: 10, cacheWrite: 100 },
		});
	});

	it('merges the cumulative output from a later message_delta', () => {
		const reader = new AnthropicRawUsageReader();
		reader.capture({
			type: 'message_start',
			message: { usage: { input_tokens: 20, output_tokens: 1 } },
		});
		reader.capture({ type: 'message_delta', usage: { output_tokens: 9 } });

		expect(reader.getUsage()).toMatchObject({
			promptTokens: 20,
			completionTokens: 9,
			totalTokens: 29,
			inputTokenDetails: { noCache: 20 },
		});
	});

	it('returns undefined before any usable event', () => {
		expect(new AnthropicRawUsageReader().getUsage()).toBeUndefined();
	});

	it('ignores unknown event shapes', () => {
		const reader = new AnthropicRawUsageReader();
		reader.capture({ type: 'content_block_delta', delta: { text: 'hi' } });
		reader.capture('not an object');
		expect(reader.getUsage()).toBeUndefined();
	});

	it('returns undefined when the captured usage totals zero', () => {
		const reader = new AnthropicRawUsageReader();
		reader.capture({
			type: 'message_start',
			message: { usage: { input_tokens: 0, output_tokens: 0 } },
		});
		expect(reader.getUsage()).toBeUndefined();
	});
});

describe('createRawUsageReader', () => {
	it('returns an Anthropic reader for an anthropic model id', () => {
		expect(createRawUsageReader('anthropic/claude-sonnet-4-6')).toBeInstanceOf(
			AnthropicRawUsageReader,
		);
	});

	it('returns undefined for a provider without a raw-usage reader', () => {
		expect(createRawUsageReader('openai/gpt-4o-mini')).toBeUndefined();
	});

	it('returns undefined for a malformed model id', () => {
		expect(createRawUsageReader('no-provider')).toBeUndefined();
	});
});
