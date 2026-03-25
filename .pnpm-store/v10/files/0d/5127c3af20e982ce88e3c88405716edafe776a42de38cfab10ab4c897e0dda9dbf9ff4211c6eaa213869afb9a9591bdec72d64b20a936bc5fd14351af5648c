/**
 * Asymmetric key generation
 *
 * @module
 */
import type * as types from '../types.d.ts';
/** Asymmetric key pair generation function result. */
export interface GenerateKeyPairResult {
    /** The generated Private Key. */
    privateKey: types.CryptoKey;
    /** Public Key corresponding to the generated Private Key. */
    publicKey: types.CryptoKey;
}
/** Asymmetric key pair generation function options. */
export interface GenerateKeyPairOptions {
    /**
     * The EC "crv" (Curve) or OKP "crv" (Subtype of Key Pair) value to generate. The curve must be
     * both supported on the runtime as well as applicable for the given JWA algorithm identifier.
     */
    crv?: string;
    /**
     * A hint for RSA algorithms to generate an RSA key of a given `modulusLength` (Key size in bits).
     * JOSE requires 2048 bits or larger. Default is 2048.
     */
    modulusLength?: number;
    /**
     * The value to use as {@link !SubtleCrypto.generateKey} `extractable` argument. Default is false.
     *
     */
    extractable?: boolean;
}
/**
 * Generates a private and a public key for a given JWA algorithm identifier. This can only generate
 * asymmetric key pairs. For symmetric secrets use the `generateSecret` function.
 *
 * > [!NOTE]\
 * > The `privateKey` is generated with `extractable` set to `false` by default. See
 * > {@link GenerateKeyPairOptions.extractable} to generate an extractable `privateKey`.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/generate/keypair'`.
 *
 * @param alg JWA Algorithm Identifier to be used with the generated key pair. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 * @param options Additional options passed down to the key pair generation.
 */
export declare function generateKeyPair(alg: string, options?: GenerateKeyPairOptions): Promise<GenerateKeyPairResult>;
