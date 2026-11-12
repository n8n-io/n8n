// Source: https://github.com/openai/openai-guardrails-js/blob/b9b99b4fb454f02a362c2836aec6285176ec40a8/src/checks/keywords.ts
import { safeRegex } from 'n8n-workflow';

import type { CreateCheckFn, GuardrailResult } from '../types';

interface KeywordsConfig {
	keywords: string[];
}

// \p{L}|\p{N}|_ - any unicode letter, number, or underscore. Alternative to \b
const WORD_CHAR_CLASS = '[\\p{L}\\p{N}_]';
const isWordChar = (() => {
	const wordCharRegex = new RegExp(WORD_CHAR_CLASS, 'u');
	return (char: string | undefined): boolean => {
		if (!char) return false;
		return wordCharRegex.test(char);
	};
})();

/**
 * Keywords-based content filtering guardrail.
 *
 * Checks if any of the configured keywords appear in the input text.
 * Can be configured to trigger tripwires on matches or just report them.
 *
 * @param text Input text to check
 * @param config Configuration specifying keywords and behavior
 * @returns GuardrailResult indicating if tripwire was triggered
 */
const keywordsCheck = (text: string, config: KeywordsConfig): GuardrailResult => {
	const { keywords } = config;

	// Sanitize keywords by stripping trailing punctuation
	const sanitizedKeywords = keywords.map((k: string) => k.replace(/[.,!?;:]+$/, ''));

	const keywordEntries = sanitizedKeywords
		.map((sanitized) => ({
			sanitized,
			escaped: sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
		}))
		.filter(({ sanitized }) => sanitized.length > 0);

	if (keywordEntries.length === 0) {
		return {
			guardrailName: 'keywords',
			tripwireTriggered: false,
			info: {
				matchedKeywords: [],
			},
		};
	}

	// Apply unicode-aware word boundaries per keyword so tokens that start/end with punctuation still match.
	const keywordPatterns = keywordEntries.map(({ sanitized, escaped }) => {
		const keywordChars = Array.from(sanitized);
		const firstChar = keywordChars[0];
		const lastChar = keywordChars[keywordChars.length - 1];
		const needsLeftBoundary = isWordChar(firstChar);
		const needsRightBoundary = isWordChar(lastChar);
		// not preceded by a word character
		const leftBoundary = needsLeftBoundary ? `(?<!${WORD_CHAR_CLASS})` : '';
		// not followed by a word character
		const rightBoundary = needsRightBoundary ? `(?!${WORD_CHAR_CLASS})` : '';
		return `${leftBoundary}${escaped}${rightBoundary}`;
	});

	const patternText = `(?:${keywordPatterns.join('|')})`;

	const matches: string[] = [];
	const seen = new Set<string>();

	// Find all matches and collect unique ones (case-insensitive)
	for (const match of safeRegex.matchAll(patternText, text, 'giu')) {
		const matchedText = match[0];
		if (!seen.has(matchedText.toLowerCase())) {
			matches.push(matchedText);
			seen.add(matchedText.toLowerCase());
		}
	}

	const tripwireTriggered = matches.length > 0;

	return {
		guardrailName: 'keywords',
		tripwireTriggered,
		info: {
			matchedKeywords: matches,
		},
	};
};

export const createKeywordsCheckFn: CreateCheckFn<KeywordsConfig> = (config) => (input: string) =>
	keywordsCheck(input, config);
