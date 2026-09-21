import { computed, onBeforeUnmount, watch, type ComputedRef, type ShallowRef } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useLogsStore } from '@/app/stores/logs.store';
import { useResizablePanel } from '@n8n/design-system';
import { usePopOutWindow } from '@/features/execution/logs/composables/usePopOutWindow';
import {
	LOGS_PANEL_STATE,
	LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH,
	LOCAL_STORAGE_PANEL_HEIGHT,
	LOCAL_STORAGE_PANEL_WIDTH,
} from '@/features/execution/logs/logs.constants';

const INITIAL_POPUP_HEIGHT = 400;
const COLLAPSED_PANEL_HEIGHT = 32;

export function useLogsPanelLayout(
	workflowName: ComputedRef<string>,
	popOutContainer: Readonly<ShallowRef<HTMLElement | null>>,
	popOutContent: Readonly<ShallowRef<HTMLElement | null>>,
	container: Readonly<ShallowRef<HTMLElement | null>>,
	logsContainer: Readonly<ShallowRef<HTMLElement | null>>,
) {
	const logsStore = useLogsStore();
	const telemetry = useTelemetry();

	const resizer = useResizablePanel({
		container: document.body,
		height: {
			localStorageKey: LOCAL_STORAGE_PANEL_HEIGHT,
			defaultSize: function getDefaultHeight(size) {
				return size * 0.3;
			},
			minSize: 160,
			maxSize: function getMaxHeight(size) {
				return size * 0.75;
			},
			allowCollapse: true,
		},
	});

	const chatPanelResizer = useResizablePanel({
		container,
		width: {
			localStorageKey: LOCAL_STORAGE_PANEL_WIDTH,
			defaultSize: function getDefaultWidth(size) {
				return Math.min(800, size * 0.3);
			},
			minSize: 240,
			maxSize: function getMaxWidth(size) {
				return size * 0.8;
			},
			snap: true,
		},
	});

	const overviewPanelResizer = useResizablePanel({
		container: logsContainer,
		width: {
			localStorageKey: LOCAL_STORAGE_OVERVIEW_PANEL_WIDTH,
			defaultSize: function getDefaultWidth(size) {
				return Math.min(240, size * 0.2);
			},
			minSize: 80,
			maxSize: 500,
			allowFullSize: true,
			snap: true,
		},
	});

	const isOpen = computed(() =>
		logsStore.isOpen
			? !resizer.isCollapsed.value
			: resizer.isResizing.value && resizer.height.value > 0,
	);
	const isCollapsingDetailsPanel = computed(() => overviewPanelResizer.isFullSize.value);
	const popOutWindowTitle = computed(() => `Logs - ${workflowName.value}`);
	const shouldPopOut = computed(() => logsStore.state === LOGS_PANEL_STATE.FLOATING);

	const { canPopOut, isPoppedOut, popOutWindow } = usePopOutWindow({
		title: popOutWindowTitle,
		initialHeight: INITIAL_POPUP_HEIGHT,
		initialWidth: window.document.body.offsetWidth * 0.8,
		container: popOutContainer,
		content: popOutContent,
		shouldPopOut,
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
		if (!resizer.isResizing.value) return;
		if (!logsStore.isOpen && !resizer.isCollapsed.value) {
			handleToggleOpen(true);
		}

		if (resizer.isCollapsed.value) {
			handleToggleOpen(false);
		}
	}

	watch(
		[() => logsStore.state, resizer.height, isPoppedOut],
		([state, height]) => {
			const updatedHeight =
				state === LOGS_PANEL_STATE.FLOATING
					? 0
					: state === LOGS_PANEL_STATE.ATTACHED
						? height
						: COLLAPSED_PANEL_HEIGHT;

			if (state === LOGS_PANEL_STATE.FLOATING) {
				popOutWindow?.value?.document.documentElement.style.setProperty(
					'--logs-panel--height',
					'100vh',
				);
			} else {
				document.documentElement.style.setProperty('--logs-panel--height', `${updatedHeight}px`);
			}

			logsStore.setHeight(updatedHeight);
		},
		{ immediate: true },
	);

	onBeforeUnmount(() => logsStore.setHeight(0));

	return {
		height: resizer.height,
		chatPanelWidth: chatPanelResizer.width,
		overviewPanelWidth: overviewPanelResizer.width,
		canPopOut,
		isOpen,
		isCollapsingDetailsPanel,
		isPoppedOut,
		isOverviewPanelFullWidth: overviewPanelResizer.isFullSize,
		popOutWindow,
		onToggleOpen: handleToggleOpen,
		onPopOut: handlePopOut,
		resizer,
		chatPanelResizer,
		overviewPanelResizer,
		onResizeEnd: handleResizeEnd,
	};
}
