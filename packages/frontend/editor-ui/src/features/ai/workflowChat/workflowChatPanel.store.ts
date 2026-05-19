import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import {
	WORKFLOW_CHAT_PANEL_STORE_ID,
	WORKFLOW_CHAT_MIN_WIDTH,
	WORKFLOW_CHAT_MAX_WIDTH,
	WORKFLOW_CHAT_DEFAULT_WIDTH,
} from './constants';

export const useWorkflowChatPanelStore = defineStore(WORKFLOW_CHAT_PANEL_STORE_ID, () => {
	const isOpen = ref(false);
	const width = useLocalStorage('workflowChat.width', WORKFLOW_CHAT_DEFAULT_WIDTH);
	const threadId = ref<string | null>(null);

	function open() {
		isOpen.value = true;
	}
	function close() {
		isOpen.value = false;
	}
	function toggle() {
		isOpen.value = !isOpen.value;
	}
	function setThreadId(id: string) {
		threadId.value = id;
	}
	function updateWidth(next: number) {
		width.value = Math.min(Math.max(next, WORKFLOW_CHAT_MIN_WIDTH), WORKFLOW_CHAT_MAX_WIDTH);
	}

	return {
		isOpen: computed(() => isOpen.value),
		width: computed(() => width.value),
		threadId: computed(() => threadId.value),
		MIN_WIDTH: WORKFLOW_CHAT_MIN_WIDTH,
		MAX_WIDTH: WORKFLOW_CHAT_MAX_WIDTH,
		open,
		close,
		toggle,
		setThreadId,
		updateWidth,
	};
});
