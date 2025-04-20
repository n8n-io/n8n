import { computed, type ShallowRef } from 'vue';
import {
	LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH,
	LOCAL_STORAGE_PANEL_HEIGHT,
	LOCAL_STORAGE_PANEL_WIDTH,
} from '../../composables/useResize';
import { LOGS_PANEL_STATE } from '../../types/logs';
import { usePiPWindow } from '../../composables/usePiPWindow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useCanvasStore } from '@/stores/canvas.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { watch } from 'vue';
import { useResizablePanel } from './useResizablePanel';

export function useLayout(
	pipContainer: Readonly<ShallowRef<HTMLElement | null>>,
	pipContent: Readonly<ShallowRef<HTMLElement | null>>,
	container: Readonly<ShallowRef<HTMLElement | null>>,
	logsContainer: Readonly<ShallowRef<HTMLElement | null>>,
) {
	const canvasStore = useCanvasStore();
	const telemetry = useTelemetry();
	const workflowsStore = useWorkflowsStore();
	const panelState = computed(() => workflowsStore.logsPanelState);

	const resizer = useResizablePanel(LOCAL_STORAGE_PANEL_HEIGHT, {
		container: document.body,
		position: 'bottom',
		snap: false,
		defaultSize: (size) => size * 0.3,
		minSize: 160,
		maxSize: (size) => size * 0.75,
		allowCollapse: true,
	});

	const chatPanelResizer = useResizablePanel(LOCAL_STORAGE_PANEL_WIDTH, {
		container,
		defaultSize: (size) => size * 0.3,
		minSize: 300,
		maxSize: (size) => size * 0.8,
	});

	const overviewPanelResizer = useResizablePanel(LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH, {
		container: logsContainer,
		defaultSize: (size) => size * 0.3,
		minSize: 80,
		maxSize: 500,
		allowFullSize: true,
	});

	const isOpen = computed(() =>
		panelState.value === LOGS_PANEL_STATE.CLOSED
			? resizer.isResizing.value && resizer.size.value > 0
			: !resizer.isCollapsed.value,
	);
	const isCollapsingDetailsPanel = computed(() => overviewPanelResizer.isFullSize.value);

	const { canPopOut, isPoppedOut, pipWindow } = usePiPWindow({
		initialHeight: 400,
		initialWidth: window.document.body.offsetWidth * 0.8,
		container: pipContainer,
		content: pipContent,
		shouldPopOut: computed(() => panelState.value === LOGS_PANEL_STATE.FLOATING),
		onRequestClose: () => {
			if (!isOpen.value) {
				return;
			}

			telemetry.track('User toggled log view', { new_state: 'attached' });
			workflowsStore.setPreferPoppedOutLogsView(false);
		},
	});

	function handleToggleOpen(open?: boolean) {
		const wasOpen = panelState.value !== LOGS_PANEL_STATE.CLOSED;

		if (open === wasOpen) {
			return;
		}

		workflowsStore.toggleLogsPanelOpen(open);

		telemetry.track('User toggled log view', {
			new_state: wasOpen ? 'collapsed' : 'attached',
		});
	}

	function handlePopOut() {
		telemetry.track('User toggled log view', { new_state: 'floating' });
		workflowsStore.toggleLogsPanelOpen(true);
		workflowsStore.setPreferPoppedOutLogsView(true);
	}

	function handleResizeEnd() {
		if (panelState.value === LOGS_PANEL_STATE.CLOSED && !resizer.isCollapsed.value) {
			handleToggleOpen(true);
		}

		if (resizer.isCollapsed.value) {
			handleToggleOpen(false);
		}

		resizer.onResizeEnd();
	}

	watch([panelState, resizer.size], ([state, height]) => {
		canvasStore.setPanelHeight(
			state === LOGS_PANEL_STATE.FLOATING
				? 0
				: state === LOGS_PANEL_STATE.ATTACHED
					? height
					: 32 /* collapsed panel height */,
		);
	});

	return {
		height: resizer.size,
		chatPanelWidth: chatPanelResizer.size,
		overviewPanelWidth: overviewPanelResizer.size,
		canPopOut,
		isOpen,
		isCollapsingDetailsPanel,
		isPoppedOut,
		isOverviewPanelFullWidth: overviewPanelResizer.isFullSize,
		pipWindow,
		onToggleOpen: handleToggleOpen,
		onPopOut: handlePopOut,
		onResize: resizer.onResize,
		onResizeEnd: handleResizeEnd,
		onChatPanelResize: chatPanelResizer.onResize,
		onChatPanelResizeEnd: chatPanelResizer.onResizeEnd,
		onOverviewPanelResize: overviewPanelResizer.onResize,
		onOverviewPanelResizeEnd: overviewPanelResizer.onResizeEnd,
	};
}
