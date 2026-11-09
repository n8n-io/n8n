import type { BaseTextKey, useI18n } from '@n8n/i18n';

/**
 * The text of an LLM usage key that is built at run time, for example from a caller type.
 * The type of the locale keys cannot check such a key, so this is the one place that casts it.
 * Use literal keys everywhere else.
 */
export const dynamicLlmUsageText = (i18n: ReturnType<typeof useI18n>, suffix: string) =>
	i18n.baseText(`settings.llmUsage.${suffix}` as BaseTextKey);
