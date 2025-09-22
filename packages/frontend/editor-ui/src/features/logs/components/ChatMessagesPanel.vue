<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import Chat from '@n8n/chat/components/Chat.vue';
import { ChatPlugin } from '@n8n/chat/plugins';
import type { ChatOptions } from '@n8n/chat/types';
import {
	computed,
	createApp,
	nextTick,
	onMounted,
	onUnmounted,
	useTemplateRef,
	watch,
	ref,
} from 'vue';
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useRouter } from 'vue-router';

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
	hideChatPanel: [];
}>();

const locale = useI18n();
const router = useRouter();
const workflowsStore = useWorkflowsStore();
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
	const options = chatTriggerNode.value?.parameters?.options;

	if (options && typeof options === 'object' && 'responseMode' in options) {
		const responseMode = options.responseMode;
		return responseMode === 'streaming';
	}

	return false;
});

// Check if workflow is ready for chat execution
const isWorkflowReadyForChat = computed(() => {
	// Must have a ChatTrigger node
	if (!chatTriggerNode.value) {
		return false;
	}

	// Must have a valid workflow ID (for new workflows, this might not be set until saved)
	if (!workflowsStore.workflowId && !workflowsStore.isNewWorkflow) {
		return false;
	}

	return true;
});

const webhookUrl = computed(() => {
	if (!chatTriggerNode.value) {
		return '';
	}

	const workflowId = workflowsStore.workflowId;
	if (!workflowId) {
		return '';
	}

	const url = `${rootStore.webhookTestUrl}/${workflowId}/${props.sessionId}`;

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
		// Force the chat SDK to use our canvas session ID
		sessionId: props.sessionId,
		// Enable streaming based on ChatTrigger node configuration
		enableStreaming: isStreamingEnabled.value,
		// Use the correct field names that ChatTrigger expects
		chatInputKey: 'chatInput',
		chatSessionKey: 'sessionId',
		defaultLanguage: 'en' as const,
		initialMessages: [],
		i18n: {
			en: {
				title: locale.baseText('chat.window.title') || 'Chat',
				subtitle: 'Test your workflow',
				footer: '',
				getStarted: 'Send a message',
				inputPlaceholder: locale.baseText('chat.window.chat.placeholder') || 'Type your message...',
				closeButtonTooltip: 'Close',
			},
		},
		beforeMessageSent: async (_message: string) => {
			// Register fresh webhook before each message to ensure it's active
			// This gives us a fresh webhook with full timeout for each message
			await registerChatWebhook();
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

async function initializeChat() {
	if (!props.isOpen || !isWorkflowReadyForChat.value) {
		return;
	}

	if (!chatContainer.value) {
		return;
	}

	// Don't initialize if already initialized
	if (chatApp) {
		return;
	}

	// Create Vue app instance with chat SDK
	chatApp = createApp(Chat);
	chatApp.use(ChatPlugin, chatOptions.value);
	chatApp.mount(chatContainer.value);
	console.log('✅ Chat initialized successfully');
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
		if (newIsOpen && !oldIsOpen) {
			// Panel reopened - register webhook and reinitialize chat
			await initializeChat();
		} else if (!newIsOpen && oldIsOpen) {
			// Panel closed - cleanup
			destroyChat();
		}
	},
);

// Watch for ChatTrigger node changes
watch(
	() => chatTriggerNode.value,
	async (newChatTrigger, oldChatTrigger) => {
		if (props.isOpen) {
			if (newChatTrigger && !oldChatTrigger) {
				// ChatTrigger was added - initialize chat
				await nextTick();
				await initializeChat();
			} else if (!newChatTrigger && oldChatTrigger) {
				// ChatTrigger was removed - destroy chat and hide panel
				destroyChat();
				emit('hideChatPanel');
			}
		}
	},
);

// Watch for chatContainer ref becoming available
watch(
	() => chatContainer.value,
	async (newContainer) => {
		if (newContainer && props.isOpen && isWorkflowReadyForChat.value) {
			await initializeChat();
		}
	},
);

// Watch for workflow ID changes (important for webhook URL)
watch(
	() => workflowsStore.workflowId,
	async (newWorkflowId, oldWorkflowId) => {
		if (props.isOpen && isWorkflowReadyForChat.value && newWorkflowId !== oldWorkflowId) {
			// Workflow ID changed and workflow is ready - reinitialize chat with new webhook URL
			destroyChat();
			await initializeChat();
		}
	},
);

// Watch for streaming configuration changes
watch(
	() => isStreamingEnabled.value,
	async (newStreaming, oldStreaming) => {
		if (props.isOpen && isWorkflowReadyForChat.value && chatApp && newStreaming !== oldStreaming) {
			// Reinitialize chat when streaming configuration changes and workflow is ready
			destroyChat();
			await initializeChat();
		}
	},
);

onMounted(async () => {
	if (props.isOpen) {
		// Wait for next tick to ensure DOM is ready
		await nextTick();
		void initializeChat();
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
						{{ props.sessionId }}
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
		<main
			v-if="isOpen && chatTriggerNode"
			:class="$style.chatSdkContainer"
			data-test-id="canvas-chat-body"
		>
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
		/* Font and Basic Styling */
		--chat--font-family: var(--font-family) !important;
		--chat--border-radius: var(--border-radius-base) !important;
		--chat--spacing: var(--spacing-m) !important;
		--chat--transition-duration: 0.15s !important;

		/* Colors - Primary and Secondary */
		--chat--color-primary: var(--color-primary) !important;
		--chat--color-secondary: var(--color-secondary) !important;
		--chat--color-light-shade-100: var(--color-foreground-base) !important;
		--chat--color-disabled: var(--color-text-light) !important;

		/* Body and Footer */
		--chat--body--background: var(--color-background-light);
		--chat--footer--background: var(--color-background-base) !important;
		--chat--footer--color: var(--color-text-base) !important;

		/* Messages List */
		--chat--messages-list--padding: var(--spacing-m) !important;

		/* Message Styling */
		--chat--message--font-size: var(--font-size-s) !important;
		--chat--message--padding: var(--spacing-s) var(--spacing-m) !important;
		--chat--message--border-radius: var(--border-radius-base) !important;
		--chat--message-line-height: var(--font-line-height-regular) !important;
		--chat--message--margin-bottom: var(--spacing-xs) !important;

		/* Bot Messages */
		--chat--message--bot--background: none !important;
		--chat--message--bot--color: var(--color-text-dark) !important;
		--chat--message--bot--border: none !important;

		/* User Messages */
		--chat--message--user--background: var(--color-text-lighter);
		--chat--message--user--color: var(--color-text-dark) !important;
		--chat--message--user--border: none !important;

		/* Code blocks in messages */
		--chat--message--pre--background: var(--color-background-xlight) !important;

		/* Input Area */
		--chat--input--font-size: var(--font-size-s) !important;
		--chat--input--padding: var(--spacing-s) !important;
		--chat--input--border-radius: var(--border-radius-base) !important;
		--chat--input--border: var(--border-base) !important;
		--chat--input--border-active: 1px solid var(--color-primary) !important;
		--chat--input--background: var(--color-background-xlight) !important;
		--chat--input--text-color: var(--color-text-base) !important;
		--chat--input--line-height: var(--font-line-height-regular) !important;
		--chat--input--placeholder--font-size: var(--font-size-s) !important;
		--chat--textarea--height: 44px !important;
		--chat--textarea--max-height: 200px !important;

		/* Input Buttons */
		--chat--input--send--button--color: var(--color-primary) !important;
		--chat--input--send--button--color-hover: var(--color-primary-shade-1) !important;
		--chat--input--send--button--background: transparent !important;
		--chat--input--send--button--background-hover: transparent !important;
		--chat--input--file--button--color: var(--color-text-light) !important;
		--chat--input--file--button--color-hover: var(--color-text-base) !important;
		--chat--input--file--button--background: transparent !important;
		--chat--input--file--button--background-hover: transparent !important;
		--chat--close--button--color-hover: var(--color-primary) !important;
	}

	/* Hide the default chat header since we use our own */
	:global(.chat-header) {
		display: none !important;
	}

	/* Dark Mode Overrides */
	body[data-theme='dark'] & {
		:global(.chat-layout) {
			/* Body and Footer - darker background like the old design */
			--chat--body--background: var(--color-background-xlight) !important;
			--chat--footer--background: var(--color-background-dark) !important;
			--chat--footer--color: var(--color-text-base) !important;

			/* Bot Messages - darker background with subtle border */
			--chat--message--bot--background: var(--color-background-medium) !important;
			--chat--message--bot--color: var(--color-text-base) !important;
			--chat--message--bot--border: 1px solid var(--color-foreground-base) !important;

			/* User Messages - darker user message background */
			--chat--message--user--background: var(--color-foreground-dark) !important;
			--chat--message--user--color: white !important;

			/* Code blocks */
			--chat--message--pre--background: var(--color-background-base) !important;

			/* Input Area - match the old design's input styling */
			--chat--input--background: var(--color-background-medium) !important;
			--chat--input--text-color: var(--color-text-base) !important;
			--chat--input--border: 1px solid var(--color-foreground-base) !important;
			--chat--input--border-active: 1px solid var(--color-primary) !important;
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
