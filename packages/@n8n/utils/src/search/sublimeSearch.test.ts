import { reRankSearchResults } from './reRankSearchResults';
import topLevel from './snapshots/toplevel.snapshot.json';
import { sublimeSearch } from './sublimeSearch';

// Mirrors packages/frontend/editor-ui/data/node-popularity.json scaled by the factor
// applied in useViewStacks.ts. Only the nodes asserted below are included.
const popularity: Record<string, number> = {
	/* eslint-disable @typescript-eslint/naming-convention */
	'n8n-nodes-base.set': 0.959 * 100,
	'n8n-nodes-base.editImage': 0.617 * 100,
	'@n8n/n8n-nodes-langchain.agent': 0.975 * 100,
	/* eslint-enable @typescript-eslint/naming-convention */
};

describe('sublimeSearch', () => {
	describe('search finds specific matches first', () => {
		// Mirrors the production pipeline in useViewStacks.ts:
		//   sublimeSearch(query, items) → reRankSearchResults(results, { popularity })
		// Note that this only tests the order of the specified matches.
		// Further results may appear after the listed ones.
		const testCases: Array<[string, string[]]> = [
			['set', ['Edit Fields (Set)']],
			['edit', ['Edit Fields (Set)']],
			['agent', ['AI Agent', 'Magento 2']],
		];

		test.each(testCases)(
			'should return at least "$expectedOrder" for filter "$filter"',
			(filter, expectedOrder) => {
				const results = sublimeSearch(filter, topLevel);
				const reRanked = reRankSearchResults(results, { popularity });

				const resultNames = reRanked.map((result) => result.item.properties.displayName);
				expectedOrder.forEach((expectedName, index) => {
					expect(resultNames[index]).toBe(expectedName);
				});
			},
		);
	});
});
