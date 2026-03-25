import * as http2 from 'http2';
export type MetadataValue = string | Buffer;
export type MetadataObject = Map<string, MetadataValue[]>;
export interface MetadataOptions {
    idempotentRequest?: boolean;
    waitForReady?: boolean;
    cacheableRequest?: boolean;
    corked?: boolean;
}
/**
 * A class for storing metadata. Keys are normalized to lowercase ASCII.
 */
export declare class Metadata {
    protected internalRepr: MetadataObject;
    private options;
    constructor(options?: MetadataOptions);
    /**
     * Sets the given value for the given key by replacing any other values
     * associated with that key. Normalizes the key.
     * @param key The key to whose value should be set.
     * @param value The value to set. Must be a buffer if and only
     *   if the normalized key ends with '-bin'.
     */
    set(key: string, value: MetadataValue): void;
    /**
     * Adds the given value for the given key by appending to a list of previous
     * values associated with that key. Normalizes the key.
     * @param key The key for which a new value should be appended.
     * @param value The value to add. Must be a buffer if and only
     *   if the normalized key ends with '-bin'.
     */
    add(key: string, value: MetadataValue): void;
    /**
     * Removes the given key and any associated values. Normalizes the key.
     * @param key The key whose values should be removed.
     */
    remove(key: string): void;
    /**
     * Gets a list of all values associated with the key. Normalizes the key.
     * @param key The key whose value should be retrieved.
     * @return A list of values associated with the given key.
     */
    get(key: string): MetadataValue[];
    /**
     * Gets a plain object mapping each key to the first value associated with it.
     * This reflects the most common way that people will want to see metadata.
     * @return A key/value mapping of the metadata.
     */
    getMap(): {
        [key: string]: MetadataValue;
    };
    /**
     * Clones the metadata object.
     * @return The newly cloned object.
     */
    clone(): Metadata;
    /**
     * Merges all key-value pairs from a given Metadata object into this one.
     * If both this object and the given object have values in the same key,
     * values from the other Metadata object will be appended to this object's
     * values.
     * @param other A Metadata object.
     */
    merge(other: Metadata): void;
    setOptions(options: MetadataOptions): void;
    getOptions(): MetadataOptions;
    /**
     * Creates an OutgoingHttpHeaders object that can be used with the http2 API.
     */
    toHttp2Headers(): http2.OutgoingHttpHeaders;
    /**
     * This modifies the behavior of JSON.stringify to show an object
     * representation of the metadata map.
     */
    toJSON(): {
        [key: string]: MetadataValue[];
    };
    /**
     * Returns a new Metadata object based fields in a given IncomingHttpHeaders
     * object.
     * @param headers An IncomingHttpHeaders object.
     */
    static fromHttp2Headers(headers: http2.IncomingHttpHeaders): Metadata;
}
