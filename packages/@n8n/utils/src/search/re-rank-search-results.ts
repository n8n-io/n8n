export function reRankSearchResults<T extends { key: string }>(
	searchResults: Array<{ score: number; item: T }>,
	additionalFactors: Record<string, Record<string, number>>,
): Array<{ score: number; item: T }> {
	return searchResults
		.map(({ score, item }) => {
			// For each additional factor, we check if it exists for the item and type,
			// and if so, we add the score to the item's score.
			const additionalScore = Object.entries(additionalFactors).reduce((acc, [_, factorScores]) => {
				const factorScore = factorScores[item.key];
				if (factorScore) {
					return acc + factorScore;
				}

				return acc;
			}, 0);

			return {
				score: score + additionalScore,
				item,
			};
		})
		.sort((a, b) => {
			return b.score - a.score;
		});
}
