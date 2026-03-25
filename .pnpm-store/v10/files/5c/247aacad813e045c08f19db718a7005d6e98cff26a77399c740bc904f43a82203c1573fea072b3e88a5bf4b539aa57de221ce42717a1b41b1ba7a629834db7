/**
 * A process environment variable name and its value.  Used by {@link EnvironmentMap}.
 * @public
 */
export interface IEnvironmentEntry {
    /**
     * The name of the environment variable.
     */
    name: string;
    /**
     * The value of the environment variable.
     */
    value: string;
}
/**
 * A map data structure that stores process environment variables.  On Windows
 * operating system, the variable names are case-insensitive.
 * @public
 */
export declare class EnvironmentMap {
    private readonly _map;
    /**
     * Whether the environment variable names are case-sensitive.
     *
     * @remarks
     * On Windows operating system, environment variables are case-insensitive.
     * The map will preserve the variable name casing from the most recent assignment operation.
     */
    readonly caseSensitive: boolean;
    constructor(environmentObject?: Record<string, string | undefined>);
    /**
     * Clears all entries, resulting in an empty map.
     */
    clear(): void;
    /**
     * Assigns the variable to the specified value.  A previous value will be overwritten.
     *
     * @remarks
     * The value can be an empty string.  To completely remove the entry, use
     * {@link EnvironmentMap.unset} instead.
     */
    set(name: string, value: string): void;
    /**
     * Removes the key from the map, if present.
     */
    unset(name: string): void;
    /**
     * Returns the value of the specified variable, or `undefined` if the map does not contain that name.
     */
    get(name: string): string | undefined;
    /**
     * Returns the map keys, which are environment variable names.
     */
    names(): IterableIterator<string>;
    /**
     * Returns the map entries.
     */
    entries(): IterableIterator<IEnvironmentEntry>;
    /**
     * Adds each entry from `environmentMap` to this map.
     */
    mergeFrom(environmentMap: EnvironmentMap): void;
    /**
     * Merges entries from a plain JavaScript object, such as would be used with the `process.env` API.
     */
    mergeFromObject(environmentObject?: Record<string, string | undefined>): void;
    /**
     * Returns the keys as a plain JavaScript object similar to the object returned by the `process.env` API.
     */
    toObject(): Record<string, string>;
}
//# sourceMappingURL=EnvironmentMap.d.ts.map