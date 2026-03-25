/**
 * @hidden
 */
export declare type _NonNullableKeys<O extends object> = {
    [K in keyof O]-?: [O[K] & (undefined | null)] extends [never] ? K : never;
}[keyof O];
/**
 * Get the keys of `O` that are non-nullable
 *
 * (⚠️ needs `--strictNullChecks` enabled)
 * @param O
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type NonNullableKeys<O extends object> = O extends unknown ? _NonNullableKeys<O> : never;
