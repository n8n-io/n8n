import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { InstanceSettings } from 'n8n-core';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { parse as parseSemver } from 'semver';

import { N8N_VERSION } from '@/constants';

export interface AvailableLocale {
	code: string;
	name: string;
	/**
	 * Where the browser loads the catalog from. An absolute URL for a remote catalog, or a path
	 * relative to the n8n base URL for a local catalog. English has none, because the UI bundles it.
	 */
	url?: string;
}

/**
 * Local catalogs are published under this path of the static file server. The name of each
 * file has a hash of its content, so a browser can keep a file until the content changes.
 */
export const LOCAL_CATALOGS_PATH = 'locales';

/** Keys under this prefix are reserved for backend message translations and never sent to the UI. */
const BACKEND_KEY_PREFIX = 'backend.';

const ENGLISH: AvailableLocale = { code: 'en', name: 'English' };

const hashCatalog = (content: string) =>
	createHash('sha256').update(content).digest('hex').slice(0, 16);

/** Resolves the admin-configured UI locales (`N8N_LOCALES`) and publishes their local catalogs. */
@Service()
export class LocaleService {
	private availableLocales: AvailableLocale[] | undefined;

	/** Processed local catalogs, keyed by the file name they are published under. */
	private readonly localCatalogs = new Map<string, string>();

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * English plus every configured locale with a valid local file or a remote URL. Computed once,
	 * so a change to a locale or its file needs a restart. A bad file is skipped so it doesn't
	 * break startup.
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
				const fileName = this.loadLocalCatalog(code, file);
				if (fileName) locales.push({ code, name, url: `${LOCAL_CATALOGS_PATH}/${fileName}` });
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
	 * Writes the local catalogs into the static file folder, so the editor's static file server
	 * serves them. Removes the files of an earlier start first, so old versions don't pile up.
	 */
	async publishLocalCatalogs(): Promise<void> {
		this.getAvailableLocales();

		const dir = path.join(this.instanceSettings.staticCacheDir, LOCAL_CATALOGS_PATH);
		await rm(dir, { recursive: true, force: true });
		if (this.localCatalogs.size === 0) return;

		await mkdir(dir, { recursive: true });
		await Promise.all(
			[...this.localCatalogs].map(
				async ([fileName, content]) => await writeFile(path.join(dir, fileName), content, 'utf8'),
			),
		);
	}

	/** Reads and checks a local file. Returns the name to publish it under, or `undefined` if invalid. */
	private loadLocalCatalog(code: string, file: string): string | undefined {
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(file, 'utf8'));
		} catch (error) {
			this.logger.warn(`Skipping locale "${code}" because its translation file is not valid`, {
				file,
				error,
			});
			return undefined;
		}

		if (!isRecord(parsed)) {
			this.logger.warn(
				`Skipping locale "${code}" because its translation file is not a JSON object`,
				{ file },
			);
			return undefined;
		}

		const content = JSON.stringify(
			Object.fromEntries(
				Object.entries(parsed).filter(([key]) => !key.startsWith(BACKEND_KEY_PREFIX)),
			),
		);
		const fileName = `${encodeURIComponent(code)}.${hashCatalog(content)}.json`;
		this.localCatalogs.set(fileName, content);
		return fileName;
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
