<script setup lang="ts">
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import type {
	ChatHubConversationModel,
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatModelDto,
	ChatSessionId,
} from '@n8n/api-types';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, useTemplateRef, watch, ref } from 'vue';
import { useChatStore } from '../chat.store';

const {
	selectedModel,
	credentials,
	readyToShowModelSelector,
	showArtifactIcon,
	hasDynamicCredentials,
} = defineProps<{
	selectedModel: ChatModelDto | null;
	credentials: CredentialsMap | null;
	readyToShowModelSelector: boolean;
	showArtifactIcon: boolean;
	hasDynamicCredentials: boolean;
}>();

const emit = defineEmits<{
	selectModel: [ChatHubConversationModel];
	renameConversation: [id: ChatSessionId, title: string];
	editCustomAgent: [agentId: string];
	createCustomAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string | null];
	openWorkflow: [workflowId: string];
	reopenArtifact: [];
	toggleDynamicCredentials: [];
}>();

const modelSelectorRef = useTemplateRef('modelSelectorRef');
const i18n = useI18n();
const chatStore = useChatStore();

const isLoadingAgents = ref(false);

const showOpenWorkflow = computed(() => {
	return (
		selectedModel?.model.provider === 'n8n' &&
		selectedModel.metadata.scopes?.includes('workflow:read')
	);
});

function onOpenWorkflow() {
	if (selectedModel?.model.provider === 'n8n') {
		emit('openWorkflow', selectedModel.model.workflowId);
	}
}

function onModelChange(selection: ChatHubConversationModel) {
	emit('selectModel', selection);
}

// Update agents when credentials are updated
watch(
	() => credentials,
	async (creds) => {
		if (creds) {
			isLoadingAgents.value = true;
			try {
				await chatStore.fetchAgents(creds);
			} finally {
				isLoadingAgents.value = false;
			}
		}
	},
	{ immediate: true },
);

defineExpose({
	openModelSelector: () => modelSelectorRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		modelSelectorRef.value?.openCredentialSelector(provider),
});
</script>

<template>
	<div :class="$style.component">
		<div :class="$style.grow">
			<ModelSelector
				v-if="readyToShowModelSelector"
				ref="modelSelectorRef"
				:selected-agent="selectedModel"
				:credentials="credentials"
				text
				:agents="chatStore.agents"
				:is-loading="isLoadingAgents"
				@change="onModelChange"
				@create-custom-agent="emit('createCustomAgent')"
				@select-credential="
					(provider, credentialId) => emit('selectCredential', provider, credentialId)
				"
			/>
		</div>
		<div :class="$style.buttons">
			<N8nButton
				variant="subtle"
				v-if="selectedModel?.model.provider === 'custom-agent'"
				size="small"
				icon="settings"
				:label="i18n.baseText('chatHub.chat.header.button.editAgent')"
				@click="emit('editCustomAgent', selectedModel.model.agentId)"
			/>
			<N8nIconButton
				v-if="showArtifactIcon"
				variant="subtle"
				size="small"
				icon="panel-right"
				@click="emit('reopenArtifact')"
			/>
			<N8nIconButton
				v-if="hasDynamicCredentials"
				variant="subtle"
				size="small"
				icon="key-round"
				:title="i18n.baseText('chatHub.chat.header.button.manageConnections')"
				:aria-label="i18n.baseText('chatHub.chat.header.button.manageConnections')"
				data-testid="manage-dynamic-credentials-button"
				@click="emit('toggleDynamicCredentials')"
			/>
			<N8nButton
				v-if="showOpenWorkflow"
				variant="subtle"
				size="small"
				icon="settings"
				:label="i18n.baseText('chatHub.chat.header.button.openWorkflow')"
				@click="onOpenWorkflow"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.component {
	padding-left: var(--spacing--4xs);
	padding-right: var(--spacing--xs);
	height: 56px;
	flex-grow: 0;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	border-bottom: var(--border);

	&:has(.menuButton) {
		padding-inline: var(--spacing--xs);
	}
}

.grow {
	flex-grow: 1;
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.title {
	margin-inline: var(--spacing--md);
}

.buttons {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
