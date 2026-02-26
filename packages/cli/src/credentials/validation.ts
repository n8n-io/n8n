import type { User } from '@n8n/db';
import { hasGlobalScope } from '@n8n/permissions';
import get from 'lodash/get';
import { type ICredentialDataDecryptedObject } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import { getAllKeyPaths } from '@/utils';

// #region External Secrets

/**
 * Regular expression pattern for valid provider keys.
 * Keep this in sync with the regex implemented in CreateSecretsProviderConnectionDto.
 */
const PROVIDER_KEY_PATTERN = '[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*';

/**
 * Checks if a string value contains an external secret expression.
 * Detects both dot notation ($secrets.vault.key) and bracket notation ($secrets['vault']['key']).
 */
export function containsExternalSecretExpression(value: string): boolean {
	const containsExpression = value.includes('{{') && value.includes('}}');
	if (!containsExpression) {
		return false;
	}
	return value.includes('$secrets.') || value.includes('$secrets[');
}

/**
 * Extracts the provider keys from an expression string.
 * Supports both dot notation ($secrets.vault.key) and bracket notation ($secrets['vault']['key']).
 * Only extracts provider keys from $secrets references inside {{ }} expression braces.
 *
 * @param expression - The expression string containing $secrets reference
 * @returns Array of unique provider keys, or empty array if none found
 *
 * @example
 * extractProviderKeys("={{ $secrets.vault.myKey }}") // returns ["vault"]
 * extractProviderKeys("={{ $secrets['aws']['secret'] }}") // returns ["aws"]
 * extractProviderKeys("={{ $secrets.vault.myKey + ':' + $secrets.aws.otherKey }}") // returns ["vault", "aws"]
 * extractProviderKeys("$secrets.vault.key") // returns [] (not inside braces)
 */
export function extractProviderKeys(expression: string): string[] {
	const providerKeys = new Set<string>();

	const expressionBlocks = expression.matchAll(/\{\{(.*?)\}\}/gs);

	for (const expression of expressionBlocks) {
		const expressionContent = expression[1]; // Content inside {{ }}

		// Match all dot notation occurrences: $secrets.providerKey
		const dotMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\.(${PROVIDER_KEY_PATTERN})`, 'g'),
		);
		for (const match of dotMatches) {
			providerKeys.add(match[1]);
		}

		// Match all bracket notation occurrences: $secrets['providerKey'] or $secrets["providerKey"]
		const bracketMatches = expressionContent.matchAll(
			new RegExp(`\\$secrets\\[['"](${PROVIDER_KEY_PATTERN})['"]\\]`, 'g'),
		);
		for (const match of bracketMatches) {
			providerKeys.add(match[1]);
		}
	}

	return Array.from(providerKeys);
}

/**
 * Checks if credential data contains any external secret expressions ($secrets)
 */
function containsExternalSecrets(data: ICredentialDataDecryptedObject): boolean {
	const secretPaths = getAllKeyPaths(data, '', [], containsExternalSecretExpression);
	return secretPaths.length > 0;
}

/**
 * Checks if any changed field in a credential contains an external secret expression
 */
export function isChangingExternalSecretExpression(
	newData: ICredentialDataDecryptedObject,
	existingData: ICredentialDataDecryptedObject,
): boolean {
	// Find all paths in newData that contain external secret expressions
	const newSecretPaths = getAllKeyPaths(newData, '', [], containsExternalSecretExpression);

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
 * Validates if a user has permission to use external secrets in credentials
 *
 * @param dataToSave - only optional in case it's not provided in the payload of the request
 * @param decryptedExistingData - Optional existing credential data (optional as it can only be provided when updating an existing credential)
 * @throws {BadRequestError} If user lacks permission when attempting to use external secrets
 */
export function validateExternalSecretsPermissions(
	user: User,
	dataToSave?: ICredentialDataDecryptedObject,
	decryptedExistingData?: ICredentialDataDecryptedObject,
): void {
	if (!dataToSave) {
		return;
	}
	const isUpdatingExistingCredential = !!decryptedExistingData;
	const needsCheck = isUpdatingExistingCredential
		? isChangingExternalSecretExpression(dataToSave, decryptedExistingData)
		: containsExternalSecrets(dataToSave);
	if (needsCheck) {
		if (!hasGlobalScope(user, 'externalSecret:list')) {
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
	const secretPaths = getAllKeyPaths(data, '', [], containsExternalSecretExpression);
	if (secretPaths.length === 0) {
		return; // No external secrets referenced, nothing to check
	}

	// Track which credential properties use which providers
	const providerToCredentialPropertyMap = new Map<string, string[]>();

	for (const credentialProperty of secretPaths) {
		const expressionString = get(data, credentialProperty);
		if (typeof expressionString === 'string') {
			const providerKeys = extractProviderKeys(expressionString);
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
