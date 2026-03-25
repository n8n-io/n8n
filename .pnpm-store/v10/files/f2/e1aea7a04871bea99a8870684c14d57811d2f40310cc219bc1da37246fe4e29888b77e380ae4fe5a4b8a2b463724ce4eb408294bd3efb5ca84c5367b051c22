export declare type I18nSettings = {
    amPm: [string, string];
    dayNames: Days;
    dayNamesShort: Days;
    monthNames: Months;
    monthNamesShort: Months;
    DoFn(dayOfMonth: number): string;
};
export declare type I18nSettingsOptional = Partial<I18nSettings>;
export declare type Days = [string, string, string, string, string, string, string];
export declare type Months = [string, string, string, string, string, string, string, string, string, string, string, string];
export declare function assign<A>(a: A): A;
export declare function assign<A, B>(a: A, b: B): A & B;
export declare function assign<A, B, C>(a: A, b: B, c: C): A & B & C;
export declare function assign<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
declare const defaultI18n: I18nSettings;
declare const setGlobalDateI18n: (i18n: I18nSettingsOptional) => I18nSettings;
declare const setGlobalDateMasks: (masks: {
    [key: string]: string;
}) => {
    [key: string]: string;
};
/***
 * Format a date
 * @method format
 * @param {Date|number} dateObj
 * @param {string} mask Format of the date, i.e. 'mm-dd-yy' or 'shortDate'
 * @returns {string} Formatted date string
 */
declare const format: (dateObj: Date, mask?: string, i18n?: I18nSettingsOptional) => string;
/**
 * Parse a date string into a Javascript Date object /
 * @method parse
 * @param {string} dateStr Date string
 * @param {string} format Date parse format
 * @param {i18n} I18nSettingsOptional Full or subset of I18N settings
 * @returns {Date|null} Returns Date object. Returns null what date string is invalid or doesn't match format
 */
declare function parse(dateStr: string, format: string, i18n?: I18nSettingsOptional): Date | null;
declare const _default: {
    format: (dateObj: Date, mask?: string, i18n?: Partial<I18nSettings>) => string;
    parse: typeof parse;
    defaultI18n: I18nSettings;
    setGlobalDateI18n: (i18n: Partial<I18nSettings>) => I18nSettings;
    setGlobalDateMasks: (masks: {
        [key: string]: string;
    }) => {
        [key: string]: string;
    };
};
export default _default;
export { format, parse, defaultI18n, setGlobalDateI18n, setGlobalDateMasks };
