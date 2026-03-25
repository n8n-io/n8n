export interface NumberFormatOptions extends Intl.NumberFormatOptions {
    /** Overrides default numbering system for the current locale. */
    numberingSystem?: string;
}
interface NumberRangeFormatPart extends Intl.NumberFormatPart {
    source: 'startRange' | 'endRange' | 'shared';
}
/**
 * A wrapper around Intl.NumberFormat providing additional options, polyfills, and caching for performance.
 */
export class NumberFormatter implements Intl.NumberFormat {
    constructor(locale: string, options?: NumberFormatOptions);
    /** Formats a number value as a string, according to the locale and options provided to the constructor. */
    format(value: number): string;
    /** Formats a number to an array of parts such as separators, digits, punctuation, and more. */
    formatToParts(value: number): Intl.NumberFormatPart[];
    /** Formats a number range as a string. */
    formatRange(start: number, end: number): string;
    /** Formats a number range as an array of parts. */
    formatRangeToParts(start: number, end: number): NumberRangeFormatPart[];
    /** Returns the resolved formatting options based on the values passed to the constructor. */
    resolvedOptions(): Intl.ResolvedNumberFormatOptions;
}
/**
 * A NumberParser can be used to perform locale-aware parsing of numbers from Unicode strings,
 * as well as validation of partial user input. It automatically detects the numbering system
 * used in the input, and supports parsing decimals, percentages, currency values, and units
 * according to the locale.
 */
export class NumberParser {
    constructor(locale: string, options?: Intl.NumberFormatOptions);
    /**
     * Parses the given string to a number. Returns NaN if a valid number could not be parsed.
     */
    parse(value: string): number;
    /**
     * Returns whether the given string could potentially be a valid number. This should be used to
     * validate user input as the user types. If a `minValue` or `maxValue` is provided, the validity
     * of the minus/plus sign characters can be checked.
     */
    isValidPartialNumber(value: string, minValue?: number, maxValue?: number): boolean;
    /**
     * Returns a numbering system for which the given string is valid in the current locale.
     * If no numbering system could be detected, the default numbering system for the current
     * locale is returned.
     */
    getNumberingSystem(value: string): string;
}

//# sourceMappingURL=types.d.ts.map
