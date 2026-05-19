import { LOCAL_STORAGE_AGENT_MODEL_CREDENTIALS } from '@/app/constants';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useLocalStorage } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
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

export function useAgentModelCredentials(userId: string) {
	const isInitialized = ref(false);
	const credentialsStore = useCredentialsStore();
	const projectStore = useProjectsStore();

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

	const autoSelectCredentials = computed<AgentCredentialsByProvider>(() => {
		const credentials: AgentCredentialsByProvider = {};

		for (const provider of AGENT_MODEL_PROVIDERS) {
			credentials[provider] = getCredentialsForProvider(provider)[0]?.id ?? null;
		}

		return credentials;
	});

	const credentialsByProvider = computed<AgentCredentialsByProvider | null>(() => {
		if (!isCredentialsReady.value) return null;

		const credentials: AgentCredentialsByProvider = {};
		for (const provider of AGENT_MODEL_PROVIDERS) {
			const selectedCredentialId = selectedCredentials.value[provider] ?? null;

			credentials[provider] =
				selectedCredentialId &&
				credentialsStore.allCredentials.some((credential) => credential.id === selectedCredentialId)
					? selectedCredentialId
					: autoSelectCredentials.value[provider];
		}

		return credentials;
	});

	function selectCredential(provider: AgentModelProvider, id: string | null) {
		selectedCredentials.value = { ...selectedCredentials.value, [provider]: id };
	}

	watch(
		() => projectStore.personalProject,
		async (personalProject) => {
			if (!personalProject) return;

			await Promise.all([
				credentialsStore.fetchCredentialTypes(false),
				credentialsStore.fetchAllCredentialsForWorkflow({ projectId: personalProject.id }),
			]);

			isInitialized.value = true;
		},
		{ immediate: true },
	);

	return { credentialsByProvider, getCredentialsForProvider, selectCredential };
}
