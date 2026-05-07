<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nCard, N8nText, N8nIcon } from '@n8n/design-system';
import type {
	AskLlmResume,
	ChatHubConversationModel,
	ChatHubProvider,
	ChatModelsResponse,
} from '@n8n/api-types';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import { isLlmProviderModel } from '@/features/ai/chatHub/chat.utils';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { CHATHUB_TO_CATALOG, AGENT_UNSUPPORTED_PROVIDERS } from '../../provider-mapping';
import { sanitizeModelId } from '../../utils/model-string';

const props = defineProps<{
	purpose?: string;
	disabled?: boolean;
	resolvedValue?: AskLlmResume;
}>();

const emit = defineEmits<{
	submit: [
		resumeData: {
			provider: string;
			model: string;
			credentialId: string;
			credentialName: string;
		},
	];
}>();

const usersStore = useUsersStore();
const credentialsStore = useCredentialsStore();
const chatStore = useChatStore();
const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

// Fetch models when credentials are ready — same pattern as AgentSettingsSidebar
watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) {
			void chatStore.fetchAgents(credentials);
		}
	},
	{ immediate: true },
);

// Filter out providers the agents runtime doesn't support
const filteredAgents = computed<ChatModelsResponse>(
	() =>
		Object.fromEntries(
			Object.entries(chatStore.agents).filter(
				([provider]) => !AGENT_UNSUPPORTED_PROVIDERS.has(provider),
			),
		) as ChatModelsResponse,
);

function onModelChange(selection: ChatHubConversationModel) {
	if (!isLlmProviderModel(selection) || props.disabled) return;

	const catalogProvider = CHATHUB_TO_CATALOG[selection.provider] ?? selection.provider;
	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';
	const credentialName =
		credentialsStore.allCredentials.find((c) => c.id === credentialId)?.name ?? '';
	const model = sanitizeModelId(catalogProvider, selection.model);

	emit('submit', { provider: catalogProvider, model, credentialId, credentialName });
}

function onSelectCredential(provider: ChatHubProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
}
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="ask-llm-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.purpose">
				{{ purpose ?? 'Choose a model' }}
			</N8nText>

			<!-- Resolved state: show what was selected instead of the live picker -->
			<div v-if="disabled && resolvedValue" :class="$style.resolved">
				<N8nIcon icon="circle-check" size="small" color="success" />
				<div :class="$style.resolvedDetails">
					<N8nText bold size="small"
						>{{ resolvedValue.provider }}/{{ resolvedValue.model }}</N8nText
					>
					<N8nText size="small" color="text-light">{{ resolvedValue.credentialName }}</N8nText>
				</div>
			</div>

			<!-- Live picker: shown when not yet resolved -->
			<ModelSelector
				v-else
				:selected-agent="null"
				:include-custom-agents="false"
				:credentials="credentialsByProvider"
				:agents="filteredAgents"
				:is-loading="false"
				:warn-missing-credentials="true"
				horizontal
				@change="onModelChange"
				@select-credential="onSelectCredential"
			/>
		</div>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	--card--padding: var(--spacing--sm);

	gap: var(--spacing--xs);
	width: 90%;
	max-width: 90%;
}

.disabled {
	opacity: 0.75;
	pointer-events: none;
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.resolved {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	color: var(--color--success);
}

.resolvedDetails {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.purpose {
	margin: 0;
	font-size: var(--font-size--sm);
}
</style>
