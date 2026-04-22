/**
 * Patch code utilities with layered fuzzy matching.
 *
 * Applies str_replace patches with progressive fallback:
 * 1. Exact match
 * 2. Whitespace-normalized match (collapse runs of whitespace)
 * 3. Trimmed-lines match (ignore leading/trailing whitespace per line)
 *
 * When all matching fails, returns actionable error with nearby code context
 * so the LLM can fix its old_str.
 */

interface Patch {
	old_str: string;
	new_str: string;
}

interface PatchResult {
	success: true;
	code: string;
}

interface PatchError {
	success: false;
	error: string;
}

/**
 * Normalize whitespace: collapse consecutive whitespace into single space, trim.
 */
function normalizeWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize each line: trim leading/trailing whitespace per line, join with \n.
 */
function normalizeTrimmedLines(s: string): string {
	return s
		.split('\n')
		.map((line) => line.trim())
		.join('\n');
}

/**
 * Find the position of `needle` in `haystack` using the normalized matcher.
 * Returns { start, end } character indices in the original haystack, or null.
 *
 * Strategy: build a normalized version of the haystack, find the needle in it,
 * then map back to original character positions using a position map.
 */
function fuzzyFind(
	haystack: string,
	needle: string,
	normalizer: (s: string) => string,
): { start: number; end: number } | null {
	const normalizedNeedle = normalizer(needle);
	if (!normalizedNeedle) return null;

	// Build position map: normalizedIndex → original index
	// We scan the haystack character by character, applying the same normalization
	// logic, and track where each normalized character came from.
	const normalizedHaystack = normalizer(haystack);
	const idx = normalizedHaystack.indexOf(normalizedNeedle);
	if (idx === -1) return null;

	// We found a match in the normalized space. Now we need to map back to
	// original positions. We do this by finding which original substring,
	// when normalized, produces the match.

	// Sliding window: try substrings of the original haystack.
	// Start by finding approximate region using character ratio.
	const ratio = haystack.length / Math.max(normalizedHaystack.length, 1);
	const approxStart = Math.max(0, Math.floor(idx * ratio) - 50);
	const approxEnd = Math.min(
		haystack.length,
		Math.ceil((idx + normalizedNeedle.length) * ratio) + 50,
	);

	// Search within the approximate region for exact boundaries
	for (let start = approxStart; start <= approxEnd; start++) {
		for (
			let end = start + needle.length - 20;
			end <= Math.min(haystack.length, start + needle.length + 50);
			end++
		) {
			const candidate = haystack.slice(start, end);
			if (normalizer(candidate) === normalizedNeedle) {
				return { start, end };
			}
		}
	}

	// Fallback: wider search
	for (let start = 0; start < haystack.length; start++) {
		for (let end = start + 1; end <= Math.min(haystack.length, start + needle.length * 2); end++) {
			const candidate = haystack.slice(start, end);
			if (normalizer(candidate) === normalizedNeedle) {
				return { start, end };
			}
		}
	}

	return null;
}

/**
 * Find the best match for `needle` in `code` using layered matching.
 * Returns the matched region { start, end } or null.
 */
function findMatch(
	code: string,
	needle: string,
): { start: number; end: number; strategy: string } | null {
	// Layer 1: Exact match
	const exactIdx = code.indexOf(needle);
	if (exactIdx !== -1) {
		return { start: exactIdx, end: exactIdx + needle.length, strategy: 'exact' };
	}

	// Layer 2: Whitespace-normalized match
	const wsMatch = fuzzyFind(code, needle, normalizeWhitespace);
	if (wsMatch) {
		return { ...wsMatch, strategy: 'whitespace-normalized' };
	}

	// Layer 3: Trimmed-lines match (handles indentation differences)
	const trimMatch = fuzzyFind(code, needle, normalizeTrimmedLines);
	if (trimMatch) {
		return { ...trimMatch, strategy: 'trimmed-lines' };
	}

	return null;
}

/**
 * Get code context around a search string for error feedback.
 * Shows the LLM what the actual code looks like near where it expected the match.
 */
function getContextForError(code: string, needle: string): string {
	// Try to find the best partial match — look for the first line of the needle
	const firstLine = needle.split('\n')[0].trim();
	if (!firstLine) return '';

	const lines = code.split('\n');
	let bestLineIdx = -1;
	let bestScore = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Check if first line is a substring
		if (line.includes(firstLine) || firstLine.includes(line)) {
			bestLineIdx = i;
			bestScore = 100;
			break;
		}

		// Check word overlap
		const needleWords = new Set(firstLine.toLowerCase().split(/\W+/).filter(Boolean));
		const lineWords = line.toLowerCase().split(/\W+/).filter(Boolean);
		const overlap = lineWords.filter((w) => needleWords.has(w)).length;
		if (overlap > bestScore) {
			bestScore = overlap;
			bestLineIdx = i;
		}
	}

	if (bestLineIdx === -1 || bestScore < 2) return '';

	// Show 3 lines before and after the best match
	const start = Math.max(0, bestLineIdx - 3);
	const end = Math.min(lines.length, bestLineIdx + 4);
	const context = lines
		.slice(start, end)
		.map((l, i) => {
			const lineNum = start + i + 1;
			const marker = start + i === bestLineIdx ? '> ' : '  ';
			return `${marker}${lineNum}: ${l}`;
		})
		.join('\n');

	return `\nNearest match in code around line ${bestLineIdx + 1}:\n${context}`;
}

/**
 * Apply an array of patches to code with layered fuzzy matching.
 *
 * Each patch is applied sequentially. If any patch fails all matching
 * strategies, returns an actionable error with code context.
 */
export function applyPatches(code: string, patches: Patch[]): PatchResult | PatchError {
	let result = code;

	for (const patch of patches) {
		const match = findMatch(result, patch.old_str);

		if (!match) {
			const context = getContextForError(result, patch.old_str);
			const truncated = patch.old_str.slice(0, 150) + (patch.old_str.length > 150 ? '...' : '');
			return {
				success: false,
				error:
					'Patch failed: could not find old_str in code.' +
					'\nSearched for: "' +
					truncated +
					'"' +
					'\nTried: exact match, whitespace-normalized, trimmed-lines.' +
					(context || '\nNo similar code found nearby.') +
					'\nTip: use get-workflow-as-code to see the exact current code, then match it precisely.',
			};
		}

		// Apply the replacement using the matched region
		result = result.slice(0, match.start) + patch.new_str + result.slice(match.end);
	}

	return { success: true, code: result };
}
