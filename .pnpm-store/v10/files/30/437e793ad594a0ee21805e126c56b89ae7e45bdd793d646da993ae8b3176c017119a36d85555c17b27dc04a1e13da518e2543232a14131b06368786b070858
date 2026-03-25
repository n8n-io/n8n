/**
 * A utility for converting snake_case to camelCase.
 *
 * For, for example `my_snake_string` becomes `mySnakeString`.
 */
export type SnakeToCamel<S> = S extends `${infer FirstWord}_${infer Remainder}` ? `${FirstWord}${Capitalize<SnakeToCamel<Remainder>>}` : S;
/**
 * A utility for converting an type's keys from snake_case
 * to camelCase, if the keys are strings.
 *
 * For example:
 *
 * ```ts
 * {
 *   my_snake_string: boolean;
 *   myCamelString: string;
 *   my_snake_obj: {
 *     my_snake_obj_string: string;
 *   };
 * }
 * ```
 *
 * becomes:
 *
 * ```ts
 * {
 *   mySnakeString: boolean;
 *   myCamelString: string;
 *   mySnakeObj: {
 *     mySnakeObjString: string;
 *   }
 * }
 * ```
 *
 * @remarks
 *
 * The generated documentation for the camelCase'd properties won't be available
 * until {@link https://github.com/microsoft/TypeScript/issues/50715} has been
 * resolved.
 */
export type SnakeToCamelObject<T> = {
    [K in keyof T as SnakeToCamel<K>]: T[K] extends {} ? SnakeToCamelObject<T[K]> : T[K];
};
/**
 * A utility for adding camelCase versions of a type's snake_case keys, if the
 * keys are strings, preserving any existing keys.
 *
 * For example:
 *
 * ```ts
 * {
 *   my_snake_boolean: boolean;
 *   myCamelString: string;
 *   my_snake_obj: {
 *     my_snake_obj_string: string;
 *   };
 * }
 * ```
 *
 * becomes:
 *
 * ```ts
 * {
 *   my_snake_boolean: boolean;
 *   mySnakeBoolean: boolean;
 *   myCamelString: string;
 *   my_snake_obj: {
 *     my_snake_obj_string: string;
 *   };
 *   mySnakeObj: {
 *     mySnakeObjString: string;
 *   }
 * }
 * ```
 * @remarks
 *
 * The generated documentation for the camelCase'd properties won't be available
 * until {@link https://github.com/microsoft/TypeScript/issues/50715} has been
 * resolved.
 *
 * Tracking: {@link https://github.com/googleapis/google-auth-library-nodejs/issues/1686}
 */
export type OriginalAndCamel<T> = {
    [K in keyof T as K | SnakeToCamel<K>]: T[K] extends {} ? OriginalAndCamel<T[K]> : T[K];
};
/**
 * Returns the camel case of a provided string.
 *
 * @remarks
 *
 * Match any `_` and not `_` pair, then return the uppercase of the not `_`
 * character.
 *
 * @param str the string to convert
 * @returns the camelCase'd string
 */
export declare function snakeToCamel<T extends string>(str: T): SnakeToCamel<T>;
/**
 * Get the value of `obj[key]` or `obj[camelCaseKey]`, with a preference
 * for original, non-camelCase key.
 *
 * @param obj object to lookup a value in
 * @returns a `get` function for getting `obj[key || snakeKey]`, if available
 */
export declare function originalOrCamelOptions<T extends {}>(obj?: T): {
    get: <K extends keyof OriginalAndCamel<T> & string>(key: K) => OriginalAndCamel<T>[K];
};
export interface LRUCacheOptions {
    /**
     * The maximum number of items to cache.
     */
    capacity: number;
    /**
     * An optional max age for items in milliseconds.
     */
    maxAge?: number;
}
/**
 * A simple LRU cache utility.
 * Not meant for external usage.
 *
 * @experimental
 */
export declare class LRUCache<T> {
    #private;
    readonly capacity: number;
    maxAge?: number;
    constructor(options: LRUCacheOptions);
    /**
     * Add an item to the cache.
     *
     * @param key the key to upsert
     * @param value the value of the key
     */
    set(key: string, value: T): void;
    /**
     * Get an item from the cache.
     *
     * @param key the key to retrieve
     */
    get(key: string): T | undefined;
}
export declare function removeUndefinedValuesInObject(object: {
    [key: string]: any;
}): {
    [key: string]: any;
};
