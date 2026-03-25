declare const API_BASEPATH = "/api/v1";
declare const SERVER_ERROR_MESSAGE = "Failed to connect to Zep server. Please check that:\n- the server is running \n- the API URL is correct\n- No other process is using the same port";
declare const MINIMUM_SERVER_VERSION = "0.17.0";
declare const MIN_SERVER_WARNING_MESSAGE: string;
declare function warnDeprecation(functionName: string): void;
declare function isVersionGreaterOrEqual(version: string | null): boolean;
declare function handleRequest(requestPromise: Promise<Response>, notFoundMessage?: string | null): Promise<Response>;
export declare function toDictFilterEmpty(instance: any): any;
declare function isFloat(n: any): boolean;
/**
 * Joins the given paths into a single path.
 *
 * @param {...string[]} paths - The paths to join.
 * @returns {string} The joined path.
 */
declare function joinPaths(...paths: string[]): string;
export { warnDeprecation, handleRequest, SERVER_ERROR_MESSAGE, MIN_SERVER_WARNING_MESSAGE, MINIMUM_SERVER_VERSION, API_BASEPATH, isVersionGreaterOrEqual, isFloat, joinPaths, };
