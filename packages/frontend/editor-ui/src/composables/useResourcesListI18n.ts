import { useI18n } from '@n8n/i18n';
import type { BaseTextKey } from '@n8n/i18n';

/**
 * Composable for handling i18n in ResourcesListLayout with dynamic resource keys
 * It provides fallback functionality for translation keys
 */
export function useResourcesListI18n(resourceKey: string) {
	const i18n = useI18n();

	/**
	 * Get a translated text with fallback support for dynamic resource keys
	 * First tries the specific resource key, then falls back to generic keys
	 */
	const getResourceText = (
		keySuffix: string,
		fallbackKeySuffix?: string,
		interpolate?: Record<string, string>,
	) => {
		const specificKey = `${resourceKey}.${keySuffix}` as BaseTextKey;
		const genericKey = `resources.${keySuffix}` as BaseTextKey;
		const fallbackKey = fallbackKeySuffix
			? (`resources.${fallbackKeySuffix}` as BaseTextKey)
			: undefined;

		// Check if the specific key exists
		if (i18n.baseText(specificKey)) {
			return i18n.baseText(specificKey, { interpolate });
		}

		// Check if the generic key exists
		if (i18n.baseText(genericKey)) {
			return i18n.baseText(genericKey, { interpolate });
		}

		// Use fallback key if provided
		if (fallbackKey && i18n.baseText(fallbackKey)) {
			return i18n.baseText(fallbackKey, { interpolate });
		}

		// If no translation found, return a readable fallback
		return (
			keySuffix
				.split('.')
				.pop()
				?.replace(/([A-Z])/g, ' $1')
				.trim() || keySuffix
		);
	};

	return {
		getResourceText,
	};
}
