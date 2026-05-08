import type { FetchedPage } from '@n8n/instance-ai';

import { maybeSummarize } from '../summarize-content';

function createPage(contentLength: number): FetchedPage {
	return {
		url: 'https://example.com',
		finalUrl: 'https://example.com',
		title: 'Test Page',
		content: 'a'.repeat(contentLength),
		truncated: false,
		contentLength,
	};
}

describe('maybeSummarize', () => {
	it('passes through content below threshold', async () => {
		const page = createPage(5000);
		const result = await maybeSummarize(page);

		expect(result).toBe(page); // Same reference — no transformation
	});

	it('truncates content above threshold when no generateFn provided', async () => {
		const page = createPage(20_000);
		const result = await maybeSummarize(page);

		expect(result.content.length).toBe(15_000);
		expect(result.truncated).toBe(true);
	});

	it('calls generateFn for content above threshold', async () => {
		const page = createPage(20_000);
		const generateFn = jest.fn().mockResolvedValue('Summarized content');

		const result = await maybeSummarize(page, generateFn);

		expect(generateFn).toHaveBeenCalledTimes(1);
		expect(generateFn).toHaveBeenCalledWith(expect.stringContaining('Summarize'));
		expect(result.content).toBe('Summarized content');
		expect(result.truncated).toBe(false);
	});

	it('does not call generateFn when content is below threshold', async () => {
		const page = createPage(5000);
		const generateFn = jest.fn();

		await maybeSummarize(page, generateFn);

		expect(generateFn).not.toHaveBeenCalled();
	});
});
