<script setup lang="ts">
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import type { CredentialsMap } from '@/features/ai/chatHub/chat.types';
import CredentialSelectorModal from '@/features/ai/chatHub/components/CredentialSelectorModal.vue';
import ModelSelector from '@/features/ai/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/ai/chatHub/composables/useChatHubSidebarState';
import { CHAT_VIEW } from '@/features/ai/chatHub/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUIStore } from '@/stores/ui.store';
import {
	type ChatHubConversationModel,
	type ChatHubProvider,
	type ChatSessionId,
	PROVIDER_CREDENTIAL_TYPE_MAP,
} from '@n8n/api-types';
import { N8nIconButton } from '@n8n/design-system';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const { selectedModel, credentials } = defineProps<{
	selectedModel: ChatHubConversationModel | null;
	credentials: CredentialsMap;
}>();

const emit = defineEmits<{
	selectModel: [ChatHubConversationModel];
	selectCredentials: [provider: ChatHubProvider, credentialsId: string];
	renameConversation: [id: ChatSessionId, title: string];
}>();

const sidebar = useChatHubSidebarState();
const chatStore = useChatStore();
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const router = useRouter();

const credentialSelectorProvider = ref<ChatHubProvider | null>(null);

const credentialsName = computed(() =>
	selectedModel
		? credentialsStore.getCredentialById(credentials[selectedModel.provider] ?? '')?.name
		: undefined,
);

function onModelChange(selection: ChatHubConversationModel) {
	emit('selectModel', selection);
}

function onConfigure(provider: ChatHubProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0) {
		uiStore.openNewCredential(credentialType);
		return;
	}

	credentialSelectorProvider.value = provider;
	uiStore.openModal('chatCredentialSelector');
}

function onNewChat() {
	sidebar.toggleOpen(false);

	void router.push({ name: CHAT_VIEW, force: true });
}

function onCredentialSelected(provider: ChatHubProvider, credentialsId: string) {
	emit('selectCredentials', provider, credentialsId);
}

function onCreateNewCredential(provider: ChatHubProvider) {
	uiStore.openNewCredential(PROVIDER_CREDENTIAL_TYPE_MAP[provider]);
}
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
			:models="chatStore.models ?? null"
			:selected-model="selectedModel"
			:credentials-name="credentialsName"
			@change="onModelChange"
			@configure="onConfigure"
		/>

		<CredentialSelectorModal
			v-if="credentialSelectorProvider"
			:key="credentialSelectorProvider"
			:provider="credentialSelectorProvider"
			:initial-value="credentials[credentialSelectorProvider] ?? null"
			@select="onCredentialSelected"
			@create-new="onCreateNewCredential"
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
