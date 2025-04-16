import topLevel from './snapshots/toplevel.snapshot.json';
import { sublimeSearch } from './sublimeSearch';

describe('sublimeSearch', () => {
	describe('search finds at least one match', () => {
		const testCases: Array<[string, string[]]> = [['agent', ['Magento 2', 'AI Agent']]];

		test.each(testCases)(
			'should return at least "$expectedOrder" for filter "$filter"',
			(filter, expectedOrder) => {
				// These match the weights in the production use case
				const results = sublimeSearch(filter, topLevel);

				const resultNames = results.map((result) => result.item.properties.displayName);
				expectedOrder.forEach((expectedName, index) => {
					expect(resultNames[index]).toBe(expectedName);
				});
			},
		);
	});
});
