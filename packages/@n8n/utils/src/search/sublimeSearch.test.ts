import topLevel from './snapshots/toplevel.snapshot.json';
import { sublimeSearch } from './sublimeSearch';

describe('sublimeSearch', () => {
	const testCases = [{ filter: 'agent', expectedOrder: ['Magento 2', 'AI Agent'] }];

	test.each(testCases)(
		'should return results in the correct order for filter "$filter"',
		({ filter, expectedOrder }) => {
			const results = sublimeSearch(filter, topLevel, [
				{ key: 'properties.displayName', weight: 1.3 },
				{ key: 'properties.codex.alias', weight: 1 },
			]);

			const resultNames = results.map((result) => result.item.properties.displayName);
			expectedOrder.forEach((expectedName, index) => {
				expect(resultNames[index]).toBe(expectedName);
			});
		},
	);
});
