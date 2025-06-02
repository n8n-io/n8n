import {
	LOG_DETAILS_PANEL_STATE,
	LOGS_PANEL_STATE,
	type LogDetailsPanelState,
} from '@/components/CanvasChat/types/logs';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL,
	LOCAL_STORAGE_LOGS_PANEL_OPEN,
	LOCAL_STORAGE_LOGS_SYNC_SELECTION,
} from '@/constants';
import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

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
	const isLogSelectionSyncedWithCanvas = useLocalStorage(LOCAL_STORAGE_LOGS_SYNC_SELECTION, false);

	const telemetry = useTelemetry();

	function setHeight(value: number) {
		height.value = value;
	}

	function toggleOpen(value?: boolean) {
		isOpen.value = value ?? !isOpen.value;
	}

	function setPreferPoppedOut(value: boolean) {
		preferPoppedOut.value = value;
	}

	function toggleInputOpen(open?: boolean) {
		const statesWithInput: LogDetailsPanelState[] = [
			LOG_DETAILS_PANEL_STATE.INPUT,
			LOG_DETAILS_PANEL_STATE.BOTH,
		];
		const wasOpen = statesWithInput.includes(detailsState.value);

		if (open === wasOpen) {
			return;
		}

		detailsState.value = wasOpen ? LOG_DETAILS_PANEL_STATE.OUTPUT : LOG_DETAILS_PANEL_STATE.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'input',
			newState: wasOpen ? 'hidden' : 'visible',
		});
	}

	function toggleOutputOpen(open?: boolean) {
		const statesWithOutput: LogDetailsPanelState[] = [
			LOG_DETAILS_PANEL_STATE.OUTPUT,
			LOG_DETAILS_PANEL_STATE.BOTH,
		];
		const wasOpen = statesWithOutput.includes(detailsState.value);

		if (open === wasOpen) {
			return;
		}

		detailsState.value = wasOpen ? LOG_DETAILS_PANEL_STATE.INPUT : LOG_DETAILS_PANEL_STATE.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'output',
			newState: wasOpen ? 'hidden' : 'visible',
		});
	}

	function toggleLogSelectionSync(value?: boolean) {
		isLogSelectionSyncedWithCanvas.value = value ?? !isLogSelectionSyncedWithCanvas.value;
	}

	return {
		state,
		isOpen: computed(() => state.value !== LOGS_PANEL_STATE.CLOSED),
		detailsState: computed(() => detailsState.value),
		height: computed(() => height.value),
		isLogSelectionSyncedWithCanvas: computed(() => isLogSelectionSyncedWithCanvas.value),
		setHeight,
		toggleOpen,
		setPreferPoppedOut,
		toggleInputOpen,
		toggleOutputOpen,
		toggleLogSelectionSync,
	};
});
