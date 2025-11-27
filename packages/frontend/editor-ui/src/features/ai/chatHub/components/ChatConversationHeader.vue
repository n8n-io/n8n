<script setup lang="ts">
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import ChatSidebarOpener from '@/features/ai/chatHub/components/ChatSidebarOpener.vue';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import type {
	ChatHubLLMProvider,
	ChatHubProvider,
	ChatModelDto,
	ChatSessionId,
} from '@n8n/api-types';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

const { selectedModel, credentials, readyToShowModelSelector } = defineProps<{
	selectedModel: ChatModelDto | null;
	credentials: CredentialsMap | null;
	readyToShowModelSelector: boolean;
}>();

const emit = defineEmits<{
	selectModel: [ChatModelDto];
	renameConversation: [id: ChatSessionId, title: string];
	editCustomAgent: [agentId: string];
	createCustomAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string | null];
	openWorkflow: [workflowId: string];
}>();

const sidebar = useChatHubSidebarState();
const router = useRouter();
const modelSelectorRef = useTemplateRef('modelSelectorRef');
const i18n = useI18n();

function onModelChange(selection: ChatModelDto) {
	emit('selectModel', selection);
}

function onNewChat() {
	sidebar.toggleOpen(false);

	void router.push({ name: CHAT_VIEW, force: true });
}

defineExpose({
	openModelSelector: () => modelSelectorRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		modelSelectorRef.value?.openCredentialSelector(provider),
});
</script>

<template>
	<div :class="$style.component">
		<div :class="$style.grow">
			<ChatSidebarOpener :class="$style.menuButton" />
			<N8nIconButton
				v-if="!sidebar.isStatic.value"
				:class="$style.menuButton"
				type="secondary"
				icon="square-pen"
				text
				icon-size="large"
				:aria-label="i18n.baseText('chatHub.chat.header.button.newChat')"
				@click="onNewChat"
			/>
			<ModelSelector
				v-if="readyToShowModelSelector"
				ref="modelSelectorRef"
				:selected-agent="selectedModel"
				:credentials="credentials"
				text
				@change="onModelChange"
				@create-custom-agent="emit('createCustomAgent')"
				@select-credential="
					(provider, credentialId) => emit('selectCredential', provider, credentialId)
				"
			/>
		</div>
		<N8nButton
			v-if="selectedModel?.model.provider === 'custom-agent'"
			:class="$style.editAgent"
			type="secondary"
			size="small"
			icon="settings"
			:label="i18n.baseText('chatHub.chat.header.button.editAgent')"
			@click="emit('editCustomAgent', selectedModel.model.agentId)"
		/>
		<N8nButton
			v-if="selectedModel?.model.provider === 'n8n'"
			:class="$style.editAgent"
			type="secondary"
			size="small"
			icon="settings"
			:label="i18n.baseText('chatHub.chat.header.button.openWorkflow')"
			@click="emit('openWorkflow', selectedModel.model.workflowId)"
		/>
	</div>
</template>

<style lang="scss" module>
.component {
	padding-inline: var(--spacing--4xs);
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

.editAgent {
	margin-right: var(--spacing--3xs);
}
</style>
