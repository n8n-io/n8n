<script setup lang="ts">
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import ChatSidebarOpener from '@/features/ai/chatHub/components/ChatSidebarOpener.vue';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import type { ChatHubProvider, ChatModelDto, ChatSessionId } from '@n8n/api-types';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
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
	selectCredential: [provider: ChatHubProvider, credentialId: string];
	openWorkflow: [workflowId: string];
}>();

const sidebar = useChatHubSidebarState();
const router = useRouter();
const modelSelectorRef = useTemplateRef('modelSelectorRef');

function onModelChange(selection: ChatModelDto) {
	emit('selectModel', selection);
}

function onNewChat() {
	sidebar.toggleOpen(false);

	void router.push({ name: CHAT_VIEW, force: true });
}

defineExpose({
	openModelSelector: () => modelSelectorRef.value?.open(),
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
				@click="onNewChat"
			/>
			<ModelSelector
				v-if="readyToShowModelSelector"
				ref="modelSelectorRef"
				:selected-agent="selectedModel"
				:credentials="credentials"
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
			label="Edit Agent"
			@click="emit('editCustomAgent', selectedModel.model.agentId)"
		/>
		<N8nButton
			v-if="selectedModel?.model.provider === 'n8n'"
			:class="$style.editAgent"
			type="secondary"
			size="small"
			icon="settings"
			label="Open Workflow"
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
