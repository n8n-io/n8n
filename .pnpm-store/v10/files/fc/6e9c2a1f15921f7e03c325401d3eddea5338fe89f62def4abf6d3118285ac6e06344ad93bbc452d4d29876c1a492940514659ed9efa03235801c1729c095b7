import { GetFallbackSecretParams, GetDecryptedSecretsParams, GetDecryptedSecretParams, CreateSecretParams, UpdateSecretParams, DeleteSecretParams } from '../types/SecretService';
import { ISecretBundle } from '../types/models';
/**
 * Get fallback secret on [process.env]
 */
export declare const getFallbackSecretHelper: ({ secretName }: GetFallbackSecretParams) => Promise<ISecretBundle>;
/**
 * Get (decrypted) secrets from a project and environment
 * @param {GetDecryptedSecretsParams} getDecryptedSecretsParams
 * @returns {Secret} secrets
 */
export declare const getDecryptedSecretsHelper: ({ apiRequest, workspaceId, environment, workspaceKey, path }: GetDecryptedSecretsParams) => Promise<ISecretBundle[]>;
/**
 * Get a (decrypted) secret
 * @param {GetDecryptedSecretParams} getDecryptedSecretParams
 * @returns
 */
export declare const getDecryptedSecretHelper: ({ apiRequest, secretName, workspaceId, environment, workspaceKey, type, path }: GetDecryptedSecretParams) => Promise<ISecretBundle>;
/**
 * Create a secret
 * @param {CreateSecretParams} createSecretParams
 * @returns
 */
export declare const createSecretHelper: ({ apiRequest, workspaceKey, workspaceId, environment, type, secretName, secretValue, path }: CreateSecretParams) => Promise<ISecretBundle>;
/**
 * Update a secret
 * @param {UpdateSecretParams} updateSecretParams
 * @returns
 */
export declare const updateSecretHelper: ({ apiRequest, workspaceKey, workspaceId, environment, type, path, secretName, secretValue }: UpdateSecretParams) => Promise<ISecretBundle>;
/**
 * Delete a secret
 * @param {DeleteSecretParams} deleteSecretParams
 * @returns
 */
export declare const deleteSecretHelper: ({ apiRequest, secretName, workspaceId, environment, type, workspaceKey }: DeleteSecretParams) => Promise<ISecretBundle>;
