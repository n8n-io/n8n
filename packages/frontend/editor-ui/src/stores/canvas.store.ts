import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { INodeUi, XYPosition } from '@/Interface';
import { useLoadingService } from '@/composables/useLoadingService';
import { useLocalStorage } from '@vueuse/core';
import {
	LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL as LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL,
	LOCAL_STORAGE_LOGS_PANEL_OPEN,
} from '@/constants';
import {
	LOG_DETAILS_CONTENT,
	LOGS_PANEL_STATE,
	type LogDetailsContent as LogDetailsPanel,
} from '@/components/CanvasChat/types/logs';
import { useTelemetry } from '@/composables/useTelemetry';

export const useCanvasStore = defineStore('canvas', () => {
	const workflowStore = useWorkflowsStore();
	const loadingService = useLoadingService();

	const newNodeInsertPosition = ref<XYPosition | null>(null);
	const panelHeight = ref(0);
	const isLogsPanelOpen = useLocalStorage(LOCAL_STORAGE_LOGS_PANEL_OPEN, false);
	const preferPopOutLogsView = ref(false);
	const logsPanelState = computed(() =>
		isLogsPanelOpen.value
			? preferPopOutLogsView.value
				? LOGS_PANEL_STATE.FLOATING
				: LOGS_PANEL_STATE.ATTACHED
			: LOGS_PANEL_STATE.CLOSED,
	);
	const logDetailsPanel = useLocalStorage<LogDetailsPanel>(
		LOCAL_STORAGE_LOGS_PANEL_DETAILS_PANEL,
		LOG_DETAILS_CONTENT.OUTPUT,
		{ writeDefaults: false },
	);
	const telemetry = useTelemetry();

	const nodes = computed<INodeUi[]>(() => workflowStore.allNodes);
	const aiNodes = computed<INodeUi[]>(() =>
		nodes.value.filter((node) => node.type.includes('langchain')),
	);

	function setPanelHeight(height: number) {
		panelHeight.value = height;
	}

	function toggleLogsPanelOpen(isOpen?: boolean) {
		isLogsPanelOpen.value = isOpen ?? !isLogsPanelOpen.value;
	}

	function setPreferPoppedOutLogsView(value: boolean) {
		preferPopOutLogsView.value = value;
	}

	function toggleLogInputOpen(open?: boolean) {
		const wasOpen = [LOG_DETAILS_CONTENT.INPUT, LOG_DETAILS_CONTENT.BOTH].includes(
			logDetailsPanel.value,
		);

		if (open === wasOpen) {
			return;
		}

		logDetailsPanel.value = wasOpen ? LOG_DETAILS_CONTENT.OUTPUT : LOG_DETAILS_CONTENT.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'input',
			newState: wasOpen ? 'hidden' : 'visible',
		});
	}

	function toggleLogOutputOpen(open?: boolean) {
		const wasOpen = [LOG_DETAILS_CONTENT.OUTPUT, LOG_DETAILS_CONTENT.BOTH].includes(
			logDetailsPanel.value,
		);

		if (open === wasOpen) {
			return;
		}

		logDetailsPanel.value = wasOpen ? LOG_DETAILS_CONTENT.INPUT : LOG_DETAILS_CONTENT.BOTH;

		telemetry.track('User toggled log view sub pane', {
			pane: 'output',
			newState: wasOpen ? 'hidden' : 'visible',
		});
	}

	return {
		newNodeInsertPosition,
		isLoading: loadingService.isLoading,
		aiNodes,
		panelHeight: computed(() => panelHeight.value),
		logsPanelState,
		isLogsPanelOpen: computed(() => logsPanelState.value !== LOGS_PANEL_STATE.CLOSED),
		logDetailsPanel: computed(() => logDetailsPanel.value),
		setPanelHeight,
		startLoading: loadingService.startLoading,
		setLoadingText: loadingService.setLoadingText,
		stopLoading: loadingService.stopLoading,
		toggleLogsPanelOpen,
		setPreferPoppedOutLogsView,
		toggleLogInputOpen,
		toggleLogOutputOpen,
	};
});
