/**
 * SHA3 (keccak) addons.
 *
 * * Full [NIST SP 800-185](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-185.pdf):
 *   cSHAKE, KMAC, TupleHash, ParallelHash + XOF variants
 * * Reduced-round Keccak [(draft)](https://datatracker.ietf.org/doc/draft-irtf-cfrg-kangarootwelve/):
 *     * 🦘 K12 aka KangarooTwelve
 *     * M14 aka MarsupilamiFourteen
 *     * TurboSHAKE
 * * KeccakPRG: Pseudo-random generator based on Keccak [(pdf)](https://keccak.team/files/CSF-0.1.pdf)
 * @module
 */
import { Keccak, type ShakeOpts } from './sha3.ts';
import { type CHashO, type CHashXO, Hash, type HashXOF, type Input } from './utils.ts';
export type cShakeOpts = ShakeOpts & {
    personalization?: Input;
    NISTfn?: Input;
};
export type ICShake = {
    (msg: Input, opts?: cShakeOpts): Uint8Array;
    outputLen: number;
    blockLen: number;
    create(opts: cShakeOpts): HashXOF<Keccak>;
};
export type ITupleHash = {
    (messages: Input[], opts?: cShakeOpts): Uint8Array;
    create(opts?: cShakeOpts): TupleHash;
};
export type IParHash = {
    (message: Input, opts?: ParallelOpts): Uint8Array;
    create(opts?: ParallelOpts): ParallelHash;
};
export declare const cshake128: ICShake;
export declare const cshake256: ICShake;
export declare class KMAC extends Keccak implements HashXOF<KMAC> {
    constructor(blockLen: number, outputLen: number, enableXOF: boolean, key: Input, opts?: cShakeOpts);
    protected finish(): void;
    _cloneInto(to?: KMAC): KMAC;
    clone(): KMAC;
}
export declare const kmac128: {
    (key: Input, message: Input, opts?: cShakeOpts): Uint8Array;
    create(key: Input, opts?: cShakeOpts): KMAC;
};
export declare const kmac256: {
    (key: Input, message: Input, opts?: cShakeOpts): Uint8Array;
    create(key: Input, opts?: cShakeOpts): KMAC;
};
export declare const kmac128xof: {
    (key: Input, message: Input, opts?: cShakeOpts): Uint8Array;
    create(key: Input, opts?: cShakeOpts): KMAC;
};
export declare const kmac256xof: {
    (key: Input, message: Input, opts?: cShakeOpts): Uint8Array;
    create(key: Input, opts?: cShakeOpts): KMAC;
};
export declare class TupleHash extends Keccak implements HashXOF<TupleHash> {
    constructor(blockLen: number, outputLen: number, enableXOF: boolean, opts?: cShakeOpts);
    protected finish(): void;
    _cloneInto(to?: TupleHash): TupleHash;
    clone(): TupleHash;
}
/** 128-bit TupleHASH. */
export declare const tuplehash128: ITupleHash;
/** 256-bit TupleHASH. */
export declare const tuplehash256: ITupleHash;
/** 128-bit TupleHASH XOF. */
export declare const tuplehash128xof: ITupleHash;
/** 256-bit TupleHASH XOF. */
export declare const tuplehash256xof: ITupleHash;
type ParallelOpts = cShakeOpts & {
    blockLen?: number;
};
export declare class ParallelHash extends Keccak implements HashXOF<ParallelHash> {
    private leafHash?;
    protected leafCons: () => Hash<Keccak>;
    private chunkPos;
    private chunksDone;
    private chunkLen;
    constructor(blockLen: number, outputLen: number, leafCons: () => Hash<Keccak>, enableXOF: boolean, opts?: ParallelOpts);
    protected finish(): void;
    _cloneInto(to?: ParallelHash): ParallelHash;
    destroy(): void;
    clone(): ParallelHash;
}
/** 128-bit ParallelHash. In JS, it is not parallel. */
export declare const parallelhash128: IParHash;
/** 256-bit ParallelHash. In JS, it is not parallel. */
export declare const parallelhash256: IParHash;
/** 128-bit ParallelHash XOF. In JS, it is not parallel. */
export declare const parallelhash128xof: IParHash;
/** 256-bit ParallelHash. In JS, it is not parallel. */
export declare const parallelhash256xof: IParHash;
export type TurboshakeOpts = ShakeOpts & {
    D?: number;
};
/** TurboSHAKE 128-bit: reduced 12-round keccak. */
export declare const turboshake128: CHashXO;
/** TurboSHAKE 256-bit: reduced 12-round keccak. */
export declare const turboshake256: CHashXO;
export type KangarooOpts = {
    dkLen?: number;
    personalization?: Input;
};
export declare class KangarooTwelve extends Keccak implements HashXOF<KangarooTwelve> {
    readonly chunkLen = 8192;
    private leafHash?;
    protected leafLen: number;
    private personalization;
    private chunkPos;
    private chunksDone;
    constructor(blockLen: number, leafLen: number, outputLen: number, rounds: number, opts: KangarooOpts);
    update(data: Input): this;
    protected finish(): void;
    destroy(): void;
    _cloneInto(to?: KangarooTwelve): KangarooTwelve;
    clone(): KangarooTwelve;
}
/** KangarooTwelve: reduced 12-round keccak. */
export declare const k12: CHashO;
/** MarsupilamiFourteen: reduced 14-round keccak. */
export declare const m14: CHashO;
/**
 * More at https://github.com/XKCP/XKCP/tree/master/lib/high/Keccak/PRG.
 */
export declare class KeccakPRG extends Keccak {
    protected rate: number;
    constructor(capacity: number);
    keccak(): void;
    update(data: Input): this;
    feed(data: Input): this;
    protected finish(): void;
    digestInto(_out: Uint8Array): Uint8Array;
    fetch(bytes: number): Uint8Array;
    forget(): void;
    _cloneInto(to?: KeccakPRG): KeccakPRG;
    clone(): KeccakPRG;
}
/** KeccakPRG: Pseudo-random generator based on Keccak. https://keccak.team/files/CSF-0.1.pdf */
export declare const keccakprg: (capacity?: number) => KeccakPRG;
export {};
//# sourceMappingURL=sha3-addons.d.ts.map