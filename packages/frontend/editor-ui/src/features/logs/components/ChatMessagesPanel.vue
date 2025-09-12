<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import Chat from '@n8n/chat/components/Chat.vue';
import { ChatPlugin } from '@n8n/chat/plugins';
import type { ChatOptions } from '@n8n/chat/types';
import { computed, createApp, onMounted, onUnmounted, useTemplateRef, watch, ref } from 'vue';
import LogsPanelHeader from '@/features/logs/components/LogsPanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
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
}>();

const locale = useI18n();
const router = useRouter();
const workflowsStore = useWorkflowsStore();
const workflowHelpers = useWorkflowHelpers();
const nodeTypesStore = useNodeTypesStore();
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

// Generate test webhook URL using the same method as regular webhook nodes
const webhookUrl = computed(() => {
	if (!chatTriggerNode.value) {
		return '';
	}

	// Get the node type description to access webhook definitions
	const nodeTypeDescription = nodeTypesStore.getNodeType(
		chatTriggerNode.value.type,
		chatTriggerNode.value.typeVersion,
	);

	if (!nodeTypeDescription?.webhooks) {
		console.error('No webhooks found for ChatTrigger node type');
		return '';
	}

	// Find the webhook description for the 'default' (POST) webhook
	const webhookDescription = nodeTypeDescription.webhooks.find(
		(webhook: any) => webhook.name === 'default',
	);

	if (!webhookDescription) {
		console.error('No default webhook found for ChatTrigger node');
		return '';
	}

	// Use the same webhook URL generation as regular webhook nodes
	const url = workflowHelpers.getWebhookUrl(
		webhookDescription,
		chatTriggerNode.value,
		'test', // Use test URL for manual execution
	);

	console.log('Chat webhook URL:', url);
	return url;
});

// Chat SDK configuration for manual execution
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
		loadPreviousSession: false,
		// TODO: Enable streaming only if ChatTrigger node has responseMode: 'streaming'
		// Need to check chatTriggerNode.parameters.options.responseMode === 'streaming'
		enableStreaming: false,
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
				inputPlaceholder: locale.baseText('chat.window.chat.placeholder') || 'Type your message...',
				closeButtonTooltip: 'Close',
			},
		},
	};
	console.log('Chat options:', options);
	return options;
});

// Register ChatTrigger webhook for test execution
async function registerChatWebhook(): Promise<void> {
	if (isRegistering.value || webhookRegistered.value || !chatTriggerNode.value) {
		return;
	}

	isRegistering.value = true;
	console.log('Registering ChatTrigger webhook...');

	try {
		// Use the useRunWorkflow composable to properly register the webhook
		// This handles all execution data initialization correctly
		await runWorkflow({
			triggerNode: chatTriggerNode.value.name,
			source: 'RunData.ManualChatTrigger',
		});

		webhookRegistered.value = true;
		console.log('ChatTrigger webhook registered successfully via useRunWorkflow');
	} catch (error) {
		console.error('Failed to register ChatTrigger webhook:', error);
		throw error;
	} finally {
		isRegistering.value = false;
	}
}

function initializeChat() {
	if (!chatContainer.value) return;

	try {
		// Create Vue app instance with chat SDK
		chatApp = createApp(Chat);
		chatApp.use(ChatPlugin, chatOptions.value);
		chatApp.mount(chatContainer.value);

		console.log('Chat initialized successfully');
	} catch (error) {
		console.error('Failed to initialize chat SDK:', error);
	}
}

function destroyChat() {
	if (chatApp && chatContainer.value) {
		chatApp.unmount();
		chatApp = null;
		chatContainer.value.innerHTML = '';
		console.log('Chat destroyed');
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
		console.log('Skipping chat setup - not open or no ChatTrigger node');
		return;
	}

	try {
		// Register webhook first
		await registerChatWebhook();

		// Small delay to ensure webhook is registered
		setTimeout(() => {
			initializeChat();
		}, 200);
	} catch (error) {
		console.error('Failed to setup chat with webhook:', error);
		// Initialize chat anyway - maybe webhook was already registered
		setTimeout(() => {
			initializeChat();
		}, 100);
	}
}

onMounted(() => {
	console.log('ChatMessagesPanel mounted, isOpen:', props.isOpen);
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

	// Comprehensive n8n styling for chat SDK
	:global(.chat-layout) {
		height: 100%;
		width: 100%;
		font-family: var(--font-family);
		font-size: var(--font-size-s);
		background: var(--color-background-base);
		color: var(--color-text-base);
		border: none;
		border-radius: 0;
		box-shadow: none;

		// Hide the default chat header (we use our own)
		.chat-header {
			display: none;
		}

		// Style the main chat container
		.chat-body {
			background: var(--color-background-base);
			padding: var(--spacing-s);
		}

		// Style messages list container
		.chat-messages-list {
			background: var(--color-background-base);
		}

		// Style individual messages
		.message {
			margin-bottom: var(--spacing-xs);
			padding: var(--spacing-xs) var(--spacing-s);
			border-radius: var(--border-radius-base);
			font-family: var(--font-family);
			font-size: var(--font-size-s);
			line-height: var(--font-line-height-regular);
			max-width: 80%;
			word-wrap: break-word;

			&.user {
				background: var(--color-primary);
				color: var(--color-primary-contrast-text, white);
				align-self: flex-end;
				margin-left: auto;
			}

			&.bot {
				background: var(--color-background-light);
				color: var(--color-text-base);
				border: var(--border-base);
				align-self: flex-start;
			}
		}

		// Style the input area
		.chat-footer {
			padding: var(--spacing-s);
			background: var(--color-background-base);
			border-top: var(--border-base);
		}

		// Style the input field itself
		.chat-input textarea {
			width: 100%;
			border: var(--border-base);
			border-radius: var(--border-radius-base);
			padding: var(--spacing-xs) var(--spacing-s);
			font-family: var(--font-family);
			font-size: var(--font-size-s);
			line-height: var(--font-line-height-regular);
			background: var(--color-background-xlight);
			color: var(--color-text-base);
			outline: none;
			resize: none;

			&:focus {
				border-color: var(--color-primary);
				box-shadow: 0 0 0 2px var(--color-primary-tint-2);
			}

			&::placeholder {
				color: var(--color-text-light);
			}
		}

		// Style send button
		.chat-input-send-button {
			background: var(--color-primary);
			color: var(--color-primary-contrast-text, white);
			border: none;
			border-radius: var(--border-radius-base);
			padding: var(--spacing-xs) var(--spacing-s);
			font-family: var(--font-family);
			font-size: var(--font-size-s);
			font-weight: var(--font-weight-bold);
			cursor: pointer;
			transition: background-color 0.2s ease;

			&:hover {
				background: var(--color-primary-shade-1);
			}

			&:disabled {
				background: var(--color-foreground-base);
				color: var(--color-text-light);
				cursor: not-allowed;
			}
		}

		// Style file attachment button
		.chat-input-file-button {
			color: var(--color-text-light);
			&:hover {
				color: var(--color-text-base);
			}
		}

		// Style any scrollbars
		*::-webkit-scrollbar {
			width: 8px;
		}

		*::-webkit-scrollbar-track {
			background: var(--color-background-base);
		}

		*::-webkit-scrollbar-thumb {
			background: var(--color-foreground-base);
			border-radius: var(--border-radius-base);
		}

		*::-webkit-scrollbar-thumb:hover {
			background: var(--color-foreground-dark);
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
