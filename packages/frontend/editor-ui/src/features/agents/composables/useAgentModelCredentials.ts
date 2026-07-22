import { LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS } from '@/app/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	AGENT_MODEL_PROVIDERS,
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
	const isInitialized = ref(false);
	const credentialsStore = useCredentialsStore();
	const aiGatewayStore = useAiGatewayStore();
	const settingsStore = useSettingsStore();

	// Providers covered by n8n Connect default to the managed "n8n credits" credential
	// so building works with zero configuration.
	function supportsManagedCredits(provider: AgentModelProvider): boolean {
		if (!settingsStore.isAiGatewayEnabled) return false;
		return AGENT_MODEL_PROVIDER_DEFINITIONS[provider].credentialTypes.some((credentialType) =>
			aiGatewayStore.isCredentialTypeSupported(credentialType),
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

	const isCredentialsReady = computed(
		() => isInitialized.value || credentialsStore.allCredentials.length > 0,
	);

	function getCredentialsForProvider(provider: AgentModelProvider) {
		const credentialsById = new Map<
			string,
			ReturnType<typeof credentialsStore.getCredentialsByType>[number]
		>();

		for (const credentialType of AGENT_MODEL_PROVIDER_DEFINITIONS[provider].credentialTypes) {
			for (const credential of credentialsStore.getCredentialsByType(credentialType)) {
				if (!credentialsById.has(credential.id)) {
					credentialsById.set(credential.id, credential);
				}
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
			// credential — preserve it instead of falling back to a real credential.
			credentials[provider] =
				selectedCredentialId === AI_GATEWAY_MANAGED_TAG
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
				credentialsStore.fetchAllCredentialsForWorkflow({ projectId: id }),
			]);

			isInitialized.value = true;
		},
		{ immediate: true },
	);

	return { credentialsByProvider, getCredentialsForProvider, selectCredential };
}
