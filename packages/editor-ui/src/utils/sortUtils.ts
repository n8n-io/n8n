/*
	Constants and utility functions used for searching for node types in node creator component
*/

// based on https://github.com/forrestthewoods/lib_fts/blob/master/code/fts_fuzzy_match.js

const SEQUENTIAL_BONUS = 30; // bonus for adjacent matches
const SEPARATOR_BONUS = 30; // bonus if match occurs after a separator
const CAMEL_BONUS = 30; // bonus if match is uppercase and prev is lower
const FIRST_LETTER_BONUS = 15; // bonus if the first letter is matched

const LEADING_LETTER_PENALTY = -15; // penalty applied for every letter in str before the first match
const MAX_LEADING_LETTER_PENALTY = -200; // maximum penalty for leading letters
const UNMATCHED_LETTER_PENALTY = -5;

/**
 * Returns true if each character in pattern is found sequentially within target
 * @param {*} pattern string
 * @param {*} target string
 */
function fuzzyMatchSimple(pattern: string, target: string): boolean {
	let patternIdx = 0;
	let strIdx = 0;

	while (patternIdx < pattern.length && strIdx < target.length) {
		const patternChar = pattern.charAt(patternIdx).toLowerCase();
		const targetChar = target.charAt(strIdx).toLowerCase();
		if (patternChar === targetChar) {
			patternIdx++;
		}
		++strIdx;
	}

	return pattern.length !== 0 && target.length !== 0 && patternIdx === pattern.length;
}

/**
 * Does a fuzzy search to find pattern inside a string.
 * @param {*} pattern string        pattern to search for
 * @param {*} target     string        string which is being searched
 * @returns [boolean, number]       a boolean which tells if pattern was
 *                                  found or not and a search score
 */
function fuzzyMatch(pattern: string, target: string): { matched: boolean; outScore: number } {
	const recursionCount = 0;
	const recursionLimit = 5;
	const matches: number[] = [];
	const maxMatches = 256;

	return fuzzyMatchRecursive(
		pattern,
		target,
		0 /* patternCurIndex */,
		0 /* strCurrIndex */,
		null /* srcMatces */,
		matches,
		maxMatches,
		0 /* nextMatch */,
		recursionCount,
		recursionLimit,
	);
}

function fuzzyMatchRecursive(
	pattern: string,
	target: string,
	patternCurIndex: number,
	targetCurrIndex: number,
	targetMatches: null | number[],
	matches: number[],
	maxMatches: number,
	nextMatch: number,
	recursionCount: number,
	recursionLimit: number,
): { matched: boolean; outScore: number } {
	let outScore = 0;

	// Return if recursion limit is reached.
	if (++recursionCount >= recursionLimit) {
		return { matched: false, outScore };
	}

	// Return if we reached ends of strings.
	if (patternCurIndex === pattern.length || targetCurrIndex === target.length) {
		return { matched: false, outScore };
	}

	// Recursion params
	let recursiveMatch = false;
	let bestRecursiveMatches: number[] = [];
	let bestRecursiveScore = 0;

	// Loop through pattern and str looking for a match.
	let firstMatch = true;
	while (patternCurIndex < pattern.length && targetCurrIndex < target.length) {
		// Match found.
		if (pattern[patternCurIndex].toLowerCase() === target[targetCurrIndex].toLowerCase()) {
			if (nextMatch >= maxMatches) {
				return { matched: false, outScore };
			}

			if (firstMatch && targetMatches) {
				matches = [...targetMatches];
				firstMatch = false;
			}

			const recursiveMatches: number[] = [];
			const recursiveResult = fuzzyMatchRecursive(
				pattern,
				target,
				patternCurIndex,
				targetCurrIndex + 1,
				matches,
				recursiveMatches,
				maxMatches,
				nextMatch,
				recursionCount,
				recursionLimit,
			);

			const recursiveScore = recursiveResult.outScore;
			if (recursiveResult.matched) {
				// Pick best recursive score.
				if (!recursiveMatch || recursiveScore > bestRecursiveScore) {
					bestRecursiveMatches = [...recursiveMatches];
					bestRecursiveScore = recursiveScore;
				}
				recursiveMatch = true;
			}

			matches[nextMatch++] = targetCurrIndex;
			++patternCurIndex;
		}
		++targetCurrIndex;
	}

	const matched = patternCurIndex === pattern.length;

	if (matched) {
		outScore = 100;

		// Apply leading letter penalty
		let penalty = LEADING_LETTER_PENALTY * matches[0];
		penalty = penalty < MAX_LEADING_LETTER_PENALTY ? MAX_LEADING_LETTER_PENALTY : penalty;
		outScore += penalty;

		//Apply unmatched penalty
		const unmatched = target.length - nextMatch;
		outScore += UNMATCHED_LETTER_PENALTY * unmatched;

		// Apply ordering bonuses
		for (let i = 0; i < nextMatch; i++) {
			const currIdx = matches[i];

			if (i > 0) {
				const prevIdx = matches[i - 1];
				if (currIdx === prevIdx + 1) {
					outScore += SEQUENTIAL_BONUS;
				}
			}

			// Check for bonuses based on neighbor character value.
			if (currIdx > 0) {
				// Camel case
				const neighbor = target[currIdx - 1];
				const curr = target[currIdx];
				if (neighbor !== neighbor.toUpperCase() && curr !== curr.toLowerCase()) {
					outScore += CAMEL_BONUS;
				}
				const isNeighbourSeparator = neighbor === '_' || neighbor === ' ';
				if (isNeighbourSeparator) {
					outScore += SEPARATOR_BONUS;
				}
			} else {
				// First letter
				outScore += FIRST_LETTER_BONUS;
			}
		}

		// Return best result
		if (recursiveMatch && (!matched || bestRecursiveScore > outScore)) {
			// Recursive score is better than "this"
			matches = [...bestRecursiveMatches];
			outScore = bestRecursiveScore;
			return { matched: true, outScore };
		} else if (matched) {
			// "this" score is better than recursive
			return { matched: true, outScore };
		} else {
			return { matched: false, outScore };
		}
	}
	return { matched: false, outScore };
}

// prop = 'key'
// prop = 'key1.key2'
// prop = ['key1', 'key2']
function getValue<T extends object>(obj: T, prop: string): unknown {
	if (obj.hasOwnProperty(prop)) {
		return obj[prop as keyof T];
	}

	const segments = prop.split('.');
	let result: any = obj; // tslint:disable-line:no-any
	let i = 0;
	while (result && i < segments.length) {
		result = result[segments[i]];
		i++;
	}
	return result;
}

export function sublimeSearch<T extends object>(
	filter: string,
	data: Readonly<T[]>,
	keys: Array<{ key: string; weight: number }>,
): Array<{ score: number; item: T }> {
	const results = data.reduce((accu: Array<{ score: number; item: T }>, item: T) => {
		let values: Array<{ value: string; weight: number }> = [];
		keys.forEach(({ key, weight }) => {
			const value = getValue(item, key);
			if (Array.isArray(value)) {
				values = values.concat(value.map((v) => ({ value: v, weight })));
			} else if (typeof value === 'string') {
				values.push({
					value,
					weight,
				});
			}
		});

		// for each item, check every key and get maximum score
		const itemMatch = values.reduce(
			(
				accu: null | { matched: boolean; outScore: number },
				{ value, weight }: { value: string; weight: number },
			) => {
				if (!fuzzyMatchSimple(filter, value)) {
					return accu;
				}

				const match = fuzzyMatch(filter, value);
				match.outScore *= weight;

				const { matched, outScore } = match;
				if (!accu && matched) {
					return match;
				}
				if (matched && accu && outScore > accu.outScore) {
					return match;
				}
				return accu;
			},
			null,
		);

		if (itemMatch) {
			accu.push({
				score: itemMatch.outScore,
				item,
			});
		}

		return accu;
	}, []);

	results.sort((a, b) => {
		return b.score - a.score;
	});

	return results;
}
