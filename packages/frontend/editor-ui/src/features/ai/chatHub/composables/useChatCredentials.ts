import { LOCAL_STORAGE_CHAT_HUB_CREDENTIALS } from '@/constants';
import { credentialsMapSchema, type CredentialsMap } from '@/features/ai/chatHub/chat.types';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	chatHubProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubProvider,
} from '@n8n/api-types';
import { useLocalStorage } from '@vueuse/core';
import { computed, onMounted, ref } from 'vue';

/**
 * Composable for managing chat credentials including auto-selection and user selection.
 */
export function useChatCredentials(userId: string) {
	const isInitialized = ref(false);
	const credentialsStore = useCredentialsStore();
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

	const autoSelectCredentials = computed<CredentialsMap>(() =>
		Object.fromEntries(
			chatHubProviderSchema.options.map((provider) => {
				if (provider === 'n8n' || provider === 'custom-agent') {
					return [provider, null];
				}

				const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

				if (!credentialType) {
					return [provider, null];
				}

				const lastCreatedCredential =
					credentialsStore
						.getCredentialsByType(credentialType)
						.toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.id ?? null;

				return [provider, lastCreatedCredential];
			}),
		),
	);

	const credentialsByProvider = computed<CredentialsMap | null>(() =>
		isInitialized.value
			? {
					...autoSelectCredentials.value,
					...selectedCredentials.value,
				}
			: null,
	);

	function selectCredential(provider: ChatHubProvider, id: string) {
		selectedCredentials.value = { ...selectedCredentials.value, [provider]: id };
	}

	onMounted(async () => {
		await Promise.all([
			credentialsStore.fetchCredentialTypes(false),
			credentialsStore.fetchAllCredentials(),
		]);
		isInitialized.value = true;
	});

	return { credentialsByProvider, selectCredential };
}
