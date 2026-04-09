import type { TokenCredential } from "@azure/core-auth";
import type { CryptographyClientOptions, JsonWebKey, KeyVaultKey } from "./keysModels.js";
import type { DecryptOptions, DecryptParameters, DecryptResult, EncryptOptions, EncryptParameters, EncryptResult, EncryptionAlgorithm, KeyWrapAlgorithm, SignOptions, SignResult, SignatureAlgorithm, UnwrapKeyOptions, UnwrapResult, VerifyOptions, VerifyResult, WrapKeyOptions, WrapResult } from "./cryptographyClientModels.js";
/**
 * A client used to perform cryptographic operations on an Azure Key vault key
 * or a local {@link JsonWebKey}.
 */
export declare class CryptographyClient {
    /**
     * The key the CryptographyClient currently holds.
     */
    private key;
    /**
     * The remote provider, which would be undefined if used in local mode.
     */
    private remoteProvider?;
    /**
     * Constructs a new instance of the Cryptography client for the given key
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateCryptographyClient
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * // Create or retrieve a key from the keyvault
     * const myKey = await client.createKey("MyKey", "RSA");
     *
     * // Lastly, create our cryptography client and connect to the service
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     * ```
     * @param key - The key to use during cryptography tasks. You can also pass the identifier of the key i.e its url here.
     * @param credential - An object that implements the `TokenCredential` interface used to authenticate requests to the service. Use the \@azure/identity package to create a credential that suits your needs.
     * @param pipelineOptions - Pipeline options used to configure Key Vault API requests.
     *                          Omit this parameter to use the default pipeline configuration.
     */
    constructor(key: string | KeyVaultKey, credential: TokenCredential, pipelineOptions?: CryptographyClientOptions);
    /**
     * Constructs a new instance of the Cryptography client for the given key in local mode.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleCreateCryptographyClientLocal
     * import { CryptographyClient } from "@azure/keyvault-keys";
     *
     * const jsonWebKey = {
     *   kty: "RSA",
     *   kid: "test-key-123",
     *   use: "sig",
     *   alg: "RS256",
     *   n: new Uint8Array([112, 34, 56, 98, 123, 244, 200, 99]),
     *   e: new Uint8Array([1, 0, 1]),
     *   d: new Uint8Array([45, 67, 89, 23, 144, 200, 76, 233]),
     *   p: new Uint8Array([34, 89, 100, 77, 204, 56, 29, 77]),
     *   q: new Uint8Array([78, 99, 201, 45, 188, 34, 67, 90]),
     *   dp: new Uint8Array([23, 45, 78, 56, 200, 144, 32, 67]),
     *   dq: new Uint8Array([12, 67, 89, 144, 99, 56, 23, 45]),
     *   qi: new Uint8Array([78, 90, 45, 201, 34, 67, 120, 55]),
     * };
     * const client = new CryptographyClient(jsonWebKey);
     * ```
     * @param key - The JsonWebKey to use during cryptography operations.
     */
    constructor(key: JsonWebKey);
    /**
     * The base URL to the vault. If a local {@link JsonWebKey} is used vaultUrl will be empty.
     */
    get vaultUrl(): string;
    /**
     * The ID of the key used to perform cryptographic operations for the client.
     */
    get keyID(): string | undefined;
    /**
     * Encrypts the given plaintext with the specified encryption parameters.
     * Depending on the algorithm set in the encryption parameters, the set of possible encryption parameters will change.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleEncrypt
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey.id, credential);
     *
     * const encryptResult = await cryptographyClient.encrypt({
     *   algorithm: "RSA1_5",
     *   plaintext: Buffer.from("My Message"),
     * });
     * console.log("encrypt result: ", encryptResult.result);
     * ```
     * @param encryptParameters - The encryption parameters, keyed on the encryption algorithm chosen.
     * @param options - Additional options.
     */
    encrypt(encryptParameters: EncryptParameters, options?: EncryptOptions): Promise<EncryptResult>;
    /**
     * Encrypts the given plaintext with the specified cryptography algorithm
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleEncrypt
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey.id, credential);
     *
     * const encryptResult = await cryptographyClient.encrypt({
     *   algorithm: "RSA1_5",
     *   plaintext: Buffer.from("My Message"),
     * });
     * console.log("encrypt result: ", encryptResult.result);
     * ```
     * @param algorithm - The algorithm to use.
     * @param plaintext - The text to encrypt.
     * @param options - Additional options.
     * @deprecated Use `encrypt({ algorithm, plaintext }, options)` instead.
     */
    encrypt(algorithm: EncryptionAlgorithm, plaintext: Uint8Array, options?: EncryptOptions): Promise<EncryptResult>;
    private initializeIV;
    /**
     * Standardizes the arguments of multiple overloads into a single shape.
     * @param args - The encrypt arguments
     */
    private disambiguateEncryptArguments;
    /**
     * Decrypts the given ciphertext with the specified decryption parameters.
     * Depending on the algorithm used in the decryption parameters, the set of possible decryption parameters will change.
     *
     * Microsoft recommends you not use CBC without first ensuring the integrity of the ciphertext using, for example, an HMAC. See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information.
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleDecrypt
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey.id, credential);
     *
     * const encryptResult = await cryptographyClient.encrypt({
     *   algorithm: "RSA1_5",
     *   plaintext: Buffer.from("My Message"),
     * });
     * console.log("encrypt result: ", encryptResult.result);
     *
     * const decryptResult = await cryptographyClient.decrypt({
     *   algorithm: "RSA1_5",
     *   ciphertext: encryptResult.result,
     * });
     * console.log("decrypt result: ", decryptResult.result.toString());
     * ```
     * @param decryptParameters - The decryption parameters.
     * @param options - Additional options.
     */
    decrypt(decryptParameters: DecryptParameters, options?: DecryptOptions): Promise<DecryptResult>;
    /**
     * Decrypts the given ciphertext with the specified cryptography algorithm
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleDecrypt
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey.id, credential);
     *
     * const encryptResult = await cryptographyClient.encrypt({
     *   algorithm: "RSA1_5",
     *   plaintext: Buffer.from("My Message"),
     * });
     * console.log("encrypt result: ", encryptResult.result);
     *
     * const decryptResult = await cryptographyClient.decrypt({
     *   algorithm: "RSA1_5",
     *   ciphertext: encryptResult.result,
     * });
     * console.log("decrypt result: ", decryptResult.result.toString());
     * ```
     *
     * Microsoft recommends you not use CBC without first ensuring the integrity of the ciphertext using, for example, an HMAC. See https://learn.microsoft.com/dotnet/standard/security/vulnerabilities-cbc-mode for more information.
     *
     * @param algorithm - The algorithm to use.
     * @param ciphertext - The text to decrypt.
     * @param options - Additional options.
     * @deprecated Use `decrypt({ algorithm, ciphertext }, options)` instead.
     */
    decrypt(algorithm: EncryptionAlgorithm, ciphertext: Uint8Array, options?: DecryptOptions): Promise<DecryptResult>;
    /**
     * Standardizes the arguments of multiple overloads into a single shape.
     * @param args - The decrypt arguments
     */
    private disambiguateDecryptArguments;
    /**
     * Wraps the given key using the specified cryptography algorithm
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleWrapKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const wrapResult = await cryptographyClient.wrapKey("RSA-OAEP", Buffer.from("My Key"));
     * console.log("wrap result:", wrapResult.result);
     * ```
     * @param algorithm - The encryption algorithm to use to wrap the given key.
     * @param key - The key to wrap.
     * @param options - Additional options.
     */
    wrapKey(algorithm: KeyWrapAlgorithm, key: Uint8Array, options?: WrapKeyOptions): Promise<WrapResult>;
    /**
     * Unwraps the given wrapped key using the specified cryptography algorithm
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleUnwrapKey
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const wrapResult = await cryptographyClient.wrapKey("RSA-OAEP", Buffer.from("My Key"));
     * console.log("wrap result:", wrapResult.result);
     *
     * const unwrapResult = await cryptographyClient.unwrapKey("RSA-OAEP", wrapResult.result);
     * console.log("unwrap result: ", unwrapResult.result);
     * ```
     * @param algorithm - The decryption algorithm to use to unwrap the key.
     * @param encryptedKey - The encrypted key to unwrap.
     * @param options - Additional options.
     */
    unwrapKey(algorithm: KeyWrapAlgorithm, encryptedKey: Uint8Array, options?: UnwrapKeyOptions): Promise<UnwrapResult>;
    /**
     * Cryptographically sign the digest of a message
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleSign
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     * import { createHash } from "node:crypto";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * let myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const signatureValue = "MySignature";
     * const hash = createHash("sha256");
     *
     * const digest = hash.update(signatureValue).digest();
     * console.log("digest: ", digest);
     *
     * const signResult = await cryptographyClient.sign("RS256", digest);
     * console.log("sign result: ", signResult.result);
     * ```
     * @param algorithm - The signing algorithm to use.
     * @param digest - The digest of the data to sign.
     * @param options - Additional options.
     */
    sign(algorithm: SignatureAlgorithm, digest: Uint8Array, options?: SignOptions): Promise<SignResult>;
    /**
     * Verify the signed message digest
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleVerify
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     * import { createHash } from "node:crypto";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const hash = createHash("sha256");
     * hash.update("My Message");
     * const digest = hash.digest();
     *
     * const signResult = await cryptographyClient.sign("RS256", digest);
     * console.log("sign result: ", signResult.result);
     *
     * const verifyResult = await cryptographyClient.verify("RS256", digest, signResult.result);
     * console.log("verify result: ", verifyResult.result);
     * ```
     * @param algorithm - The signing algorithm to use to verify with.
     * @param digest - The digest to verify.
     * @param signature - The signature to verify the digest against.
     * @param options - Additional options.
     */
    verify(algorithm: SignatureAlgorithm, digest: Uint8Array, signature: Uint8Array, options?: VerifyOptions): Promise<VerifyResult>;
    /**
     * Cryptographically sign a block of data
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleSignData
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const signResult = await cryptographyClient.signData("RS256", Buffer.from("My Message"));
     * console.log("sign result: ", signResult.result);
     * ```
     * @param algorithm - The signing algorithm to use.
     * @param data - The data to sign.
     * @param options - Additional options.
     */
    signData(algorithm: SignatureAlgorithm, data: Uint8Array, options?: SignOptions): Promise<SignResult>;
    /**
     * Verify the signed block of data
     *
     * Example usage:
     * ```ts snippet:ReadmeSampleVerifyData
     * import { DefaultAzureCredential } from "@azure/identity";
     * import { KeyClient, CryptographyClient } from "@azure/keyvault-keys";
     *
     * const credential = new DefaultAzureCredential();
     *
     * const vaultName = "<YOUR KEYVAULT NAME>";
     * const url = `https://${vaultName}.vault.azure.net`;
     *
     * const client = new KeyClient(url, credential);
     *
     * const myKey = await client.createKey("MyKey", "RSA");
     * const cryptographyClient = new CryptographyClient(myKey, credential);
     *
     * const buffer = Buffer.from("My Message");
     *
     * const signResult = await cryptographyClient.signData("RS256", buffer);
     * console.log("sign result: ", signResult.result);
     *
     * const verifyResult = await cryptographyClient.verifyData("RS256", buffer, signResult.result);
     * console.log("verify result: ", verifyResult.result);
     * ```
     * @param algorithm - The algorithm to use to verify with.
     * @param data - The signed block of data to verify.
     * @param signature - The signature to verify the block against.
     * @param options - Additional options.
     */
    verifyData(algorithm: SignatureAlgorithm, data: Uint8Array, signature: Uint8Array, options?: VerifyOptions): Promise<VerifyResult>;
    /**
     * Retrieves the {@link JsonWebKey} from the Key Vault, if possible. Returns undefined if the key could not be retrieved due to insufficient permissions.
     * @param options - The additional options.
     */
    private getKeyMaterial;
    /**
     * Returns the underlying key used for cryptographic operations.
     * If needed, attempts to fetch the key from KeyVault and exchanges the ID for the actual key.
     * @param options - The additional options.
     */
    private fetchKey;
    private providers?;
    /**
     * Gets the provider that support this algorithm and operation.
     * The available providers are ordered by priority such that the first provider that supports this
     * operation is the one we should use.
     * @param operation - The {@link KeyOperation}.
     * @param algorithm - The algorithm to use.
     */
    private getProvider;
    private ensureValid;
}
//# sourceMappingURL=cryptographyClient.d.ts.map