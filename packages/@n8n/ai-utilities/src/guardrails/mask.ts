import type { GuardrailResult } from './types';

/** Escapes regex metacharacters so a match replaces literally. Same form as the keywords check. */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces the matches the guardrail checks reported with typed mask tokens:
 * `maskEntities` become `<TYPE>` and `matchedKeywords` become `<KEYWORD>`.
 * Longer matches replace first, so a shorter match cannot leave a partial of a
 * longer one behind. Replacement treats every character literally, so a match
 * cannot inject regex syntax.
 */
export function redactMatches(text: string, results: GuardrailResult[]): string {
	// A null prototype keeps a literal `__proto__` keyword from hitting the
	// inherited setter instead of creating an entry.
	const entities: Record<string, string> = Object.create(null);
	const keywords: Record<string, string> = Object.create(null);
	for (const result of results) {
		for (const [entityType, values] of Object.entries(result.info?.maskEntities ?? {})) {
			for (const value of values) {
				entities[value] = `<${entityType}>`;
			}
		}
		const matched = result.info?.matchedKeywords;
		if (Array.isArray(matched)) {
			for (const keyword of matched) {
				if (typeof keyword === 'string') keywords[keyword] = '<KEYWORD>';
			}
		}
	}
	if (Object.keys(entities).length === 0 && Object.keys(keywords).length === 0) return text;

	let masked = text;
	// Longest matches replace first, so a shorter match cannot leave a partial
	// of a longer one behind.
	const entityEntries = Object.entries(entities).sort((a, b) => b[0].length - a[0].length);
	for (const [match, token] of entityEntries) {
		if (masked.includes(match)) {
			masked = masked.split(match).join(token);
		}
	}
	// The keyword check matches case-insensitively and reports only the
	// first-seen casing, so replacement must ignore case too or the other
	// spellings of a flagged word survive. Without word boundaries this can
	// over-mask a word that contains the keyword, which is the safe direction.
	const keywordEntries = Object.entries(keywords).sort((a, b) => b[0].length - a[0].length);
	for (const [keyword, token] of keywordEntries) {
		masked = masked.replace(new RegExp(escapeRegExp(keyword), 'giu'), token);
	}
	return masked;
}
