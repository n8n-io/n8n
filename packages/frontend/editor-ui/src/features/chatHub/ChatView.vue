<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, useTemplateRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';

import { N8nScrollArea, N8nIconButton } from '@n8n/design-system';
import ModelSelector from './components/ModelSelector.vue';
import CredentialSelectorModal from './components/CredentialSelectorModal.vue';

import { useChatStore } from './chat.store';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useUIStore } from '@/stores/ui.store';
import {
	type ChatMessage as ChatMessageType,
	credentialsMapSchema,
	type CredentialsMap,
	type Suggestion,
} from './chat.types';
import {
	chatHubConversationModelSchema,
	type ChatHubProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	chatHubProviderSchema,
} from '@n8n/api-types';
import { useLocalStorage, useMediaQuery } from '@vueuse/core';
import {
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
	LOCAL_STORAGE_CHAT_HUB_CREDENTIALS,
	CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY,
} from '@/constants';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_VIEW,
	MOBILE_MEDIA_QUERY,
} from '@/features/chatHub/constants';
import { findOneFromModelsResponse } from '@/features/chatHub/chat.utils';
import { useToast } from '@/composables/useToast';
import ChatMessage from '@/features/chatHub/components/ChatMessage.vue';
import ChatPrompt from '@/features/chatHub/components/ChatPrompt.vue';
import ChatStarter from '@/features/chatHub/components/ChatStarter.vue';
import { useUsersStore } from '@/features/users/users.store';

const router = useRouter();
const route = useRoute();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const credentialsStore = useCredentialsStore();
const uiStore = useUIStore();
const toast = useToast();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);

const inputRef = useTemplateRef('inputRef');
const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isNewSession = computed(() => sessionId.value !== route.params.id);
const messagesRef = ref<HTMLDivElement | null>(null);
const scrollAreaRef = ref<InstanceType<typeof N8nScrollArea>>();
const credentialSelectorProvider = ref<ChatHubProvider | null>(null);
const selectedModel = useLocalStorage<ChatHubConversationModel | null>(
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL(usersStore.currentUserId ?? 'anonymous'),
	null,
	{
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: (value) => {
				try {
					return chatHubConversationModelSchema.parse(JSON.parse(value));
				} catch (error) {
					return null;
				}
			},
			write: (value) => JSON.stringify(value),
		},
	},
);

const selectedCredentials = useLocalStorage<CredentialsMap>(
	LOCAL_STORAGE_CHAT_HUB_CREDENTIALS(usersStore.currentUserId ?? 'anonymous'),
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
			const lastCreatedCredential =
				credentialsStore
					.getCredentialsByType(PROVIDER_CREDENTIAL_TYPE_MAP[provider])
					.toSorted((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.id ?? null;

			return [provider, lastCreatedCredential];
		}),
	),
);

const mergedCredentials = computed(() => ({
	...autoSelectCredentials.value,
	...selectedCredentials.value,
}));

const chatMessages = computed(() => chatStore.messagesBySession[sessionId.value] ?? []);
const hasMessages = computed(() => chatMessages.value.length > 0);
const inputPlaceholder = computed(() => {
	if (!selectedModel.value) {
		return 'Select a model';
	}

	const modelName = selectedModel.value.model;

	return `Message ${modelName}`;
});

const scrollOnNewMessage = ref(true);
const editingMessageId = ref<string>();

const credentialsName = computed(() =>
	selectedModel.value
		? credentialsStore.getCredentialById(
				mergedCredentials.value[selectedModel.value.provider] ?? '',
			)?.name
		: undefined,
);

function getScrollViewport(): HTMLElement | null {
	const root = scrollAreaRef.value?.$el as HTMLElement | undefined;
	return root?.querySelector('[data-reka-scroll-area-viewport]') as HTMLElement | null;
}

function scrollToBottom() {
	const viewport = getScrollViewport();
	if (viewport && messagesRef.value) {
		viewport.scrollTo({
			top: messagesRef.value.scrollHeight,
			behavior: 'smooth',
		});
	}
}

watch(
	chatMessages,
	async (messages) => {
		// Check if the last message is user and scroll to bottom of the chat
		if (scrollOnNewMessage.value && messages.length > 0) {
			// Wait for DOM updates before scrolling
			await nextTick();
			// Check if viewport is available after nextTick
			if (getScrollViewport()) {
				scrollToBottom();
			}
		}
	},
	{ immediate: true, deep: true },
);

// TODO: fix duplicate requests
watch(
	mergedCredentials,
	async (credentials) => {
		const models = await chatStore.fetchChatModels(credentials);
		const selected = selectedModel.value;

		if (selected === null) {
			selectedModel.value = findOneFromModelsResponse(models) ?? null;
		}
	},
	{ immediate: true },
);

watch(
	[sessionId, isNewSession],
	async ([id, isNew]) => {
		if (!isNew && !chatStore.messagesBySession[id]) {
			try {
				await chatStore.fetchMessages(id);
			} catch (error) {
				toast.showError(error, 'Error fetching a conversation');
				await router.push({ name: CHAT_VIEW });
			}
		}

		inputRef.value?.focus();
	},
	{ immediate: true },
);

onMounted(async () => {
	await Promise.all([
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
});

function onModelChange(selection: ChatHubConversationModel) {
	selectedModel.value = selection;
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

function onCredentialSelected(provider: ChatHubProvider, credentialId: string) {
	selectedCredentials.value = { ...selectedCredentials.value, [provider]: credentialId };
}

function onCreateNewCredential(provider: ChatHubProvider) {
	uiStore.openNewCredential(PROVIDER_CREDENTIAL_TYPE_MAP[provider]);
}

function onSubmit(message: string) {
	if (!message.trim() || chatStore.isResponding || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	chatStore.askAI(sessionId.value, message, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});

	inputRef.value?.setText('');

	if (isNewSession.value) {
		void router.push({ name: CHAT_CONVERSATION_VIEW, params: { id: sessionId.value } });
	}
}

function onSuggestionClick(s: Suggestion) {
	inputRef.value?.setText(`${s.title} ${s.subtitle}`);
}

function handleStartEditMessage(messageId: string) {
	editingMessageId.value = messageId;
}

function handleCancelEditMessage() {
	editingMessageId.value = undefined;
}

async function handleUpdateMessage(message: ChatMessageType) {
	if (message.type === 'error') {
		return;
	}

	await chatStore.updateChatMessage(sessionId.value, message.id, message.text);
	editingMessageId.value = undefined;
}
</script>

<template>
	<N8nScrollArea
		ref="scrollAreaRef"
		type="hover"
		:enable-vertical-scroll="true"
		:enable-horizontal-scroll="false"
		:viewport-class="$style.scrollViewport"
		as-child
		:class="{ [$style.hasMessages]: hasMessages, [$style.isMobileDevice]: isMobileDevice }"
	>
		<div :class="$style.floating">
			<N8nIconButton
				v-if="isMobileDevice"
				type="secondary"
				icon="menu"
				@click="uiStore.openModal(CHAT_HUB_SIDE_MENU_DRAWER_MODAL_KEY)"
			/>
			<ModelSelector
				:models="chatStore.models ?? null"
				:selected-model="selectedModel"
				:disabled="chatStore.isResponding"
				:credentials-name="credentialsName"
				@change="onModelChange"
				@configure="onConfigure"
			/>
		</div>

		<CredentialSelectorModal
			v-if="credentialSelectorProvider"
			:key="credentialSelectorProvider"
			:provider="credentialSelectorProvider"
			:initial-value="mergedCredentials[credentialSelectorProvider] ?? null"
			@select="onCredentialSelected"
			@create-new="onCreateNewCredential"
		/>

		<div :class="$style.scrollable">
			<ChatStarter
				v-if="!hasMessages"
				:class="$style.starter"
				:is-mobile-device="isMobileDevice"
				@select="onSuggestionClick"
			/>

			<div v-else ref="messagesRef" role="log" aria-live="polite" :class="$style.messageList">
				<ChatMessage
					v-for="message in chatMessages"
					:key="message.id"
					:message="message"
					:compact="isMobileDevice"
					:is-editing="editingMessageId === message.id"
					:is-streaming="chatStore.streamingMessageId === message.id"
					@start-edit="handleStartEditMessage(message.id)"
					@cancel-edit="handleCancelEditMessage"
					@update="handleUpdateMessage"
				/>
			</div>

			<div :class="$style.promptContainer">
				<ChatPrompt
					ref="inputRef"
					:class="$style.prompt"
					:placeholder="inputPlaceholder"
					:disabled="chatStore.isResponding"
					:session-id="sessionId"
					@submit="onSubmit"
				/>
			</div>
		</div>
	</N8nScrollArea>
</template>

<style lang="scss" module>
.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	gap: var(--spacing--2xl);
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.starter {
	.isMobileDevice & {
		padding-top: 100px;
		padding-bottom: 200px;
	}
}

.messageList {
	width: 100%;
	max-width: 55rem;
	min-height: 100vh;
	align-self: center;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: 100px;
	padding-bottom: 200px;
	padding-inline: 64px;

	.isMobileDevice & {
		padding-inline: var(--spacing--md);
	}
}

.promptContainer {
	display: flex;
	justify-content: center;

	.isMobileDevice &,
	.hasMessages & {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		padding-block: var(--spacing--md);
		background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
	}
}

.prompt {
	width: 100%;
	max-width: 55rem;
	padding-inline: 64px;

	.isMobileDevice & {
		padding-inline: var(--spacing--md);
	}
}

.floating {
	position: absolute;
	padding: var(--spacing--xs);
	top: 0;
	left: 0;
	z-index: 100;
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}
</style>
