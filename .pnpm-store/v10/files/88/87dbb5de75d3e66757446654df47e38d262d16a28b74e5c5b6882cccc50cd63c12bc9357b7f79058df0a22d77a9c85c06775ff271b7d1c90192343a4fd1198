import type { DecryptOptions, DecryptParameters, DecryptResult, EncryptOptions, EncryptParameters, EncryptResult, JsonWebKey, KeyWrapAlgorithm, SignOptions, SignResult, SignatureAlgorithm, UnwrapKeyOptions, UnwrapResult, VerifyOptions, VerifyResult, WrapKeyOptions, WrapResult } from "../index.js";
import type { CryptographyProvider, CryptographyProviderOperation } from "./models.js";
/**
 * An RSA cryptography provider supporting RSA algorithms.
 */
export declare class RsaCryptographyProvider implements CryptographyProvider {
    constructor(key: JsonWebKey);
    isSupported(algorithm: string, operation: CryptographyProviderOperation): boolean;
    encrypt(encryptParameters: EncryptParameters, _options?: EncryptOptions): Promise<EncryptResult>;
    decrypt(_decryptParameters: DecryptParameters, _options?: DecryptOptions): Promise<DecryptResult>;
    wrapKey(algorithm: KeyWrapAlgorithm, keyToWrap: Uint8Array, _options?: WrapKeyOptions): Promise<WrapResult>;
    unwrapKey(_algorithm: KeyWrapAlgorithm, _encryptedKey: Uint8Array, _options?: UnwrapKeyOptions): Promise<UnwrapResult>;
    sign(_algorithm: SignatureAlgorithm, _digest: Uint8Array, _options?: SignOptions): Promise<SignResult>;
    signData(_algorithm: SignatureAlgorithm, _data: Uint8Array, _options?: SignOptions): Promise<SignResult>;
    verify(_algorithm: SignatureAlgorithm, _digest: Uint8Array, _signature: Uint8Array, _options?: VerifyOptions): Promise<VerifyResult>;
    verifyData(algorithm: SignatureAlgorithm, data: Uint8Array, signature: Uint8Array, _options?: VerifyOptions): Promise<VerifyResult>;
    /**
     * The {@link JsonWebKey} used to perform crypto operations.
     */
    private key;
    /**
     * The set of algorithms this provider supports
     */
    private applicableAlgorithms;
    /**
     * The set of operations this provider supports
     */
    private applicableOperations;
    /**
     * Mapping between signature algorithms and their corresponding hash algorithms. Externally used for testing.
     * @internal
     */
    signatureAlgorithmToHashAlgorithm: {
        [s: string]: string;
    };
    private ensureValid;
}
//# sourceMappingURL=rsaCryptographyProvider.d.ts.map