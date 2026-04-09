import { KeyValuePair, DescribeCollectionResponse } from '../';
/**
 * Formats key-value data based on the provided keys.
 * @param {KeyValuePair[]} data - The array of key-value pairs.
 * @param {string[]} keys - The keys to include in the formatted result.
 * @returns {Object} - The formatted key-value data as an object.
 */
export declare const formatKeyValueData: (data: KeyValuePair[], keys: string[]) => {
    [x: string]: any;
};
/**
 * parse {row_count:4} to [{key:"row_count",value:"4"}]
 * @param data Object
 * @returns {KeyValuePair[]}
 */
export declare const parseToKeyValue: (data?: {
    [x: string]: any;
} | undefined, valueToString?: boolean) => KeyValuePair[];
/**
 *
 * @param number Number like 3.1738998889923096
 * @param precision The precision you want, if is 3 will return 3.173 and If is 2 will return 3.17
 * @returns
 */
export declare const formatNumberPrecision: (number: number, precision: number) => number;
/**
 * Checks if the given time parameter is valid.
 *
 * @param ts - The time parameter to be checked.
 * @returns A boolean value indicating whether the time parameter is valid or not.
 */
export declare const checkTimeParam: (ts: any) => boolean;
/**
 * Converts a hybrid timestamp to Unix time.
 * @param hybridts - The hybrid timestamp to convert.
 * @returns The Unix time representation of the hybrid timestamp.
 * @throws An error if the hybridts parameter fails the time parameter check.
 */
export declare const hybridtsToUnixtime: (hybridts: bigint | string) => string;
/**
 * Converts a Unix timestamp to a hybrid timestamp.
 * @param unixtime - The Unix timestamp to convert.
 * @returns The hybrid timestamp as a string.
 * @throws An error if the unixtime parameter fails the check.
 */
export declare const unixtimeToHybridts: (unixtime: bigint | string) => string;
/**
 * Converts a JavaScript Date object to a hybridts timestamp.
 * @param datetime - The JavaScript Date object to be converted.
 * @returns The hybridts timestamp.
 * @throws An error if the input is not a valid Date object.
 */
export declare const datetimeToHybrids: (datetime: Date) => string;
/**
 * Converts a string to base64 encoding.
 * @param str The string to convert.
 * @returns The base64 encoded string.
 */
export declare const stringToBase64: (str: string) => string;
/**
 * Formats the given address by removing the http or https prefix and appending the default Milvus port if necessary.
 * @param address The address to format.
 * @returns The formatted address.
 */
export declare const formatAddress: (address: string) => string;
/**
 * Parses a time token and returns the corresponding number of milliseconds.
 *
 * @param {string} token - The time token to parse.
 * @returns {number} The number of milliseconds corresponding to the time token.
 * @throws {Error} If the time token is invalid.
 */
export declare const parseTimeToken: (token: string) => number;
/**
 * Extracts the method name from a URL path.
 *
 * @param {string} query - The URL path to extract the method name from.
 * @returns {string} The extracted method name.
 */
export declare const extractMethodName: (query: string) => string;
/**dd
 * Creates a deep copy of the provided object using JSON.parse and JSON.stringify.
 * Note that this function is not efficient and may cause performance issues if used with large or complex objects. It also does not handle cases where the object being cloned contains functions or prototype methods.
 *
 * @typeparam T The type of object being cloned.
 * @param {T} obj - The object to clone.
 * @returns {T} A new object with the same properties and values as the original.
 */
export declare const cloneObj: <T>(obj: T) => T;
/**
 * Formats a `DescribeCollectionResponse` object by adding a `dataType` property to each field object in its `schema` array.
 * The `dataType` property represents the numerical value of the `data_type` property.
 *
 * @param {DescribeCollectionResponse} data - The `DescribeCollectionResponse` object to format.
 * @returns {DescribeCollectionResponse} A new `DescribeCollectionResponse` object with the updated `dataType` properties.
 */
export declare const formatDescribedCol: (data: DescribeCollectionResponse) => DescribeCollectionResponse;
