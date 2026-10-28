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

	it('yields to the event loop while counting a large text', async () => {
		const words = ['alpha', 'beta,', 'gamma\n', '"delta"', '{epsilon:', '42}', 'ζήτα'];
		const text = Array.from({ length: 20_000 }, (_, index) => words[index % words.length]).join(
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
