import { getEncoding } from '@n8n/ai-utilities/tokenizer';
import { setTimeout as delay } from 'node:timers/promises';
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

	it.each([
		{ model: 'openai/gpt-5', encoding: 'o200k_base' },
		{ model: 'anthropic/claude-haiku-4-5', encoding: 'cl100k_base' },
	] as const)('counts uniform spaces accurately for $encoding', async ({ model, encoding }) => {
		const text = ' '.repeat(8_000);
		const encoder = await getEncoding(encoding);
		const expected = encoder.encode(text, [], []).length;

		expect(await createModelTokenCounter(model)(text)).toBe(expected);
	});

	it.each([
		{
			name: 'ordinary prose',
			text: 'ordinary synthetic text. '.repeat(334).slice(0, 8_000),
			expectedTokens: 1_281,
		},
		{
			name: 'alternating spaces and tabs',
			text: ' \t'.repeat(4_000),
			expectedTokens: 3_999,
		},
		{
			name: 'uniform spaces',
			text: ' '.repeat(8_000),
			expectedTokens: 63,
		},
	])(
		'keeps the maximum event-loop pause below 500 ms for $name',
		async ({ text, expectedTokens }) => {
			// AGENT-1442: A final synchronous encode must not hide behind an eventual yield.
			const countTokens = createModelTokenCounter('openai/gpt-5');
			await countTokens('warm up');
			let lastHeartbeat = performance.now();
			let maxPauseMs = 0;
			let heartbeats = 0;
			const heartbeat = setInterval(() => {
				const now = performance.now();
				maxPauseMs = Math.max(maxPauseMs, now - lastHeartbeat);
				lastHeartbeat = now;
				heartbeats++;
			}, 1);

			try {
				const count = await countTokens(text);
				// Include the last encode even if the counter returns without yielding.
				await delay(0);

				expect(heartbeats).toBeGreaterThan(0);
				expect(Math.abs(count - expectedTokens) / expectedTokens).toBeLessThan(0.01);
				// Allow ample CI headroom above the counter's 10 ms yield interval.
				expect(maxPauseMs).toBeLessThan(500);
			} finally {
				clearInterval(heartbeat);
			}
		},
		35_000,
	);

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
