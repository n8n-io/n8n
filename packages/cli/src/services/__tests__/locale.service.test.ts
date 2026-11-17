import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'fs';
import type { InstanceSettings } from 'n8n-core';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { LOCAL_CATALOGS_PATH, LocaleService } from '../locale.service';

const versionState = vi.hoisted(() => ({ version: '2.4.1' }));

vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	get N8N_VERSION() {
		return versionState.version;
	},
}));

describe('LocaleService', () => {
	let dir: string;
	let staticCacheDir: string;
	const logger = mock<Logger>();
	const baseUrl = 'https://translations.example.com/n8n';
	const localUrl = expect.stringMatching(/^locales\/de\.[0-9a-f]{16}\.json$/);

	const createService = (
		available: GlobalConfig['locales']['available'],
		{ defaultLocale = 'en', versionedBaseUrl = '' } = {},
	) =>
		// A plain object, because a mock would turn a missing `file` into a mock function.
		new LocaleService(
			{
				defaultLocale,
				locales: { available, userOverride: true, versionedBaseUrl },
			} as GlobalConfig,
			logger,
			{ staticCacheDir } as InstanceSettings,
		);

	const writeCatalog = (name: string, content: string) => {
		const file = join(dir, name);
		writeFileSync(file, content);
		return file;
	};

	const urlOf = (file: string) =>
		createService({ de: { name: 'Deutsch', file } }).getAvailableLocales()[1]?.url;

	const catalogsDir = () => join(staticCacheDir, LOCAL_CATALOGS_PATH);

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'n8n-locales-'));
		staticCacheDir = join(dir, 'static');
		versionState.version = '2.4.1';
		vi.clearAllMocks();
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	describe('getAvailableLocales', () => {
		it('should return English plus each locale whose file exists', () => {
			const file = writeCatalog('de.json', '{}');
			const service = createService({
				de: { name: 'Deutsch', file },
				fr: { name: 'Français', file: join(dir, 'missing.json') },
			});

			expect(service.getAvailableLocales()).toEqual([
				{ code: 'en', name: 'English' },
				{ code: 'de', name: 'Deutsch', url: localUrl },
			]);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping locale "fr"'),
				expect.anything(),
			);
		});

		it('should ignore an "en" entry because English is built in', () => {
			const file = writeCatalog('en.json', '{}');
			const service = createService({ en: { name: 'English (custom)', file } });

			expect(service.getAvailableLocales()).toEqual([{ code: 'en', name: 'English' }]);
		});

		it('should compute the list only once', () => {
			const file = writeCatalog('de.json', '{}');
			const service = createService({ de: { name: 'Deutsch', file } });

			expect(service.isAvailable('de')).toBe(true);
			rmSync(file);

			expect(service.isAvailable('de')).toBe(true);
		});

		it('should warn when the default locale is not available', () => {
			createService({}, { defaultLocale: 'de' }).getAvailableLocales();

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_DEFAULT_LOCALE'));
		});

		it.each([
			['invalid JSON', '{not json'],
			['a JSON value that is not an object', '["Speichern"]'],
		])('should skip a file with %s', (_, content) => {
			const service = createService({
				de: { name: 'Deutsch', file: writeCatalog('de.json', content) },
			});

			expect(service.getAvailableLocales()).toEqual([{ code: 'en', name: 'English' }]);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Skipping locale "de"'),
				expect.anything(),
			);
		});
	});

	describe('local catalog URL', () => {
		it('should be the same for the same content', () => {
			expect(urlOf(writeCatalog('a.json', '{"a":"1"}'))).toBe(
				urlOf(writeCatalog('b.json', '{"a":"1"}')),
			);
		});

		it('should change when the content changes', () => {
			expect(urlOf(writeCatalog('a.json', '{"a":"1"}'))).not.toBe(
				urlOf(writeCatalog('b.json', '{"a":"2"}')),
			);
		});

		it('should not change when only backend keys change', () => {
			expect(urlOf(writeCatalog('a.json', '{"a":"1","backend.x":"1"}'))).toBe(
				urlOf(writeCatalog('b.json', '{"a":"1","backend.x":"2"}')),
			);
		});
	});

	describe('publishLocalCatalogs', () => {
		it('should write each local catalog under its URL, without backend keys', async () => {
			const file = writeCatalog(
				'de.json',
				JSON.stringify({ 'generic.save': 'Speichern', 'backend.error.notFound': 'Nicht gefunden' }),
			);
			const service = createService({ de: { name: 'Deutsch', file } });

			await service.publishLocalCatalogs();

			const url = service.getAvailableLocales()[1].url!;
			expect(JSON.parse(readFileSync(join(staticCacheDir, url), 'utf8'))).toEqual({
				'generic.save': 'Speichern',
			});
		});

		it('should remove the catalogs of an earlier start', async () => {
			mkdirSync(catalogsDir(), { recursive: true });
			writeFileSync(join(catalogsDir(), 'de.0000000000000000.json'), '{}');
			const service = createService({
				de: { name: 'Deutsch', file: writeCatalog('de.json', '{}') },
			});

			await service.publishLocalCatalogs();

			expect(readdirSync(catalogsDir())).toEqual([
				service.getAvailableLocales()[1].url!.split('/')[1],
			]);
		});

		it('should leave no folder when there is no local catalog', async () => {
			mkdirSync(catalogsDir(), { recursive: true });
			const service = createService({ de: { name: 'Deutsch' } }, { versionedBaseUrl: baseUrl });

			await service.publishLocalCatalogs();

			expect(existsSync(catalogsDir())).toBe(false);
		});
	});

	describe('remote catalogs', () => {
		it('should resolve an entry without a file to the versioned URL', () => {
			const service = createService({ de: { name: 'Deutsch' } }, { versionedBaseUrl: baseUrl });

			expect(service.getAvailableLocales()).toEqual([
				{ code: 'en', name: 'English' },
				{ code: 'de', name: 'Deutsch', url: `${baseUrl}/de/de_2.4.json` },
			]);
		});

		it('should prefer a local file over the base URL', () => {
			const file = writeCatalog('de.json', '{}');
			const service = createService(
				{ de: { name: 'Deutsch', file } },
				{ versionedBaseUrl: baseUrl },
			);

			expect(service.getAvailableLocales()[1].url).toEqual(localUrl);
		});

		it('should skip an entry without a file when no base URL is set', () => {
			const service = createService({ de: { name: 'Deutsch' } });

			expect(service.getAvailableLocales()).toEqual([{ code: 'en', name: 'English' }]);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('N8N_VERSIONED_LOCALES_BASE_URL is not set'),
			);
		});

		it('should use the minor version of a prerelease', () => {
			versionState.version = '2.5.0-rc.1';
			const service = createService({ de: { name: 'Deutsch' } }, { versionedBaseUrl: baseUrl });

			expect(service.getAvailableLocales()[1].url).toBe(`${baseUrl}/de/de_2.5.json`);
		});

		it('should remove a trailing slash from the base URL', () => {
			const service = createService(
				{ de: { name: 'Deutsch' } },
				{ versionedBaseUrl: `${baseUrl}/` },
			);

			expect(service.getAvailableLocales()[1].url).toBe(`${baseUrl}/de/de_2.4.json`);
		});
	});
});
