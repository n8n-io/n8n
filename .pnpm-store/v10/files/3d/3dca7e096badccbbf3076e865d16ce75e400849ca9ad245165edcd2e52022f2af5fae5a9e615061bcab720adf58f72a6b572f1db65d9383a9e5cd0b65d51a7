export declare const parse: (u: string | URL) => URL;
/**
 * Returns resolved target URL relative to a base URL in a manner similar to that of a Web browser resolving an anchor tag HREF.
 *
 * @returns
 */
export declare function resolve(from: string, to: string): string;
/**
 * Returns the current working directory (in Node) or the current page URL (in browsers).
 *
 * @returns
 */
export declare function cwd(): string;
/**
 * Returns the protocol of the given URL, or `undefined` if it has no protocol.
 *
 * @param path
 * @returns
 */
export declare function getProtocol(path: string | undefined): string | undefined;
/**
 * Returns the lowercased file extension of the given URL,
 * or an empty string if it has no extension.
 *
 * @param path
 * @returns
 */
export declare function getExtension(path: any): any;
/**
 * Removes the query, if any, from the given path.
 *
 * @param path
 * @returns
 */
export declare function stripQuery(path: any): any;
/**
 * Returns the hash (URL fragment), of the given path.
 * If there is no hash, then the root hash ("#") is returned.
 *
 * @param path
 * @returns
 */
export declare function getHash(path: undefined | string): string;
/**
 * Removes the hash (URL fragment), if any, from the given path.
 *
 * @param path
 * @returns
 */
export declare function stripHash(path?: string | undefined): string;
/**
 * Determines whether the given path is an HTTP(S) URL.
 *
 * @param path
 * @returns
 */
export declare function isHttp(path: string): boolean;
/**
 * Determines whether the given path is a filesystem path.
 * This includes "file://" URLs.
 *
 * @param path
 * @returns
 */
export declare function isFileSystemPath(path: string | undefined): boolean;
/**
 * Converts a filesystem path to a properly-encoded URL.
 *
 * This is intended to handle situations where JSON Schema $Ref Parser is called
 * with a filesystem path that contains characters which are not allowed in URLs.
 *
 * @example
 * The following filesystem paths would be converted to the following URLs:
 *
 *    <"!@#$%^&*+=?'>.json              ==>   %3C%22!@%23$%25%5E&*+=%3F\'%3E.json
 *    C:\\My Documents\\File (1).json   ==>   C:/My%20Documents/File%20(1).json
 *    file://Project #42/file.json      ==>   file://Project%20%2342/file.json
 *
 * @param path
 * @returns
 */
export declare function fromFileSystemPath(path: string): string;
/**
 * Converts a URL to a local filesystem path.
 */
export declare function toFileSystemPath(path: string | undefined, keepFileProtocol?: boolean): string;
/**
 * Converts a $ref pointer to a valid JSON Path.
 *
 * @param pointer
 * @returns
 */
export declare function safePointerToPath(pointer: any): any;
export declare function relative(from: string, to: string): string;
