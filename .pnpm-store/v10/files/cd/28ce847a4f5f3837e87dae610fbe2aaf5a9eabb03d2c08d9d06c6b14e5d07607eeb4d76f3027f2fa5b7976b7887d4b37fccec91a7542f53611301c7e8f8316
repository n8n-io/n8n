import { GetFallbackSecretParams, GetDecryptedSecretsParams, GetDecryptedSecretParams, CreateSecretParams, UpdateSecretParams, DeleteSecretParams } from '../types/SecretService';
import { ServiceTokenClientConfig } from '../types/InfisicalClient';
/**
 * Class for secret-related actions
 */
export default class SecretService {
    static populateClientWorkspaceConfig(clientConfig: ServiceTokenClientConfig): Promise<import("../types/InfisicalClient").WorkspaceConfig>;
    /**
     * Get fallback secret on [process.env]
     */
    static getFallbackSecret(getFallbackSecretParams: GetFallbackSecretParams): Promise<import("../types/models").ISecretBundle>;
    /**
     * Get (decrypted) secrets from a project and environment
     * @param {GetDecryptedSecretsParams} getDecryptedSecretsParams
     * @returns
     */
    static getDecryptedSecrets(getDecryptedSecretsParams: GetDecryptedSecretsParams): Promise<import("../types/models").ISecretBundle[]>;
    /**
     * Get (decrypted) secret
     * @param {GetDecryptedSecretParams} getDecryptedSecretParams
     * @returns
     */
    static getDecryptedSecret(getDecryptedSecretParams: GetDecryptedSecretParams): Promise<import("../types/models").ISecretBundle>;
    /**
     * Create secret
     * @param {CreateSecretParams} createSecretParams
     * @returns
     */
    static createSecret(createSecretParams: CreateSecretParams): Promise<import("../types/models").ISecretBundle>;
    /**
     * Update secret
     * @param {UpdateSecretParams} updateSecretParams
     * @returns
     */
    static updateSecret(updateSecretParams: UpdateSecretParams): Promise<import("../types/models").ISecretBundle>;
    /**
     * Delete secret
     * @param {DeleteSecretParams} deleteSecretParams
     * @returns
     */
    static deleteSecret(deleteSecretParams: DeleteSecretParams): Promise<import("../types/models").ISecretBundle>;
}
