/**
 * HMAC: RFC2104 message authentication code.
 * @module
 */
import { Hash, type CHash, type Input } from './utils.ts';
export declare class HMAC<T extends Hash<T>> extends Hash<HMAC<T>> {
    oHash: T;
    iHash: T;
    blockLen: number;
    outputLen: number;
    private finished;
    private destroyed;
    constructor(hash: CHash, _key: Input);
    update(buf: Input): this;
    digestInto(out: Uint8Array): void;
    digest(): Uint8Array;
    _cloneInto(to?: HMAC<T>): HMAC<T>;
    clone(): HMAC<T>;
    destroy(): void;
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 * @example
 * import { hmac } from '@noble/hashes/hmac';
 * import { sha256 } from '@noble/hashes/sha2';
 * const mac1 = hmac(sha256, 'key', 'message');
 */
export declare const hmac: {
    (hash: CHash, key: Input, message: Input): Uint8Array;
    create(hash: CHash, key: Input): HMAC<any>;
};
//# sourceMappingURL=hmac.d.ts.map