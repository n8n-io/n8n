export const findGaps = (arr: number[]): number[] =>
	arr
		.sort((a, b) => a - b)
		.reduce((result, current, index, array) => {
			if (index < array.length - 1) {
				const next = array[index + 1];

				// Generate numbers between the current and next elements (exclusive)
				const gapNumbers = Array.from({ length: next - current - 1 }, (_, i) => current + i + 1);

				result = result.concat(gapNumbers);
			}
			return result;
		}, []);
