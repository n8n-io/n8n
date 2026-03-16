/* eslint-disable id-denylist */
import { loadLanguage, i18nInstance } from './index';
import type { LocaleMessages } from './types';

const testLocales = new Set<string>();

describe('loadLanguage', () => {
	beforeEach(() => {
		i18nInstance.global.locale.value = 'en';
		document.querySelector('html')?.setAttribute('lang', 'en');
	});

	afterEach(() => {
		i18nInstance.global.locale.value = 'en';
		document.querySelector('html')?.setAttribute('lang', 'en');
	});

	it('should load a new language and set it as current locale', () => {
		const locale = 'de';
		const messages = {
			hello: 'Hallo',
			world: 'Welt',
		} as unknown as LocaleMessages;

		const result = loadLanguage(locale, messages);

		expect(result).toBe(locale);
		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('hello')).toBe('Hallo');
		expect(i18nInstance.global.t('world')).toBe('Welt');
		testLocales.add(locale);
	});

	it('should set the HTML lang attribute when loading a language', () => {
		const locale = 'fr';
		const messages = { greeting: 'Bonjour' } as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(document.querySelector('html')?.getAttribute('lang')).toBe(locale);
		testLocales.add(locale);
	});

	it('should handle number formats when provided in messages', () => {
		const locale = 'de-num';
		const messages = {
			hello: 'Hallo',
			numberFormats: {
				currency: {
					style: 'currency',
					currency: 'EUR',
				},
			},
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('hello')).toBe('Hallo');
		expect(i18nInstance.global.getNumberFormat(locale)).toBeDefined();
		testLocales.add(locale);
	});

	it('should not reload a language if it has already been loaded', () => {
		const locale = 'es';
		const originalMessages = { hello: 'Hola' } as unknown as LocaleMessages;
		const newMessages = { hello: 'Buenos días' } as unknown as LocaleMessages;

		loadLanguage(locale, originalMessages);
		expect(i18nInstance.global.t('hello')).toBe('Hola');

		i18nInstance.global.locale.value = 'en';

		const result = loadLanguage(locale, newMessages);

		expect(result).toBe(locale);
		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('hello')).toBe('Hola');
		testLocales.add(locale);
	});

	it('should handle empty messages object', () => {
		const locale = 'it';
		const messages = {} as unknown as LocaleMessages;

		const result = loadLanguage(locale, messages);

		expect(result).toBe(locale);
		expect(i18nInstance.global.locale.value).toBe(locale);
		testLocales.add(locale);
	});

	it('should return the locale that was set', () => {
		const locale = 'nl';
		const messages = { test: 'test' } as unknown as LocaleMessages;

		const result = loadLanguage(locale, messages);

		expect(result).toBe(locale);
		expect(typeof result).toBe('string');
		testLocales.add(locale);
	});
});
