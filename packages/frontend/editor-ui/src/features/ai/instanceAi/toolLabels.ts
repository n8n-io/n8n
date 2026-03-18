import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

/**
 * Returns a human-readable display label for an instance AI tool name.
 * Falls back to the raw tool name if no mapping exists in i18n.
 */
export function useToolLabel() {
	const i18n = useI18n();

	function getToolLabel(toolName: string): string {
		const key = `instanceAi.tools.${toolName}` as BaseTextKey;
		const translated = i18n.baseText(key);
		// If the key is not found, baseText returns the key itself
		return translated === key ? toolName : translated;
	}

	return { getToolLabel };
}
