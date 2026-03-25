import { ISecretBundle } from '../types/models';
import { ServiceTokenClientConfig, GetAllOptions, GetOptions, CreateOptions, UpdateOptions, DeleteOptions, InfisicalClientOptions } from '../types/InfisicalClient';
import { IEncryptSymmetricOutput } from '../types/utils';
declare class InfisicalClient {
    cache: {
        [key: string]: ISecretBundle;
    };
    clientConfig: ServiceTokenClientConfig | undefined;
    debug: boolean;
    /**
     * Create an instance of the Infisical client
     * @param {Object} obj
     * @param {String} obj.token - an Infisical Token scoped to a project and environment
     * @param {Boolean} debug - whether debug is on
     * @param {Number} cacheTTL - time-to-live (in seconds) for refreshing cached secrets.
     */
    constructor({ token, siteURL, debug, cacheTTL }: InfisicalClientOptions);
    /**
    * Return all the secrets accessible by the instance of Infisical
    */
    getAllSecrets(options?: GetAllOptions): Promise<ISecretBundle[]>;
    /**
     * Return secret with name [secretName]
     * @returns {ISecretBundle} secretBundle - secret bundle
     * @param secretName name of the secret
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous get
     */
    getSecret(secretName: string, options?: GetOptions): Promise<ISecretBundle>;
    /**
     * Create secret with name [secretName] and value [secretValue]
     * @param secretName - name of secret to create
     * @param secretValue - value of secret to create
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous creation
     */
    createSecret(secretName: string, secretValue: string, options?: CreateOptions): Promise<ISecretBundle>;
    /**
     * Update secret with name [secretName] and value [secretValue]
     * @param secretName - name of secret to update
     * @param secretValue - new value for secret
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous update
     */
    updateSecret(secretName: string, secretValue: string, options?: UpdateOptions): Promise<ISecretBundle>;
    /**
     * Delete secret with name [secretName]
     * @param secretName - name of secret to delete
     * @param options - secret selection options
     * @returns - a promise representing the result of the asynchronous deletion
     */
    deleteSecret(secretName: string, options?: DeleteOptions): Promise<ISecretBundle>;
    /**
     * Create a base64-encoded, 256-bit symmetric key
     * @returns {String} key - the symmetric key
     */
    createSymmetricKey(): string;
    /**
     * Encrypt the plaintext [plaintext] with the (base64) 256-bit
     * secret key [key]
     * @param plaintext
     * @param key - base64-encoded, 256-bit symmetric key
     * @returns {IEncryptSymmetricOutput} - an object containing the base64-encoded ciphertext, iv, and tag
     */
    encryptSymmetric(plaintext: string, key: string): IEncryptSymmetricOutput;
    /**
     * Decrypt the ciphertext [ciphertext] with the (base64) 256-bit
     * secret key [key], provided [iv] and [tag]
     * @param ciphertext - base64-encoded ciphertext
     * @param key - base64-encoded, 256-bit symmetric key
     * @param iv - base64-encoded initialization vector
     * @param tag - base64-encoded authentication tag
     * @returns {String} - the decrypted [ciphertext] or cleartext
     */
    decryptSymmetric(ciphertext: string, key: string, iv: string, tag: string): string;
}
export default InfisicalClient;
