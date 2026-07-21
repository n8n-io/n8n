/**
 * Attempts to extract markdown code fence content from text.
 * Handles both ```json and ``` fences.
 */
function extractFromCodeFence(text: string): string | null {
	const lines = text.split('\n');
	let fenceStartIndex = -1;
	let fenceEndIndex = -1;

	for (let i = 0; i < lines.length; i++) {
		const trimmedLine = lines[i].trim();
		if (fenceStartIndex === -1 && /^```(?:json)?$/.test(trimmedLine)) {
			fenceStartIndex = i;
		} else if (fenceStartIndex !== -1 && trimmedLine === '```') {
			fenceEndIndex = i;
			break;
		}
	}

	if (fenceStartIndex !== -1 && fenceEndIndex !== -1) {
		return lines
			.slice(fenceStartIndex + 1, fenceEndIndex)
			.join('\n')
			.trim();
	}

	return null;
}

/** Sentinel returned when no valid JSON could be extracted from the output. */
export const JSON_NOT_FOUND = Symbol('JSON_NOT_FOUND');

/**
 * Finds the position of the closing bracket that matches the opening bracket at `start`.
 * Skips over JSON string literals so that bracket characters inside strings are not
 * counted as structural closers (e.g. the } in {"msg":"a } b"} must not close early).
 *
 * @returns Index of the matching closing bracket, or -1 if not found.
 */
function findMatchingClose(text: string, start: number, open: string, close: string): number {
	let depth = 0;
	let i = start;
	while (i < text.length) {
		const ch = text[i];
		if (ch === '"') {
			// Skip past the entire string literal, respecting backslash escapes
			i++;
			while (i < text.length) {
				if (text[i] === '\\') {
					i += 2; // skip the escaped character
					continue;
				}
				if (text[i] === '"') break;
				i++;
			}
		} else if (ch === open) {
			depth++;
		} else if (ch === close) {
			depth--;
			if (depth === 0) return i;
		}
		i++;
	}
	return -1;
}

/**
 * Attempts to extract and parse valid JSON from raw LLM output text.
 *
 * Handles common LLM response patterns:
 * - Markdown code block wrappers (` ```json ... ``` `)
 * - Preamble text before JSON ("Here's the result: {...}")
 * - Trailing commentary after JSON
 *
 * @param text - Raw LLM output text
 * @returns Parsed JSON value, or JSON_NOT_FOUND if no valid JSON could be extracted
 */
export function extractJsonFromOutput(text: string): unknown | typeof JSON_NOT_FOUND {
	const trimmed = text.trim();

	// 1. Try to extract from markdown code fence
	const codeBlockContent = extractFromCodeFence(trimmed);
	if (codeBlockContent !== null) {
		try {
			return JSON.parse(codeBlockContent);
		} catch {
			// Code block content isn't valid JSON, continue
		}
	}

	// 2. Try to parse the full text directly (handles clean JSON responses)
	try {
		return JSON.parse(trimmed);
	} catch {
		// Not valid JSON, try to extract JSON substring
	}

	// 3 & 4. Collect every valid JSON candidate in the text and return the longest one.
	// "Longest" naturally skips incidental snippets (numbered refs like [1], placeholders
	// like {}) in favour of the real payload, which is almost always the largest value.
	//
	// Two kinds of candidates are tried:
	//  a) Structural: '{' / '[' paired with their matching closer (string-aware depth count)
	//  b) Scalar: boolean/null literals, numbers, and JSON strings found via regex
	let bestValue: unknown = JSON_NOT_FOUND;
	let bestLength = 0;

	// (a) Structural candidates
	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (ch !== '{' && ch !== '[') continue;
		const closeChar = ch === '{' ? '}' : ']';
		const end = findMatchingClose(trimmed, i, ch, closeChar);
		if (end === -1) continue;
		const length = end - i + 1;
		if (length <= bestLength) continue;
		try {
			bestValue = JSON.parse(trimmed.slice(i, end + 1));
			bestLength = length;
		} catch {
			// Not valid JSON starting here, continue scanning
		}
	}

	// (b) Scalar candidates — booleans, null, numbers, and quoted strings
	const scalarRegex =
		/\btrue\b|\bfalse\b|\bnull\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|"(?:[^"\\]|\\.)*"/g;
	for (const match of trimmed.matchAll(scalarRegex)) {
		const length = match[0].length;
		if (length <= bestLength) continue;
		try {
			bestValue = JSON.parse(match[0]);
			bestLength = length;
		} catch {
			// Not valid JSON
		}
	}

	return bestValue as unknown | typeof JSON_NOT_FOUND;
}
