import { computed, ref, watch } from 'vue';

const CHAT_COLLAPSED_KEY = 'agentBuilder.chatColumnCollapsed';

/**
 * Three-column shell layout state for the agent builder. Owns the chat-column
 * collapse toggle (persisted to localStorage) and the corresponding
 * `grid-template-columns` value.
 */
export function useAgentBuilderLayout() {
	const chatColumnCollapsed = ref(
		typeof window !== 'undefined' && window.localStorage?.getItem(CHAT_COLLAPSED_KEY) === '1',
	);

	watch(chatColumnCollapsed, (v) => {
		try {
			window.localStorage?.setItem(CHAT_COLLAPSED_KEY, v ? '1' : '0');
		} catch {
			// localStorage may throw in private-browsing modes; silently ignore.
		}
	});

	const gridColumns = computed(() =>
		chatColumnCollapsed.value
			? '0 1fr minmax(200px, 260px)'
			: 'minmax(520px, 640px) 1fr minmax(200px, 260px)',
	);

	function onToggleChatColumn() {
		chatColumnCollapsed.value = !chatColumnCollapsed.value;
	}

	return { chatColumnCollapsed, gridColumns, onToggleChatColumn };
}
