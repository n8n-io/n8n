<script setup lang="ts">
import { useToast } from '@/app/composables/useToast';
import {
	LOCAL_STORAGE_CHAT_HUB_HAD_CONVERSATION_BEFORE,
	LOCAL_STORAGE_CHAT_HUB_SELECTED_MODEL,
	VIEWS,
} from '@/app/constants';
import {
	findOneFromModelsResponse,
	isLlmProvider,
	unflattenModel,
	createMimeTypes,
	isWaitingForApproval,
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
	type ChatMessageId,
	type ChatHubSendMessageRequest,
	type ChatModelDto,
	chatHubConversationModelSchema,
} from '@n8n/api-types';
import { N8nIconButton, N8nResizeWrapper, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useElementSize, useLocalStorage, useMediaQuery, useScroll } from '@vueuse/core';
import { v4 as uuidv4 } from 'uuid';
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useChatStore } from './chat.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUIStore } from '@/app/stores/ui.store';
import { useChatCredentials } from '@/features/ai/chatHub/composables/useChatCredentials';
import ChatLayout from '@/features/ai/chatHub/components/ChatLayout.vue';
import { useFileDrop } from '@/features/ai/chatHub/composables/useFileDrop';
import {
	type ChatHubConversationModelWithCachedDisplayName,
	chatHubConversationModelWithCachedDisplayNameSchema,
	type ChatMessage as ChatMessageType,
	type MessagingState,
} from '@/features/ai/chatHub/chat.types';
import { useI18n } from '@n8n/i18n';
import { useCustomAgent } from '@/features/ai/chatHub/composables/useCustomAgent';
import { useSettingsStore } from '@/app/stores/settings.store';
import { hasRole } from '@/app/utils/rbac/checks';
import { useFreeAiCredits } from '@/app/composables/useFreeAiCredits';
import ChatGreetings from './components/ChatGreetings.vue';
import { useChatPushHandler } from './composables/useChatPushHandler';
import ChatArtifactViewer from './components/ChatArtifactViewer.vue';
import { useChatArtifacts } from './composables/useChatArtifacts';
import { useChatInputFocus } from './composables/useChatInputFocus';

const router = useRouter();
const route = useRoute();
const usersStore = useUsersStore();
const chatStore = useChatStore();
const settingsStore = useSettingsStore();
const toast = useToast();
const isMobileDevice = useMediaQuery(MOBILE_MEDIA_QUERY);
const documentTitle = useDocumentTitle();
const uiStore = useUIStore();
const i18n = useI18n();

// Initialize WebSocket push handler for chat streaming
const chatPushHandler = useChatPushHandler();

onBeforeMount(async () => {
	chatPushHandler.initialize();
	await chatStore.fetchConfiguredTools();
});

onBeforeUnmount(() => {
	chatPushHandler.terminate();
});

const headerRef = useTemplateRef('headerRef');
const inputRef = useTemplateRef('inputRef');
const scrollableRef = useTemplateRef('scrollable');
const chatLayoutRef = useTemplateRef('chatLayout');
const chatLayoutElement = computed(() => chatLayoutRef.value?.$el);

const welcomeScreenDismissed = ref(false);
const showCreditsClaimedCallout = ref(false);
const hasAttemptedAutoClaim = ref(false);

const { userCanClaimOpenAiCredits, aiCreditsQuota, claimCredits } = useFreeAiCredits();
const sessionId = computed<string>(() =>
	typeof route.params.id === 'string' ? route.params.id : uuidv4(),
);
const isResponding = computed(() => chatStore.isResponding(sessionId.value));
const isNewSession = computed(() => sessionId.value !== route.params.id);
const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);
const scrollContainerSize = useElementSize(scrollContainerRef);
const currentConversation = computed(() =>
	sessionId.value ? chatStore.sessions.byId[sessionId.value] : undefined,
);
const currentConversationTitle = computed(() => currentConversation.value?.title);

const canSelectTools = computed(() => !!selectedModel.value?.metadata.capabilities.functionCalling);
const hadConversationBefore = useLocalStorage(
	LOCAL_STORAGE_CHAT_HUB_HAD_CONVERSATION_BEFORE(usersStore.currentUserId ?? 'anonymous'),
	false,
);
const hasSession = computed(() => (chatStore.sessions.ids?.length ?? 0) > 0);

const showWelcomeScreen = computed<boolean | undefined>(() => {
	if (hadConversationBefore.value || welcomeScreenDismissed.value) {
		return false; // return false early to make UI ready fast
	}

	// Skip welcome screen if an agent is pre-selected via query params
	if (route.query.workflowId || route.query.agentId) {
		return false;
	}

	if (!chatStore.sessionsReady) {
		return undefined; // not known yet
	}

	return (
		!hasSession.value && (!settingsStore.isChatFeatureEnabled || !hasRole(['global:chatUser']))
	);
});

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

const shouldSkipNextScrollTrigger = ref(false);

const modelFromQuery = computed<ChatModelDto | null>(() => {
	const agentId = route.query.agentId;
	const workflowId = route.query.workflowId;
	const provider = route.query.provider;
	const model = route.query.model;

	if (!isNewSession.value) {
		return null;
	}

	if (typeof agentId === 'string') {
		return chatStore.getAgent({ provider: 'custom-agent', agentId });
	}

	if (typeof workflowId === 'string') {
		return chatStore.getAgent({ provider: 'n8n', workflowId });
	}

	if (typeof provider === 'string' && typeof model === 'string') {
		const parsedModel = chatHubConversationModelSchema.safeParse({
			provider,
			model,
		});

		if (parsedModel.success) {
			return chatStore.getAgent(parsedModel.data);
		}
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
		return chatStore.streaming.agent;
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
const { customAgent } = useCustomAgent(customAgentId);

const checkedToolIds = computed<string[]>(() => {
	if (customAgent.value) {
		return customAgent.value.toolIds;
	}

	if (currentConversation.value?.toolIds) {
		return currentConversation.value.toolIds;
	}

	return modelFromQuery.value
		? []
		: chatStore.configuredTools.filter((t) => t.enabled).map((t) => t.definition.id);
});

const { credentialsByProvider, selectCredential } = useChatCredentials(
	usersStore.currentUserId ?? 'anonymous',
);

const chatMessages = computed(() => chatStore.getActiveMessages(sessionId.value));
const artifacts = useChatArtifacts(chatLayoutElement, chatMessages);

const isMainPanelNarrow = computed(() => scrollContainerSize.width.value < 600);

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
const messagingState = computed<MessagingState>(() => {
	if (chatStore.streaming?.sessionId === sessionId.value) {
		return chatStore.streaming.messageId ? 'receiving' : 'waitingFirstChunk';
	}

	// Check if waiting for approval (button click)
	if (isWaitingForApproval(chatStore.lastMessage(sessionId.value))) {
		return 'waitingForApproval';
	}

	if (chatStore.agentsReady && !selectedModel.value) {
		return 'missingAgent';
	}

	if (chatStore.agentsReady && isMissingSelectedCredential.value) {
		return 'missingCredentials';
	}

	return 'idle';
});

const editingMessageId = ref<string>();
const messageElementsRef = useTemplateRef('messages');
const didSubmitInCurrentSession = ref(false);

const canAcceptFiles = computed(() => {
	const baseCondition =
		!!createMimeTypes(selectedModel.value?.metadata.inputModalities ?? []) &&
		!isMissingSelectedCredential.value;

	if (!baseCondition) return false;

	// If editing, only allow file drops for human messages
	if (editingMessageId.value) {
		const editingMessage = chatMessages.value.find((msg) => msg.id === editingMessageId.value);
		return editingMessage?.type === 'human';
	}

	return true;
});

const fileDrop = useFileDrop(canAcceptFiles, onFilesDropped);

useChatInputFocus(inputRef, {
	disabled: computed(() => showWelcomeScreen.value === true || messagingState.value !== 'idle'),
});

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
		const settings = settingsStore.moduleSettings?.['chat-hub'];

		if (!models || !!selectedModel.value || !isNewSession.value || !settings) {
			return;
		}

		const model = findOneFromModelsResponse(models, settings.providers);
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

				// Check for active stream after loading messages (handles page refresh during streaming)
				const reconnectResult = await chatStore.reconnectToStream(id, 0);
				if (reconnectResult?.hasActiveStream && reconnectResult.currentMessageId) {
					// Initialize push handler to receive future chunks
					chatPushHandler.initializeStreamState(
						id,
						reconnectResult.currentMessageId,
						reconnectResult.lastSequenceNumber,
					);
					// Pending chunks are already replayed by reconnectToStream()
				}
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
			defaultModel.value &&
			agent?.icon &&
			(agent.icon.type !== prevAgent?.icon?.type || agent.icon.value !== prevAgent.icon.value)
		) {
			defaultModel.value = { ...defaultModel.value, cachedIcon: agent.icon };
		}
	},
	{ immediate: true },
);

// Auto-claim free AI credits if available when user lands on chat without credentials
watch(
	[welcomeScreenDismissed, userCanClaimOpenAiCredits, messagingState, () => chatStore.agentsReady],
	async ([dismissed, canClaim, state, ready]) => {
		if (!canClaim || hasAttemptedAutoClaim.value) return;

		const shouldClaim = dismissed || (ready && state === 'missingCredentials');
		if (shouldClaim) {
			hasAttemptedAutoClaim.value = true;
			const success = await claimCredits('chatHubAutoClaim');
			if (success) {
				showCreditsClaimedCallout.value = true;
			}
		}
	},
	{ immediate: true },
);

// Hide credits callout when user sends their first message
watch(chatMessages, (messages) => {
	if (messages.length > 0) {
		showCreditsClaimedCallout.value = false;
	}
});

// Update hadConversationBefore
watch(
	hasSession,
	(value) => {
		hadConversationBefore.value = hadConversationBefore.value || value;
	},
	{ immediate: true },
);

function handleDismissCreditsCallout() {
	showCreditsClaimedCallout.value = false;
}

async function onSubmit(message: string, attachments: File[]) {
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

	await chatStore.sendMessage(
		sessionId.value,
		message,
		selectedModel.value,
		credentialsForSelectedProvider.value,
		attachments,
	);

	inputRef.value?.reset();

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

async function handleEditMessage(
	content: string,
	keptAttachmentIndices: number[],
	newFiles: File[],
) {
	if (
		!editingMessageId.value ||
		isResponding.value ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	await chatStore.editMessage(
		sessionId.value,
		editingMessageId.value,
		content,
		selectedModel.value,
		credentialsForSelectedProvider.value,
		keptAttachmentIndices,
		newFiles,
	);

	editingMessageId.value = undefined;
}

async function handleRegenerateMessage(message: ChatMessageType) {
	if (
		isResponding.value ||
		message.type !== 'ai' ||
		!selectedModel.value ||
		!credentialsForSelectedProvider.value
	) {
		return;
	}

	const messageToRetry = message.id;

	editingMessageId.value = undefined;

	await chatStore.regenerateMessage(
		sessionId.value,
		messageToRetry,
		selectedModel.value,
		credentialsForSelectedProvider.value,
	);
}

async function handleSelectModel(
	selection: ChatHubConversationModel,
	selectedAgent?: ChatModelDto,
) {
	const agent = selectedAgent ?? chatStore.getAgent(selection);

	if (currentConversation.value) {
		try {
			await chatStore.updateSessionModel(sessionId.value, selection, agent.name);
		} catch (error) {
			toast.showError(error, i18n.baseText('chatHub.error.updateModelFailed'));
		}
	} else {
		defaultModel.value = {
			...selection,
			cachedDisplayName: agent.name,
			cachedIcon: agent.icon ?? undefined,
		};

		// Remove query params (if exists) and focus input
		await router.push({ name: CHAT_VIEW, force: true }); // remove query params
	}
}

async function handleSelectAgent(selection: ChatModelDto) {
	await handleSelectModel(selection.model, selection);
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
	if (!editingMessageId.value) {
		inputRef.value?.addAttachments(files);
		return;
	}

	const index = chatMessages.value.findIndex((message) => message.id === editingMessageId.value);
	messageElementsRef.value?.[index]?.addFiles(files);
}
</script>

<template>
	<ChatLayout
		v-if="showWelcomeScreen !== undefined"
		ref="chatLayout"
		:class="{
			[$style.chatLayout]: true,
			[$style.isNewSession]: isNewSession,
			[$style.isExistingSession]: !isNewSession,
			[$style.isMobileDevice]: isMobileDevice,
			[$style.isDraggingFile]: fileDrop.isDragging.value,
			[$style.hasArtifact]: artifacts.isViewerVisible.value,
			[$style.isMainPanelNarrow]: isMainPanelNarrow,
			[$style.isResizing]: artifacts.isViewerResizing.value,
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
		<N8nResizeWrapper
			:class="$style.mainContentResizer"
			:width="artifacts.viewerSize.value"
			:style="{
				width: artifacts.isViewerVisible.value ? `${artifacts.viewerSize.value}px` : '100%',
			}"
			:supported-directions="['right']"
			:is-resizing-enabled="true"
			@resize="artifacts.handleViewerResize"
			@resizeend="artifacts.handleViewerResizeEnd"
		>
			<div :class="$style.mainContent">
				<ChatConversationHeader
					v-if="!showWelcomeScreen"
					ref="headerRef"
					:selected-model="selectedModel"
					:credentials="credentialsByProvider"
					:ready-to-show-model-selector="isNewSession || !!currentConversation"
					:show-artifact-icon="
						artifacts.allArtifacts.value.length > 0 && artifacts.isViewerCollapsed.value
					"
					@select-model="handleSelectModel"
					@edit-custom-agent="handleEditAgent"
					@create-custom-agent="openNewAgentCreator"
					@select-credential="selectCredential"
					@open-workflow="handleOpenWorkflow"
					@reopen-artifact="artifacts.handleOpenViewer"
				/>

				<N8nScrollArea
					type="scroll"
					:enable-vertical-scroll="true"
					:enable-horizontal-scroll="false"
					as-child
					:class="$style.scrollArea"
				>
					<div ref="scrollable" :class="$style.scrollable">
						<ChatGreetings v-if="isNewSession" :selected-agent="selectedModel" />

						<div v-else role="log" aria-live="polite" :class="$style.messageList">
							<ChatMessage
								v-for="(message, index) in chatMessages"
								:key="message.id"
								ref="messages"
								:message="message"
								:compact="isMainPanelNarrow"
								:is-editing="editingMessageId === message.id"
								:is-edit-submitting="chatStore.streaming?.revisionOfMessageId === message.id"
								:has-session-streaming="isResponding"
								:cached-agent-display-name="selectedModel?.name ?? null"
								:cached-agent-icon="selectedModel?.icon ?? null"
								:min-height="
									didSubmitInCurrentSession &&
									message.type === 'ai' &&
									index === chatMessages.length - 1 &&
									scrollContainerRef
										? scrollContainerRef.offsetHeight -
											30 /* padding-top */ -
											200 /* padding-bottom */
										: undefined
								"
								@start-edit="handleStartEditMessage(message.id)"
								@cancel-edit="handleCancelEditMessage"
								@regenerate="handleRegenerateMessage"
								@update="handleEditMessage"
								@switch-alternative="handleSwitchAlternative"
								@open-artifact="artifacts.handleOpenViewer"
							/>
						</div>

						<div v-if="!showWelcomeScreen" :class="$style.promptContainer">
							<N8nIconButton
								v-if="!arrivedState.bottom && !isNewSession"
								variant="subtle"
								icon="arrow-down"
								:class="$style.scrollToBottomButton"
								:title="i18n.baseText('chatHub.chat.scrollToBottom')"
								@click="scrollToBottom(true)"
							/>

							<ChatPrompt
								ref="inputRef"
								:class="$style.prompt"
								:selected-model="selectedModel"
								:checked-tool-ids="canSelectTools ? checkedToolIds : []"
								:session-id="isNewSession ? undefined : sessionId"
								:custom-agent-id="customAgentId"
								:messaging-state="messagingState"
								:is-tools-selectable="canSelectTools"
								:is-new-session="isNewSession"
								:show-credits-claimed-callout="showCreditsClaimedCallout"
								:ai-credits-quota="String(aiCreditsQuota)"
								@submit="onSubmit"
								@stop="onStop"
								@select-model="handleConfigureModel"
								@set-credentials="handleConfigureCredentials"
								@edit-agent="handleEditAgent"
								@dismiss-credits-callout="handleDismissCreditsCallout"
							/>
						</div>
					</div>
				</N8nScrollArea>

				<ChatStarter
					v-if="isNewSession"
					:show-welcome-screen="showWelcomeScreen"
					@start-new-chat="
						welcomeScreenDismissed = true;
						inputRef?.focus();
					"
				/>
			</div>
		</N8nResizeWrapper>
		<ChatArtifactViewer
			v-if="artifacts.isViewerVisible.value"
			:key="sessionId"
			:class="$style.artifactViewer"
			:artifacts="artifacts.allArtifacts.value"
			:selected-index="artifacts.selectedIndex.value"
			@close="artifacts.handleCloseViewer"
			@select-artifact="artifacts.handleSelect"
			@download="artifacts.handleDownload"
		/>
	</ChatLayout>
</template>

<style lang="scss" module>
.chatLayout {
	position: relative;
	display: flex;
	flex-direction: row;

	&.hasArtifact {
		.mainContent {
			flex: 1;
			min-width: 0;
		}
	}

	&:not(.hasArtifact) {
		.mainContent {
			flex: 1;
		}
	}
}

.mainContentResizer {
	overflow: hidden;
	flex-shrink: 0;
}

.mainContent {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	height: 100%;
	flex: 1;
}

.artifactViewer {
	flex: 1;
	min-width: 300px;
	overflow: hidden;

	.isResizing & {
		/* Prevent mouse event captured by iframe */
		pointer-events: none;
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
	gap: var(--spacing--xl);

	.isNewSession & {
		justify-content: center;
	}
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.messageList {
	min-height: 100%;
	align-self: center;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding-top: var(--spacing--2xl);
	padding-bottom: 200px;
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

.messageList,
.prompt {
	width: 100%;
	max-width: 88ch;
	padding-inline: 64px;

	.isMainPanelNarrow & {
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
