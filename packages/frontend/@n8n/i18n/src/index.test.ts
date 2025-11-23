/* eslint-disable id-denylist */
import { I18nClass, loadLanguage, i18nInstance } from './index';
import type { LocaleMessages } from './types';

// Store original state for cleanup
let originalLocale: string;
let originalHtmlLang: string;
const testLocales = new Set<string>();

describe(I18nClass, () => {
	beforeAll(() => {
		// Set up basic i18n messages for displayTimer tests
		i18nInstance.global.setLocaleMessage('en', {
			genericHelpers: {
				millis: 'ms',
				secShort: 's',
				minShort: 'm',
				hrsShort: 'h',
			},
		} as unknown as LocaleMessages);
		originalLocale = i18nInstance.global.locale.value;
		originalHtmlLang = document.querySelector('html')?.getAttribute('lang') ?? 'en';
	});

	afterAll(() => {
		// Restore original locale and html lang
		i18nInstance.global.locale.value = originalLocale as 'en';
		document.querySelector('html')?.setAttribute('lang', originalHtmlLang);
	});

	describe('displayTimer', () => {
		it('should format duration with hours, minutes and seconds', () => {
			expect(new I18nClass().displayTimer(-1)).toBe('-1s');
			expect(new I18nClass().displayTimer(0)).toBe('0s');
			expect(new I18nClass().displayTimer(12)).toBe('0s');
			expect(new I18nClass().displayTimer(123)).toBe('0s');
			expect(new I18nClass().displayTimer(1234)).toBe('1s');
			expect(new I18nClass().displayTimer(59000)).toBe('59s');
			expect(new I18nClass().displayTimer(60000)).toBe('1m 0s');
			expect(new I18nClass().displayTimer(600000)).toBe('10m 0s');
			expect(new I18nClass().displayTimer(601234)).toBe('10m 1s');
			expect(new I18nClass().displayTimer(3599999)).toBe('59m 59s');
			expect(new I18nClass().displayTimer(3600000)).toBe('1h 0m 0s');
			expect(new I18nClass().displayTimer(3601234)).toBe('1h 0m 1s');
			expect(new I18nClass().displayTimer(6000000)).toBe('1h 40m 0s');
			expect(new I18nClass().displayTimer(100000000)).toBe('27h 46m 40s');
		});

		it('should include milliseconds if showMs=true and the time includes sub-seconds', () => {
			expect(new I18nClass().displayTimer(0, true)).toBe('0s');
			expect(new I18nClass().displayTimer(12, true)).toBe('12ms');
			expect(new I18nClass().displayTimer(123, true)).toBe('123ms');
			expect(new I18nClass().displayTimer(1012, true)).toBe('1.012s');
			expect(new I18nClass().displayTimer(1120, true)).toBe('1.12s');
			expect(new I18nClass().displayTimer(1234, true)).toBe('1.234s');
			expect(new I18nClass().displayTimer(600000, true)).toBe('10m 0s');
			expect(new I18nClass().displayTimer(601234, true)).toBe('10m 1.234s');
			expect(new I18nClass().displayTimer(3600000, true)).toBe('1h 0m 0s');
			expect(new I18nClass().displayTimer(3601234, true)).toBe('1h 0m 1.234s');
		});
	});
});

describe('loadLanguage', () => {
	beforeEach(() => {
		// Reset to English before each test
		i18nInstance.global.locale.value = 'en';
		document.querySelector('html')?.setAttribute('lang', 'en');
	});

	afterEach(() => {
		// Clean up test locales (we can't easily remove them, but we can reset to English)
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
		// Verify that numberFormats were set
		expect(i18nInstance.global.getNumberFormat(locale)).toBeDefined();
		testLocales.add(locale);
	});

	it('should not reload a language if it has already been loaded', () => {
		const locale = 'es';
		const originalMessages = { hello: 'Hola' } as unknown as LocaleMessages;
		const newMessages = { hello: 'Buenos días' } as unknown as LocaleMessages;

		// Load the language for the first time
		loadLanguage(locale, originalMessages);
		expect(i18nInstance.global.t('hello')).toBe('Hola');

		// Switch to English temporarily
		i18nInstance.global.locale.value = 'en';

		// Try to load the same language again with different messages
		const result = loadLanguage(locale, newMessages);

		// Should return the locale but not update the messages
		expect(result).toBe(locale);
		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('hello')).toBe('Hola'); // Should still be the original message
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

	it('should handle messages with nested objects', () => {
		const locale = 'pt';
		const messages = {
			nested: {
				deep: {
					message: 'Mensagem aninhada',
				},
			},
			simple: 'Simples',
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('nested.deep.message')).toBe('Mensagem aninhada');
		expect(i18nInstance.global.t('simple')).toBe('Simples');
		testLocales.add(locale);
	});

	it('should properly separate numberFormats from other messages', () => {
		const locale = 'ja';
		const messages = {
			greeting: 'こんにちは',
			farewell: 'さようなら',
			numberFormats: {
				currency: {
					style: 'currency',
					currency: 'JPY',
				},
				decimal: {
					style: 'decimal',
					minimumFractionDigits: 2,
				},
			},
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('greeting')).toBe('こんにちは');
		expect(i18nInstance.global.t('farewell')).toBe('さようなら');
		// numberFormats should not be accessible as regular translation messages
		expect(i18nInstance.global.te('numberFormats')).toBe(false);
		expect(i18nInstance.global.te('numberFormats.currency')).toBe(false);
		testLocales.add(locale);
	});

	it('should switch between already loaded languages', () => {
		const locale1 = 'fr-switch';
		const locale2 = 'de-switch';

		// Load first language
		loadLanguage(locale1, { hello: 'Bonjour' } as unknown as LocaleMessages);
		expect(i18nInstance.global.locale.value).toBe(locale1);
		expect(i18nInstance.global.t('hello')).toBe('Bonjour');

		// Load second language
		loadLanguage(locale2, { hello: 'Hallo' } as unknown as LocaleMessages);
		expect(i18nInstance.global.locale.value).toBe(locale2);
		expect(i18nInstance.global.t('hello')).toBe('Hallo');

		// Switch back to first language (should not reload messages)
		loadLanguage(locale1, { hello: 'Salut' } as unknown as LocaleMessages); // Different message
		expect(i18nInstance.global.locale.value).toBe(locale1);
		expect(i18nInstance.global.t('hello')).toBe('Bonjour'); // Should be original message
		testLocales.add(locale1);
		testLocales.add(locale2);
	});

	it('should return the locale that was set', () => {
		const locale = 'nl';
		const messages = { test: 'test' } as unknown as LocaleMessages;

		const result = loadLanguage(locale, messages);

		expect(result).toBe(locale);
		expect(typeof result).toBe('string');
		testLocales.add(locale);
	});

	it('should handle messages with special characters', () => {
		const locale = 'zh';
		const messages = {
			special: '特殊字符测试',
			emoji: '🚀 测试 🎉',
			mixed: 'Mixed 混合 content',
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('special')).toBe('特殊字符测试');
		expect(i18nInstance.global.t('emoji')).toBe('🚀 测试 🎉');
		expect(i18nInstance.global.t('mixed')).toBe('Mixed 混合 content');
		testLocales.add(locale);
	});

	it('should handle messages with undefined and null values', () => {
		const locale = 'test-null';
		const messages = {
			defined: 'Valid message',
			undefined,
			null: null,
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('defined')).toBe('Valid message');
		// Undefined and null values should fallback to the key
		expect(i18nInstance.global.t('undefined')).toBe('undefined');
		expect(i18nInstance.global.t('null')).toBe('null');
		testLocales.add(locale);
	});

	it('should handle messages with array values', () => {
		const locale = 'test-array';
		const messages = {
			items: ['item1', 'item2', 'item3'],
			nested: {
				list: ['a', 'b', 'c'],
			},
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		// Vue i18n handles arrays, but accessing them directly might not work as expected
		// This tests that the function doesn't crash with array values
		expect(() => i18nInstance.global.t('items')).not.toThrow();
		testLocales.add(locale);
	});

	it('should handle loading the same locale as current locale', () => {
		const currentLocale = 'en';
		const messages = {
			newMessage: 'This is a new message',
		} as unknown as LocaleMessages;

		// Ensure we're starting with English
		i18nInstance.global.locale.value = currentLocale;

		const result = loadLanguage(currentLocale, messages);

		expect(result).toBe(currentLocale);
		expect(i18nInstance.global.locale.value).toBe(currentLocale);
		expect(i18nInstance.global.t('newMessage')).toBe('This is a new message');
	});

	it('should handle numberFormats with complex structure', () => {
		const locale = 'complex-number';
		const messages = {
			greeting: 'Hello',
			numberFormats: {
				currency: {
					style: 'currency',
					currency: 'USD',
					currencyDisplay: 'symbol',
				},
				percent: {
					style: 'percent',
					minimumFractionDigits: 2,
				},
				decimal: {
					style: 'decimal',
					minimumFractionDigits: 0,
					maximumFractionDigits: 3,
				},
			},
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('greeting')).toBe('Hello');

		const numberFormats = i18nInstance.global.getNumberFormat(
			locale,
		) as typeof messages.numberFormats;
		expect(numberFormats).toBeDefined();
		expect(numberFormats.currency).toBeDefined();
		expect(numberFormats.percent).toBeDefined();
		expect(numberFormats.decimal).toBeDefined();
		testLocales.add(locale);
	});

	it('should handle messages with boolean and numeric values', () => {
		const locale = 'test-types';
		const messages = {
			boolTrue: true,
			boolFalse: false,
			number: 42,
			zero: 0,
			string: 'actual string',
		} as unknown as LocaleMessages;

		loadLanguage(locale, messages);

		expect(i18nInstance.global.locale.value).toBe(locale);
		expect(i18nInstance.global.t('string')).toBe('actual string');
		// Boolean and numeric values that are not strings will fallback to the key name
		// This is the expected behavior of vue-i18n when values are not strings
		expect(i18nInstance.global.t('boolTrue')).toBe('boolTrue');
		expect(i18nInstance.global.t('boolFalse')).toBe('boolFalse');
		expect(i18nInstance.global.t('number')).toBe('number');
		expect(i18nInstance.global.t('zero')).toBe('zero');
		testLocales.add(locale);
	});

	it('should preserve HTML document language attribute correctly', () => {
		const html = document.querySelector('html');
		const originalLang = html?.getAttribute('lang') ?? 'en';

		const locale1 = 'preserve-1';
		const locale2 = 'preserve-2';

		loadLanguage(locale1, { test: 'test1' } as unknown as LocaleMessages);
		expect(html?.getAttribute('lang')).toBe(locale1);

		loadLanguage(locale2, { test: 'test2' } as unknown as LocaleMessages);
		expect(html?.getAttribute('lang')).toBe(locale2);

		// Restore original
		html?.setAttribute('lang', originalLang);
		testLocales.add(locale1);
		testLocales.add(locale2);
	});
});
