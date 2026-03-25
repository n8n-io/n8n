/**
 * @hidden
 */
export declare type _NullableKeys<O extends object> = {
    [K in keyof O]-?: [O[K] & (undefined | null)] extends [never] ? never : K;
}[keyof O];
/**
 * Get the keys of `O` that are nullable
 *
 * (⚠️ needs `--strictNullChecks` enabled)
 * @param O
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type NullableKeys<O extends object> = O extends unknown ? _NullableKeys<O> : never;
