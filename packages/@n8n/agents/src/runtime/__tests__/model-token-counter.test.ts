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
});
