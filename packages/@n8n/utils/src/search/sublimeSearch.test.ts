import topLevel from './snapshots/toplevel.snapshot.json';
import { sublimeSearch } from './sublimeSearch';

describe('sublimeSearch', () => {
	describe('search finds specific matches first', () => {
		// Note that this only tests the order of the specified matches
		// Further results may appear after the listed ones
		const testCases: Array<[string, string[]]> = [
			['set', ['Edit Fields (Set)']],
			['agent', ['AI Agent', 'Magento 2']],
		];

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
