import { reRankSearchResults } from './reRankSearchResults';
import topLevel from './snapshots/toplevel.snapshot.json';
import { sublimeSearch } from './sublimeSearch';

describe('reRankSearchResults', () => {
	describe('should re-rank search results based on additional factors', () => {
		it('should return Coda before Code without additional factors for query "cod"', () => {
			const searchResults = sublimeSearch('cod', topLevel);
			const resultNames = searchResults.map((result) => result.item.properties.displayName);

			// Without re-ranking, Coda should appear before Code
			expect(resultNames[0]).toBe('Coda');
			expect(resultNames[1]).toBe('Code');
		});

		it('should return Code before Coda with additional factors favoring Code for query "cod"', () => {
			const searchResults = sublimeSearch('cod', topLevel);

			// Add popularity scores that heavily favor Code node
			const additionalFactors = {
				popularity: {
					/* eslint-disable @typescript-eslint/naming-convention */
					'n8n-nodes-base.code': 90, // High popularity for Code node
					'n8n-nodes-base.coda': 10, // Lower popularity for Coda node
					/* eslint-enable @typescript-eslint/naming-convention */
				},
			};

			const reRankedResults = reRankSearchResults(searchResults, additionalFactors);
			const resultNames = reRankedResults.map((result) => result.item.properties.displayName);

			// After re-ranking with additional factors, Code should appear before Coda
			expect(resultNames[0]).toBe('Code');
			expect(resultNames[1]).toBe('Coda');
		});

		it('should handle multiple additional factors', () => {
			const searchResults = sublimeSearch('cod', topLevel);

			// Add multiple factors: popularity and recent usage
			const additionalFactors = {
				popularity: {
					/* eslint-disable @typescript-eslint/naming-convention */
					'n8n-nodes-base.code': 50,
					'n8n-nodes-base.coda': 40,
					/* eslint-enable @typescript-eslint/naming-convention */
				},
				recentUsage: {
					/* eslint-disable @typescript-eslint/naming-convention */
					'n8n-nodes-base.code': 80, // Code was used more recently
					'n8n-nodes-base.coda': 20,
					/* eslint-enable @typescript-eslint/naming-convention */
				},
			};

			const reRankedResults = reRankSearchResults(searchResults, additionalFactors);
			const resultNames = reRankedResults.map((result) => result.item.properties.displayName);

			// Code should rank higher due to combined score (50 + 80 = 130 vs Coda's 40 + 20 = 60)
			expect(resultNames[0]).toBe('Code');
			expect(resultNames[1]).toBe('Coda');
		});

		it('should preserve original order when additional factors are equal', () => {
			const searchResults = sublimeSearch('cod', topLevel);

			// Add equal factors for both nodes
			const additionalFactors = {
				popularity: {
					/* eslint-disable @typescript-eslint/naming-convention */
					'n8n-nodes-base.code': 50,
					'n8n-nodes-base.coda': 50,
					/* eslint-enable @typescript-eslint/naming-convention */
				},
			};

			const reRankedResults = reRankSearchResults(searchResults, additionalFactors);
			const resultNames = reRankedResults.map((result) => result.item.properties.displayName);

			// When additional factors are equal, original order should be preserved
			// Since Coda has a higher base score from sublimeSearch, it should remain first
			expect(resultNames[0]).toBe('Coda');
			expect(resultNames[1]).toBe('Code');
		});

		it('should handle empty additional factors object', () => {
			const searchResults = sublimeSearch('cod', topLevel);
			const reRankedResults = reRankSearchResults(searchResults, {});

			// Results should be identical to original search results
			expect(reRankedResults).toEqual(searchResults);
		});

		it('should handle nodes not present in additional factors', () => {
			const searchResults = sublimeSearch('git', topLevel);

			// Only provide factor for some items
			const additionalFactors = {
				popularity: {
					// eslint-disable-next-line @typescript-eslint/naming-convention
					'n8n-nodes-base.github': 100,
					// Other git-related nodes are not included
				},
			};

			const reRankedResults = reRankSearchResults(searchResults, additionalFactors);

			// GitHub should rank higher due to additional factor
			const githubIndex = reRankedResults.findIndex(
				(r) => r.item.properties.displayName === 'GitHub',
			);
			const gitIndex = reRankedResults.findIndex((r) => r.item.properties.displayName === 'Git');

			if (githubIndex !== -1 && gitIndex !== -1) {
				expect(githubIndex).toBeLessThan(gitIndex);
			}
		});
	});
});
