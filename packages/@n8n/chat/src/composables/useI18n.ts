import { useOptions } from '@n8n/chat/composables/useOptions';

export function useI18n() {
	const { options } = useOptions();
	const language = options?.defaultLanguage ?? 'en';

	function t(key: string): string {
		return options?.i18n?.[language]?.[key] ?? key;
	}

	function te(key: string): boolean {
		return !!options?.i18n?.[language]?.[key];
	}

	return { t, te };
}
