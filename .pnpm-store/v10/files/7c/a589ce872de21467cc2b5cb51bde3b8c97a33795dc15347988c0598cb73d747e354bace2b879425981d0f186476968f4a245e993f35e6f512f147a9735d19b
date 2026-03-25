export default function cartesianProductSamples(combinations, length = Number.POSITIVE_INFINITY) {
	const total = combinations.reduce((total, {length}) => total * length, 1);

	const samples = Array.from({length: Math.min(total, length)}, (_, sampleIndex) => {
		let indexRemaining = sampleIndex;
		const combination = [];
		for (let combinationIndex = combinations.length - 1; combinationIndex >= 0; combinationIndex--) {
			const items = combinations[combinationIndex];
			const {length} = items;
			const index = indexRemaining % length;
			indexRemaining = (indexRemaining - index) / length;
			combination.unshift(items[index]);
		}

		return combination;
	});

	return {
		total,
		samples,
	};
}
