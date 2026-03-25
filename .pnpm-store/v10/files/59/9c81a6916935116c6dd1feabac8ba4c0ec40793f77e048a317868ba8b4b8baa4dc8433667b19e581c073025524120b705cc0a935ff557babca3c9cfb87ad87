/**
 * Basic utils for ARX (add-rotate-xor) salsa and chacha ciphers.

RFC8439 requires multi-step cipher stream, where
authKey starts with counter: 0, actual msg with counter: 1.

For this, we need a way to re-use nonce / counter:

    const counter = new Uint8Array(4);
    chacha(..., counter, ...); // counter is now 1
    chacha(..., counter, ...); // counter is now 2

This is complicated:

- 32-bit counters are enough, no need for 64-bit: max ArrayBuffer size in JS is 4GB
- Original papers don't allow mutating counters
- Counter overflow is undefined [^1]
- Idea A: allow providing (nonce | counter) instead of just nonce, re-use it
- Caveat: Cannot be re-used through all cases:
- * chacha has (counter | nonce)
- * xchacha has (nonce16 | counter | nonce16)
- Idea B: separate nonce / counter and provide separate API for counter re-use
- Caveat: there are different counter sizes depending on an algorithm.
- salsa & chacha also differ in structures of key & sigma:
  salsa20:      s[0] | k(4) | s[1] | nonce(2) | ctr(2) | s[2] | k(4) | s[3]
  chacha:       s(4) | k(8) | ctr(1) | nonce(3)
  chacha20orig: s(4) | k(8) | ctr(2) | nonce(2)
- Idea C: helper method such as `setSalsaState(key, nonce, sigma, data)`
- Caveat: we can't re-use counter array

xchacha [^2] uses the subkey and remaining 8 byte nonce with ChaCha20 as normal
(prefixed by 4 NUL bytes, since [RFC8439] specifies a 12-byte nonce).

[^1]: https://mailarchive.ietf.org/arch/msg/cfrg/gsOnTJzcbgG6OqD8Sc0GO5aR_tU/
[^2]: https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha#appendix-A.2

 * @module
 */
import { type XorStream } from './utils.ts';
export declare function rotl(a: number, b: number): number;
/** Ciphers must use u32 for efficiency. */
export type CipherCoreFn = (sigma: Uint32Array, key: Uint32Array, nonce: Uint32Array, output: Uint32Array, counter: number, rounds?: number) => void;
/** Method which extends key + short nonce into larger nonce / diff key. */
export type ExtendNonceFn = (sigma: Uint32Array, key: Uint32Array, input: Uint32Array, output: Uint32Array) => void;
/** ARX cipher options.
 * * `allowShortKeys` for 16-byte keys
 * * `counterLength` in bytes
 * * `counterRight`: right: `nonce|counter`; left: `counter|nonce`
 * */
export type CipherOpts = {
    allowShortKeys?: boolean;
    extendNonceFn?: ExtendNonceFn;
    counterLength?: number;
    counterRight?: boolean;
    rounds?: number;
};
/** Creates ARX-like (ChaCha, Salsa) cipher stream from core function. */
export declare function createCipher(core: CipherCoreFn, opts: CipherOpts): XorStream;
//# sourceMappingURL=_arx.d.ts.map