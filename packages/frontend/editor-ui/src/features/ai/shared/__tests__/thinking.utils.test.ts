import { latestSentence } from '../thinking.utils';

describe('latestSentence', () => {
	it('is the newest complete sentence', () => {
		expect(latestSentence('The user wants invoices. Gmail can filter by label. Then I need')).toBe(
			'Gmail can filter by label.',
		);
	});

	it('takes a line that ends without punctuation as complete', () => {
		expect(latestSentence('## Choosing the trigger\nThe schedule')).toBe('Choosing the trigger');
	});

	it('drops markdown', () => {
		expect(latestSentence('Use the **Schedule Trigger** with `cron`. ')).toBe(
			'Use the Schedule Trigger with cron.',
		);
	});

	it('does not end a sentence inside a dotted name', () => {
		expect(latestSentence('I will use n8n-nodes-base.gmail for this. More')).toBe(
			'I will use n8n-nodes-base.gmail for this.',
		);
	});

	it('skips very short sentences', () => {
		expect(latestSentence('Gmail can filter by label. Okay. Hmm. Next')).toBe(
			'Gmail can filter by label.',
		);
	});

	it('shortens a long sentence', () => {
		const sentence = `${'word '.repeat(60).trim()}.`;

		const preview = latestSentence(`${sentence} Next`);

		expect(preview?.length).toBeLessThanOrEqual(140);
		expect(preview?.endsWith('…')).toBe(true);
	});

	it('is undefined while the first sentence is still streaming', () => {
		expect(latestSentence('The user wants')).toBeUndefined();
		expect(latestSentence('')).toBeUndefined();
	});
});
