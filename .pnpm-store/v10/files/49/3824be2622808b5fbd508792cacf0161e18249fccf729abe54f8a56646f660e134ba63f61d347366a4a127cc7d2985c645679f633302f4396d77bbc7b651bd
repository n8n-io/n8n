/**
 * Metadata is information about a particular RPC call (such as authentication
 * details) in the form of a list of key-value pairs, where the keys are strings
 * and the values are strings or binary data.
 */
export type Metadata = {
    /**
     * Sets the value of a metadata with a given key.
     *
     * The value must be binary if and only if the key ends with '-bin'.
     *
     * Multiple string metadata values are always joined to a single string with
     * a comma. It is not recommended to use multiple binary metadata values
     * either, because some gRPC implementations may not support it.
     */
    set<Key extends string>(key: Key, value: MetadataValue<Key> | Array<MetadataValue<Key>>): Metadata;
    /**
     * Appends the value to an array of metadata with a given key.
     *
     * The value must be binary if and only if the key ends with '-bin'.
     *
     * Multiple string metadata values are always joined to a single string with
     * a comma. It is not recommended to use multiple binary metadata values
     * either, because some gRPC implementations may not support it.
     */
    append<Key extends string>(key: Key, value: MetadataValue<Key>): Metadata;
    /**
     * Clears all values of a metadata with a given key.
     */
    delete(key: string): void;
    /**
     * Returns the value of a metadata with a given key.
     *
     * If there are multiple binary values, the first one is returned.
     *
     * Multiple string metadata values are always joined to a single string with
     * a comma. It is not recommended to use multiple binary metadata values
     * either, because some gRPC implementations may not support it.
     */
    get<Key extends string>(key: Key): MetadataValue<Key> | undefined;
    /**
     * Returns an array of all the values of a metadata with a given key.
     *
     * Multiple string metadata values are always joined to a single string with
     * a comma. It is not recommended to use multiple binary metadata values
     * either, because some gRPC implementations may not support it.
     */
    getAll<Key extends string>(key: Key): Array<MetadataValue<Key>>;
    /**
     * Checks whether there is at least one value of a metadata with a given key.
     */
    has(key: string): boolean;
    [Symbol.iterator](): IterableIterator<[string, Array<string | Uint8Array>]>;
};
export type MetadataValue<Key extends string> = string extends Key ? string | Uint8Array : Lowercase<Key> extends `${string}-bin` ? Uint8Array : string;
export type MetadataInit = Metadata | Iterable<[string, string | Uint8Array | Array<string | Uint8Array>]> | Record<string, string | Uint8Array | Array<string | Uint8Array>>;
export type MetadataConstructor = {
    new (init?: MetadataInit): Metadata;
    (init?: MetadataInit): Metadata;
};
export declare const Metadata: MetadataConstructor;
