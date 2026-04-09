/// <reference types="node" />
/**
 * Redis command list
 *
 * All commands are lowercased.
 */
export declare const list: string[];
/**
 * Check if the command exists
 */
export declare function exists(commandName: string, options?: {
    caseInsensitive?: boolean;
}): boolean;
/**
 * Check if the command has the flag
 *
 * Some of possible flags: readonly, noscript, loading
 */
export declare function hasFlag(commandName: string, flag: string, options?: {
    nameCaseInsensitive?: boolean;
}): boolean;
/**
 * Get indexes of keys in the command arguments
 *
 * @example
 * ```javascript
 * getKeyIndexes('set', ['key', 'value']) // [0]
 * getKeyIndexes('mget', ['key1', 'key2']) // [0, 1]
 * ```
 */
export declare function getKeyIndexes(commandName: string, args: (string | Buffer | number)[], options?: {
    parseExternalKey?: boolean;
    nameCaseInsensitive?: boolean;
}): number[];
