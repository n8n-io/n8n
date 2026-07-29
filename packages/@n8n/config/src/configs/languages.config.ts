import { z } from 'zod';

import { Config, Env } from '../decorators';

export type LanguageDefinitions = Record<string, { file: string; name: string }>;

const languageEntrySchema = z.object({
	file: z.string().min(1),
	name: z.string().min(1),
});

const languagesSchema = z.string().transform((raw, ctx) => {
	if (!raw) return {};

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be valid JSON' });
		return z.NEVER;
	}

	const result = z.record(z.string(), languageEntrySchema).safeParse(parsed);
	if (!result.success) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'must be a JSON object mapping a locale code to `{ file, name }`',
		});
		return z.NEVER;
	}

	return result.data;
});

@Config
export class LanguagesConfig {
	/**
	 * Additional UI languages available besides the built-in English, as a
	 * JSON object mapping a locale code to the translation file to load and
	 * the display name to show for it, e.g.:
	 * `{"de":{"file":"/files/languages/de.json","name":"Deutsch"}}`
	 *
	 * The locale code doesn't need to match the file name, so an instance
	 * whose runtime locale is `en-GB` can point at a file literally named
	 * `en.json`. `N8N_DEFAULT_LOCALE` may be set to any code declared here.
	 */
	@Env('N8N_EDITOR_LANGUAGES', languagesSchema)
	available: LanguageDefinitions = {};

	/**
	 * Whether users can override the instance's default UI language for
	 * themselves via Personal Settings. Set to `false` to enforce
	 * `N8N_DEFAULT_LOCALE` for everyone.
	 */
	@Env('N8N_EDITOR_LANGUAGE_USER_SETTING')
	userSettingEnabled: boolean = true;
}
