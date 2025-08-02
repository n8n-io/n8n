import type englishBaseText from './locales/en.json';

export type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		};
	};
}
