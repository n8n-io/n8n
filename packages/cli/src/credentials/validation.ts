import type { User } from '@n8n/db';
import get from 'lodash/get';
import { type ICredentialDataDecryptedObject } from 'n8n-workflow';

import {
	extractProviderKeysFromExpression,
	getExternalSecretExpressionPaths,
} from './external-secrets.utils';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { userHasScopes } from '@/permissions.ee/check-access';

// #region External Secrets

/**
 * Checks if credential data contains any external secret expressions ($secrets)
 */
function containsExternalSecrets(data: ICredentialDataDecryptedObject): boolean {
	return getExternalSecretExpressionPaths(data).length > 0;
}

/**
 * Checks if any changed field in a credential contains an external secret expression
 */
export function isChangingExternalSecretExpression(
	newData: ICredentialDataDecryptedObject,
	existingData: ICredentialDataDecryptedObject,
): boolean {
	// Find all paths in newData that contain external secret expressions
	const newSecretPaths = getExternalSecretExpressionPaths(newData);

	// Check if any of these paths represent a change from existingData
	for (const path of newSecretPaths) {
		const newValue = get(newData, path);
		const existingValue = get(existingData, path);

		if (newValue !== existingValue) {
			return true; // External secret expression is being added or modified
		}
	}

	return false;
}

/**
 * Validates if a user has permission to use external secrets in credentials.
 * Accepts either global scope or project-level scope for `externalSecret:list`.
 *
 * @param dataToSave - only optional in case it's not provided in the payload of the request
 * @param decryptedExistingData - Optional existing credential data (optional as it can only be provided when updating an existing credential)
 * @throws {BadRequestError} If user lacks permission when attempting to use external secrets
 */
export async function validateExternalSecretsPermissions({
	user,
	projectId,
	dataToSave,
	decryptedExistingData,
}: {
	user: User;
	projectId: string;
	dataToSave?: ICredentialDataDecryptedObject;
	decryptedExistingData?: ICredentialDataDecryptedObject;
}): Promise<void> {
	if (!dataToSave) {
		return;
	}
	const isUpdatingExistingCredential = !!decryptedExistingData;
	const needsCheck = isUpdatingExistingCredential
		? isChangingExternalSecretExpression(dataToSave, decryptedExistingData)
		: containsExternalSecrets(dataToSave);
	if (needsCheck) {
		const hasAccess = await userHasScopes(user, ['externalSecret:list'], false, { projectId });
		if (!hasAccess) {
			throw new BadRequestError('Lacking permissions to reference external secrets in credentials');
		}
	}
}

/**
 * Validates that the project has access to all external secret providers referenced in credential data.
 *
 * Call validateExternalSecretsPermissions before this one.
 *
 * @param projectId - The project ID to check access for
 * @param data - The credential data that may contain external secret expressions
 * @param externalSecretsProviderAccessCheckService - Service to check provider access
 * @throws BadRequestError if any providers are inaccessible.
 */
export async function validateAccessToReferencedSecretProviders(
	projectId: string,
	data: ICredentialDataDecryptedObject,
	externalSecretsProviderAccessCheckService: SecretsProviderAccessCheckService,
	source: 'create' | 'update' | 'transfer',
) {
	if (!containsExternalSecrets(data)) {
		return; // No external secrets referenced, nothing to check
	}

	const secretPaths = getExternalSecretExpressionPaths(data);

	// Track which credential properties use which providers
	const providerToCredentialPropertyMap = new Map<string, string[]>();

	for (const credentialProperty of secretPaths) {
		const expressionString = get(data, credentialProperty);
		if (typeof expressionString === 'string') {
			const providerKeys = extractProviderKeysFromExpression(expressionString);
			if (providerKeys.length === 0) {
				throw new BadRequestError(
					`Could not find a valid external secret vault name inside "${expressionString}" used in "${credentialProperty}"`,
				);
			}

			for (const providerKey of providerKeys) {
				const credentialProperties = providerToCredentialPropertyMap.get(providerKey) ?? [];
				credentialProperties.push(credentialProperty);
				providerToCredentialPropertyMap.set(providerKey, credentialProperties);
			}
		}
	}

	// Early return if no valid providers found
	if (providerToCredentialPropertyMap.size === 0) {
		return;
	}

	// map of inaccessible providerKey -> list of credential properties that reference it
	const inaccessibleProviders = new Map<string, string[]>();
	const providerKeys = Array.from(providerToCredentialPropertyMap.keys());

	await Promise.all(
		providerKeys.map(async (providerKey) => {
			const hasAccess =
				await externalSecretsProviderAccessCheckService.isProviderAvailableInProject(
					providerKey,
					projectId,
				);

			if (!hasAccess) {
				const credentialProperties = providerToCredentialPropertyMap.get(providerKey) ?? [];
				if (credentialProperties.length > 0) {
					inaccessibleProviders.set(providerKey, credentialProperties);
				}
			}
		}),
	);

	// Throw error if any providers are inaccessible
	if (inaccessibleProviders.size > 0) {
		const formatCredentialPropertyList = (properties: string[]): string => {
			return properties.map((f) => `"${f}"`).join(', ');
		};
		const errorMessageSuffix =
			source === 'transfer' ? 'in the destination project' : 'in this project';
		if (inaccessibleProviders.size === 1) {
			const [providerKey, credentialProperties] = Array.from(inaccessibleProviders.entries())[0];
			const credentialPropertyList = formatCredentialPropertyList(credentialProperties);
			throw new BadRequestError(
				`The secret provider "${providerKey}" used in ${credentialPropertyList} does not exist ${errorMessageSuffix}`,
			);
		} else {
			const providerDetails = Array.from(inaccessibleProviders.entries())
				.map(([provider, fields]) => {
					const credentialPopertyList = formatCredentialPropertyList(fields);
					return `"${provider}" (used in ${credentialPopertyList})`;
				})
				.join(', ');
			throw new BadRequestError(
				`The secret providers ${providerDetails} do not exist ${errorMessageSuffix}`,
			);
		}
	}
}

// #endregion
