import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
	DEFAULT_LOCALE,
	i18n,
	resolveLocale,
	setLocaleFromHost,
	SUPPORTED_LOCALES,
	type SupportedLocale,
} from './index';

describe('mcp-apps i18n', () => {
	beforeEach(() => {
		i18n.global.locale.value = DEFAULT_LOCALE;
		document.documentElement.removeAttribute('lang');
	});

	afterEach(() => {
		i18n.global.locale.value = DEFAULT_LOCALE;
		document.documentElement.removeAttribute('lang');
	});

	describe('resolveLocale', () => {
		it.each<[string, string | undefined | null, SupportedLocale]>([
			['returns default when input is undefined', undefined, DEFAULT_LOCALE],
			['returns default when input is null', null, DEFAULT_LOCALE],
			['returns default when input is empty', '', DEFAULT_LOCALE],
			['returns the matching language for an exact match', 'en', 'en'],
			['returns the matching language from a BCP 47 tag', 'en-US', 'en'],
			['lowercases the language tag', 'EN-gb', 'en'],
			['returns the matching language for another supported locale', 'ko', 'ko'],
			[
				'returns the matching language from a BCP 47 tag for another supported locale',
				'ko-KR',
				'ko',
			],
			['falls back to default for unsupported languages', 'zz-ZZ', DEFAULT_LOCALE],
		])('%s', (_label, input, expected) => {
			expect(resolveLocale(input)).toBe(expected);
		});

		it('only includes supported locales', () => {
			expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE);
		});

		it('every supported locale ships a message file with the same keys as the default locale', () => {
			const defaultMessages = i18n.global.getLocaleMessage(DEFAULT_LOCALE);
			const defaultKeys = Object.keys(defaultMessages).sort();

			for (const locale of SUPPORTED_LOCALES) {
				const messages = i18n.global.getLocaleMessage(locale);
				expect(Object.keys(messages).sort(), `locale "${locale}" key parity`).toEqual(defaultKeys);
			}
		});
	});

	describe('setLocaleFromHost', () => {
		it('applies the resolved locale to the i18n instance', () => {
			expect(setLocaleFromHost('en-US')).toBe('en');
			expect(i18n.global.locale.value).toBe('en');
		});

		it('applies another supported locale to the i18n instance', () => {
			expect(setLocaleFromHost('ko-KR')).toBe('ko');
			expect(i18n.global.locale.value).toBe('ko');
		});

		it('falls back to the default locale for unsupported tags', () => {
			expect(setLocaleFromHost('zz-ZZ')).toBe(DEFAULT_LOCALE);
			expect(i18n.global.locale.value).toBe(DEFAULT_LOCALE);
		});

		it('reflects the resolved locale on `<html lang>` for assistive tech', () => {
			setLocaleFromHost('en-GB');
			expect(document.documentElement.getAttribute('lang')).toBe('en');
		});
	});
});
