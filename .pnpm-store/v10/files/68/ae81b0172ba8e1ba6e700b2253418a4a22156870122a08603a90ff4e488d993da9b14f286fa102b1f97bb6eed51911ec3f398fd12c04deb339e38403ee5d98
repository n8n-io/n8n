import { Hash, type CHash, type CHashXO, type HashXOF, type Input } from './utils.ts';
/** `keccakf1600` internal function, additionally allows to adjust round count. */
export declare function keccakP(s: Uint32Array, rounds?: number): void;
/** Keccak sponge function. */
export declare class Keccak extends Hash<Keccak> implements HashXOF<Keccak> {
    protected state: Uint8Array;
    protected pos: number;
    protected posOut: number;
    protected finished: boolean;
    protected state32: Uint32Array;
    protected destroyed: boolean;
    blockLen: number;
    suffix: number;
    outputLen: number;
    protected enableXOF: boolean;
    protected rounds: number;
    constructor(blockLen: number, suffix: number, outputLen: number, enableXOF?: boolean, rounds?: number);
    clone(): Keccak;
    protected keccak(): void;
    update(data: Input): this;
    protected finish(): void;
    protected writeInto(out: Uint8Array): Uint8Array;
    xofInto(out: Uint8Array): Uint8Array;
    xof(bytes: number): Uint8Array;
    digestInto(out: Uint8Array): Uint8Array;
    digest(): Uint8Array;
    destroy(): void;
    _cloneInto(to?: Keccak): Keccak;
}
/** SHA3-224 hash function. */
export declare const sha3_224: CHash;
/** SHA3-256 hash function. Different from keccak-256. */
export declare const sha3_256: CHash;
/** SHA3-384 hash function. */
export declare const sha3_384: CHash;
/** SHA3-512 hash function. */
export declare const sha3_512: CHash;
/** keccak-224 hash function. */
export declare const keccak_224: CHash;
/** keccak-256 hash function. Different from SHA3-256. */
export declare const keccak_256: CHash;
/** keccak-384 hash function. */
export declare const keccak_384: CHash;
/** keccak-512 hash function. */
export declare const keccak_512: CHash;
export type ShakeOpts = {
    dkLen?: number;
};
/** SHAKE128 XOF with 128-bit security. */
export declare const shake128: CHashXO;
/** SHAKE256 XOF with 256-bit security. */
export declare const shake256: CHashXO;
//# sourceMappingURL=sha3.d.ts.map