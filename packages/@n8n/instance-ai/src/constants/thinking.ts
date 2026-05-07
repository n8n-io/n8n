/**
 * Anthropic extended-thinking config used at stream/generate time.
 *
 * Skipped for the workflow builder sub-agent — it runs at low temperature
 * for deterministic code emission, and Anthropic disallows extended thinking
 * when temperature ≠ 1.
 */
export const ANTHROPIC_THINKING = {
	type: 'enabled' as const,
	budgetTokens: 2048,
} as const;
