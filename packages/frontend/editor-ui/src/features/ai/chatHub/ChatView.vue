<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import {
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
	LOCAL_STORAGE_CHAT_HUB_SELECTED_TOOLS,
	VIEWS,
} from '@/app/constants';
import {
	findOneFromModelsResponse,
	isLlmProvider,
	unflattenModel,
	createMimeTypes,
} from '@/features/ai/chatHub/chat.utils';
import ChatConversationHeader from '@/features/ai/chatHub/components/ChatConversationHeader.vue';
import ChatMessage from '@/features/ai/chatHub/components/ChatMessage.vue';
import ChatPrompt from '@/features/ai/chatHub/components/ChatPrompt.vue';
import ChatStarter from '@/features/ai/chatHub/components/ChatStarter.vue';
import {
	AGENT_EDITOR_MODAL_KEY,
	CHAT_CONVERSATION_VIEW,
	CHAT_VIEW,
	MOBILE_MEDIA_QUERY,
} from '@/features/ai/chatHub/constants';
import { useUsersStore } from '@/features/settings/users/users.store';
import {
	type ChatHubLLMProvider,
	PROVIDER_CREDENTIAL_TYPE_MAP,
	type ChatHubConversationModel,
	type ChatHubMessageDto,
	type ChatMessageId,
	type ChatHubSendMessageRequest,
	type ChatModelDto,
} from '@n8n/api-types';
import { N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useElementSize, useLocalStorage, useMediaQuery, useScroll } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from './chat.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import ChatLayout from '@/features/ai/chatHub/components/ChatLayout.vue';
import { INodesSchema, type INode } from 'n8n-workflow';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';
import {
	type ChatHubConversationModelWithCachedDisplayName,
	chatHubConversationModelWithCachedDisplayNameSchema,
} from '@/features/ai/chatHub/chat.types';
import { useI18n } from '@n8n/i18n';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';

const router = useRouter();
const route = useRoute();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const toast = useToast();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const documentTitle = useDocumentTitle();
const uiStore = useUIStore();
const i18n = useI18n();

const headerRef = useTemplateRef('headerRef');
const inputRef = useTemplateRef('inputRef');
const scrollableRef = useTemplateRef('scrollable');

const scrollableSize = useElementSize(scrollableRef);

const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isResponding = computed(() => chatStore.isResponding(sessionId.value));
const isNewSession = computed(() => sessionId.value !== route.params.id);
const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);
const currentConversation = computed(() =>
	sessionId.value ? chatStore.sessions.byId[sessionId.value] : undefined,
);
const currentConversationTitle = computed(() => currentConversation.value?.title);

const canSelectTools = computed(
	() =>
		selectedModel.value?.model.provider === 'custom-agent' ||
		!!selectedModel.value?.metadata.capabilities.functionCalling,
);

const { arrivedState, measure } = useScroll(scrollContainerRef, {
	throttle: 100,
	offset: { bottom: 100 },
});

const defaultModel = useLocalStorage<ChatHubConversationModelWithCachedDisplayName | null>(
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL(usersStore.currentUserId ?? 'anonymous'),
	null,
	{
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: (value) => {
				try {
					return chatHubConversationModelWithCachedDisplayNameSchema.parse(JSON.parse(value));
				} catch (error) {
					return null;
				}
			},
			write: (value) => JSON.stringify(value),
		},
	},
);

const defaultAgent = computed(() =>
	defaultModel.value ? chatStore.getAgent(defaultModel.value) : undefined,
);

const defaultTools = useLocalStorage<INode[] | null>(
	LOCAL_STORAGE_CHAT_HUB_SELECTED_TOOLS(usersStore.currentUserId ?? 'anonymous'),
	null,
	{
		writeDefaults: false,
		shallow: true,
		serializer: {
			read: (value) => {
				try {
					return INodesSchema.parse(JSON.parse(value));
				} catch (error) {
					return null;
				}
			},
			write: (value) => JSON.stringify(value),
		},
	},
);

const shouldSkipNextScrollTrigger = ref(false);

const modelFromQuery = computed<ChatModelDto | null>(() => {
	const agentId = route.query.agentId;
	const workflowId = route.query.workflowId;

	if (!isNewSession.value) {
		return null;
	}

	if (typeof agentId === 'string') {
		return chatStore.getAgent({ provider: 'custom-agent', agentId });
	}

	if (typeof workflowId === 'string') {
		return chatStore.getAgent({ provider: 'n8n', workflowId });
	}

	return null;
});

const selectedModel = computed<ChatModelDto | null>(() => {
	if (!isNewSession.value) {
		const model = currentConversation.value ? unflattenModel(currentConversation.value) : null;

		if (!model) {
			return null;
		}

		return chatStore.getAgent(model, {
			name: currentConversation.value?.agentName || currentConversation.value?.model,
			icon: currentConversation.value?.agentIcon,
		});
	}

	if (modelFromQuery.value) {
		return modelFromQuery.value;
	}

	if (chatStore.streaming?.sessionId === sessionId.value) {
		return chatStore.getAgent(chatStore.streaming.agent.model, {
			name: chatStore.streaming.agent.name,
			icon: chatStore.streaming.agent.icon,
		});
	}

	if (!defaultModel.value) {
		return null;
	}

	return chatStore.getAgent(defaultModel.value, {
		name: defaultModel.value.cachedDisplayName,
		icon: defaultModel.value.cachedIcon,
	});
});

const customAgentId = computed(() =>
	selectedModel.value?.model.provider === 'custom-agent'
		? selectedModel.value.model.agentId
		: undefined,
);
const customAgent = useCustomAgent(customAgentId);

const selectedTools = computed<INode[]>(() => {
	if (customAgent.value) {
		return customAgent.value.tools;
	}

	if (currentConversation.value?.tools) {
		return currentConversation.value.tools;
	}

	return modelFromQuery.value ? [] : (defaultTools.value ?? []);
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

		if (!isLlmProvider(provider)) {
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
const issue = computed<null | 'missingCredentials' | 'missingAgent'>(() => {
	if (!chatStore.agentsReady) {
		return null;
	}

	if (!selectedModel.value) {
		return 'missingAgent';
	}

	if (isMissingSelectedCredential.value) {
		return 'missingCredentials';
	}

	return null;
});

const editingMessageId = ref<string>();
const didSubmitInCurrentSession = ref(false);

const canAcceptFiles = computed(
	() =>
		editingMessageId.value === undefined &&
		!!createMimeTypes(selectedModel.value?.metadata.inputModalities ?? []) &&
		!isMissingSelectedCredential.value,
);

const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);

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

		if (shouldSkipNextScrollTrigger.value) {
			shouldSkipNextScrollTrigger.value = false;
			return;
		}

		// Prevent "scroll to bottom" button from appearing when not necessary
		void nextTick(measure);

		if (chatStore.streaming?.sessionId === sessionId.value) {
			// Scroll to user's prompt when the message is being generated
			scrollToMessage(chatStore.streaming.promptId);
			return;
		}

		scrollToBottom(false);
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
			void handleSelectAgent(model);
		}
	},
	{ immediate: true },
);

watch(
	[sessionId, isNewSession],
	async ([id, isNew]) => {
		didSubmitInCurrentSession.value = false;
		editingMessageId.value = undefined;

		if (!isNew && !chatStore.getConversation(id)) {
			try {
				await chatStore.fetchMessages(id);
			} catch (error) {
				toast.showError(error, i18n.baseText('chatHub.error.fetchConversationFailed'));
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

// Reload models when credentials are updated
watch(
	credentialsByProvider,
	(credentials) => {
		if (credentials) {
			void chatStore.fetchAgents(credentials);
		}
	},
	{ immediate: true },
);

// Keep cached display name up-to-date
watch(
	defaultAgent,
	(agent, prevAgent) => {
		if (defaultModel.value && agent?.name && agent.name !== prevAgent?.name) {
			defaultModel.value = { ...defaultModel.value, cachedDisplayName: agent.name };
		}

		if (
			agent &&
			!agent.metadata.capabilities.functionCalling &&
			(defaultTools.value ?? []).length > 0
		) {
			defaultTools.value = [];
		}
	},
	{ immediate: true },
);

function onSubmit(message: string, attachments: File[]) {
	if (
		!message.trim() ||
		isResponding.value ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	didSubmitInCurrentSession.value = true;
	editingMessageId.value = undefined;

	void chatStore.sendMessage(
		sessionId.value,
		message,
		selectedModel.value,
		credentialsForSelectedProvider.value,
		canSelectTools.value ? selectedTools.value : [],
		attachments,
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
		isResponding.value ||
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
		selectedModel.value,
		credentialsForSelectedProvider.value,
	);
	editingMessageId.value = undefined;
}

function handleRegenerateMessage(message: ChatHubMessageDto) {
	if (
		isResponding.value ||
		message.type !== 'ai' ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	const messageToRetry = message.id;

	chatStore.regenerateMessage(
		sessionId.value,
		messageToRetry,
		selectedModel.value,
		credentialsForSelectedProvider.value,
	);
}

async function handleSelectModel(selection: ChatHubConversationModel, displayName?: string) {
	const agentName = displayName ?? chatStore.getAgent(selection)?.name ?? '';

	if (currentConversation.value) {
		try {
			await chatStore.updateSessionModel(sessionId.value, selection, agentName);
		} catch (error) {
			toast.showError(error, i18n.baseText('chatHub.error.updateModelFailed'));
		}
	} else {
		defaultModel.value = { ...selection, cachedDisplayName: agentName };

		// Remove query params (if exists) and focus input
		await router.push({ name: CHAT_VIEW, force: true }); // remove query params
	}
}

async function handleSelectAgent(selection: ChatModelDto) {
	await handleSelectModel(selection.model, selection.name);
}

function handleSwitchAlternative(messageId: string) {
	shouldSkipNextScrollTrigger.value = true;
	chatStore.switchAlternative(sessionId.value, messageId);
}

function handleConfigureCredentials(provider: ChatHubLLMProvider) {
	headerRef.value?.openCredentialSelector(provider);
}

function handleConfigureModel() {
	headerRef.value?.openModelSelector();
}

async function handleUpdateTools(newTools: INode[]) {
	defaultTools.value = newTools;

	if (currentConversation.value) {
		try {
			await chatStore.updateToolsInSession(sessionId.value, newTools);
		} catch (error) {
			toast.showError(error, i18n.baseText('chatHub.error.updateToolsFailed'));
		}
	}
}

function handleEditAgent(agentId: string) {
	uiStore.openModalWithData({
		name: AGENT_EDITOR_MODAL_KEY,
		data: {
			agentId,
			credentials: credentialsByProvider,
			onCreateCustomAgent: handleSelectAgent,
		},
	});
}

function openNewAgentCreator() {
	uiStore.openModalWithData({
		name: AGENT_EDITOR_MODAL_KEY,
		data: {
			credentials: credentialsByProvider,
			onCreateCustomAgent: handleSelectAgent,
		},
	});
}

function handleOpenWorkflow(workflowId: string) {
	const routeData = router.resolve({ name: VIEWS.WORKFLOW, params: { name: workflowId } });

	window.open(routeData.href, '_blank');
}

function onFilesDropped(files: File[]) {
	inputRef.value?.addAttachments(files);
}
</script>

<template>
	<ChatLayout
		:class="{
			[$style.chatLayout]: true,
			[$style.isNewSession]: isNewSession,
			[$style.isExistingSession]: !isNewSession,
			[$style.isMobileDevice]: isMobileDevice,
			[$style.isDraggingFile]: fileDrop.isDragging.value,
		}"
		@dragenter="fileDrop.handleDragEnter"
		@dragleave="fileDrop.handleDragLeave"
		@dragover="fileDrop.handleDragOver"
		@drop="fileDrop.handleDrop"
		@paste="fileDrop.handlePaste"
	>
		<div v-if="fileDrop.isDragging.value" :class="$style.dropOverlay">
			<N8nText size="large" color="text-dark">{{
				i18n.baseText('chatHub.chat.dropOverlay')
			}}</N8nText>
		</div>

		<ChatConversationHeader
			ref="headerRef"
			:selected-model="selectedModel"
			:credentials="credentialsByProvider"
			:ready-to-show-model-selector="isNewSession || !!currentConversation"
			:is-new-session="isNewSession"
			@select-model="handleSelectModel"
			@edit-custom-agent="handleEditAgent"
			@create-custom-agent="openNewAgentCreator"
			@select-credential="selectCredential"
			@open-workflow="handleOpenWorkflow"
		/>

		<N8nScrollArea
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
						:cached-agent-display-name="selectedModel?.name ?? null"
						:cached-agent-icon="selectedModel?.icon ?? null"
						:min-height="
							didSubmitInCurrentSession &&
							message.type === 'ai' &&
							index === chatMessages.length - 1 &&
							scrollContainerRef
								? scrollContainerRef.offsetHeight - 30 /* padding-top */ - 200 /* padding-bottom */
								: undefined
						"
						:container-width="scrollableSize.width.value ?? 0"
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
						:title="i18n.baseText('chatHub.chat.scrollToBottom')"
						@click="scrollToBottom(true)"
					/>

					<ChatPrompt
						ref="inputRef"
						:class="$style.prompt"
						:selected-model="selectedModel"
						:selected-tools="selectedTools"
						:is-responding="isResponding"
						:is-tools-selectable="canSelectTools"
						:is-missing-credentials="isMissingSelectedCredential"
						:is-new-session="isNewSession"
						:issue="issue"
						@submit="onSubmit"
						@stop="onStop"
						@select-model="handleConfigureModel"
						@select-tools="handleUpdateTools"
						@set-credentials="handleConfigureCredentials"
						@edit-agent="handleEditAgent"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</ChatLayout>
</template>

<style lang="scss" module>
.chatLayout {
	position: relative;
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
	.isExistingSession & {
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

.isDraggingFile {
	border-color: var(--color--secondary);
}

.dropOverlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--color--background--light-2) 95%, transparent);
	pointer-events: none;
}
</style>
