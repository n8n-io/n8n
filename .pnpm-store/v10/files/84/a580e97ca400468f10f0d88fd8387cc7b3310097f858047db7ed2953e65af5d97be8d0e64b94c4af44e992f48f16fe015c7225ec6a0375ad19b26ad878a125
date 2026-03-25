import {
    GetFallbackSecretParams,
    GetDecryptedSecretsParams,
    GetDecryptedSecretParams,
    CreateSecretParams,
    UpdateSecretParams,
    DeleteSecretParams
} from '../types/SecretService';
import { 
    getFallbackSecretHelper,
    getDecryptedSecretsHelper,
    getDecryptedSecretHelper,
    createSecretHelper,
    updateSecretHelper,
    deleteSecretHelper
} from '../helpers/secrets';
import {
    populateClientWorkspaceConfigsHelper
} from '../helpers/key';

import { ServiceTokenClientConfig } from '../types/InfisicalClient';

/**
 * Class for secret-related actions
 */
export default class SecretService {
    
    static async populateClientWorkspaceConfig(clientConfig: ServiceTokenClientConfig) {
        return await populateClientWorkspaceConfigsHelper(clientConfig);
    }

    /**
     * Get fallback secret on [process.env]
     */
    static async getFallbackSecret(getFallbackSecretParams: GetFallbackSecretParams) {
        return getFallbackSecretHelper(getFallbackSecretParams);
    }

    /**
     * Get (decrypted) secrets from a project and environment
     * @param {GetDecryptedSecretsParams} getDecryptedSecretsParams 
     * @returns 
     */
    static async getDecryptedSecrets(getDecryptedSecretsParams: GetDecryptedSecretsParams) {
        return await getDecryptedSecretsHelper(getDecryptedSecretsParams);
    }
    
    /**
     * Get (decrypted) secret
     * @param {GetDecryptedSecretParams} getDecryptedSecretParams 
     * @returns 
     */
    static async getDecryptedSecret(getDecryptedSecretParams: GetDecryptedSecretParams) {
        return await getDecryptedSecretHelper(getDecryptedSecretParams);
    }

    /**
     * Create secret
     * @param {CreateSecretParams} createSecretParams 
     * @returns 
     */
    static async createSecret(createSecretParams: CreateSecretParams) {
        return await createSecretHelper(createSecretParams);
    }

    /**
     * Update secret
     * @param {UpdateSecretParams} updateSecretParams 
     * @returns 
     */
    static async updateSecret(updateSecretParams: UpdateSecretParams) {
        return await updateSecretHelper(updateSecretParams);
    }

    /**
     * Delete secret
     * @param {DeleteSecretParams} deleteSecretParams 
     * @returns 
     */
    static async deleteSecret(deleteSecretParams: DeleteSecretParams) {
        return await deleteSecretHelper(deleteSecretParams);
    }
}