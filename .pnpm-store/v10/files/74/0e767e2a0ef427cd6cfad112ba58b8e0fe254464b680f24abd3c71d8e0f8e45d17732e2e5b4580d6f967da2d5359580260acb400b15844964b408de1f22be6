/**
 * Serialises a Date to a string of format `yyyy-MM-ddTHH:mm:ss`.
 * An alternative separator can be provided to be used instead of hyphens.
 * @param date The date to serialise
 * @param includeTime Whether to include the time in the serialised string
 * @param separator The separator to use between date and time parts (default 'T')
 */
export declare function _serialiseDate(date: Date | null, includeTime?: boolean, separator?: string): string | null;
/**
 * Helper function to get the date parts of a date. Used in set filter.
 * @param d The date to get the parts from
 * @param includeTime Whether to include the time in the returned array
 * @returns The date parts as an array of strings or null if the date is null or undefined
 */
export declare function _getDateParts(d: Date | null | undefined, includeTime?: boolean): null | string[];
export declare const MONTHS: string[];
/**
 * Serialises a Date to a string of format the defined format, does not include time.
 * @param date The date to serialise
 * @param format The string to format the date to, defaults to YYYY-MM-DD
 */
export declare function _dateToFormattedString(date: Date, format?: string): string;
/**
 * Helper function to check if a date is valid. Use isValidDateTime() to check if a date is valid and has time parts.
 */
export declare function _isValidDate(value?: string | null, bailIfInvalidTime?: boolean): boolean;
export declare function _isValidDateTime(value?: string | null): boolean;
/**
 * Parses a date and time from a string. Expected format is ISO-compatible `yyyy-MM-dd` or `yyyy-MM-ddTHH:mm:ssZ`.
 *
 * Because of javascript historical reasons, we need to parse the datetime manually:
 * Per MDN:
 *   When the time zone offset is absent, **date-only** forms are interpreted as a UTC time and **date-time** forms are interpreted as a local time.
 *   The interpretation as a UTC time is due to a historical spec error that was not consistent with ISO 8601 but could not be changed due to web compatibility.
 */
export declare function _parseDateTimeFromString(value?: string | null, bailIfInvalidTime?: boolean, skipValidation?: boolean): Date | null;
