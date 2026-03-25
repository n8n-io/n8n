import { Charmap } from '../../data/charmap';
export declare type OptionReplaceArrayItem = [string | RegExp, string];
export declare type OptionReplaceArray = OptionReplaceArrayItem[];
export interface OptionReplaceObject {
    [from: string]: string;
}
export declare type OptionReplaceCombined = OptionReplaceArray | OptionReplaceObject;
export interface OptionsTransliterate {
    /**
     * Ignore a list of strings untouched
     * @example tr('你好，世界', { ignore: ['你'] }) // 你 Hao , Shi Jie
     */
    ignore?: string[];
    /**
     * Replace a list of string / regex in the source string into the provided target string before transliteration
     * The option can either be an array or an object
     * @example tr('你好，世界', { replace: {你: 'You'} }) // You Hao , Shi Jie
     * @example tr('你好，世界', { replace: [['你', 'You']] }) // You Hao , Shi Jie
     * @example tr('你好，世界', { replace: [[/你/g, 'You']] }) // You Hao , Shi Jie
     */
    replace?: OptionReplaceCombined;
    /**
     * Same as `replace` but after transliteration
     */
    replaceAfter?: OptionReplaceCombined;
    /**
     * Decides whether or not to trim the result string after transliteration
     * @default false
     */
    trim?: boolean;
    /**
     * Any characters not known by this library will be replaced by a specific string `unknown`
     * @default ''
     */
    unknown?: string;
    /**
     * Fix Chinese spacing. For example, `你好` is transliterated to `Ni Hao` instead of `NiHao`. If you don't need to transliterate Chinese characters, set it to false to false to improve performance.
     * @default true
     */
    fixChineseSpacing?: boolean;
}
export interface OptionsSlugify extends OptionsTransliterate {
    /**
     * Whether the result need to be converted into lowercase
     * @default true
     */
    lowercase?: boolean;
    /**
     * Whether the result need to be converted into uppercase
     * @default false
     */
    uppercase?: boolean;
    /**
     * Custom separator string
     * @default '-'
     */
    separator?: string;
    /**
     * Allowed characters.
     * When `allowedChars` is set to `'abc'`, then only characters match `/[abc]/g` will be preserved.
     * Other characters will all be converted to `separator`
     * @default 'a-zA-Z0-9-_.~''
     */
    allowedChars?: string;
    /**
     * Fix Chinese spacing. For example, `你好` is transliterated to `Ni Hao` instead of `NiHao`. If you don't need to transliterate Chinese characters, set it to false to false to improve performance.
     */
    fixChineseSpacing?: boolean;
}
export declare type Options = OptionsTransliterate | OptionsSlugify;
export declare type IntervalArray = [number, number][];
interface TransliterationFunction<T> {
    (source: string, options?: T): string;
    /**
     * Set default config
     * @param options
     * @param reset
     */
    config: (options?: T, reset?: boolean) => T;
    /**
     * Set charmap data
     * @param data
     * @param reset
     * @memberof Transliterate
     */
    setData: (data?: Charmap, reset?: boolean) => Charmap;
    /**
     * Used by browser
     */
    noConflict?: () => TransliterationFunction<T>;
}
export declare type TransliterateFunction = TransliterationFunction<OptionsTransliterate>;
export declare type SlugifyFunction = TransliterationFunction<OptionsSlugify>;
export interface BrowserGlobalObject {
    transl: TransliterateFunction;
    transliterate: TransliterateFunction;
    slugify: SlugifyFunction;
}
export {};
