import { ref } from 'vue';

export type ChatMode = 'build' | 'test';

/**
 * Per-agent chat-mode UI state. Owns:
 * - the active mode (Build/Test)
 * - lazy-mount tracking for the two chat panels (we don't mount Test until
 *   the user clicks into it, so the unused panel doesn't fire loadHistory)
 * - streaming flag for the builder chat (used to disable config inputs)
 * - the seed prompt for whichever panel is about to mount
 *
 * `setChatMode` lives in the view because it bridges this state with session
 * + URL + telemetry concerns; this composable only owns the storage.
 */
export function useAgentChatMode() {
	const chatMode = ref<ChatMode>('test');
	const chatModeOpened = ref<Record<ChatMode, boolean>>({ test: false, build: false });
	const isBuildChatStreaming = ref(false);
	const initialPrompt = ref<string | undefined>(undefined);

	function onBuildChatStreamingChange(streaming: boolean) {
		isBuildChatStreaming.value = streaming;
	}

	function resetForAgentSwitch() {
		chatModeOpened.value = { test: false, build: false };
		isBuildChatStreaming.value = false;
		initialPrompt.value = undefined;
	}

	return {
		chatMode,
		chatModeOpened,
		isBuildChatStreaming,
		initialPrompt,
		onBuildChatStreamingChange,
		resetForAgentSwitch,
	};
}
