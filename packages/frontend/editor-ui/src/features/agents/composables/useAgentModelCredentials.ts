import { LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue';
import {
	AGENT_MODEL_PROVIDERS,
	getProviderCredentialTypes,
	type AgentCredentialsByProvider,
	type AgentModelProvider,
	isAgentModelProvider,
} from '../model-providers';

function parseStoredCredentials(value: string): AgentCredentialsByProvider {
	try {
		const raw: unknown = JSON.parse(value);
		if (typeof raw !== 'object' || raw === null) return {};

		const credentials: AgentCredentialsByProvider = {};
		for (const [provider, credentialId] of Object.entries(raw)) {
			if (!isAgentModelProvider(provider)) continue;
			if (typeof credentialId !== 'string' && credentialId !== null) continue;
			credentials[provider] = credentialId;
		}

		return credentials;
	} catch {
		return {};
	}
}

export function useAgentModelCredentials(userId: string, projectId: MaybeRefOrGetter<string>) {
	const credentialsStore = useCredentialsStore();
	const aiGatewayStore = useAiGatewayStore();
	const settingsStore = useSettingsStore();

	// Providers covered by n8n Connect default to the managed "n8n credits" credential
	// so building works with zero configuration.
	function supportsManagedCredits(provider: AgentModelProvider): boolean {
		if (!settingsStore.isAiGatewayEnabled) return false;
		return getProviderCredentialTypes(provider).some((credentialType) =>
			aiGatewayStore.canServeCredentialType(credentialType),
		);
	}

	const selectedCredentials = useLocalStorage<AgentCredentialsByProvider>(
		LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS(userId),
		{},
		{
			writeDefaults: false,
			shallow: true,
			serializer: {
				read: parseStoredCredentials,
				write: (value) => JSON.stringify(value),
			},
		},
	);

	// Read the agent scope by key: another surface can fetch a different scope while the
	// picker is open, and that must not empty the picker.
	const agentScopeCredentials = computed(() =>
		credentialsStore.getUsableCredentialsForScope({
			projectId: toValue(projectId),
			forAgent: true,
		}),
	);
	const isCredentialsReady = computed(() => agentScopeCredentials.value !== undefined);

	function getCredentialsForProvider(provider: AgentModelProvider) {
		const credentials = agentScopeCredentials.value;
		if (!credentials) return [];

		const credentialTypes = new Set(getProviderCredentialTypes(provider));
		const credentialsById = new Map<string, (typeof credentials)[number]>();
		for (const credential of credentials) {
			if (credentialTypes.has(credential.type) && !credentialsById.has(credential.id)) {
				credentialsById.set(credential.id, credential);
			}
		}

		return [...credentialsById.values()].toSorted(
			(a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
		);
	}

	const credentialsByProvider = computed<AgentCredentialsByProvider | null>(() => {
		if (!isCredentialsReady.value) return null;

		const credentials: AgentCredentialsByProvider = {};
		for (const provider of AGENT_MODEL_PROVIDERS) {
			const providerCredentials = getCredentialsForProvider(provider);
			const selectedCredentialId = selectedCredentials.value[provider] ?? null;

			// The n8n Connect managed tag is a valid selection with no matching stored
			// credential — preserve it while n8n Connect still serves the provider,
			// otherwise fall through to a real credential (license off / provider removed).
			credentials[provider] =
				selectedCredentialId === AI_GATEWAY_MANAGED_TAG && supportsManagedCredits(provider)
					? AI_GATEWAY_MANAGED_TAG
					: selectedCredentialId &&
							providerCredentials.some((credential) => credential.id === selectedCredentialId)
						? selectedCredentialId
						: // Nothing selected: default to n8n credits where supported, else the
							// first existing credential.
							supportsManagedCredits(provider)
							? AI_GATEWAY_MANAGED_TAG
							: (providerCredentials[0]?.id ?? null);
		}

		return credentials;
	});

	function selectCredential(provider: AgentModelProvider, id: string | null) {
		selectedCredentials.value = { ...selectedCredentials.value, [provider]: id };
	}

	watch(
		() => toValue(projectId),
		async (id) => {
			if (!id) return;

			await Promise.all([
				credentialsStore.fetchCredentialTypes(false),
				credentialsStore.fetchUsableCredentials({ projectId: id, forAgent: true }),
			]);
		},
		{ immediate: true },
	);

	// The store keeps a bounded number of scopes. Fetch again if it drops ours while
	// the picker is open. Only the ready-to-not-ready change triggers it, so a failed
	// fetch does not repeat. A project change is left to the watcher above.
	watch(
		() => [isCredentialsReady.value, toValue(projectId)] as const,
		([ready, id], [wasReady, previousId]) => {
			if (ready || !wasReady || !id || id !== previousId) return;
			void credentialsStore
				.fetchUsableCredentials({ projectId: id, forAgent: true })
				.catch(() => {});
		},
	);

	return { credentialsByProvider, getCredentialsForProvider, selectCredential };
}
