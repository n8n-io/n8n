/**
 * @hidden
 */
export declare type _CompulsoryKeys<O extends object> = {
    [K in keyof O]-?: [O[K] & (undefined | null)] extends [never] ? K : never;
}[keyof O];
/**
 * Get the keys of `O` that are [[Compulsory]]
 *
 * (⚠️ needs `--strictNullChecks` enabled)
 * @param O
 * @returns [[Key]]
 * @example
 * ```ts
 * ```
 */
export declare type CompulsoryKeys<O extends object> = O extends unknown ? _CompulsoryKeys<O> : never;
