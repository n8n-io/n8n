import { getEncoding } from '@n8n/ai-utilities/tokenizer';
import { describe, expect, it } from 'vitest';

import { createModelTokenCounter } from '../model/model-token-counter';

describe('createModelTokenCounter', () => {
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
		expect(await createModelTokenCounter('openai/gpt-5')('a' + '😀'.repeat(3_900))).toBe(3_901);
	});

	it('counts a long run without whitespace in small chunks', async () => {
		// A single encode of this text takes about 15 s and returns 2,503 tokens.
		const count = await createModelTokenCounter('openai/gpt-5')('start ' + 'x'.repeat(20_000));

		expect(Math.abs(count - 2503) / 2503).toBeLessThan(0.01);
	});

	it('yields to the event loop while counting a large text', async () => {
		const words = ['alpha', 'beta,', 'gamma\n', '"delta"', '{epsilon:', '42}', 'ζήτα'];
		// Counting must take well over the yield interval, so the text is large.
		const text = Array.from({ length: 60_000 }, (_, index) => words[index % words.length]).join(
			' ',
		);
		const encoder = await getEncoding('o200k_base');
		const expected = encoder.encode(text, [], []).length;
		const countTokens = createModelTokenCounter('openai/gpt-5');
		// Load the tokenizer first so its dynamic import cannot count as a yield.
		await countTokens('warm up');
		let yielded = false;
		setImmediate(() => {
			yielded = true;
		});

		const count = await countTokens(text);

		expect(yielded).toBe(true);
		expect(Math.abs(count - expected) / expected).toBeLessThan(0.01);
	});
});
