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

	test('falls back to the default when an entry has no file', () => {
		vi.stubEnv('N8N_LOCALES', '{"de":{"name":"Deutsch"}}');

		expect(Container.get(LocalesConfig).available).toEqual({});
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('N8N_LOCALES'));
	});

	test('reads the user override switch', () => {
		vi.stubEnv('N8N_LOCALE_USER_OVERRIDE', 'true');

		expect(Container.get(LocalesConfig).userOverride).toBe(true);
	});
});
