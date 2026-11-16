import { z } from 'zod';

import { Config, Env } from '../decorators';

const localeDefinitionSchema = z.object({
	name: z.string().min(1),
	file: z.string().min(1).optional(),
});

// The code becomes part of a URL path, so only allow characters that need no encoding.
const localeCodeSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

const isHttpUrl = (value: string) => {
	try {
		const { protocol } = new URL(value);
		return protocol === 'http:' || protocol === 'https:';
	} catch {
		return false;
	}
};

const versionedBaseUrlSchema = z
	.string()
	.trim()
	.refine((value) => value === '' || isHttpUrl(value), { message: 'must be an http or https URL' });

const localeDefinitionsSchema = z
	.string()
	.transform((value, ctx): unknown => {
		// A blank value from an env template means "no extra languages", not invalid JSON.
		if (value.trim() === '') return {};
		try {
			return JSON.parse(value);
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be valid JSON' });
			return z.NEVER;
		}
	})
	.pipe(z.record(localeCodeSchema, localeDefinitionSchema));

export type LocaleDefinitions = z.infer<typeof localeDefinitionsSchema>;

@Config
export class LocalesConfig {
	/**
	 * Extra UI languages, as a JSON object that maps a locale code to a display
	 * name and the path of a translation file, for example
	 * `{"de":{"name":"Deutsch","file":"/files/locales/de.json"}}`. Locale codes
	 * can contain only letters, digits, `-`, and `_`. You can leave out `file`
	 * when you set `N8N_VERSIONED_LOCALES_BASE_URL`. Keys missing from a file
	 * show in English. Keys that start with `backend.` are reserved for n8n.
	 * n8n skips a language whose file doesn't exist.
	 */
	@Env('N8N_LOCALES', localeDefinitionsSchema)
	available: LocaleDefinitions = {};

	/**
	 * Base URL of a server that hosts translation files for each n8n minor
	 * version, for languages in `N8N_LOCALES` that have no `file`. The browser
	 * loads `{base URL}/{code}/{code}_{major}.{minor}.json`, for example
	 * `https://translations.example.com/n8n/de/de_2.4.json` on n8n 2.4.1. The
	 * patch version isn't part of the path, and a local `file` takes precedence.
	 * The server must allow cross-origin requests from your n8n URL.
	 */
	@Env('N8N_VERSIONED_LOCALES_BASE_URL', versionedBaseUrlSchema)
	versionedBaseUrl: string = '';

	/**
	 * Whether users can choose their own UI language in their personal settings.
	 * When false, every user sees the language from `N8N_DEFAULT_LOCALE`.
	 */
	@Env('N8N_LOCALE_USER_OVERRIDE')
	userOverride: boolean = false;
}
