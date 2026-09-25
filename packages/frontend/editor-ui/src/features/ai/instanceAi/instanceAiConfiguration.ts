import { deriveInstanceAiSetupState } from '@n8n/api-types';
import type {
	InstanceAiAdminSettingsResponse,
	InstanceAiProviderConnection,
	InstanceAiWebSearchSource,
} from '@n8n/api-types';

export type InstanceAiSearchState = 'set' | 'env' | 'disabled' | 'notset';

const SEARCH_STATE_BY_SOURCE: Record<InstanceAiWebSearchSource, InstanceAiSearchState> = {
	ui: 'set',
	env: 'env',
	disabled: 'disabled',
	none: 'notset',
};

export function deriveInstanceAiConfiguration(
	settings: InstanceAiAdminSettingsResponse | null,
	modelCredentials: InstanceAiProviderConnection[],
	serviceCredentials: InstanceAiProviderConnection[],
) {
	const state = settings ? deriveInstanceAiSetupState(settings) : null;
	const modelCredential = modelCredentials.find(
		(credential) => credential.id === settings?.modelCredentialId,
	);
	const searchCredential = serviceCredentials.find(
		(credential) => credential.id === settings?.searchCredentialId,
	);
	const modelConfigured = state !== null && state.modelSource !== 'none';
	const sandboxConfigured = state !== null && state.sandboxSource !== 'none';
	const searchState: InstanceAiSearchState = state
		? SEARCH_STATE_BY_SOURCE[state.webSearchSource]
		: 'notset';

	return {
		modelCredential,
		modelConfigured,
		sandboxCredentialId: state?.sandboxCredentialId ?? null,
		sandboxConfigured,
		searchCredential,
		searchState,
		setupCompleted: state?.setupCompleted ?? false,
		hasSetupProgress: modelConfigured || sandboxConfigured || searchState !== 'notset',
	};
}
