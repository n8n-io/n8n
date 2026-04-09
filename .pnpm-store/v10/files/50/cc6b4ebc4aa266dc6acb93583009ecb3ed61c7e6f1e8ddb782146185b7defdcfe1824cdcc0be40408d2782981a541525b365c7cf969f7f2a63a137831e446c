import type { OperationOptions } from "@azure-rest/core-client";
import type { AesCbcEncryptParameters, DecryptOptions, DecryptResult, EncryptOptions, EncryptResult, JsonWebKey, KeyWrapAlgorithm, SignOptions, SignResult, UnwrapKeyOptions, UnwrapResult, VerifyOptions, VerifyResult, WrapKeyOptions, WrapResult } from "../index.js";
import type { AesCbcDecryptParameters } from "../cryptographyClientModels.js";
import type { CryptographyProvider, CryptographyProviderOperation } from "./models.js";
/**
 * An AES cryptography provider supporting AES algorithms.
 * @internal
 */
export declare class AesCryptographyProvider implements CryptographyProvider {
    private key;
    constructor(key: JsonWebKey);
    encrypt(encryptParameters: AesCbcEncryptParameters, _options?: EncryptOptions): Promise<EncryptResult>;
    decrypt(decryptParameters: AesCbcDecryptParameters, _options?: DecryptOptions): Promise<DecryptResult>;
    isSupported(algorithm: string, operation: CryptographyProviderOperation): boolean;
    /**
     * The set of algorithms this provider supports.
     * For AES encryption, the values include the underlying algorithm used in crypto
     * as well as the key size in bytes.
     *
     * We start with support for A[SIZE]CBCPAD which uses the PKCS padding (the default padding scheme in node crypto)
     */
    private supportedAlgorithms;
    private supportedOperations;
    wrapKey(_algorithm: KeyWrapAlgorithm, _keyToWrap: Uint8Array, _options?: WrapKeyOptions): Promise<WrapResult>;
    unwrapKey(_algorithm: KeyWrapAlgorithm, _encryptedKey: Uint8Array, _options?: UnwrapKeyOptions): Promise<UnwrapResult>;
    sign(_algorithm: string, _digest: Uint8Array, _options?: SignOptions): Promise<SignResult>;
    signData(_algorithm: string, _data: Uint8Array, _options?: SignOptions): Promise<SignResult>;
    verify(_algorithm: string, _digest: Uint8Array, _signature: Uint8Array, _options?: VerifyOptions): Promise<VerifyResult>;
    verifyData(_algorithm: string, _data: Uint8Array, _signature: Uint8Array, _updatedOptions: OperationOptions): Promise<VerifyResult>;
    private ensureValid;
}
//# sourceMappingURL=aesCryptographyProvider.d.ts.map