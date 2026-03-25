import type { KeyLike } from '../types';
export interface GenerateSecretOptions {
    /**
     * (Only effective in Web Crypto API runtimes) The value to use as
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey SubtleCrypto.generateKey()}
     * `extractable` argument. Default is false.
     */
    extractable?: boolean;
}
/**
 * Generates a symmetric secret key for a given JWA algorithm identifier.
 *
 * Note: Under Web Crypto API runtime the secret key is generated with `extractable` set to `false`
 * by default.
 *
 * @param alg JWA Algorithm Identifier to be used with the generated secret.
 * @param options Additional options passed down to the secret generation.
 */
export declare function generateSecret<T extends KeyLike = KeyLike>(alg: string, options?: GenerateSecretOptions): Promise<T | Uint8Array>;
