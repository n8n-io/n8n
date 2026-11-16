import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { LocaleService } from '../locale.service';

const versionState = vi.hoisted(() => ({ version: '2.4.1' }));

vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	get N8N_VERSION() {
		return versionState.version;
	},
}));

describe('LocaleService', () => {
	let dir: string;
	const logger = mock<Logger>();
	const baseUrl = 'https://translations.example.com/n8n';

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
		);

	const writeCatalog = (name: string, content: string) => {
		const file = join(dir, name);
		writeFileSync(file, content);
		return file;
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'n8n-locales-'));
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
				{ code: 'de', name: 'Deutsch', hash: expect.stringMatching(/^[0-9a-f]{16}$/) },
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
	});

	describe('local catalog hash', () => {
		const hashOf = (file: string) => {
			const service = createService({ de: { name: 'Deutsch', file } });
			return service.getAvailableLocales()[1].hash;
		};

		it('should be the same for the same content', () => {
			expect(hashOf(writeCatalog('a.json', '{"a":"1"}'))).toBe(
				hashOf(writeCatalog('b.json', '{"a":"1"}')),
			);
		});

		it('should change when the content changes', () => {
			expect(hashOf(writeCatalog('a.json', '{"a":"1"}'))).not.toBe(
				hashOf(writeCatalog('b.json', '{"a":"2"}')),
			);
		});

		it('should match the hash that getUiCatalog returns for the same content', async () => {
			const file = writeCatalog('de.json', '{"generic.save":"Speichern"}');
			const service = createService({ de: { name: 'Deutsch', file } });

			expect((await service.getUiCatalog('de'))?.hash).toBe(service.getAvailableLocales()[1].hash);
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
			const file = writeCatalog('fr.json', '{}');
			const service = createService(
				{ fr: { name: 'Français', file } },
				{ versionedBaseUrl: baseUrl },
			);

			const [, fr] = service.getAvailableLocales();
			expect(fr.url).toBeUndefined();
			expect(fr.hash).toBeDefined();
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

		it('should not serve a remote catalog through the backend', async () => {
			const service = createService({ de: { name: 'Deutsch' } }, { versionedBaseUrl: baseUrl });

			expect(await service.getUiCatalog('de')).toBeNull();
		});
	});

	describe('getUiCatalog', () => {
		it('should return null for English and for an unknown locale', async () => {
			const service = createService({});

			expect(await service.getUiCatalog('en')).toBeNull();
			expect(await service.getUiCatalog('xx')).toBeNull();
		});

		it('should return the catalog without backend keys', async () => {
			const file = writeCatalog(
				'de.json',
				JSON.stringify({ 'generic.save': 'Speichern', 'backend.error.notFound': 'Nicht gefunden' }),
			);
			const service = createService({ de: { name: 'Deutsch', file } });

			expect((await service.getUiCatalog('de'))?.catalog).toEqual({ 'generic.save': 'Speichern' });
		});

		it('should read the file again on every call', async () => {
			const file = writeCatalog('de.json', JSON.stringify({ 'generic.save': 'Speichern' }));
			const service = createService({ de: { name: 'Deutsch', file } });
			const before = await service.getUiCatalog('de');

			writeFileSync(file, JSON.stringify({ 'generic.save': 'Sichern' }));

			const after = await service.getUiCatalog('de');
			expect(after?.catalog).toEqual({ 'generic.save': 'Sichern' });
			expect(after?.hash).not.toBe(before?.hash);
		});

		it('should return null for invalid JSON', async () => {
			const file = writeCatalog('de.json', '{not json');
			const service = createService({ de: { name: 'Deutsch', file } });

			expect(await service.getUiCatalog('de')).toBeNull();
		});

		it('should return null when the file is not a JSON object', async () => {
			const file = writeCatalog('de.json', '["Speichern"]');
			const service = createService({ de: { name: 'Deutsch', file } });

			expect(await service.getUiCatalog('de')).toBeNull();
		});
	});
});
