import { isRef } from 'vue';

import { useOptions } from '@n8n/chat/composables/useOptions';

export function useI18n() {
	const { options } = useOptions();
	const language = options?.defaultLanguage ?? 'en';

	function t(key: string): string {
		const val = options?.i18n?.[language]?.[key];
		if (isRef(val)) {
			return val.value as string;
		}
		return val ?? key;
	}

	function te(key: string): boolean {
		return !!options?.i18n?.[language]?.[key];
	}

	return { t, te };
}
