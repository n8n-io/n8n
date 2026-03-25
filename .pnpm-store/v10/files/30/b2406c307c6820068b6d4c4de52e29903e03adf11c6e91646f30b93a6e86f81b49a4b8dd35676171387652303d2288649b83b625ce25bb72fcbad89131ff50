import type { JWK, KeyLike } from '../types';
export interface PEMImportOptions {
    /**
     * (Only effective in Web Crypto API runtimes) The value to use as
     * {@link https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey SubtleCrypto.importKey()}
     * `extractable` argument. Default is false.
     */
    extractable?: boolean;
}
/**
 * Imports a PEM-encoded SPKI string as a runtime-specific public key representation (KeyObject or
 * CryptoKey).
 *
 * @param pem PEM-encoded SPKI string
 * @param alg (Only effective in Web Crypto API runtimes) JSON Web Algorithm identifier to be used
 *   with the imported key, its presence is only enforced in Web Crypto API runtimes. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 */
export declare function importSPKI<T extends KeyLike = KeyLike>(spki: string, alg: string, options?: PEMImportOptions): Promise<T>;
/**
 * Imports the SPKI from an X.509 string certificate as a runtime-specific public key representation
 * (KeyObject or CryptoKey).
 *
 * @param pem X.509 certificate string
 * @param alg (Only effective in Web Crypto API runtimes) JSON Web Algorithm identifier to be used
 *   with the imported key, its presence is only enforced in Web Crypto API runtimes. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 */
export declare function importX509<T extends KeyLike = KeyLike>(x509: string, alg: string, options?: PEMImportOptions): Promise<T>;
/**
 * Imports a PEM-encoded PKCS#8 string as a runtime-specific private key representation (KeyObject
 * or CryptoKey).
 *
 * @param pem PEM-encoded PKCS#8 string
 * @param alg (Only effective in Web Crypto API runtimes) JSON Web Algorithm identifier to be used
 *   with the imported key, its presence is only enforced in Web Crypto API runtimes. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 */
export declare function importPKCS8<T extends KeyLike = KeyLike>(pkcs8: string, alg: string, options?: PEMImportOptions): Promise<T>;
/**
 * Imports a JWK to a runtime-specific key representation (KeyLike). Either JWK "alg" (Algorithm)
 * Parameter must be present or the optional "alg" argument. When running on a runtime using
 * {@link https://www.w3.org/TR/WebCryptoAPI/ Web Cryptography API} the jwk parameters "use",
 * "key_ops", and "ext" are also used in the resulting `CryptoKey`.
 *
 * @param jwk JSON Web Key.
 * @param alg (Only effective in Web Crypto API runtimes) JSON Web Algorithm identifier to be used
 *   with the imported key. Default is the "alg" property on the JWK, its presence is only enforced
 *   in Web Crypto API runtimes. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 * @param octAsKeyObject Forces a symmetric key to be imported to a KeyObject or CryptoKey. Default
 *   is true unless JWK "ext" (Extractable) is true.
 */
export declare function importJWK<T extends KeyLike = KeyLike>(jwk: JWK, alg?: string, octAsKeyObject?: boolean): Promise<T | Uint8Array>;
