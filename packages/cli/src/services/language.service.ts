import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

export interface AvailableLanguage {
	code: string;
	name: string;
}

@Service()
export class LanguageService {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	/**
	 * English plus every admin-configured language whose translation file
	 * currently exists on disk. A language whose file is missing is skipped
	 * (not treated as a startup error) so a misconfiguration doesn't break
	 * the instance.
	 */
	getAvailableLanguages(): AvailableLanguage[] {
		const languages: AvailableLanguage[] = [{ code: 'en', name: 'English' }];

		for (const [code, { file, name }] of Object.entries(this.globalConfig.languages.available)) {
			if (!existsSync(file)) {
				this.logger.warn(`Skipping UI language "${code}" - translation file not found`, {
					file,
				});
				continue;
			}
			languages.push({ code, name });
		}

		return languages;
	}

	isAvailable(code: string): boolean {
		return this.getAvailableLanguages().some((language) => language.code === code);
	}

	/** Returns `null` for `en` (always bundled client-side) or an unknown/unreadable code. */
	async getLanguageCatalog(code: string): Promise<Record<string, string> | null> {
		if (code === 'en') return null;

		const entry = this.globalConfig.languages.available[code];
		if (!entry) return null;

		try {
			const raw = await readFile(entry.file, 'utf8');
			return JSON.parse(raw) as Record<string, string>;
		} catch (error) {
			this.logger.warn(`Failed to read UI language file for "${code}"`, {
				file: entry.file,
				error,
			});
			return null;
		}
	}
}
