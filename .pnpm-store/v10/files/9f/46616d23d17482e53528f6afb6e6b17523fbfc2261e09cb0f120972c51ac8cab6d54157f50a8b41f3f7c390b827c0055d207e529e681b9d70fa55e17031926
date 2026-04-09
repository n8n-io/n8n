import type { TokenCredential } from "@azure/core-auth";
import type { DecryptOptions, DecryptParameters, DecryptResult, EncryptOptions, EncryptParameters, EncryptResult, KeyWrapAlgorithm, SignOptions, SignResult, UnwrapKeyOptions, VerifyOptions, VerifyResult, WrapKeyOptions, WrapResult } from "../cryptographyClientModels.js";
import type { UnwrapResult } from "../cryptographyClientModels.js";
import type { CryptographyClientOptions, GetKeyOptions, KeyVaultKey } from "../keysModels.js";
import type { CryptographyProvider, CryptographyProviderOperation } from "./models.js";
/**
 * The remote cryptography provider is used to run crypto operations against KeyVault.
 * @internal
 */
export declare class RemoteCryptographyProvider implements CryptographyProvider {
    constructor(key: string | KeyVaultKey, credential: TokenCredential, pipelineOptions?: CryptographyClientOptions);
    isSupported(_algorithm: string, _operation: CryptographyProviderOperation): boolean;
    encrypt(encryptParameters: EncryptParameters, options?: EncryptOptions): Promise<EncryptResult>;
    decrypt(decryptParameters: DecryptParameters, options?: DecryptOptions): Promise<DecryptResult>;
    wrapKey(algorithm: KeyWrapAlgorithm, keyToWrap: Uint8Array, options?: WrapKeyOptions): Promise<WrapResult>;
    unwrapKey(algorithm: KeyWrapAlgorithm, encryptedKey: Uint8Array, options?: UnwrapKeyOptions): Promise<UnwrapResult>;
    sign(algorithm: string, digest: Uint8Array, options?: SignOptions): Promise<SignResult>;
    verifyData(algorithm: string, data: Uint8Array, signature: Uint8Array, options?: VerifyOptions): Promise<VerifyResult>;
    verify(algorithm: string, digest: Uint8Array, signature: Uint8Array, options?: VerifyOptions): Promise<VerifyResult>;
    signData(algorithm: string, data: Uint8Array, options?: SignOptions): Promise<SignResult>;
    /**
     * The base URL to the vault.
     */
    readonly vaultUrl: string;
    /**
     * The ID of the key used to perform cryptographic operations for the client.
     */
    get keyId(): string | undefined;
    /**
     * Gets the {@link KeyVaultKey} used for cryptography operations, fetching it
     * from KeyVault if necessary.
     * @param options - Additional options.
     */
    getKey(options?: GetKeyOptions): Promise<KeyVaultKey>;
    /**
     * A reference to the auto-generated KeyVault HTTP client.
     */
    private client;
    /**
     * A reference to the key used for the cryptographic operations.
     * Based on what was provided to the CryptographyClient constructor,
     * it can be either a string with the URL of a Key Vault Key, or an already parsed {@link KeyVaultKey}.
     */
    private key;
    /**
     * Name of the key the client represents
     */
    private name;
    /**
     * Version of the key the client represents
     */
    private version;
    /**
     * Attempts to retrieve the ID of the key.
     */
    private getKeyID;
}
//# sourceMappingURL=remoteCryptographyProvider.d.ts.map