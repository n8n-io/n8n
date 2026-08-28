import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { WebSearchMockArgs, WebSearchMockResult } from '../web-search-mock';
import { createWebSearchMock } from '../web-search-mock';

const generate = vi.fn();
const extractText = vi.fn();

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => ({ generate })),
	extractText: (result: unknown) => extractText(result) as string,
}));

const logger = mock<Logger>();

const resultsJson = JSON.stringify({
	results: [
		{
			title: 'Export limits — Acme docs',
			url: 'https://docs.acme.example/limits',
			snippet: 'The export limit is 10k rows.',
		},
		{
			title: 'Acme changelog',
			url: 'https://acme.example/changelog',
			snippet: 'Limits unchanged in v2.',
		},
	],
});

function buildMock(
	onSearch: (args: WebSearchMockArgs, result: WebSearchMockResult) => void = vi.fn(),
) {
	return createWebSearchMock({
		agentInstructions: 'Answer product questions, searching the web when needed.',
		scenarioHints: 'Search results must state the export limit is 10k rows.',
		searchHint: 'Docs pages about Acme export limits',
		onSearch,
		logger,
	});
}

describe('createWebSearchMock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		generate.mockResolvedValue({ messages: [] });
	});

	it('returns generated results in the WebSearchResponse shape and records the call', async () => {
		extractText.mockReturnValue(resultsJson);
		const calls: Array<{ args: WebSearchMockArgs; result: WebSearchMockResult }> = [];
		const search = buildMock((args, result) => calls.push({ args, result }));

		const result = await search({ query: 'acme export limit' });

		expect(result.query).toBe('acme export limit');
		expect(result.results).toHaveLength(2);
		expect(result.results[0].snippet).toContain('10k rows');
		expect(calls).toHaveLength(1);
		expect(calls[0].args.query).toBe('acme export limit');
	});

	it('caps results at maxResults and caches identical queries', async () => {
		extractText.mockReturnValue(resultsJson);
		const search = buildMock();

		const first = await search({ query: 'acme export limit', maxResults: 1 });
		expect(first.results).toHaveLength(1);

		await search({ query: 'acme export limit', maxResults: 1 });
		expect(generate).toHaveBeenCalledTimes(1);
	});

	it('enforces domain filters but never empties a non-empty result set', async () => {
		extractText.mockReturnValue(
			JSON.stringify({
				results: [
					{ title: 'On-domain', url: 'https://docs.acme.example/a', snippet: 'keep' },
					{ title: 'Off-domain', url: 'https://other.example/b', snippet: 'drop' },
				],
			}),
		);
		const search = buildMock();

		const filtered = await search({ query: 'q1', includeDomains: ['docs.acme.example'] });
		expect(filtered.results.map((hit) => hit.title)).toEqual(['On-domain']);

		// The agent restricted to a domain the mock never generated — serve the
		// unfiltered results rather than starving the scenario.
		const fallback = await search({ query: 'q2', includeDomains: ['unrelated.example'] });
		expect(fallback.results).toHaveLength(2);
	});

	it('degrades to an empty result set with a framework-issue note when generation fails', async () => {
		extractText.mockReturnValue('not json');
		const search = buildMock();

		const result = await search({ query: 'anything' });

		expect(result.results).toEqual([]);
		expect(result.note).toContain('framework issue');
	});
});
