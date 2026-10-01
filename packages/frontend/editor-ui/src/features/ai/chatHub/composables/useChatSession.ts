import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	watch,
	type ComputedRef,
	type Ref,
	type ShallowRef,
} from 'vue';
import { useScroll } from '@vueuse/core';
import type { ChatSessionId, ChatMessageId } from '@n8n/api-types';
import { useChatStore } from '../chat.store';
import { isWaitingForApproval } from '../chat.utils';
import { useChatPushHandler } from './useChatPushHandler';
import type { ChatMessage, MessagingState } from '../chat.types';

export interface UseChatSessionOptions {
	sessionId: Ref<ChatSessionId> | ComputedRef<ChatSessionId>;
	scrollableRef: Readonly<ShallowRef<HTMLElement | null>>;
	/** Override isNewSession (default: chatMessages.length === 0) */
	isNewSession?: ComputedRef<boolean>;
	/** Return a MessagingState to extend the default, or null to fall through to 'idle' */
	extendMessagingState?: () => MessagingState | null;
	/** Return true to skip the auto-scroll on new message */
	shouldSkipScroll?: () => boolean;
}

export function useChatSession(options: UseChatSessionOptions) {
	const { sessionId, scrollableRef, extendMessagingState, shouldSkipScroll } = options;

	const chatStore = useChatStore();

	// Push handler lifecycle
	const chatPushHandler = useChatPushHandler();

	onBeforeMount(() => {
		chatPushHandler.initialize();
	});

	onBeforeUnmount(() => {
		chatPushHandler.terminate();
	});

	// Message computeds
	const chatMessages = computed<ChatMessage[]>(() => chatStore.getActiveMessages(sessionId.value));
	const isResponding = computed(() => chatStore.isResponding(sessionId.value));
	const isNewSession = options.isNewSession ?? computed(() => chatMessages.value.length === 0);

	// Messaging state
	const messagingState = computed<MessagingState>(() => {
		if (chatStore.streaming?.sessionId === sessionId.value) {
			return chatStore.streaming.messageId ? 'receiving' : 'waitingFirstChunk';
		}

		if (isWaitingForApproval(chatStore.lastMessage(sessionId.value))) {
			return 'waitingForApproval';
		}

		if (extendMessagingState) {
			const extended = extendMessagingState();
			if (extended !== null) {
				return extended;
			}
		}

		return 'idle';
	});

	// Scroll setup
	const scrollContainerRef = computed(() => scrollableRef.value?.parentElement ?? null);

	const { arrivedState, measure } = useScroll(scrollContainerRef, {
		throttle: 100,
		offset: { bottom: 100 },
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

	/**
	 * Fetch messages for a session and reconnect to any active stream.
	 * Throws on failure so callers can handle errors differently.
	 */
	async function loadSession(targetSessionId: ChatSessionId) {
		if (!chatStore.getConversation(targetSessionId)) {
			await chatStore.fetchMessages(targetSessionId);
		}

		const result = await chatStore.reconnectToStream(targetSessionId, 0);
		if (result?.hasActiveStream && result.currentMessageId) {
			chatPushHandler.initializeStreamState(
				targetSessionId,
				result.currentMessageId,
				result.lastSequenceNumber,
			);
		}
	}

	// Auto-scroll watcher
	watch(
		() => chatMessages.value[chatMessages.value.length - 1]?.id,
		(lastMessageId) => {
			if (!lastMessageId) return;

			if (shouldSkipScroll?.()) {
				return;
			}

			void nextTick(measure);

			if (chatStore.streaming?.sessionId === sessionId.value) {
				scrollToMessage(chatStore.streaming.promptId);
				return;
			}

			scrollToBottom(false);
		},
		{ immediate: true, flush: 'post' },
	);

	return {
		chatMessages,
		isResponding,
		isNewSession,
		messagingState,
		scrollContainerRef,
		arrivedState,
		scrollToBottom,
		scrollToMessage,
		loadSession,
	};
}
