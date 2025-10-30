<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL } from '@/constants';
import {
	findOneFromModelsResponse,
	restoreConversationModelFromMessageOrSession,
} from '@/features/ai/chatHub/chat.utils';
import ChatConversationHeader from '@/features/ai/chatHub/components/ChatConversationHeader.vue';
import ChatMessage from '@/features/ai/chatHub/components/ChatMessage.vue';
import ChatPrompt from '@/features/ai/chatHub/components/ChatPrompt.vue';
import ChatStarter from '@/features/ai/chatHub/components/ChatStarter.vue';
import AgentEditorModal from '@/features/ai/chatHub/components/AgentEditorModal.vue';
import {
	CHAT_CONVERSATION_VIEW,
	CHAT_VIEW,
	MOBILE_MEDIA_QUERY,
} from '@/features/ai/chatHub/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import {
	chatHubConversationModelSchema,
	type ChatHubLLMProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	type ChatHubMessageDto,
	type ChatMessageId,
	type ChatHubSendMessageRequest,
	type ChatModelDto,
} from '@n8n/api-types';
import { N8nIconButton, N8nScrollArea } from '@n8n/design-system';
import { useLocalStorage, useMediaQuery, useScroll } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from './chat.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useUIStore } from '@/stores/ui.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';

const router = useRouter();
const route = useRoute();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const toast = useToast();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const documentTitle = useDocumentTitle();
const uiStore = useUIStore();

const headerRef = useTemplateRef('headerRef');
const inputRef = useTemplateRef('inputRef');
const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isResponding = computed(() => chatStore.isResponding(sessionId.value));
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

const defaultModel = useLocalStorage<ChatHubConversationModel | null>(
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
const modelFromQuery = computed<ChatModelDto | null>(() => {
	const agentId = route.query.agentId;
	const workflowId = route.query.workflowId;

	if (!isNewSession.value) {
		return null;
	}

	if (typeof agentId === 'string') {
		return chatStore.getAgent({ provider: 'custom-agent', agentId }) ?? null;
	}

	if (typeof workflowId === 'string') {
		return chatStore.getAgent({ provider: 'n8n', workflowId }) ?? null;
	}

	return null;
});

const selectedModel = computed<ChatModelDto | undefined>(() => {
	if (!chatStore.agentsReady) {
		return undefined;
	}

	if (modelFromQuery.value) {
		return modelFromQuery.value;
	}

	if (!currentConversation.value?.provider) {
		return defaultModel.value ? chatStore.getAgent(defaultModel.value) : undefined;
	}

	const model = restoreConversationModelFromMessageOrSession(currentConversation.value);

	return model ? chatStore.getAgent(model) : undefined;
});

const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const chatMessages = computed(() => chatStore.getActiveMessages(sessionId.value));
const credentialsForSelectedProvider = computed<ChatHubSendMessageRequest['credentials'] | null>(
	() => {
		const provider = selectedModel.value?.model.provider;

		if (!provider) {
			return null;
		}

		if (provider === 'custom-agent' || provider === 'n8n') {
			return {};
		}

		const credentialsId = credentialsByProvider.value?.[provider];

		if (!credentialsId) {
			return null;
		}

		return {
			[PROVIDER_CREDENTIAL_TYPE_MAP[provider]]: {
				id: credentialsId,
				name: '',
			},
		};
	},
);
const isMissingSelectedCredential = computed(() => !credentialsForSelectedProvider.value);

const editingMessageId = ref<string>();
const didSubmitInCurrentSession = ref(false);
const editingAgentId = ref<string | undefined>(undefined);

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

		const currentMessage = chatStore.lastMessage(sessionId.value);
		if (lastMessageId !== currentMessage?.id) {
			scrollToBottom(currentMessage !== null);
			return;
		}

		const message = chatStore
			.getActiveMessages(sessionId.value)
			.find((m) => m.id === lastMessageId);

		if (message?.previousMessageId) {
			// Scroll to user's prompt when the message is being generated
			scrollToMessage(message.previousMessageId);
		}
	},
	{ immediate: true, flush: 'post' },
);

// Preselect a model
watch(
	() => chatStore.agents,
	(models) => {
		if (!models || !!selectedModel.value || !isNewSession.value) {
			return;
		}

		const model = findOneFromModelsResponse(models) ?? null;

		if (model) {
			void handleSelectModel(model);
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
	},
	{ immediate: true },
);

// Focus prompt when new a new conversation is started
watch(
	[inputRef, sessionId],
	([input]) => {
		input?.focus();
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

function onSubmit(message: string) {
	if (
		!message.trim() ||
		isResponding.value ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	didSubmitInCurrentSession.value = true;

	chatStore.sendMessage(
		sessionId.value,
		message,
		selectedModel.value.model,
		credentialsForSelectedProvider.value,
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
	if (
		chatStore.isResponding(message.sessionId) ||
		!['human', 'ai'].includes(message.type) ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	const messageToEdit = message.revisionOfMessageId ?? message.id;

	chatStore.editMessage(
		sessionId.value,
		messageToEdit,
		message.content,
		selectedModel.value.model,
		credentialsForSelectedProvider.value,
	);
	editingMessageId.value = undefined;
}

function handleRegenerateMessage(message: ChatHubMessageDto) {
	if (
		chatStore.isResponding(message.sessionId) ||
		message.type !== 'ai' ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	const messageToRetry = message.retryOfMessageId ?? message.id;

	chatStore.regenerateMessage(
		sessionId.value,
		messageToRetry,
		selectedModel.value.model,
		credentialsForSelectedProvider.value,
	);
}

async function handleSelectModel(selection: ChatModelDto) {
	if (currentConversation.value) {
		try {
			await chatStore.updateSessionModel(sessionId.value, selection.model);
		} catch (error) {
			toast.showError(error, 'Could not update selected model');
		}
	} else {
		defaultModel.value = selection.model;
	}
}

function handleSwitchAlternative(messageId: string) {
	chatStore.switchAlternative(sessionId.value, messageId);
}

function handleConfigureCredentials(_provider: ChatHubLLMProvider) {
	// todo call model selector to open model
}

function handleConfigureModel() {
	headerRef.value?.openModelSelector();
}

async function handleEditAgent(agentId: string) {
	try {
		await chatStore.fetchCustomAgent(agentId);
		editingAgentId.value = agentId;
		uiStore.openModal('agentEditor');
	} catch (error) {
		toast.showError(error, 'Failed to load agent');
	}
}

function openNewAgentCreator() {
	chatStore.currentEditingAgent = null;
	editingAgentId.value = undefined;
	uiStore.openModal('agentEditor');
}

function closeAgentEditor() {
	editingAgentId.value = undefined;
}
</script>

<template>
	<div
		:class="[
			$style.component,
			{
				[$style.isNewSession]: isNewSession,
				[$style.isMobileDevice]: isMobileDevice,
			},
		]"
	>
		<ChatConversationHeader
			ref="headerRef"
			:selected-model="selectedModel ?? null"
			:credentials="credentialsByProvider"
			@select-model="handleSelectModel"
			@edit-custom-agent="handleEditAgent"
			@create-custom-agent="openNewAgentCreator"
			@select-credential="selectCredential"
		/>

		<AgentEditorModal
			v-if="credentialsByProvider"
			:agent-id="editingAgentId"
			:credentials="credentialsByProvider"
			@create-custom-agent="handleSelectModel"
			@close="closeAgentEditor"
		/>

		<N8nScrollArea
			v-if="chatStore.agentsReady"
			type="scroll"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
		>
			<div :class="$style.scrollable" ref="scrollable">
				<ChatStarter
					v-if="isNewSession"
					:class="$style.starter"
					:is-mobile-device="isMobileDevice"
				/>

				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<ChatMessage
						v-for="(message, index) in chatMessages"
						:key="message.id"
						:message="message"
						:compact="isMobileDevice"
						:is-editing="editingMessageId === message.id"
						:is-streaming="message.status === 'running'"
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
						v-if="!arrivedState.bottom && !isNewSession"
						type="secondary"
						icon="arrow-down"
						:class="$style.scrollToBottomButton"
						title="Scroll to bottom"
						@click="scrollToBottom(true)"
					/>

					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:is-responding="isResponding"
						:selected-model="selectedModel ?? null"
						:is-missing-credentials="isMissingSelectedCredential"
						:is-new-session="isNewSession"
						@submit="onSubmit"
						@stop="onStop"
						@select-model="handleConfigureModel"
						@set-credentials="handleConfigureCredentials"
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

	.isNewSession & {
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
	.component:not(.isNewSession) & {
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
