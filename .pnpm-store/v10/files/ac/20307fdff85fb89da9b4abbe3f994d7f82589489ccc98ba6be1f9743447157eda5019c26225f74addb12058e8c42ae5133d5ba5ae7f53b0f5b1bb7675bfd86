import {
    getSecrets,
    getSecret,
    createSecret,
    updateSecret,
    deleteSecret
} from '../api';
import {
    GetFallbackSecretParams,
    GetDecryptedSecretsParams,
    GetDecryptedSecretParams,
    CreateSecretParams,
    UpdateSecretParams,
    DeleteSecretParams
} from '../types/SecretService';
import { ISecret, ISecretBundle } from '../types/models';
import { decryptSymmetric128BitHexKeyUTF8, encryptSymmetric128BitHexKeyUTF8 } from '../utils/crypto';

/**
 * Transform a raw secret returned from the API plus [secretName]
 * and [secretValue] into secret to be returned from SDK.
 * @param param0 
 * @returns 
 */
const transformSecretToSecretBundle = ({
    secret,
    secretName,
    secretValue
}: {
    secret: ISecret;
    secretName: string;
    secretValue: string;
}): ISecretBundle => ({
    secretName,
    secretValue,
    version: secret.version,
    workspace: secret.workspace,
    environment: secret.environment,
    type: secret.type,
    updatedAt: secret.updatedAt,
    createdAt: secret.createdAt,
    isFallback: false,
    lastFetchedAt: new Date()
});

/**
 * Get fallback secret on [process.env]
 */
export const getFallbackSecretHelper = async ({
    secretName
}: GetFallbackSecretParams): Promise<ISecretBundle> => ({
    secretName,
    secretValue: process.env[secretName],
    isFallback: true,
    lastFetchedAt: new Date()
});

/**
 * Get (decrypted) secrets from a project and environment
 * @param {GetDecryptedSecretsParams} getDecryptedSecretsParams 
 * @returns {Secret} secrets
 */
export const getDecryptedSecretsHelper = async ({
    apiRequest,
    workspaceId,
    environment,
    workspaceKey,
    path
}: GetDecryptedSecretsParams) => {
    const secrets = await getSecrets(apiRequest, {
        workspaceId,
        environment,
        path
    });

    return secrets.map((secret) => {
        const secretName = decryptSymmetric128BitHexKeyUTF8({
            ciphertext: secret.secretKeyCiphertext,
            iv: secret.secretKeyIV,
            tag: secret.secretKeyTag,
            key: workspaceKey
        });

        const secretValue = decryptSymmetric128BitHexKeyUTF8({
            ciphertext: secret.secretValueCiphertext,
            iv: secret.secretValueIV,
            tag: secret.secretValueTag,
            key: workspaceKey
        });

        return transformSecretToSecretBundle({
            secret,
            secretName,
            secretValue
        });
    });
}

/**
 * Get a (decrypted) secret
 * @param {GetDecryptedSecretParams} getDecryptedSecretParams 
 * @returns 
 */
export const getDecryptedSecretHelper = async ({
    apiRequest,
    secretName,
    workspaceId,
    environment,
    workspaceKey,
    type,
    path
}: GetDecryptedSecretParams): Promise<ISecretBundle> => {

    const secret = await getSecret(apiRequest, {
        secretName,
        workspaceId,
        environment,
        type,
        path
    });

    const secretValue = decryptSymmetric128BitHexKeyUTF8({
        ciphertext: secret.secretValueCiphertext,
        iv: secret.secretValueIV,
        tag: secret.secretValueTag,
        key: workspaceKey
    });

    return transformSecretToSecretBundle({
        secret,
        secretName,
        secretValue
    });
}

/**
 * Create a secret
 * @param {CreateSecretParams} createSecretParams 
 * @returns 
 */
export const createSecretHelper = async ({
    apiRequest,
    workspaceKey,
    workspaceId,
    environment,
    type,
    secretName,
    secretValue,
    path
}: CreateSecretParams) => {

    const {
        ciphertext: secretKeyCiphertext,
        iv: secretKeyIV,
        tag: secretKeyTag
    } = encryptSymmetric128BitHexKeyUTF8({
        plaintext: secretName,
        key: workspaceKey
    });

    const {
        ciphertext: secretValueCiphertext,
        iv: secretValueIV,
        tag: secretValueTag
    } = encryptSymmetric128BitHexKeyUTF8({
        plaintext: secretValue,
        key: workspaceKey
    });

    const secret = await createSecret(apiRequest, {
        secretName,
        workspaceId,
        environment,
        type,
        secretKeyCiphertext,
        secretKeyIV,
        secretKeyTag,
        secretValueCiphertext,
        secretValueIV,
        secretValueTag,
        path
    });

    return transformSecretToSecretBundle({
        secret,
        secretName,
        secretValue
    });
}

/**
 * Update a secret
 * @param {UpdateSecretParams} updateSecretParams 
 * @returns 
 */
export const updateSecretHelper = async ({
    apiRequest,
    workspaceKey,
    workspaceId,
    environment,
    type,
    path,
    secretName,
    secretValue
}: UpdateSecretParams) => {

    const {
        ciphertext: secretValueCiphertext,
        iv: secretValueIV,
        tag: secretValueTag
    } = encryptSymmetric128BitHexKeyUTF8({
        plaintext: secretValue,
        key: workspaceKey
    })

    const secret = await updateSecret(apiRequest, {
        secretName,
        workspaceId,
        environment,
        type,
        path,
        secretValueCiphertext,
        secretValueIV,
        secretValueTag
    });

    return transformSecretToSecretBundle({
        secret,
        secretName,
        secretValue
    });
}

/**
 * Delete a secret
 * @param {DeleteSecretParams} deleteSecretParams 
 * @returns 
 */
export const deleteSecretHelper = async ({
    apiRequest,
    secretName,
    workspaceId,
    environment,
    type,
    workspaceKey
}: DeleteSecretParams) => {
    const secret = await deleteSecret(apiRequest, {
        secretName,
        workspaceId,
        environment,
        type
    });

    const secretValue = decryptSymmetric128BitHexKeyUTF8({
        ciphertext: secret.secretValueCiphertext,
        iv: secret.secretValueIV,
        tag: secret.secretValueTag,
        key: workspaceKey
    });

    return transformSecretToSecretBundle({
        secret,
        secretName,
        secretValue
    });
}