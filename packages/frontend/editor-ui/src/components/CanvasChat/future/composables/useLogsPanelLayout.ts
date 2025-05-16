import { computed, type ShallowRef } from 'vue';
import {
	LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH,
	LOCAL_STORAGE_PANEL_HEIGHT,
	LOCAL_STORAGE_PANEL_WIDTH,
} from '../../composables/useResize';
import { LOGS_PANEL_STATE } from '../../types/logs';
import { usePiPWindow } from '../../composables/usePiPWindow';
import { useTelemetry } from '@/composables/useTelemetry';
import { watch } from 'vue';
import { useResizablePanel } from '../../../../composables/useResizablePanel';
import { useLogsStore } from '@/stores/logs.store';

export function useLogsPanelLayout(
	pipContainer: Readonly<ShallowRef<HTMLElement | null>>,
	pipContent: Readonly<ShallowRef<HTMLElement | null>>,
	container: Readonly<ShallowRef<HTMLElement | null>>,
	logsContainer: Readonly<ShallowRef<HTMLElement | null>>,
) {
	const logsStore = useLogsStore();
	const telemetry = useTelemetry();

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
		defaultSize: (size) => Math.min(800, size * 0.3),
		minSize: 240,
		maxSize: (size) => size * 0.8,
	});

	const overviewPanelResizer = useResizablePanel(LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH, {
		container: logsContainer,
		defaultSize: (size) => Math.min(240, size * 0.2),
		minSize: 80,
		maxSize: 500,
		allowFullSize: true,
	});

	const isOpen = computed(() =>
		logsStore.isOpen
			? !resizer.isCollapsed.value
			: resizer.isResizing.value && resizer.size.value > 0,
	);
	const isCollapsingDetailsPanel = computed(() => overviewPanelResizer.isFullSize.value);

	const { canPopOut, isPoppedOut, pipWindow } = usePiPWindow({
		initialHeight: 400,
		initialWidth: window.document.body.offsetWidth * 0.8,
		container: pipContainer,
		content: pipContent,
		shouldPopOut: computed(() => logsStore.state === LOGS_PANEL_STATE.FLOATING),
		onRequestClose: () => {
			if (!isOpen.value) {
				return;
			}

			telemetry.track('User toggled log view', { new_state: 'attached' });
			logsStore.setPreferPoppedOut(false);
		},
	});

	function handleToggleOpen(open?: boolean) {
		const wasOpen = logsStore.isOpen;

		if (open === wasOpen) {
			return;
		}

		logsStore.toggleOpen(open);

		telemetry.track('User toggled log view', {
			new_state: wasOpen ? 'collapsed' : 'attached',
		});
	}

	function handlePopOut() {
		telemetry.track('User toggled log view', { new_state: 'floating' });
		logsStore.toggleOpen(true);
		logsStore.setPreferPoppedOut(true);
	}

	function handleResizeEnd() {
		if (!logsStore.isOpen && !resizer.isCollapsed.value) {
			handleToggleOpen(true);
		}

		if (resizer.isCollapsed.value) {
			handleToggleOpen(false);
		}

		resizer.onResizeEnd();
	}

	watch(
		[() => logsStore.state, resizer.size],
		([state, height]) => {
			logsStore.setHeight(
				state === LOGS_PANEL_STATE.FLOATING
					? 0
					: state === LOGS_PANEL_STATE.ATTACHED
						? height
						: 32 /* collapsed panel height */,
			);
		},
		{ immediate: true },
	);

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
