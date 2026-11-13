import { z } from 'zod';

import { Config, Env } from '../decorators';

const localeDefinitionSchema = z.object({
	name: z.string().min(1),
	file: z.string().min(1),
});

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
	.pipe(z.record(z.string().min(1), localeDefinitionSchema));

export type LocaleDefinitions = z.infer<typeof localeDefinitionsSchema>;

@Config
export class LocalesConfig {
	/**
	 * Extra UI languages, as a JSON object that maps a locale code to a display
	 * name and the path of a translation file, for example
	 * `{"de":{"name":"Deutsch","file":"/files/locales/de.json"}}`. Keys missing
	 * from a file show in English. Keys that start with `backend.` are reserved
	 * for n8n. n8n skips a language whose file doesn't exist.
	 */
	@Env('N8N_LOCALES', localeDefinitionsSchema)
	available: LocaleDefinitions = {};

	/**
	 * Whether users can choose their own UI language in their personal settings.
	 * When false, every user sees the language from `N8N_DEFAULT_LOCALE`, and
	 * the public API endpoint that sets a user's language returns 404.
	 */
	@Env('N8N_LOCALE_USER_OVERRIDE')
	userOverride: boolean = false;
}
