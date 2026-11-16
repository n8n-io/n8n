import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { parse as parseSemver } from 'semver';

import { N8N_VERSION } from '@/constants';

export interface AvailableLocale {
	code: string;
	name: string;
	/** Set for a remote catalog. The browser loads it from this URL. */
	url?: string;
	/** Set for a local catalog. A hash of the file content at startup, used to bust the browser cache. */
	hash?: string;
}

export interface UiCatalog {
	catalog: Record<string, unknown>;
	/** Hash of the content that was read, to compare with the hash the client requested. */
	hash: string;
}

/** Keys under this prefix are reserved for backend message translations and never sent to the UI. */
const BACKEND_KEY_PREFIX = 'backend.';

const ENGLISH: AvailableLocale = { code: 'en', name: 'English' };

const hashCatalog = (content: string) =>
	createHash('sha256').update(content).digest('hex').slice(0, 16);

/** Resolves the admin-configured UI locales (`N8N_LOCALES`) and reads their translation catalogs. */
@Service()
export class LocaleService {
	private availableLocales: AvailableLocale[] | undefined;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
	) {}

	/**
	 * English plus every configured locale with a readable file or a remote URL. Computed once,
	 * so adding a locale needs a restart. A missing file is skipped so a bad path doesn't break
	 * startup.
	 */
	getAvailableLocales(): AvailableLocale[] {
		if (this.availableLocales) return this.availableLocales;

		const locales = [ENGLISH];
		for (const [code, { name, file }] of Object.entries(this.globalConfig.locales.available)) {
			if (code === ENGLISH.code) {
				this.logger.warn('Ignoring locale "en" in N8N_LOCALES because English is built in');
				continue;
			}

			if (file) {
				let content: string;
				try {
					content = readFileSync(file, 'utf8');
				} catch (error) {
					this.logger.warn(
						`Skipping locale "${code}" because its translation file is not readable`,
						{
							file,
							error,
						},
					);
					continue;
				}
				locales.push({ code, name, hash: hashCatalog(content) });
				continue;
			}

			if (!this.globalConfig.locales.versionedBaseUrl) {
				this.logger.warn(
					`Skipping locale "${code}" because it has no file and N8N_VERSIONED_LOCALES_BASE_URL is not set`,
				);
				continue;
			}
			const url = this.getVersionedUrl(code);
			if (url) locales.push({ code, name, url });
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
	 * Reads a local catalog from disk on every call, so edits to an existing file apply without
	 * a restart. Returns `null` for English (bundled in the UI), for a remote catalog (the browser
	 * loads it directly), and for an unknown or unreadable locale.
	 */
	async getUiCatalog(code: string): Promise<UiCatalog | null> {
		if (code === ENGLISH.code || !this.isAvailable(code)) return null;

		const { file } = this.globalConfig.locales.available[code];
		if (!file) return null;

		let content: string;
		let parsed: unknown;
		try {
			content = await readFile(file, 'utf8');
			parsed = JSON.parse(content);
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

		return {
			catalog: Object.fromEntries(
				Object.entries(parsed).filter(([key]) => !key.startsWith(BACKEND_KEY_PREFIX)),
			),
			hash: hashCatalog(content),
		};
	}

	/** `{baseUrl}/{code}/{code}_{major}.{minor}.json`, or `undefined` for an invalid n8n version. */
	private getVersionedUrl(code: string): string | undefined {
		const baseUrl = this.globalConfig.locales.versionedBaseUrl.replace(/\/+$/, '');

		// A prerelease such as 2.5.0-rc.1 loads the 2.5 file.
		const version = parseSemver(N8N_VERSION);
		if (!version) {
			this.logger.warn(
				`Cannot build translation URLs because the n8n version "${N8N_VERSION}" is not valid`,
			);
			return undefined;
		}

		const encodedCode = encodeURIComponent(code);
		return `${baseUrl}/${encodedCode}/${encodedCode}_${version.major}.${version.minor}.json`;
	}
}
