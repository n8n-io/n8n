import type { GuardrailResult } from './types';

/**
 * Replaces the matches the guardrail checks reported with typed mask tokens:
 * `maskEntities` become `<TYPE>` and `matchedKeywords` become `<KEYWORD>`.
 * Longer matches replace first, so a shorter match cannot leave a partial of a
 * longer one behind. Replacement treats every character literally, so a match
 * cannot inject regex syntax.
 */
export function redactMatches(text: string, results: GuardrailResult[]): string {
	const mappings: Record<string, string> = {};
	for (const result of results) {
		for (const [entityType, entities] of Object.entries(result.info?.maskEntities ?? {})) {
			for (const entity of entities) {
				mappings[entity] = `<${entityType}>`;
			}
		}
		const keywords = result.info?.matchedKeywords;
		if (Array.isArray(keywords)) {
			for (const keyword of keywords) {
				if (typeof keyword === 'string') mappings[keyword] = '<KEYWORD>';
			}
		}
	}
	if (Object.keys(mappings).length === 0) return text;

	let maskedText = text;
	const sorted = Object.entries(mappings).sort((a, b) => b[0].length - a[0].length);
	for (const [match, token] of sorted) {
		if (maskedText.includes(match)) {
			maskedText = maskedText.split(match).join(token);
		}
	}
	return maskedText;
}
