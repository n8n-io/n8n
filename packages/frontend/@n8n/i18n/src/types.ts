import type englishBaseText from './locales/en.json';

export type GetBaseTextKey<T> = T extends `_${string}` ? never : T;

export type BaseTextKey = GetBaseTextKey<keyof typeof englishBaseText>;

export type GetCategoryName<T> = T extends `nodeCreator.categoryNames.${infer C}` ? C : never;

export type CategoryName = GetCategoryName<keyof typeof englishBaseText>;

export interface INodeTranslationHeaders {
	data: {
		[key: string]: {
			displayName: string;
			description: string;
		};
	};
}
