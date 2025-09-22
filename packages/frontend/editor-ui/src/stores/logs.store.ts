import { type LogDetailsPanelState } from '@/features/logs/logs.types';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL,
	LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL_SUB_NODE,
	LOCAL_STORAGE_LOGS_PANEL_OPEN,
	LOCAL_STORAGE_LOGS_SYNC_SELECTION,
} from '@/constants';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { LOG_DETAILS_PANEL_STATE, LOGS_PANEL_STATE } from '@/features/logs/logs.constants';
import type { ChatMessage } from '@n8n/chat/types';
import { v4 as uuid } from 'uuid';

export const useLogsStore = defineStore('logs', () => {
	const isOpen = useLocalStorage(LOCAL_STORAGE_LOGS_PANEL_OPEN, false);
	const preferPoppedOut = ref(false);
	const state = computed(() =>
		isOpen.value
			? preferPoppedOut.value
				? LOGS_PANEL_STATE.FLOATING
				: LOGS_PANEL_STATE.ATTACHED
			: LOGS_PANEL_STATE.CLOSED,
	);
	const height = ref(0);
	const detailsState = useLocalStorage<LogDetailsPanelState>(
		LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL,
		LOG_DETAILS_PANEL_STATE.OUTPUT,
		{ writeDefaults: false },
	);
	const detailsStateSubNode = useLocalStorage<LogDetailsPanelState>(
		LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL_SUB_NODE,
		LOG_DETAILS_PANEL_STATE.BOTH,
		{ writeDefaults: false },
	);
	const isLogSelectionSyncedWithCanvas = useLocalStorage(LOCAL_STORAGE_LOGS_SYNC_SELECTION, true, {
		writeDefaults: false,
	});
	const isSubNodeSelected = ref(false);

	const telemetry = useTelemetry();

	const chatSessionId = ref<string>(getNewSessionId());
	const chatSessionMessages = ref<ChatMessage[]>([]);

	function setHeight(value: number) {
		height.value = value;
	}

	function getNewSessionId(): string {
		return uuid().replace(/-/g, '');
	}

	function resetChatSessionId() {
		chatSessionId.value = getNewSessionId();
	}

	function resetMessages() {
		chatSessionMessages.value = [];
	}

	function toggleOpen(value?: boolean) {
		isOpen.value = value ?? !isOpen.value;
	}

	function setPreferPoppedOut(value: boolean) {
		preferPoppedOut.value = value;
	}

	function setSubNodeSelected(value: boolean) {
		isSubNodeSelected.value = value;
	}

	function toggleInputOpen(open?: boolean) {
		const statesWithInput: LogDetailsPanelState[] = [
			LOG_DETAILS_PANEL_STATE.INPUT,
			LOG_DETAILS_PANEL_STATE.BOTH,
		];
		const stateRef = isSubNodeSelected.value ? detailsStateSubNode : detailsState;
		const wasOpen = statesWithInput.includes(stateRef.value);

		if (open === wasOpen) {
			return;
		}

		stateRef.value = wasOpen ? LOG_DETAILS_PANEL_STATE.OUTPUT : LOG_DETAILS_PANEL_STATE.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'input',
			newState: wasOpen ? 'hidden' : 'visible',
			isSubNode: isSubNodeSelected.value,
		});
	}

	function toggleOutputOpen(open?: boolean) {
		const statesWithOutput: LogDetailsPanelState[] = [
			LOG_DETAILS_PANEL_STATE.OUTPUT,
			LOG_DETAILS_PANEL_STATE.BOTH,
		];
		const stateRef = isSubNodeSelected.value ? detailsStateSubNode : detailsState;
		const wasOpen = statesWithOutput.includes(stateRef.value);

		if (open === wasOpen) {
			return;
		}

		stateRef.value = wasOpen ? LOG_DETAILS_PANEL_STATE.INPUT : LOG_DETAILS_PANEL_STATE.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'output',
			newState: wasOpen ? 'hidden' : 'visible',
			isSubNode: isSubNodeSelected.value,
		});
	}

	function toggleLogSelectionSync(value?: boolean) {
		isLogSelectionSyncedWithCanvas.value = value ?? !isLogSelectionSyncedWithCanvas.value;
	}

	function addChatMessage(message: ChatMessage) {
		chatSessionMessages.value.push(message);
	}

	return {
		state,
		isOpen: computed(() => state.value !== LOGS_PANEL_STATE.CLOSED),
		detailsState: computed(() =>
			isSubNodeSelected.value ? detailsStateSubNode.value : detailsState.value,
		),
		height: computed(() => height.value),
		isLogSelectionSyncedWithCanvas: computed(() => isLogSelectionSyncedWithCanvas.value),
		chatSessionId: computed(() => chatSessionId.value),
		chatSessionMessages: computed(() => chatSessionMessages.value),
		addChatMessage,
		setHeight,
		toggleOpen,
		setPreferPoppedOut,
		setSubNodeSelected,
		toggleInputOpen,
		toggleOutputOpen,
		toggleLogSelectionSync,
		resetChatSessionId,
		resetMessages,
	};
});
