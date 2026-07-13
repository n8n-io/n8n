<script setup lang="ts">
import { computed, watch } from 'vue';
import { N8nCard, N8nText, N8nIcon } from '@n8n/design-system';
import type { AskLlmResume } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useAgentModelCredentials } from '../../composables/useAgentModelCredentials';
import { useAgentProjectId } from '../../composables/useAgentProjectId';
import AgentModelSelector from '../AgentModelSelector.vue';
import { sanitizeModelId } from '../../utils/model-string';
import { useModelCatalog } from '../../composables/useModelCatalog';
import {
	type AgentModelProvider,
	type AgentModelSelection,
	type AgentModelsByProvider,
} from '../../model-providers';

const props = defineProps<{
	purpose?: string;
	disabled?: boolean;
	resolvedValue?: AskLlmResume;
	projectId?: string;
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

const i18n = useI18n();
const usersStore = useUsersStore();
const credentialsStore = useCredentialsStore();
const { ensureLoaded, getModelsForPicker, isLoading } = useModelCatalog();

const projectId = useAgentProjectId(() => props.projectId);

const { credentialsByProvider, selectCredential } = useAgentModelCredentials(
	usersStore.currentUserId ?? 'anonymous',
	projectId,
);

watch(
	projectId,
	(id) => {
		if (id) void ensureLoaded(id);
	},
	{ immediate: true },
);

const filteredAgents = computed<AgentModelsByProvider>(() =>
	getModelsForPicker(credentialsByProvider.value),
);

function onModelChange(selection: AgentModelSelection) {
	if (props.disabled) return;

	const credentialId = credentialsByProvider.value?.[selection.provider] ?? '';
	if (!credentialId) return;

	const credentialName =
		credentialsStore.allCredentials.find((c) => c.id === credentialId)?.name ?? '';
	const model = sanitizeModelId(selection.provider, selection.model);

	emit('submit', { provider: selection.provider, model, credentialId, credentialName });
}

function onSelectCredential(provider: AgentModelProvider, credentialId: string | null) {
	selectCredential(provider, credentialId);
}
</script>

<template>
	<N8nCard :class="[$style.card, disabled && $style.disabled]" data-testid="ask-llm-card">
		<div :class="$style.cardBody">
			<N8nText tag="p" bold :class="$style.purpose">
				{{ purpose ?? i18n.baseText('agents.askLlm.chooseModel') }}
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
			<AgentModelSelector
				v-else
				:selected-model="null"
				:credentials="credentialsByProvider"
				:models-by-provider="filteredAgents"
				:is-loading="isLoading"
				:project-id="projectId"
				:warn-missing-credentials="true"
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
