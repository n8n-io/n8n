// Source: https://github.com/openai/openai-guardrails-js/blob/b9b99b4fb454f02a362c2836aec6285176ec40a8/src/checks/keywords.ts
import type { CreateCheckFn, GuardrailResult } from '../types';

interface KeywordsConfig {
	keywords: string[];
}

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

	const validKeywords = sanitizedKeywords.filter((k: string) => k.length > 0);

	if (validKeywords.length === 0) {
		return {
			guardrailName: 'keywords',
			tripwireTriggered: false,
			info: {
				matchedKeywords: [],
			},
		};
	}

	// Create regex pattern with word boundaries
	// Escape special regex characters and join with word boundaries
	const escapedKeywords = validKeywords.map((k: string) =>
		k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
	);
	const patternText = `\\b(?:${escapedKeywords.join('|')})\\b`;
	const pattern = new RegExp(patternText, 'gi'); // case-insensitive, global

	const matches: string[] = [];
	let match;
	const seen = new Set<string>();

	// Find all matches and collect unique ones (case-insensitive)
	while ((match = pattern.exec(text)) !== null) {
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
