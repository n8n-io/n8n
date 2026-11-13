import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { LocaleService } from '../locale.service';

describe('LocaleService', () => {
	let dir: string;
	const logger = mock<Logger>();

	const createService = (available: GlobalConfig['locales']['available'], defaultLocale = 'en') =>
		new LocaleService(
			mock<GlobalConfig>({ defaultLocale, locales: { available, userOverride: true } }),
			logger,
		);

	const writeCatalog = (name: string, content: string) => {
		const file = join(dir, name);
		writeFileSync(file, content);
		return file;
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'n8n-locales-'));
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
				{ code: 'de', name: 'Deutsch' },
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
			createService({}, 'de').getAvailableLocales();

			expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_DEFAULT_LOCALE'));
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

			expect(await service.getUiCatalog('de')).toEqual({ 'generic.save': 'Speichern' });
		});

		it('should read the file again on every call', async () => {
			const file = writeCatalog('de.json', JSON.stringify({ 'generic.save': 'Speichern' }));
			const service = createService({ de: { name: 'Deutsch', file } });
			await service.getUiCatalog('de');

			writeFileSync(file, JSON.stringify({ 'generic.save': 'Sichern' }));

			expect(await service.getUiCatalog('de')).toEqual({ 'generic.save': 'Sichern' });
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
