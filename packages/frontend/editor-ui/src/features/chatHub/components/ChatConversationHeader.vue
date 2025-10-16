<script setup lang="ts">
import { useChatStore } from '@/features/chatHub/chat.store';
import type { CredentialsMap } from '@/features/chatHub/chat.types';
import CredentialSelectorModal from '@/features/chatHub/components/CredentialSelectorModal.vue';
import ModelSelector from '@/features/chatHub/components/ModelSelector.vue';
import { useChatHubSidebarState } from '@/features/chatHub/composables/useChatHubSidebarState';
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
			v-if="sidebar.isCollapsible.value"
			:class="$style.menuButton"
			type="secondary"
			icon="panel-left"
			@click="sidebar.open"
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
	padding: var(--spacing--4xs);
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	border-bottom: var(--border);

	&:has(.menuButton) {
		padding-inline: var(--spacing--md);
	}
}

.title {
	margin-inline: var(--spacing--md);
}
</style>
