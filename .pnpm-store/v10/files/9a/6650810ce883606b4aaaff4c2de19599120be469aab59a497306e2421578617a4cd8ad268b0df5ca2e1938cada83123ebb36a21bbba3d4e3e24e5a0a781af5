import { BLAKE2 } from './blake2.ts';
import { type CHashXO, type HashXOF, type Input } from './utils.ts';
/**
 * Ensure to use EITHER `key` OR `context`, not both.
 *
 * * `key`: 32-byte MAC key.
 * * `context`: string for KDF. Should be hardcoded, globally unique, and application - specific.
 *   A good default format for the context string is "[application] [commit timestamp] [purpose]".
 */
export type Blake3Opts = {
    dkLen?: number;
    key?: Input;
    context?: Input;
};
/** Blake3 hash. Can be used as MAC and KDF. */
export declare class BLAKE3 extends BLAKE2<BLAKE3> implements HashXOF<BLAKE3> {
    private chunkPos;
    private chunksDone;
    private flags;
    private IV;
    private state;
    private stack;
    private posOut;
    private bufferOut32;
    private bufferOut;
    private chunkOut;
    private enableXOF;
    constructor(opts?: Blake3Opts, flags?: number);
    protected get(): [];
    protected set(): void;
    private b2Compress;
    protected compress(buf: Uint32Array, bufPos?: number, isLast?: boolean): void;
    _cloneInto(to?: BLAKE3): BLAKE3;
    destroy(): void;
    private b2CompressOut;
    protected finish(): void;
    private writeInto;
    xofInto(out: Uint8Array): Uint8Array;
    xof(bytes: number): Uint8Array;
    digestInto(out: Uint8Array): Uint8Array;
    digest(): Uint8Array;
}
/**
 * BLAKE3 hash function. Can be used as MAC and KDF.
 * @param msg - message that would be hashed
 * @param opts - `dkLen` for output length, `key` for MAC mode, `context` for KDF mode
 * @example
 * const data = new Uint8Array(32);
 * const hash = blake3(data);
 * const mac = blake3(data, { key: new Uint8Array(32) });
 * const kdf = blake3(data, { context: 'application name' });
 */
export declare const blake3: CHashXO;
//# sourceMappingURL=blake3.d.ts.map