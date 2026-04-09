/**
 * Helper for identifying unknown union members during deserialization.
 */
export declare class UnionSerde {
    private from;
    private to;
    private keys;
    constructor(from: any, to: any);
    /**
     * Marks the key as being a known member.
     * @param key - to mark.
     */
    mark(key: string): void;
    /**
     * @returns whether only one key remains unmarked and nothing has been written,
     * implying the object is a union.
     */
    hasUnknown(): boolean;
    /**
     * Writes the unknown key-value pair, if present, into the $unknown property
     * of the union object.
     */
    writeUnknown(): void;
}
