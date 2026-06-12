import { describe, expect, it } from 'vitest';

import { normalizeDescriptionParts, renderDescriptionSentence } from './description-parts';

describe('normalizeDescriptionParts', () => {
	it('keeps parts unchanged when the text already carries the spacing', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'text', text: 'Every ' },
			{ kind: 'param', value: 'Monday', options: ['Friday'] },
			{ kind: 'text', text: ' at ' },
			{ kind: 'param', value: '9:00 AM', options: [] },
			{ kind: 'text', text: ', generate a fruit joke.' },
		]);

		expect(renderDescriptionSentence(parts)).toBe(
			'Every Monday at 9:00 AM, generate a fruit joke.',
		);
	});

	it('repairs missing spaces at text↔param boundaries', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'text', text: 'Generate a joke about' },
			{ kind: 'param', value: 'oranges', options: ['apples'] },
			{ kind: 'text', text: 'and save it to' },
			{ kind: 'param', value: '~/Desktop/orange_joke.txt', options: [] },
			{ kind: 'text', text: '.' },
		]);

		expect(renderDescriptionSentence(parts)).toBe(
			'Generate a joke about oranges and save it to ~/Desktop/orange_joke.txt.',
		);
	});

	it('keeps punctuation and closing delimiters hugging the preceding param', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'text', text: 'Post it in "' },
			{ kind: 'param', value: '#general', options: [] },
			{ kind: 'text', text: '", then stop.' },
		]);

		expect(renderDescriptionSentence(parts)).toBe('Post it in "#general", then stop.');
	});

	it('separates adjacent params with a space', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'param', value: 'Monday', options: [] },
			{ kind: 'param', value: '9:00 AM', options: [] },
		]);

		expect(parts).toEqual([
			{ kind: 'param', id: 'p1', value: 'Monday', options: [] },
			{ kind: 'text', text: ' ' },
			{ kind: 'param', id: 'p2', value: '9:00 AM', options: [] },
		]);
	});

	it('assigns sequential param ids, trims values and de-duplicates options', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'text', text: 'Send via ' },
			{ kind: 'param', value: ' email ', options: ['slack', 'slack', 'email', ' '] },
		]);

		expect(parts).toEqual([
			{ kind: 'text', text: 'Send via ' },
			{ kind: 'param', id: 'p1', value: 'email', options: ['slack'] },
		]);
	});

	it('merges adjacent text parts and drops empty ones', () => {
		const parts = normalizeDescriptionParts([
			{ kind: 'text', text: 'Generate ' },
			{ kind: 'text', text: '' },
			{ kind: 'text', text: 'a joke.' },
		]);

		expect(parts).toEqual([{ kind: 'text', text: 'Generate a joke.' }]);
	});

	it('degrades params past the cap to text, still spaced into the sentence', () => {
		const rawParts = Array.from({ length: 6 }, (_, i) => ({
			kind: 'param' as const,
			value: `v${i + 1}`,
			options: [],
		}));

		const parts = normalizeDescriptionParts(rawParts);

		expect(parts.filter((part) => part.kind === 'param')).toHaveLength(4);
		expect(renderDescriptionSentence(parts)).toBe('v1 v2 v3 v4 v5v6');
	});
});
