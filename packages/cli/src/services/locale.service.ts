import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

export interface AvailableLocale {
	code: string;
	name: string;
}

/** Keys under this prefix are reserved for backend message translations and never sent to the UI. */
const BACKEND_KEY_PREFIX = 'backend.';

const ENGLISH: AvailableLocale = { code: 'en', name: 'English' };

/** Resolves the admin-configured UI locales (`N8N_LOCALES`) and reads their translation catalogs. */
@Service()
export class LocaleService {
	private availableLocales: AvailableLocale[] | undefined;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	/**
	 * English plus every configured locale whose file exists. Computed once, so adding a
	 * locale needs a restart. A missing file is skipped so a bad path doesn't break startup.
	 */
	getAvailableLocales(): AvailableLocale[] {
		if (this.availableLocales) return this.availableLocales;

		const locales = [ENGLISH];
		for (const [code, { name, file }] of Object.entries(this.globalConfig.locales.available)) {
			if (code === ENGLISH.code) {
				this.logger.warn('Ignoring locale "en" in N8N_LOCALES because English is built in');
				continue;
			}
			if (!existsSync(file)) {
				this.logger.warn(`Skipping locale "${code}" because its translation file does not exist`, {
					file,
				});
				continue;
			}
			locales.push({ code, name });
		}

		const { defaultLocale } = this.globalConfig;
		if (!locales.some((locale) => locale.code === defaultLocale)) {
			this.logger.warn(
				`N8N_DEFAULT_LOCALE is "${defaultLocale}", but no such locale is available. The UI uses English.`,
			);
		}

		this.availableLocales = locales;
		return locales;
	}

	isAvailable(code: string): boolean {
		return this.getAvailableLocales().some((locale) => locale.code === code);
	}

	/**
	 * Reads the catalog from disk on every call, so edits to an existing file apply without
	 * a restart. Returns `null` for English (bundled in the UI) and for an unknown or unreadable
	 * locale.
	 */
	async getUiCatalog(code: string): Promise<Record<string, unknown> | null> {
		if (code === ENGLISH.code || !this.isAvailable(code)) return null;

		const { file } = this.globalConfig.locales.available[code];
		let parsed: unknown;
		try {
			parsed = JSON.parse(await readFile(file, 'utf8'));
		} catch (error) {
			this.logger.warn(`Failed to read the translation file for locale "${code}"`, {
				file,
				error,
			});
			return null;
		}

		if (!isRecord(parsed)) {
			this.logger.warn(`Translation file for locale "${code}" is not a JSON object`, { file });
			return null;
		}

		return Object.fromEntries(
			Object.entries(parsed).filter(([key]) => !key.startsWith(BACKEND_KEY_PREFIX)),
		);
	}
}
