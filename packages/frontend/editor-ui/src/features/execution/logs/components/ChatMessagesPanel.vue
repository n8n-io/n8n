<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import Chat from '@n8n/chat/components/Chat.vue';
import { ChatPlugin } from '@n8n/chat/plugins';
import {
	computed,
	createApp,
	nextTick,
	onMounted,
	onUnmounted,
	useTemplateRef,
	watch,
	type App,
} from 'vue';
import LogsPanelHeader from '@/features/execution/logs/components/LogsPanelHeader.vue';
import { N8nButton, N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { useClipboard } from '@vueuse/core';
import { useToast } from '@/app/composables/useToast';
import { useChatState } from '@/features/execution/logs/composables/useChatState';
import { useWorkflowsStore } from '@/app/stores/workflows.store';

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
const clipboard = useClipboard();
const toast = useToast();
const workflowsStore = useWorkflowsStore();
const chatContainer = useTemplateRef<HTMLElement>('chatContainer');

// Use the chat state composable
const {
	chatTriggerNode,
	isStreamingEnabled,
	isFileUploadsAllowed,
	allowedFilesMimeTypes,
	isWorkflowReadyForChat,
	chatOptions,
} = useChatState(props.isReadOnly, () => props.sessionId);

let chatApp: App | null = null;

const sessionIdText = computed(() =>
	locale.baseText('chat.window.session.id', {
		interpolate: { id: `${props.sessionId.slice(0, 5)}...` },
	}),
);

async function copySessionId() {
	await clipboard.copy(props.sessionId);
	toast.showMessage({
		title: locale.baseText('generic.copiedToClipboard'),
		message: '',
		type: 'success',
	});
}

function initializeChat() {
	if (!isWorkflowReadyForChat.value) {
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
}

function destroyChat() {
	if (chatApp && chatContainer.value) {
		chatApp.unmount();
		chatApp = null;
		chatContainer.value.innerHTML = '';
	}
}

// Watch for isOpen changes
watch(
	() => props.isOpen,
	async (newIsOpen) => {
		if (newIsOpen && !chatApp) {
			// Panel opened and chat not yet initialized - initialize it
			destroyChat();
			initializeChat();
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
				initializeChat();
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
			initializeChat();
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
			initializeChat();
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
			initializeChat();
		}
	},
);

// Watch for file upload configuration changes
watch(
	() => [isFileUploadsAllowed.value, allowedFilesMimeTypes.value],
	async (newConfig, oldConfig) => {
		if (
			props.isOpen &&
			isWorkflowReadyForChat.value &&
			chatApp &&
			JSON.stringify(newConfig) !== JSON.stringify(oldConfig)
		) {
			// Reinitialize chat when file upload configuration changes and workflow is ready
			destroyChat();
			initializeChat();
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
						{{ sessionId }}
						<br />
						{{ locale.baseText('chat.window.session.id.copy') }}
					</template>
					<N8nButton
						variant="outline"
						data-test-id="chat-session-id"
						size="xsmall"
						:class="$style.newHeaderButton"
						@click.stop="copySessionId"
						>{{ sessionIdText }}</N8nButton
					>
				</N8nTooltip>
				<N8nTooltip
					v-if="!isReadOnly"
					:content="locale.baseText('chat.window.session.resetSession')"
				>
					<N8nIconButton
						variant="subtle"
						:class="$style.newHeaderButton"
						data-test-id="refresh-session-button"
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
			v-show="isOpen && chatTriggerNode"
			:class="$style.chatSdkContainer"
			data-test-id="canvas-chat-body"
		>
			<div ref="chatContainer" :class="$style.chatContainer" />
		</main>
	</div>
</template>

<style lang="scss" module>
.chat {
	--chat--spacing: var(--spacing--xs);
	--chat--message--padding: var(--spacing--2xs);
	--chat--message--font-size: var(--font-size--2xs);
	--chat--input--font-size: var(--font-size--sm);
	--chat--input--placeholder--font-size: var(--font-size--xs);
	--chat--message--bot--background: transparent;
	--chat--message--user--background: var(--color--text--tint-2);
	--chat--message--bot--color: var(--color--text--shade-1);
	--chat--message--user--color: var(--color--text--shade-1);
	--chat--message--bot--border: none;
	--chat--message--user--border: none;
	--chat--message--user--border: none;
	--chat--input--padding: var(--spacing--xs);
	--chat--color-typing: var(--color--text--tint-1);
	--chat--textarea--max-height: calc(var(--logs-panel--height) * 0.3);
	--chat--message--pre--background: var(--color--foreground--tint-1);
	--chat--textarea--height: calc(
		var(--chat--input--padding) * 2 + var(--chat--input--font-size) *
			var(--chat--input--line-height)
	);
	--chat--transition-duration: 0.3s;
	--chat--button--font-size: var(--font-size--2xs);
	--chat--button--line-height: 1;
	--chat--button--border-radius: var(--radius);
	--chat--button--padding: var(--spacing--2xs) var(--spacing--xs);
	--chat--button--color--primary: var(--button--color--text--primary);
	--chat--button--background--primary: var(--button--color--background--primary);
	--chat--button--border--primary: none;
	--chat--button--color--primary--hover: var(--button--color--text--primary);
	--chat--button--background--primary--hover: var(
		--button--color--background--primary--hover-active-focus
	);
	--chat--button--border--primary--hover: none;
	--chat--button--color--primary--disabled: var(--button--color--text--primary--disabled);
	--chat--button--background--primary--disabled: var(
		--button--color--background--primary--disabled
	);
	--chat--button--border--primary--disabled: none;
	--chat--button--color--secondary: var(--button--color--text--secondary);
	--chat--button--background--secondary: var(--button--color--background--secondary);
	--chat--button--border--secondary: var(--border-width) var(--button--border-color--secondary)
		var(--border-style);
	--chat--button--color--secondary--hover: var(
		--button--color--text--secondary--hover-active-focus
	);
	--chat--button--background--secondary--hover: var(--button--color--background--secondary--hover);
	--chat--button--border--secondary--hover: var(--border-width)
		var(--button--border-color--secondary--hover-active-focus) var(--border-style);
	--chat--button--color--secondary--disabled: var(--button--color--text--secondary--disabled);
	--chat--button--background--secondary--disabled: var(--button--color--background--secondary);
	--chat--button--border--secondary--disabled: var(--border-width)
		var(--button--border-color--secondary--disabled) var(--border-style);
	height: 100%;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	background-color: var(--color--background--light-2);
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
	border-radius: 0;

	:global(.chat-layout) {
		/* Font and Basic Styling */
		--chat--font-family: var(--font-family);
		--chat--border-radius: var(--radius);
		--chat--spacing: var(--spacing--md);
		--chat--transition-duration: 0.15s;

		/* Colors - Primary and Secondary */
		--chat--color--primary: var(--color--secondary);
		--chat--color--secondary: var(--color--secondary);
		--chat--color-light-shade-100: var(--color--foreground);
		--chat--color-disabled: var(--color--text--tint-2);

		/* Body and Footer */
		--chat--body--background: var(--color--background--light-2);
		--chat--footer--background: var(--color--background--light-2);
		--chat--footer--color: var(--color--text);

		/* Messages List */
		--chat--messages-list--padding: var(--spacing--md);

		/* Message Styling */
		--chat--message--font-size: var(--font-size--sm);
		--chat--message--padding: var(--spacing--sm) var(--spacing--md);
		--chat--message--border-radius: var(--radius);
		--chat--message-line-height: var(--line-height--md);
		--chat--message--margin-bottom: var(--spacing--xs);

		/* Bot Messages */
		--chat--message--bot--background: none;
		--chat--message--bot--color: var(--color--text--shade-1);
		--chat--message--bot--border: none;

		/* User Messages */
		--chat--message--user--background: var(--color--text--tint-2);
		--chat--message--user--color: var(--color--text--shade-1);
		--chat--message--user--border: none;

		/* Code blocks in messages */
		--chat--message--pre--background: var(--color--background--light-3);

		/* Footer Container */
		--chat--footer--padding: var(--spacing--md);
		--chat--footer--border-top: none;

		/* Input Container - unified rounded container */
		--chat--input--width: 95%;
		--chat--input--background: transparent;
		--chat--input--container--background: var(--color--background--light-3);
		--chat--input--container--border: 1px solid var(--color--foreground--tint-1);
		--chat--input--container--padding: 4px 8px;

		/* Input Textarea */
		--chat--input--font-size: var(--font-size--sm);
		--chat--input--padding: var(--padding--xs) var(--padding--md);
		--chat--input--border: none;
		--chat--input--border-active: none;
		--chat--input--background: transparent;
		--chat--input--text-color: var(--color--text--shade-1);
		--chat--input--line-height: var(--line-height--md);
		--chat--input--placeholder--font-size: var(--font-size--sm);
		--chat--textarea--height: 52px;
		--chat--textarea--max-height: 200px;

		/* Send Button - integrated into container */
		--chat--input--send--button--color: var(--color--secondary);
		--chat--input--send--button--color-hover: var(--color--primary);
		--chat--input--send--button--background: transparent;
		--chat--input--send--button--background-hover: var(--color--primary--shade-2);
		--chat--input--send--button--border-radius: var(--radius--lg);
		--chat--input--send--button--size: 36px;
		--chat--input--send--button--margin: var(--spacing--sm);

		/* File Button */
		--chat--input--send--button--color: var(--color--secondary);
		--chat--input--file--button--color-hover: var(--color--primary);
		--chat--input--file--button--background: transparent;
		--chat--input--file--button--background-hover: var(--color--primary--shade-2);

		/* Message Action Buttons */
		--chat--message--actions--color: var(--color--text--primary);
		--chat--message--actions--gap: var(--spacing--sm);
		--chat--message--actions--icon-size: 32px;
	}

	/* Hide the default chat header since we use our own */
	:global(.chat-header) {
		display: none;
	}

	/* Fix typing indicator width */
	:global(.chat-message-typing.chat-message) {
		max-width: 100px;
	}

	/* Dark Mode Overrides */
	body[data-theme='dark'] & {
		:global(.chat-layout) {
			/* Body and Footer - darker background like the old design */
			--chat--body--background: var(--color--background--light-2);
			--chat--footer--background: var(--color--background--light-2);
			--chat--footer--color: var(--color--text);
			--chat--footer--border-top: none;

			/* Bot Messages - darker background with subtle border */
			--chat--message--bot--background: transparent;
			--chat--message--bot--color: var(--color--text);
			--chat--message--bot--border: 0;

			/* User Messages - darker user message background */
			--chat--message--user--background: var(--color--foreground);
			--chat--message--user--color: white;

			/* Code blocks */
			--chat--message--pre--background: var(--color--background);

			/* Input Area - match the old design's input styling */
			--chat--input--background: transparent;
			--chat--input--text-color: var(--color--text);
			--chat--input--border: 1px solid var(--color--foreground);
			--chat--input--border-active: 1px solid var(--color--primary);
			--chat--color--primary-shade-50: var(--color--primary--shade-50);

			--chat--message--actions--color: var(--chat--color-light-shade-100);
		}
	}
}
</style>
