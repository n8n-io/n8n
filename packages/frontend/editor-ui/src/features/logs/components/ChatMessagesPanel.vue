<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import Chat from '@n8n/chat/components/Chat.vue';
import { ChatPlugin } from '@n8n/chat/plugins';
import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatOptions } from '@n8n/chat/types';
import { computed, createApp, onMounted, onUnmounted, useTemplateRef, watch, ref } from 'vue';
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRouter } from 'vue-router';
import { IN_PROGRESS_EXECUTION_ID } from '@/constants';
import type { IExecutionResponse, IRunExecutionData, IWorkflowDb } from '@/Interface';

interface Props {
	sessionId: string;
	showCloseButton?: boolean;
	isOpen?: boolean;
	isReadOnly?: boolean;
	isHeaderClickable: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	isOpen: true,
	isReadOnly: false,
});

const emit = defineEmits<{
	displayExecution: [id: string];
	refreshSession: [];
	close: [];
	clickHeader: [];
}>();

const locale = useI18n();
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowHelpers = useWorkflowHelpers();
const nodeTypesStore = useNodeTypesStore();
const rootStore = useRootStore();
const { runWorkflow } = useRunWorkflow({ router });
const chatContainer = useTemplateRef<HTMLElement>('chatContainer');

let chatApp: any = null;
const webhookRegistered = ref(false);
const isRegistering = ref(false);

const sessionIdText = computed(() =>
	locale.baseText('chat.window.session.id', {
		interpolate: { id: `${props.sessionId.slice(0, 5)}...` },
	}),
);


// Find ChatTrigger node in the workflow
const chatTriggerNode = computed(() => {
	return workflowsStore.allNodes.find(
		(node) => node.type === 'n8n-nodes-langchain.chatTrigger' || node.type.includes('chatTrigger'),
	);
});

// Check if streaming is enabled in ChatTrigger node
const isStreamingEnabled = computed(() => {
	if (!chatTriggerNode.value?.parameters?.options) {
		console.log('No ChatTrigger options found, defaulting to non-streaming');
		return false;
	}

	const responseMode = chatTriggerNode.value.parameters.options.responseMode;
	const isStreaming = responseMode === 'streaming';

	console.log('ChatTrigger responseMode:', responseMode, 'isStreaming:', isStreaming);
	console.log('ChatTrigger node parameters:', chatTriggerNode.value.parameters);

	return isStreaming;
});

// Generate test webhook URL using sessionId-based path
const webhookUrl = computed(() => {
	if (!chatTriggerNode.value) {
		return '';
	}

	const workflowId = workflowsStore.workflowId;
	if (!workflowId) {
		console.error('No workflow ID found');
		return '';
	}

	// Generate predictable webhook URL using sessionId
	// This matches the backend path generation: /${workflowId}/${sessionId}
	const url = `${rootStore.webhookTestUrl}/${workflowId}/${props.sessionId}`;
	
	console.log('Chat webhook URL (sessionId-based):', url);
	return url;
});



const chatOptions = computed<ChatOptions>(() => {
	const options = {
		webhookUrl: webhookUrl.value,
		webhookConfig: {
			method: 'POST' as const,
			headers: {
				'Content-Type': 'application/json',
			},
		},
		mode: 'fullscreen' as const,
		showWindowCloseButton: false,
		showWelcomeScreen: false,
		loadPreviousSession: true,
		// Enable streaming based on ChatTrigger node configuration
		enableStreaming: isStreamingEnabled.value,
		// Use the correct field names that ChatTrigger expects
		chatInputKey: 'chatInput',
		chatSessionKey: 'sessionId',
		defaultLanguage: 'en' as const,
		initialMessages: [],
		// Pass the actual session ID value
		metadata: {
			sessionId: props.sessionId,
		},
		i18n: {
			en: {
				title: locale.baseText('chat.window.title') || 'Chat',
				subtitle: 'Test your workflow',
				footer: '',
				getStarted: 'Send a message',
				inputPlaceholder:
					locale.baseText('chat.window.chat.placeholder') || 'Type your message...',
				closeButtonTooltip: 'Close',
			},
		},
		// Event handlers for message lifecycle
		beforeMessageSent: async (message: string) => {
			console.log('Before sending message:', message);
			// Register fresh webhook before each message to ensure it's active
			// This gives us a fresh webhook with full timeout for each message
			console.log('Registering fresh webhook for message...');
			await registerChatWebhook();
			// Replace execution data with a fresh placeholder (like runWorkflow does)
			// This clears the visual display while preserving the infrastructure
			if (workflowsStore.workflowExecutionData?.id) {
				console.log('Replacing execution data with fresh placeholder');
				createFreshExecutionPlaceholder();
			}
		},
		afterMessageSent: (message: string, response?: any) => {
			console.log('After sending message:', message, 'Response:', response);
		},

	};
	return options;
});

// Register ChatTrigger webhook for test execution
async function registerChatWebhook(): Promise<void> {
	if (isRegistering.value || !chatTriggerNode.value) {
		return;
	}

	isRegistering.value = true;

	try {
		// Use the useRunWorkflow composable to properly register the webhook
		// This handles all execution data initialization correctly, including
		// replacing the old execution data with a fresh placeholder
		console.log(`Calling runWorkflow with sessionId: ${props.sessionId}`);
		await runWorkflow({
			triggerNode: chatTriggerNode.value.name,
			source: 'RunData.ManualChatTrigger',
			sessionId: props.sessionId,
		});

		webhookRegistered.value = true;
	} finally {
		isRegistering.value = false;
	}
}


function initializeChat() {
	if (!chatContainer.value) return;

	// Create Vue app instance with chat SDK
	chatApp = createApp(Chat);
	chatApp.use(ChatPlugin, chatOptions.value);
	chatApp.mount(chatContainer.value);
}

function destroyChat() {
	if (chatApp && chatContainer.value) {
		chatApp.unmount();
		chatApp = null;
		chatContainer.value.innerHTML = '';
	}
	// Reset webhook registration state when chat is destroyed
	webhookRegistered.value = false;
	isRegistering.value = false;
}

// Watch for isOpen changes to handle panel close/reopen
watch(
	() => props.isOpen,
	async (newIsOpen, oldIsOpen) => {
		console.log('isOpen changed:', { newIsOpen, oldIsOpen });
		if (newIsOpen && !oldIsOpen) {
			// Panel reopened - register webhook and reinitialize chat
			await setupChatWithWebhook();
		} else if (!newIsOpen && oldIsOpen) {
			// Panel closed - cleanup
			destroyChat();
		}
	},
);

// Setup chat with webhook registration
async function setupChatWithWebhook() {
	if (!props.isOpen || !chatTriggerNode.value) {
		return;
	}

	// Initialize chat immediately - webhook will be registered on-demand before each message
	initializeChat();
}

// Create a fresh execution placeholder (replicates what runWorkflow does)
function createFreshExecutionPlaceholder() {
	const workflowData = workflowsStore.workflow;
	
	const executionData: IExecutionResponse = {
		id: IN_PROGRESS_EXECUTION_ID,
		finished: false,
		mode: 'manual',
		status: 'running',
		createdAt: new Date(),
		startedAt: new Date(),
		stoppedAt: undefined,
		workflowId: workflowsStore.workflowId,
		executedNode: chatTriggerNode.value?.name,
		triggerNode: chatTriggerNode.value?.name,
		data: {
			resultData: {
				runData: {}, // Empty run data - new execution events will populate this
				pinData: workflowData.pinData,
				workflowData,
			},
		} as IRunExecutionData,
		workflowData: {
			id: workflowsStore.workflowId,
			name: workflowData.name!,
			active: workflowData.active!,
			createdAt: 0,
			updatedAt: 0,
			...workflowData,
		} as IWorkflowDb,
	};
	
	workflowsStore.setWorkflowExecutionData(executionData);
}

onMounted(() => {
	if (props.isOpen) {
		// Setup chat with webhook registration
		void setupChatWithWebhook();
	}
});

onUnmounted(() => {
	destroyChat();
});
</script>

<template>
	<div
		:class="$style.chat"
		data-test-id="workflow-lm-chat-dialog"
		class="ignore-key-press-canvas"
		tabindex="0"
	>
		<LogsPanelHeader
			data-test-id="chat-header"
			:title="locale.baseText('chat.window.title')"
			:is-clickable="isHeaderClickable"
			@click="emit('clickHeader')"
		>
			<template #actions>
				<N8nTooltip v-if="!isReadOnly">
					<template #content>
						{{ sessionId }}
						<br />
						{{ locale.baseText('chat.window.session.id.copy') }}
					</template>
					<N8nButton
						data-test-id="chat-session-id"
						type="secondary"
						size="mini"
						:class="$style.newHeaderButton"
						>{{ sessionIdText }}</N8nButton
					>
				</N8nTooltip>
				<N8nTooltip
					v-if="!isReadOnly"
					:content="locale.baseText('chat.window.session.resetSession')"
				>
					<N8nIconButton
						:class="$style.newHeaderButton"
						data-test-id="refresh-session-button"
						outline
						type="secondary"
						size="small"
						icon-size="medium"
						icon="undo-2"
						:title="locale.baseText('chat.window.session.reset')"
						@click.stop="emit('refreshSession')"
					/>
				</N8nTooltip>
			</template>
		</LogsPanelHeader>

		<!-- Chat SDK Container -->
		<main v-if="isOpen" :class="$style.chatSdkContainer" data-test-id="canvas-chat-body">
			<div ref="chatContainer" :class="$style.chatContainer" />
		</main>
	</div>
</template>

<style lang="scss" module>
.chat {
	--chat--spacing: var(--spacing-xs);
	--chat--message--padding: var(--spacing-2xs);
	--chat--message--font-size: var(--font-size-2xs);
	--chat--input--font-size: var(--font-size-s);
	--chat--input--placeholder--font-size: var(--font-size-xs);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color--text--tint-2);
	--chat--message--bot--color: var(--color--text--shade-1);
	--chat--message--user--color: var(--color--text--shade-1);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--message--user--border: none;
	--chat--input--padding: var(--spacing-xs);
	--chat--color-typing: var(--color--text--tint-1);
	--chat--textarea--max-height: calc(var(--logs-panel-height) * 0.3);
	--chat--message--pre--background: var(--color--foreground--tint-1);
	--chat--textarea--height: calc(
		var(--chat--input--padding) * 2 + var(--chat--input--font-size) *
			var(--chat--input--line-height)
	);
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color--background--light-2);
}

.chatHeader {
	font-size: var(--font-size-s);
	font-weight: var(--font-weight-regular);
	line-height: 18px;
	text-align: left;
	border-bottom: 1px solid var(--color--foreground);
	padding: var(--chat--spacing);
	background-color: var(--color--foreground--tint-2);
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.chatTitle {
	font-weight: var(--font-weight-medium);
}

.session {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	color: var(--color--text);
	max-width: 70%;
}

.sessionId {
	display: inline-block;
	white-space: nowrap;
	text-overflow: ellipsis;
	overflow: hidden;

	&.copyable {
		cursor: pointer;
	}
}

.headerButton {
	max-height: 1.1rem;
	border: none;
}

.newHeaderButton {
	border: none;
	color: var(--color--text--tint-1);
}

.chatSdkContainer {
	display: flex;
	height: 100%;
	overflow: hidden;
	flex-direction: column;
}

.chatContainer {
	height: 100%;
	width: 100%;
	background: var(--color-background-base);
	border-radius: 0;

	:global(.chat-layout) {
		--chat-font-family: var(--font-family) !important;
		--chat-color-primary: var(--color-primary) !important;
		--chat-color-secondary: var(--color-secondary) !important;
		--chat-color-tertiary: var(--color-foreground-base) !important;
		--chat-color-background: var(--color-background-base) !important;
		--chat-color-text: var(--color-text-base) !important;
		--chat-color-light-shade-100: var(--color-foreground-base) !important;
		--chat-color-light-shade-200: var(--color-foreground-dark) !important;
		--chat-color-light-shade-300: var(--color-background-light) !important;
		--chat-color-light-shade-400: var(--color-background-xlight) !important;
		--chat-color-disabled: var(--color-text-light) !important;
		--chat-border-radius: var(--border-radius-base) !important;
		--chat-spacing: var(--spacing-m) !important;
		--chat-transition-duration: 0.15s !important;
		--chat-header-height: auto !important;
		--chat-header-padding: var(--spacing-m) !important;
		--chat-header-background: var(--color-background-light) !important;
		--chat-header-color: var(--color-text-base) !important;
		--chat-header-border-bottom: var(--border-base) !important;
		--chat-heading-font-size: var(--font-size-l) !important;
		--chat-subtitle-font-size: var(--font-size-s) !important;
		--chat-subtitle-line-height: var(--font-line-height-regular) !important;
		--chat-body-background: var(--color-background-base) !important;
		--chat-footer-background: var(--color-background-base) !important;
		--chat-footer-color: var(--color-text-base) !important;
		--chat-messages-list-padding: var(--spacing-m) !important;
		--chat-message-font-size: var(--font-size-s) !important;
		--chat-message-padding: var(--spacing-s) var(--spacing-m) !important;
		--chat-message-border-radius: var(--border-radius-base) !important;
		--chat-message-line-height: var(--font-line-height-regular) !important;
		--chat-message-margin-bottom: var(--spacing-xs) !important;
		--chat-message-bot-background: var(--color-background-light) !important;
		--chat-message-bot-color: var(--color-text-base) !important;
		--chat-message-bot-border: var(--border-base) !important;
		--chat-message-user-background: var(--color-primary) !important;
		--chat-message-user-color: white !important;
		--chat-message-user-border: none !important;
		--chat-message-pre-background: var(--color-background-xlight) !important;
		--chat-input-font-size: var(--font-size-s) !important;
		--chat-input-padding: var(--spacing-s) !important;
		--chat-input-border-radius: var(--border-radius-base) !important;
		--chat-input-border: var(--border-base) !important;
		--chat-input-border-active: var(--color-primary) !important;
		--chat-input-background: var(--color-background-xlight) !important;
		--chat-input-text-color: var(--color-text-base) !important;
		--chat-input-line-height: var(--font-line-height-regular) !important;
		--chat-input-placeholder-font-size: var(--font-size-s) !important;
		--chat-textarea-height: 44px !important;
		--chat-textarea-max-height: 200px !important;
		--chat-input-send-button-color: var(--color-primary) !important;
		--chat-input-send-button-color-hover: var(--color-primary-shade-1) !important;
		--chat-input-send-button-background: transparent !important;
		--chat-input-send-button-background-hover: transparent !important;
		--chat-input-file-button-color: var(--color-text-light) !important;
		--chat-input-file-button-color-hover: var(--color-text-base) !important;
		--chat-input-file-button-background: transparent !important;
		--chat-input-file-button-background-hover: transparent !important;
		--chat-close-button-color-hover: var(--color-primary) !important;
	}

	:global(.chat-header) {
		display: none !important;
	}

	body[data-theme='dark'] & {
		:global(.chat-layout) {
			--chat-color-background: var(--p-gray-670) !important;
			--chat-color-text: var(--p-gray-200) !important;
			--chat-color-light-shade-100: var(--p-gray-540) !important;
			--chat-color-light-shade-300: var(--p-gray-820) !important;
			--chat-color-light-shade-400: var(--p-gray-740) !important;
			--chat-header-background: var(--p-gray-820) !important;
			--chat-header-color: var(--p-gray-200) !important;
			--chat-header-border-bottom: 1px solid var(--p-gray-540) !important;
			--chat-body-background: var(--p-gray-670) !important;
			--chat-footer-background: var(--p-gray-670) !important;
			--chat-footer-color: var(--p-gray-200) !important;
			--chat-message-bot-background: var(--p-gray-740) !important;
			--chat-message-bot-color: var(--p-gray-200) !important;
			--chat-message-bot-border: 1px solid var(--p-gray-490) !important;
			--chat-message-user-background: var(--p-color-alt-a-700) !important;
			--chat-message-user-color: var(--p-white) !important;
			--chat-message-pre-background: var(--p-gray-820) !important;
			--chat-input-background: var(--p-gray-740) !important;
			--chat-input-text-color: var(--p-gray-200) !important;
			--chat-input-border: 1px solid var(--p-gray-540) !important;
		}
	}
}

.messagesInput {
	--input-border-color: var(--border-color-base);
	--chat--input--border: none;

	--chat--input--border-radius: 0.5rem;
	--chat--input--send--button--background: transparent;
	--chat--input--send--button--color: var(--color--primary);
	--chat--input--file--button--background: transparent;
	--chat--input--file--button--color: var(--color--primary);
	--chat--input--border-active: var(--input-focus-border-color, var(--color--secondary));
	--chat--files-spacing: var(--spacing-2xs);
	--chat--input--background: transparent;
	--chat--input--file--button--color: var(--color-button-secondary-font);
	--chat--input--file--button--color-hover: var(--color--primary);

	padding: var(--spacing-5xs);
	margin: 0 var(--chat--spacing) var(--chat--spacing);
	flex-grow: 1;
	display: flex;
	background: var(--color-lm-chat-bot-background);
	border-radius: var(--chat--input--border-radius);
	transition: border-color 200ms ease-in-out;
	border: var(--input-border-color, var(--border-color-base))
		var(--input-border-style, var(--border-style-base))
		var(--input-border-width, var(--border-width-base));

	[data-theme='dark'] & {
		--chat--input--text-color: var(--input-font-color, var(--color--text--shade-1));
	}
	@media (prefers-color-scheme: dark) {
		--chat--input--text-color: var(--input-font-color, var(--color--text--shade-1));
	}

	&:focus-within {
		--input-border-color: #4538a3;
	}
}

.messagesHistory {
	height: var(--chat--textarea--height);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
</style>
