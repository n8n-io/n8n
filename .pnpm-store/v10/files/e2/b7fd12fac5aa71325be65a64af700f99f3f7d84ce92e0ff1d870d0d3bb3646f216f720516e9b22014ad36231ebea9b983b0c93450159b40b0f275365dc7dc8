export class RabinUncachedEncoder {
    /**
     * @param {Uint8Array} m assert(m[0] === 1)
     */
    constructor(m: Uint8Array);
    m: Uint8Array<ArrayBufferLike>;
    blen: number;
    bs: Uint8Array<ArrayBuffer>;
    /**
     * This describes the position of the most significant byte (starts with 0 and increases with
     * shift)
     */
    bpos: number;
    /**
     * Add/Xor/Substract bytes.
     *
     * Discards bytes that are out of range.
     * @todo put this in function or inline
     *
     * @param {Uint8Array} cs
     */
    add(cs: Uint8Array): void;
    /**
     * @param {number} byte
     */
    write(byte: number): void;
    getFingerprint(): Uint8Array<ArrayBuffer>;
}
//# sourceMappingURL=rabin-uncached.d.ts.map