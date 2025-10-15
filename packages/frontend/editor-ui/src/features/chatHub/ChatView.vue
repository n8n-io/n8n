<script setup lang="ts">
import { ref, computed, watch, onMounted, useTemplateRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';

import { N8nScrollArea, N8nIconButton } from '@n8n/design-system';
import ModelSelector from './components/ModelSelector.vue';
import CredentialSelectorModal from './components/CredentialSelectorModal.vue';

import { useChatStore } from './chat.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
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
const scrollableRef = useTemplateRef('scrollable');
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
const isNewChat = computed(() => route.name === CHAT_VIEW);
const inputPlaceholder = computed(() => {
	if (!selectedModel.value) {
		return 'Select a model';
	}

	const modelName = selectedModel.value.model;

	return `Message ${modelName}`;
});

const editingMessageId = ref<string>();
const didSubmitInCurrentSession = ref(false);

const credentialsName = computed(() =>
	selectedModel.value
		? credentialsStore.getCredentialById(
				mergedCredentials.value[selectedModel.value.provider] ?? '',
			)?.name
		: undefined,
);

function scrollToBottom(smooth: boolean) {
	scrollableRef.value?.parentElement?.scrollTo({
		top: scrollableRef.value.scrollHeight,
		behavior: smooth ? 'smooth' : 'instant',
	});
}

function scrollToMessage(messageId: string) {
	scrollableRef.value
		?.querySelector(`[data-message-id="${messageId}"]`)
		?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Scroll to the bottom when messages are loaded
watch(
	[chatMessages, didSubmitInCurrentSession],
	([messages, didSubmit]) => {
		if (!didSubmit && messages.length > 0) {
			scrollToBottom(false);
			return;
		}
	},
	{ immediate: true, flush: 'post' },
);

// Scroll user's prompt to the top when start generating response
watch(
	() => chatStore.ongoingStreaming?.replyToMessageId,
	(replyingTo) => {
		if (replyingTo) {
			scrollToMessage(replyingTo);
		}
	},
	{ flush: 'post' },
);

// Reload models when credentials are updated
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
		didSubmitInCurrentSession.value = false;

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

	didSubmitInCurrentSession.value = true;

	chatStore.sendMessage(sessionId.value, message, selectedModel.value, {
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

function handleEditMessage(message: ChatMessageType) {
	if (chatStore.isResponding || message.type === 'error' || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	chatStore.editMessage(sessionId.value, message.id, message.text, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});
	editingMessageId.value = undefined;
}

function handleRegenerateMessage(message: ChatMessageType) {
	if (chatStore.isResponding || message.type === 'error' || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	chatStore.regenerateMessage(sessionId.value, message.id, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});
}
</script>

<template>
	<div
		:class="[
			$style.component,
			{
				[$style.isNewChat]: isNewChat,
				[$style.isMobileDevice]: isMobileDevice,
				[$style.didSubmitInCurrentSession]: didSubmitInCurrentSession,
			},
		]"
	>
		<N8nScrollArea
			type="hover"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
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

			<div :class="$style.scrollable" ref="scrollable">
				<ChatStarter
					v-if="isNewChat"
					:class="$style.starter"
					:is-mobile-device="isMobileDevice"
					@select="onSuggestionClick"
				/>

				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<ChatMessage
						v-for="message in chatMessages"
						:key="message.id"
						:message="message"
						:compact="isMobileDevice"
						:is-editing="editingMessageId === message.id"
						:is-streaming="chatStore.ongoingStreaming?.messageId === message.id"
						@start-edit="handleStartEditMessage(message.id)"
						@cancel-edit="handleCancelEditMessage"
						@regenerate="handleRegenerateMessage"
						@update="handleEditMessage"
					/>
				</div>

				<div :class="$style.promptContainer">
					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:placeholder="inputPlaceholder"
						:disabled="chatStore.isResponding"
						@submit="onSubmit"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.component {
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--4xs) var(--spacing--4xs) 0;
	background-color: var(--color--background--light-3);

	&.isMobileDevice {
		padding: 0;
	}
}

.scrollArea {
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);

	.isMobileDevice & {
		border: none;
	}

	& [data-reka-scroll-area-viewport] {
		scroll-padding-top: 100px;
	}
}

.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	gap: var(--spacing--2xl);

	.didSubmitInCurrentSession & {
		/* This allows scrolling user's prompt to the top while generating response */
		padding-bottom: 100vh;
	}
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
	.component:not(.isNewChat) & {
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
