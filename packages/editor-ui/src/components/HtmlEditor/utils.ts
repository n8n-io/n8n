import type { Range } from './types';

/**
 * Return the ranges of a full range that are _not_ within the taken ranges,
 * assuming sorted taken ranges. e.g. `[0, 10]` and `[[2, 3], [7, 8]]`
 * return `[[0, 1], [4, 6], [9, 10]]`
 */
export function nonTakenRanges(fullRange: Range, takenRanges: Range[]) {
	const found = [];

	const [fullStart, fullEnd] = fullRange;
	let i = fullStart;
	let curStart = fullStart;

	takenRanges = [...takenRanges];

	while (i < fullEnd) {
		if (takenRanges.length === 0) {
			found.push([curStart, fullEnd]);
			break;
		}

		const [takenStart, takenEnd] = takenRanges[0];

		if (i < takenStart) {
			i++;
			continue;
		}

		if (takenStart !== fullStart) {
			found.push([curStart, i - 1]);
		}

		i = takenEnd + 1;
		curStart = takenEnd + 1;
		takenRanges.shift();
	}

	return found;
}
