import type englishBaseText from './locales/en.json';

export type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;
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
