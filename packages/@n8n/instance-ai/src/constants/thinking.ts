/**
 * Extended-thinking config used at stream/generate time.
 *
 * Skipped for the workflow builder sub-agent — it runs at low temperature
 * for deterministic code emission, which is incompatible with extended
 * thinking on providers that require temperature = 1.
 */
export const EXTENDED_THINKING = {
	type: 'enabled' as const,
	budgetTokens: 2048,
} as const;
