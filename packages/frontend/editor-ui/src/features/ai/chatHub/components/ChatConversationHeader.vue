<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import {
	type ChatHubConversationModel,
	type ChatHubProvider,
	type ChatSessionId,
} from '@n8n/api-types';
import { N8nIconButton } from '@n8n/design-system';
import { computed, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';

const { selectedModel, credentials } = defineProps<{
	selectedModel: ChatHubConversationModel | null;
	credentials: CredentialsMap;
}>();

const emit = defineEmits<{
	selectModel: [ChatHubConversationModel];
	setCredentials: [provider: ChatHubProvider];
	renameConversation: [id: ChatSessionId, title: string];
}>();

const sidebar = useChatHubSidebarState();
const chatStore = useChatStore();
const credentialsStore = useCredentialsStore();
const router = useRouter();
const modelSelectorRef = useTemplateRef('modelSelectorRef');

const credentialsName = computed(() =>
	selectedModel
		? credentialsStore.getCredentialById(credentials[selectedModel.provider] ?? '')?.name
		: undefined,
);

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
			:credentials-name="credentialsName"
			@change="onModelChange"
			@configure="emit('setCredentials', $event)"
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

.title {
	margin-inline: var(--spacing--md);
}
</style>
