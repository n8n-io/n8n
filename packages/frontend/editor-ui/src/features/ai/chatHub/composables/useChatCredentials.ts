import { LOCAL_STORAGE_CHAT_HUB_CREDENTIALS } from '@/app/constants';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasPermission } from '@/app/utils/rbac/permissions';
import { credentialsMapSchema, type CredentialsMap } from '@/features/ai/chatHub/chat.types';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	chatHubProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
} from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { isLlmProvider } from '../chat.utils';

/**
 * Composable for managing chat credentials including auto-selection and user selection.
 */
export function useChatCredentials(userId: string) {
	const isInitialized = ref(false);
	const credentialsStore = useCredentialsStore();
	const settingsStore = useSettingsStore();
	const projectStore = useProjectsStore();

	const selectedCredentials = useLocalStorage<CredentialsMap>(
		LOCAL_STORAGE_CHAT_HUB_CREDENTIALS(userId),
		{},
		{
			writeDefaults: false,
			shallow: true,
			serializer: {
				read: (value) => {
					try {
						return credentialsMapSchema.parse(JSON.parse(value));
					} catch (error) {
						return {};
					}
				},
				write: (value) => JSON.stringify(value),
			},
		},
	);

	const isCredentialsReady = computed(
		() => isInitialized.value || credentialsStore.allCredentials.length > 0,
	);

	const autoSelectCredentials = computed<CredentialsMap>(() =>
		Object.fromEntries(
			chatHubProviderSchema.options.map((provider) => {
				if (!isLlmProvider(provider)) {
					return [provider, null];
				}

				const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
				if (!credentialType) {
					return [provider, null];
				}

				const availableCredentials = credentialsStore.getCredentialsByType(credentialType);

				const settings = settingsStore.moduleSettings?.['chat-hub']?.providers[provider];

				// Use default credential from settings if available to the user
				if (
					settings?.credentialId &&
					availableCredentials.some((c) => c.id === settings.credentialId)
				) {
					return [provider, settings.credentialId];
				}

				const lastCreatedCredential =
					availableCredentials.toSorted(
						(a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
					)[0]?.id ?? null;

				return [provider, lastCreatedCredential];
			}),
		),
	);

	const credentialsByProvider = computed<CredentialsMap | null>(() =>
		isCredentialsReady.value
			? {
					...autoSelectCredentials.value,
					...selectedCredentials.value,
				}
			: null,
	);

	function selectCredential(provider: ChatHubProvider, id: string) {
		selectedCredentials.value = { ...selectedCredentials.value, [provider]: id };
	}

	watch(
		() => projectStore.personalProject,
		async (personalProject) => {
			if (personalProject) {
				const hasGlobalCredentialRead = hasPermission(['rbac'], {
					rbac: { scope: 'credential:read' },
				});

				await Promise.all([
					credentialsStore.fetchCredentialTypes(false),
					// For non-owner users only fetch credentials from personal project.
					hasGlobalCredentialRead
						? credentialsStore.fetchAllCredentials()
						: credentialsStore.fetchAllCredentials(personalProject.id),
				]);

				isInitialized.value = true;
			}
		},
		{ immediate: true },
	);

	return { credentialsByProvider, selectCredential };
}
