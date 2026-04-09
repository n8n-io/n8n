import { GrpcTls, HttpTls } from './models/commonModel';
/**
 * Retrieves a boolean value from a configuration file parameter.
 * - Trims leading and trailing whitespace and ignores casing.
 * - Returns `undefined` if the value is empty, unset, or contains only whitespace.
 * - Returns `undefined` and a warning for values that cannot be mapped to a boolean.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {boolean} - The boolean value or `false` if the environment variable is unset empty, unset, or contains only whitespace.
 */
export declare function getBooleanFromConfigFile(value: unknown): boolean | undefined;
/**
 * Retrieves a list of booleans from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {boolean[] | undefined} - The list of strings or `undefined`.
 */
export declare function getBooleanListFromConfigFile(value: unknown): boolean[] | undefined;
/**
 * Retrieves a number from a configuration file parameter.
 * - Returns `undefined` if the environment variable is empty, unset, or contains only whitespace.
 * - Returns `undefined` and a warning if is not a number.
 * - Returns a number in all other cases.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {number | undefined} - The number value or `undefined`.
 */
export declare function getNumberFromConfigFile(value: unknown): number | undefined;
/**
 * Retrieves a list of numbers from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {number[] | undefined} - The list of numbers or `undefined`.
 */
export declare function getNumberListFromConfigFile(value: unknown): number[] | undefined;
/**
 * Retrieves a string from a configuration file parameter.
 * - Returns `undefined` if the variable is empty, unset, or contains only whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {string | undefined} - The string value or `undefined`.
 */
export declare function getStringFromConfigFile(value: unknown): string | undefined;
/**
 * Retrieves a list of strings from a configuration file parameter.
 * - Uses ',' as the delimiter.
 * - Trims leading and trailing whitespace from each entry.
 * - Excludes empty entries.
 * - Returns `undefined` if the variable is empty or contains only whitespace.
 * - Returns an empty array if all entries are empty or whitespace.
 *
 * @param {unknown} value - The value from the config file.
 * @returns {string[] | undefined} - The list of strings or `undefined`.
 */
export declare function getStringListFromConfigFile(value: unknown): string[] | undefined;
export declare function envVariableSubstitution(value: unknown): string | undefined;
export declare function getGrpcTlsConfig(certificateFile?: string, clientKeyFile?: string, clientCertificateFile?: string, insecure?: boolean): GrpcTls | undefined;
export declare function getHttpTlsConfig(certificateFile?: string, clientKeyFile?: string, clientCertificateFile?: string): HttpTls | undefined;
//# sourceMappingURL=utils.d.ts.map