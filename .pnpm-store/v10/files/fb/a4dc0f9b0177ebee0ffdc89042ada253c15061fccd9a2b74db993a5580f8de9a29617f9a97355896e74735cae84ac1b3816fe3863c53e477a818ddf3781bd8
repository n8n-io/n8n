/**
 * Parser for Args.directory and Flags.directory. Checks that the provided path
 * exists and is a directory.
 * @param input flag or arg input
 * @returns Promise<string>
 */
export declare const dirExists: (input: string) => Promise<string>;
/**
 * Parser for Args.file and Flags.file. Checks that the provided path
 * exists and is a file.
 * @param input flag or arg input
 * @returns Promise<string>
 */
export declare const fileExists: (input: string) => Promise<string>;
/**
 * Read a file from disk and cache its contents if in production environment.
 *
 * Will throw an error if the file does not exist.
 *
 * @param path file path of JSON file
 * @param useCache if false, ignore cache and read file from disk
 * @returns <T>
 */
export declare function readJson<T = unknown>(path: string, useCache?: boolean): Promise<T>;
/**
 * Safely read a file from disk and cache its contents if in production environment.
 *
 * Will return undefined if the file does not exist.
 *
 * @param path file path of JSON file
 * @param useCache if false, ignore cache and read file from disk
 * @returns <T> or undefined
 */
export declare function safeReadJson<T>(path: string, useCache?: boolean): Promise<T | undefined>;
export declare function existsSync(path: string): boolean;
