import type englishBaseText from './locales/en.json';

export type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

/**
 * Interface for extension locale keys.
 * This can be augmented by other packages (e.g., editor-ui) to add extension-specific keys.
 *
 * @example
 * // In editor-ui or another package:
 * declare module '@n8n/i18n' {
 *   interface ExtensionLocaleKeys {
 *     'ce.myExtension.title': true;
 *   }
 * }
 */
export interface ExtensionLocaleKeys {}

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText> | keyof ExtensionLocaleKeys;
export type LocaleMessages = typeof englishBaseText & {
	numberFormats: { [key: string]: Intl.NumberFormatOptions };
};

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		};
	};
}
