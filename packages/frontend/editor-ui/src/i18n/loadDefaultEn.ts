import { loadLanguage } from '@n8n/i18n';
import type { LocaleMessages } from '@n8n/i18n/types';

export async function loadDefaultEn() {
	const mod = (await import('@n8n/i18n/locales/en.json')) as { default: LocaleMessages };
	loadLanguage('en', mod.default);
}
