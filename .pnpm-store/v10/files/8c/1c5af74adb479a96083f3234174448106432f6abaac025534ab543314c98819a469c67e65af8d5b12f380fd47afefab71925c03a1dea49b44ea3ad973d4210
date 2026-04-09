import type { ILocaleService, LocaleTextFunc } from '../interfaces/iLocaleService';
export declare function _getLocaleTextFunc<TKey extends string = string>(localeSvc?: ILocaleService<TKey>): LocaleTextFunc<TKey>;
export declare function _translate<T extends Record<string, string | ((variableValues: string[]) => string)>>(bean: {
    getLocaleTextFunc(): LocaleTextFunc;
}, localeValues: T, key: keyof T & string, variableValues?: string[]): string;
export declare function _getLocaleTextFromFunc(getLocaleText: (params: {
    key: string;
    defaultValue: string;
    variableValues?: string[];
}) => string): LocaleTextFunc;
export declare function _getLocaleTextFromMap(localeText?: {
    [key: string]: string;
}): LocaleTextFunc;
