import { createI18n } from 'vue-i18n';

import en from '../locales/en.json';

/**
 * Locales bundled with MCP apps. When adding a new locale:
 *   1. Drop a `<code>.json` file alongside `en.json` in `src/locales`.
 *   2. Import it here and add the code to `SUPPORTED_LOCALES`.
 * Locale files use the same flat-key style as `@n8n/i18n` (e.g.
 * `workflowPreview.openButton`), namespaced by app.
 */
export const SUPPORTED_LOCALES = ['en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Schema derived from English messages so other locales must match keys. */
export type MessageSchema = typeof en;

export const i18n = createI18n<MessageSchema, SupportedLocale, false>({
	legacy: false,
	locale: DEFAULT_LOCALE,
	fallbackLocale: DEFAULT_LOCALE,
	messages: { en },
	warnHtmlMessage: false,
});

/**
 * Resolve an MCP host BCP 47 locale (e.g. `de-DE`, `en-GB`) to a locale we
 * actually ship. Falls back to the default when the language tag is missing or
 * unsupported.
 */
export function resolveLocale(input: string | undefined | null): SupportedLocale {
	if (typeof input !== 'string' || input.length === 0) return DEFAULT_LOCALE;

	const lang = input.split('-')[0]?.toLowerCase();
	if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) {
		return lang as SupportedLocale;
	}

	return DEFAULT_LOCALE;
}

/**
 * Apply the host-provided locale to the i18n instance and to the document's
 * `<html lang>` attribute for assistive technologies.
 */
export function setLocaleFromHost(input: string | undefined | null): SupportedLocale {
	const locale = resolveLocale(input);
	i18n.global.locale.value = locale;
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('lang', locale);
	}
	return locale;
}
