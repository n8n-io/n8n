/**
 * Extended-thinking config used at stream/generate time.
 *
 * Anthropic requires temperature = 1 when thinking is enabled. The workflow
 * builder is configured to run at temperature = 1 for this reason — see
 * `constants/model-settings.ts`.
 */
export const EXTENDED_THINKING = {
	type: 'enabled' as const,
	budgetTokens: 1024,
} as const;
