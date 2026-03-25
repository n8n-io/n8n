export const StandardIrreducible8: Uint8Array<ArrayBuffer>;
export const StandardIrreducible16: Uint8Array<ArrayBuffer>;
export const StandardIrreducible32: Uint8Array<ArrayBuffer>;
export const StandardIrreducible64: Uint8Array<ArrayBuffer>;
export const StandardIrreducible128: Uint8Array<ArrayBuffer>;
export class RabinEncoder {
    /**
     * @param {Uint8Array} m assert(m[0] === 1)
     */
    constructor(m: Uint8Array);
    m: Uint8Array<ArrayBufferLike>;
    blen: number;
    bs: Uint8Array<ArrayBuffer>;
    cache: Uint8Array<ArrayBuffer>;
    /**
     * This describes the position of the most significant byte (starts with 0 and increases with
     * shift)
     */
    bpos: number;
    /**
     * @param {number} byte
     */
    write(byte: number): void;
    getFingerprint(): Uint8Array<ArrayBuffer>;
}
export function fingerprint(irreducible: Uint8Array, data: Uint8Array): Uint8Array<ArrayBuffer>;
//# sourceMappingURL=rabin.d.ts.map