import type { FetchedPage } from '@n8n/instance-ai';

const SUMMARIZE_THRESHOLD = 15_000;

type GenerateFn = (prompt: string) => Promise<string>;

/**
 * If content exceeds the summarization threshold, call the provided `generateFn`
 * to compress it while preserving technical details.
 * Falls back to truncation if no generateFn is provided.
 */
export async function maybeSummarize(
	page: FetchedPage,
	generateFn?: GenerateFn,
): Promise<FetchedPage> {
	if (page.content.length <= SUMMARIZE_THRESHOLD) {
		return page;
	}

	if (!generateFn) {
		// No summarization model available — truncate
		return {
			...page,
			content: page.content.slice(0, SUMMARIZE_THRESHOLD),
			truncated: true,
		};
	}

	const prompt = `Summarize the following web page content. Preserve:
- API endpoints, URLs, and authentication details
- Code examples and configuration snippets
- Technical specifications and requirements
- Step-by-step instructions

Remove navigation, ads, footers, and repetitive content. Output markdown.

---
${page.content}`;

	const summary = await generateFn(prompt);

	return {
		...page,
		content: summary,
		contentLength: summary.length,
		truncated: false,
	};
}
