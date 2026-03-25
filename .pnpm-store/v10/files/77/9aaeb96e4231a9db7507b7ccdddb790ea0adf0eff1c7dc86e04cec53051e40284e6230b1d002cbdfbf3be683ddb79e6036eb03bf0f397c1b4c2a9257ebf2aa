import type { LocaleService } from './localeService';
export type LocaleTextFunc = (key: string, defaultValue: string, variableValues?: string[]) => string;
export declare function _getLocaleTextFunc(localeSvc?: LocaleService): LocaleTextFunc;
export declare function _translate<T extends Record<string, string | ((variableValues: string[]) => string)>>(bean: {
    getLocaleTextFunc(): LocaleTextFunc;
}, localeValues: T, key: keyof T & string, variableValues?: string[]): string;
