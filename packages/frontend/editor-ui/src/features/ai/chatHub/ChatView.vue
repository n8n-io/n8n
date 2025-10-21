<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import {
	LOCAL_STORAGE_CHAT_HUB_CREDENTIALS,
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
} from '@/constants';
import { findOneFromModelsResponse } from '@/features/ai/chatHub/chat.utils';
import ChatConversationHeader from '@/features/ai/chatHub/components/ChatConversationHeader.vue';
import ChatMessage from '@/features/ai/chatHub/components/ChatMessage.vue';
import ChatPrompt from '@/features/ai/chatHub/components/ChatPrompt.vue';
import ChatStarter from '@/features/ai/chatHub/components/ChatStarter.vue';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_VIEW,
	MOBILE_MEDIA_QUERY,
} from '@/features/ai/chatHub/constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import {
	chatHubConversationModelSchema,
	type ChatHubProvider,
	chatHubProviderSchema,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	type ChatHubMessageDto,
	type ChatMessageId,
} from '@n8n/api-types';
import { N8nIconButton, N8nScrollArea } from '@n8n/design-system';
import { useLocalStorage, useMediaQuery, useScroll } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from './chat.store';
import { credentialsMapSchema, type CredentialsMap } from './chat.types';
import { useDocumentTitle } from '@/composables/useDocumentTitle';

const router = useRouter();
const route = useRoute();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const credentialsStore = useCredentialsStore();
const toast = useToast();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const documentTitle = useDocumentTitle();

const inputRef = useTemplateRef('inputRef');
const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isNewSession = computed(() => sessionId.value !== route.params.id);
const scrollableRef = useTemplateRef('scrollable');
const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);
const currentConversation = computed(() =>
	sessionId.value
		? chatStore.sessions.find((session) => session.id === sessionId.value)
		: undefined,
);
const currentConversationTitle = computed(() => currentConversation.value?.title);

const { arrivedState } = useScroll(scrollContainerRef, { throttle: 100, offset: { bottom: 100 } });

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

const chatMessages = computed(() => chatStore.getActiveMessages(sessionId.value));
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

function scrollToBottom(smooth: boolean) {
	scrollContainerRef.value?.scrollTo({
		top: scrollableRef.value?.scrollHeight,
		behavior: smooth ? 'smooth' : 'instant',
	});
}

function scrollToMessage(messageId: ChatMessageId) {
	scrollableRef.value?.querySelector(`[data-message-id="${messageId}"]`)?.scrollIntoView({
		behavior: 'smooth',
	});
}

// Scroll to the bottom when a new message is added
watch(
	() => chatMessages.value[chatMessages.value.length - 1]?.id,
	(lastMessageId) => {
		if (!lastMessageId) {
			return;
		}

		if (lastMessageId !== chatStore.streamingMessageId) {
			scrollToBottom(chatStore.streamingMessageId !== undefined);
			return;
		}

		const message = chatStore
			.getActiveMessages(sessionId.value)
			.find((message) => message.id === lastMessageId);

		if (message?.previousMessageId) {
			// Scroll to user's prompt when the message is being generated
			scrollToMessage(message.previousMessageId);
		}
	},
	{ immediate: true, flush: 'post' },
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

		if (!isNew && !chatStore.getConversation(id)) {
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

watch(
	currentConversationTitle,
	(title) => {
		documentTitle.set(title ?? 'Chat');
	},
	{ immediate: true },
);

onMounted(async () => {
	await Promise.all([
		credentialsStore.fetchCredentialTypes(false),
		credentialsStore.fetchAllCredentials(),
	]);
});

function onSubmit(message: string) {
	if (!message.trim() || chatStore.isResponding) {
		return;
	}

	const credentialsId = selectedModel.value
		? mergedCredentials.value[selectedModel.value.provider]
		: undefined;

	didSubmitInCurrentSession.value = true;

	chatStore.sendMessage(
		sessionId.value,
		message,
		selectedModel.value,
		selectedModel.value && credentialsId
			? {
					[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
						id: credentialsId,
						name: '',
					},
				}
			: null,
	);

	inputRef.value?.setText('');

	if (isNewSession.value) {
		// TODO: this should not happen when submit fails
		void router.push({ name: CHAT_CONVERSATION_VIEW, params: { id: sessionId.value } });
	}
}

async function onStop() {
	await chatStore.stopStreamingMessage(sessionId.value);
}

function handleStartEditMessage(messageId: string) {
	editingMessageId.value = messageId;
}

function handleCancelEditMessage() {
	editingMessageId.value = undefined;
}

function handleEditMessage(message: ChatHubMessageDto) {
	if (chatStore.isResponding || message.type !== 'human' || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	const mesasgeToEdit = message.revisionOfMessageId ?? message.id;

	chatStore.editMessage(sessionId.value, mesasgeToEdit, message.content, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});
	editingMessageId.value = undefined;
}

function handleRegenerateMessage(message: ChatHubMessageDto) {
	if (chatStore.isResponding || message.type !== 'ai' || !selectedModel.value) {
		return;
	}

	const credentialsId = mergedCredentials.value[selectedModel.value.provider];

	if (!credentialsId) {
		return;
	}

	const messageToRetry = message.retryOfMessageId ?? message.id;

	chatStore.regenerateMessage(sessionId.value, messageToRetry, selectedModel.value, {
		[PROVIDER_CREDENTIAL_TYPE_MAP[selectedModel.value.provider]]: {
			id: credentialsId,
			name: '',
		},
	});
}

function handleSelectModel(selection: ChatHubConversationModel) {
	selectedModel.value = selection;
}

function handleSelectCredentials(provider: ChatHubProvider, credentialsId: string) {
	selectedCredentials.value = { ...selectedCredentials.value, [provider]: credentialsId };
}

function handleSwitchAlternative(messageId: string) {
	chatStore.switchAlternative(sessionId.value, messageId);
}
</script>

<template>
	<div
		:class="[
			$style.component,
			{
				[$style.isNewChat]: isNewChat,
				[$style.isMobileDevice]: isMobileDevice,
			},
		]"
	>
		<ChatConversationHeader
			:selected-model="selectedModel"
			:credentials="mergedCredentials"
			@select-model="handleSelectModel"
			@select-credentials="handleSelectCredentials"
		/>

		<N8nScrollArea
			type="scroll"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
		>
			<div :class="$style.scrollable" ref="scrollable">
				<ChatStarter v-if="isNewChat" :class="$style.starter" :is-mobile-device="isMobileDevice" />

				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<ChatMessage
						v-for="(message, index) in chatMessages"
						:key="message.id"
						:message="message"
						:compact="isMobileDevice"
						:is-editing="editingMessageId === message.id"
						:is-streaming="chatStore.streamingMessageId === message.id"
						:min-height="
							didSubmitInCurrentSession &&
							message.type === 'ai' &&
							index === chatMessages.length - 1 &&
							scrollContainerRef
								? scrollContainerRef.offsetHeight - 30 /* padding-top */ - 200 /* padding-bottom */
								: undefined
						"
						@start-edit="handleStartEditMessage(message.id)"
						@cancel-edit="handleCancelEditMessage"
						@regenerate="handleRegenerateMessage"
						@update="handleEditMessage"
						@switch-alternative="handleSwitchAlternative"
					/>
				</div>

				<div :class="$style.promptContainer">
					<N8nIconButton
						v-if="!arrivedState.bottom && !isNewChat"
						type="secondary"
						icon="arrow-down"
						:class="$style.scrollToBottomButton"
						title="Scroll to bottom"
						@click="scrollToBottom(true)"
					/>

					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:placeholder="inputPlaceholder"
						:is-responding="chatStore.isResponding"
						:disabled="chatStore.isResponding"
						@submit="onSubmit"
						@stop="onStop"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.component {
	margin: var(--spacing--4xs);
	width: 100%;
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	display: flex;
	flex-direction: column;
	align-items: stretch;
	overflow: hidden;

	&.isMobileDevice {
		margin: 0;
		border: none;
	}
}

.scrollArea {
	flex-grow: 1;
	flex-shrink: 1;
}

.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: start;
	gap: var(--spacing--2xl);

	.isNewChat & {
		justify-content: center;
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.starter {
	.isMobileDevice & {
		padding-top: 30px;
		padding-bottom: 200px;
	}
}

.messageList {
	width: 100%;
	max-width: 55rem;
	min-height: 100%;
	align-self: center;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	padding-top: 30px;
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

.scrollToBottomButton {
	position: absolute;
	bottom: 100%;
	left: auto;
	box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.15);
	border-radius: 50%;
}
</style>
