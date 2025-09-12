import { loadLanguage } from '@n8n/i18n';

export async function loadDefaultEn() {
	const mod = await import('@n8n/i18n/locales/en.json');
	loadLanguage('en', (mod as any).default);
}
