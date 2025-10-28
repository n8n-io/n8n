<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import type { ChatHubConversationModel, ChatHubProvider, ChatSessionId } from '@n8n/api-types';
import { N8nButton, N8nIconButton } from '@n8n/design-system';
import { useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

const { selectedModel, credentials } = defineProps<{
	selectedModel: ChatHubConversationModel | null;
	credentials: CredentialsMap;
}>();

const emit = defineEmits<{
	selectModel: [ChatHubConversationModel];
	renameConversation: [id: ChatSessionId, title: string];
	editAgent: [agentId: string];
	createAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string];
}>();

const sidebar = useChatHubSidebarState();
const chatStore = useChatStore();
const router = useRouter();
const modelSelectorRef = useTemplateRef('modelSelectorRef');

function onModelChange(selection: ChatHubConversationModel) {
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
			<N8nIconButton
				v-if="!sidebar.isStatic.value"
				:class="$style.menuButton"
				type="secondary"
				icon="panel-left"
				text
				icon-size="large"
				@click="sidebar.toggleOpen(true)"
			/>
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
				ref="modelSelectorRef"
				:models="chatStore.models ?? null"
				:selected-model="selectedModel"
				:credentials="credentials"
				@change="onModelChange"
				@create-agent="emit('createAgent')"
				@select-credential="
					(provider, credentialId) => emit('selectCredential', provider, credentialId)
				"
			/>
		</div>
		<N8nButton
			v-if="selectedModel?.provider === 'custom-agent'"
			:class="$style.editAgent"
			type="secondary"
			size="small"
			icon="cog"
			label="Edit Agent"
			@click="emit('editAgent', selectedModel.agentId)"
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
}

.title {
	margin-inline: var(--spacing--md);
}

.editAgent {
	margin-right: var(--spacing--3xs);
}
</style>
