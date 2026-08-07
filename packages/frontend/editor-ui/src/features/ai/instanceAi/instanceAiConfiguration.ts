import type { InstanceAiAdminSettingsResponse, InstanceAiProviderConnection } from '@n8n/api-types';

export type InstanceAiSearchState = 'set' | 'env' | 'disabled' | 'notset';

export function deriveInstanceAiConfiguration(
	settings: InstanceAiAdminSettingsResponse | null,
	modelCredentials: InstanceAiProviderConnection[],
	serviceCredentials: InstanceAiProviderConnection[],
) {
	const modelCredential = modelCredentials.find(
		(credential) => credential.id === settings?.modelCredentialId,
	);
	const modelConfigured = Boolean(
		settings?.modelEnvConfigured || (settings?.modelCredentialId && settings.modelName),
	);
	const sandboxCredentialId =
		settings?.sandboxProvider === 'daytona'
			? settings.daytonaCredentialId
			: settings?.n8nSandboxCredentialId;
	const sandboxConfigured = Boolean(
		settings?.sandboxEnabled && (sandboxCredentialId || settings.sandboxEnvConfigured),
	);
	const searchCredential = serviceCredentials.find(
		(credential) => credential.id === settings?.searchCredentialId,
	);
	let searchState: InstanceAiSearchState = 'notset';
	if (settings?.searchCredentialId) searchState = 'set';
	else if (settings?.searchEnvConfigured) searchState = 'env';
	else if (settings?.searchDisabled) searchState = 'disabled';

	const setupCompleted = modelConfigured && sandboxConfigured && searchState !== 'notset';
	return {
		modelCredential,
		modelConfigured,
		sandboxCredentialId,
		sandboxConfigured,
		searchCredential,
		searchState,
		setupCompleted,
		hasSetupProgress: modelConfigured || sandboxConfigured || searchState !== 'notset',
	};
}
