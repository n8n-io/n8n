import { getEncoding } from '@n8n/ai-utilities/tokenizer';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { createModelTokenCounter } from '../model/model-token-counter';

describe('createModelTokenCounter', () => {
	beforeAll(async () => {
		// Load the encoding tables once, outside the individual count assertions.
		await Promise.all([getEncoding('o200k_base'), getEncoding('cl100k_base')]);
	});

	it('selects the encoding for the model family', async () => {
		const text =
			'こんにちは世界。ユーザーは毎週金曜日にレポートを送信します。مرحبا بالعالم — يجب إرسال التقرير يوم الجمعة. 🚀🔐🧪';

		expect(await createModelTokenCounter('openai/gpt-5')(text)).toBe(37);
		expect(await createModelTokenCounter('anthropic/claude-haiku-4-5')(text)).toBe(68);
	});

	it('counts tokenizer special markers as ordinary text', async () => {
		expect(await createModelTokenCounter('openai/gpt-5')('<|endoftext|>')).toBe(7);
	});

	it('keeps surrogate pairs whole when splitting text without whitespace', async () => {
		// The 200-character chunk boundary splits the last emoji's surrogate pair.
		expect(await createModelTokenCounter('openai/gpt-5')('a' + '😀'.repeat(100))).toBe(101);
	});

	it('counts a long run without whitespace in small chunks', async () => {
		// A single encode of this text takes about 15 s and returns 2,503 tokens.
		const count = await createModelTokenCounter('openai/gpt-5')('start ' + 'x'.repeat(20_000));

		expect(Math.abs(count - 2503) / 2503).toBeLessThan(0.01);
	});

	it.each([
		{ model: 'openai/gpt-5', encoding: 'o200k_base' },
		{ model: 'anthropic/claude-haiku-4-5', encoding: 'cl100k_base' },
	] as const)(
		'counts uniform spaces accurately for $encoding',
		async ({ model, encoding }) => {
			const text = ' '.repeat(8_000);
			const encoder = await getEncoding(encoding);
			const expected = encoder.encode(text, [], []).length;

			expect(await createModelTokenCounter(model)(text)).toBe(expected);
		},
		15_000,
	);

	it.each([
		{
			name: 'ordinary prose',
			text: 'ordinary synthetic text. '.repeat(334).slice(0, 8_000),
			expectedTokens: 1_281,
			maxChunkChars: 8_000,
		},
		{
			name: 'alternating spaces and tabs',
			text: ' \t'.repeat(4_000),
			expectedTokens: 3_999,
			maxChunkChars: 200,
		},
		{
			name: 'uniform spaces',
			text: ' '.repeat(8_000),
			expectedTokens: 63,
			maxChunkChars: 200,
		},
	])('bounds every encode for $name', async ({ text, expectedTokens, maxChunkChars }) => {
		const encoder = await getEncoding('o200k_base');
		const encode = vi.spyOn(encoder, 'encode');
		const countTokens = createModelTokenCounter('openai/gpt-5');

		const count = await countTokens(text);
		const chunks = encode.mock.calls.map(([chunk]) => chunk);

		// Check the final encode too. An eventual yield must not hide an unbounded chunk.
		expect(chunks.join('')).toBe(text);
		for (const chunk of chunks) {
			expect(chunk.length).toBeLessThanOrEqual(maxChunkChars);
		}
		expect(Math.abs(count - expectedTokens) / expectedTokens).toBeLessThan(0.01);
	});

	it('yields to the event loop when the encoding work reaches the yield interval', async () => {
		const text = 'alpha beta '.repeat(1_600);
		const encoder = await getEncoding('o200k_base');
		const expected = encoder.encode(text, [], []).length;
		const countTokens = createModelTokenCounter('openai/gpt-5');
		// Load the tokenizer first so its dynamic import cannot count as a yield.
		await countTokens('warm up');
		// Advance the work clock without a large input or a wall-clock timing assumption.
		let now = 0;
		vi.spyOn(performance, 'now').mockImplementation(() => (now += 10));
		let yielded = false;
		const immediate = setImmediate(() => {
			yielded = true;
		});

		try {
			const count = await countTokens(text);

			expect(yielded).toBe(true);
			expect(Math.abs(count - expected) / expected).toBeLessThan(0.01);
		} finally {
			clearImmediate(immediate);
		}
	});
});
