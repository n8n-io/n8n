import { currentSentence } from '../thinking.utils';

describe('currentSentence', () => {
	it('is the sentence the reasoning is writing', () => {
		expect(
			currentSentence(
				'The user wants invoices. Gmail can filter by label. Then I need the trigger',
			),
		).toBe('Then I need the trigger');
	});

	it('keeps the newest complete sentence while the next one is too short to read', () => {
		expect(currentSentence('The user wants invoices. Gmail can filter by label. Then')).toBe(
			'Gmail can filter by label.',
		);
	});

	it('takes a line that ends without punctuation as complete', () => {
		expect(currentSentence('## Choosing the trigger\nThe')).toBe('Choosing the trigger');
	});

	it('drops markdown', () => {
		expect(currentSentence('Use the **Schedule Trigger** with `cron`. ')).toBe(
			'Use the Schedule Trigger with cron.',
		);
	});

	it('does not end a sentence inside a dotted name', () => {
		expect(currentSentence('I will use n8n-nodes-base.gmail for this. More')).toBe(
			'I will use n8n-nodes-base.gmail for this.',
		);
	});

	it('skips very short sentences', () => {
		expect(currentSentence('Gmail can filter by label. Okay. Hmm. Next')).toBe(
			'Gmail can filter by label.',
		);
	});

	it('keeps the newest words of a long sentence', () => {
		const preview = currentSentence(`${'word '.repeat(60)}last`);

		expect(preview?.length).toBeLessThanOrEqual(140);
		expect(preview?.startsWith('…')).toBe(true);
		expect(preview?.endsWith('word last')).toBe(true);
	});

	it('is undefined until the reasoning says enough to read', () => {
		expect(currentSentence('The user')).toBeUndefined();
		expect(currentSentence('')).toBeUndefined();
	});
});
