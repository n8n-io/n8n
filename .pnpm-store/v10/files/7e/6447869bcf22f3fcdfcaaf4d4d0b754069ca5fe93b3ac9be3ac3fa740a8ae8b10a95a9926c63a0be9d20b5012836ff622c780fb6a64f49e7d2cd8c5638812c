/**
 * @internal
 *
 * Parses a value into a Date. Returns undefined if the input is null or
 * undefined, throws an error if the input is not a number or a parseable string.
 *
 * Input strings must be an integer or floating point number. Fractional seconds are supported.
 *
 * @param value - the value to parse
 * @returns a Date or undefined
 */
export declare const _parseEpochTimestamp: (value: unknown) => Date | undefined;
/**
 * @internal
 *
 * Parses a value into a Date. Returns undefined if the input is null or
 * undefined, throws an error if the input is not a string that can be parsed
 * as an RFC 3339 date.
 *
 * Input strings must conform to RFC3339 section 5.6, and can have a UTC
 * offset. Fractional precision is supported.
 *
 * @see {@link https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14}
 *
 * @param value - the value to parse
 * @returns a Date or undefined
 */
export declare const _parseRfc3339DateTimeWithOffset: (value: unknown) => Date | undefined;
/**
 * @internal
 *
 * Parses a value into a Date. Returns undefined if the input is null or
 * undefined, throws an error if the input is not a string that can be parsed
 * as an RFC 7231 date.
 *
 * Input strings must conform to RFC7231 section 7.1.1.1. Fractional seconds are supported.
 *
 * RFC 850 and unix asctime formats are also accepted.
 * todo: practically speaking, are RFC 850 and asctime even used anymore?
 * todo: can we remove those parts?
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc7231.html#section-7.1.1.1}
 *
 * @param value - the value to parse.
 * @returns a Date or undefined.
 */
export declare const _parseRfc7231DateTime: (value: unknown) => Date | undefined;
