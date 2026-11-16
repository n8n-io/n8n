import { Container } from '@n8n/di';

import { LocalesConfig } from '../locales.config';

describe('LocalesConfig', () => {
	beforeEach(() => {
		Container.reset();
		vi.unstubAllEnvs();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('defaults to no extra locales and no user override', () => {
		const config = Container.get(LocalesConfig);

		expect(config.available).toEqual({});
		expect(config.userOverride).toBe(false);
	});

	test('parses a JSON map of locale definitions', () => {
		vi.stubEnv(
			'N8N_LOCALES',
			'{"de":{"name":"Deutsch","file":"/files/locales/de.json"},"fr":{"name":"Français","file":"/files/locales/fr.json"}}',
		);

		expect(Container.get(LocalesConfig).available).toEqual({
			de: { name: 'Deutsch', file: '/files/locales/de.json' },
			fr: { name: 'Français', file: '/files/locales/fr.json' },
		});
	});

	test('treats a blank value as no extra locales without a warning', () => {
		vi.stubEnv('N8N_LOCALES', '');

		expect(Container.get(LocalesConfig).available).toEqual({});
		expect(console.warn).not.toHaveBeenCalled();
	});

	test('falls back to the default on invalid JSON', () => {
		vi.stubEnv('N8N_LOCALES', '{not json');

		expect(Container.get(LocalesConfig).available).toEqual({});
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_LOCALES'));
	});

	test('parses an entry without a file', () => {
		vi.stubEnv('N8N_LOCALES', '{"de":{"name":"Deutsch"}}');

		expect(Container.get(LocalesConfig).available).toEqual({ de: { name: 'Deutsch' } });
	});

	test('falls back to the default when an entry has no name', () => {
		vi.stubEnv('N8N_LOCALES', '{"de":{"file":"/files/locales/de.json"}}');

		expect(Container.get(LocalesConfig).available).toEqual({});
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_LOCALES'));
	});

	test.each(['de/x', 'de.json', '../de', ''])(
		'falls back to the default for the locale code "%s"',
		(code) => {
			vi.stubEnv('N8N_LOCALES', JSON.stringify({ [code]: { name: 'Deutsch' } }));

			expect(Container.get(LocalesConfig).available).toEqual({});
			expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_LOCALES'));
		},
	);

	test('accepts locale codes with letters, digits, "-" and "_"', () => {
		vi.stubEnv('N8N_LOCALES', '{"pt-BR":{"name":"Português"},"zh_Hans2":{"name":"中文"}}');

		expect(Object.keys(Container.get(LocalesConfig).available)).toEqual(['pt-BR', 'zh_Hans2']);
	});

	describe('N8N_VERSIONED_LOCALES_BASE_URL', () => {
		test('is not set by default', () => {
			expect(Container.get(LocalesConfig).versionedBaseUrl).toBe('');
		});

		test.each(['https://translations.example.com/n8n', 'http://localhost:8080/'])(
			'accepts %s',
			(url) => {
				vi.stubEnv('N8N_VERSIONED_LOCALES_BASE_URL', url);

				expect(Container.get(LocalesConfig).versionedBaseUrl).toBe(url);
			},
		);

		test('treats a blank value as not set without a warning', () => {
			vi.stubEnv('N8N_VERSIONED_LOCALES_BASE_URL', '  ');

			expect(Container.get(LocalesConfig).versionedBaseUrl).toBe('');
			expect(console.warn).not.toHaveBeenCalled();
		});

		test.each(['not a url', 'ftp://translations.example.com', 'file:///files/locales'])(
			'falls back to the default for %s',
			(url) => {
				vi.stubEnv('N8N_VERSIONED_LOCALES_BASE_URL', url);

				expect(Container.get(LocalesConfig).versionedBaseUrl).toBe('');
				expect(console.warn).toHaveBeenCalledWith(
					expect.stringContaining('N8N_VERSIONED_LOCALES_BASE_URL'),
				);
			},
		);
	});

	test('reads the user override switch', () => {
		vi.stubEnv('N8N_LOCALE_USER_OVERRIDE', 'true');

		expect(Container.get(LocalesConfig).userOverride).toBe(true);
	});
});
