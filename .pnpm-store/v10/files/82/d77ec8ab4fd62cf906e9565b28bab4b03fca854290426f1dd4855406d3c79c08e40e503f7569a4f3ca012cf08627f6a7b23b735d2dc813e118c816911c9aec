import * as querystring from 'querystring';
import { PassThrough } from 'stream';
export declare function normalize<T = {}, U = Function>(optionsOrCallback?: T | U, cb?: U): {
    options: T;
    callback: U;
};
/**
 * Flatten an object into an Array of arrays, [[key, value], ..].
 * Implements Object.entries() for Node.js <8
 * @internal
 */
export declare function objectEntries<T>(obj: {
    [key: string]: T;
}): Array<[string, T]>;
/**
 * Encode `str` with encodeURIComponent, plus these
 * reserved characters: `! * ' ( )`.
 *
 * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent| MDN: fixedEncodeURIComponent}
 *
 * @param {string} str The URI component to encode.
 * @return {string} The encoded string.
 */
export declare function fixedEncodeURIComponent(str: string): string;
/**
 * URI encode `uri` for generating signed URLs, using fixedEncodeURIComponent.
 *
 * Encode every byte except `A-Z a-Z 0-9 ~ - . _`.
 *
 * @param {string} uri The URI to encode.
 * @param [boolean=false] encodeSlash If `true`, the "/" character is not encoded.
 * @return {string} The encoded string.
 */
export declare function encodeURI(uri: string, encodeSlash: boolean): string;
/**
 * Serialize an object to a URL query string using util.encodeURI(uri, true).
 * @param {string} url The object to serialize.
 * @return {string} Serialized string.
 */
export declare function qsStringify(qs: querystring.ParsedUrlQueryInput): string;
export declare function objectKeyToLowercase<T>(object: {
    [key: string]: T;
}): {
    [key: string]: T;
};
/**
 * JSON encode str, with unicode \u+ representation.
 * @param {object} obj The object to encode.
 * @return {string} Serialized string.
 */
export declare function unicodeJSONStringify(obj: object): string;
/**
 * Converts the given objects keys to snake_case
 * @param {object} obj object to convert keys to snake case.
 * @returns {object} object with keys converted to snake case.
 */
export declare function convertObjKeysToSnakeCase(obj: object): object;
/**
 * Formats the provided date object as a UTC ISO string.
 * @param {Date} dateTimeToFormat date object to be formatted.
 * @param {boolean} includeTime flag to include hours, minutes, seconds in output.
 * @param {string} dateDelimiter delimiter between date components.
 * @param {string} timeDelimiter delimiter between time components.
 * @returns {string} UTC ISO format of provided date obect.
 */
export declare function formatAsUTCISO(dateTimeToFormat: Date, includeTime?: boolean, dateDelimiter?: string, timeDelimiter?: string): string;
/**
 * Examines the runtime environment and returns the appropriate tracking string.
 * @returns {string} metrics tracking string based on the current runtime environment.
 */
export declare function getRuntimeTrackingString(): string;
/**
 * Looks at package.json and creates the user-agent string to be applied to request headers.
 * @returns {string} user agent string.
 */
export declare function getUserAgentString(): string;
export declare function getDirName(): string;
export declare function getModuleFormat(): "ESM" | "CJS";
export declare class PassThroughShim extends PassThrough {
    private shouldEmitReading;
    private shouldEmitWriting;
    _read(size: number): void;
    _write(chunk: never, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void;
    _final(callback: (error?: Error | null | undefined) => void): void;
}
