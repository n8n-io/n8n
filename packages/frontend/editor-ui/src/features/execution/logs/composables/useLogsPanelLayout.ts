import {
	computed,
	inject,
	onBeforeUnmount,
	toValue,
	watch,
	type ComputedRef,
	type ShallowRef,
} from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useLogsStore } from '@/app/stores/logs.store';
import { LogsPanelHostKey } from '@/app/constants/injectionKeys';
import { useResizablePanel } from '@/app/composables/useResizablePanel';
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
	// The host defines where the panel lives and how it persists its height (INS-1192).
	const host = inject(LogsPanelHostKey, {
		context: 'editor',
		heightStorageKey: LOCAL_STORAGE_PANEL_HEIGHT,
	});

	const resizer = useResizablePanel(host.heightStorageKey, {
		container: computed(() => toValue(host.heightContainer) ?? document.body),
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
	const popOutWindowTitle = computed(() => `Logs - ${workflowName.value}`);
	const shouldPopOut = computed(() => logsStore.state === LOGS_PANEL_STATE.FLOATING);

	function trackToggle(newState: 'attached' | 'collapsed' | 'floating') {
		telemetry.track('User toggled log view', {
			new_state: newState,
			source: 'user',
			context: host.context,
		});
	}

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

			trackToggle('attached');
			logsStore.setPreferPoppedOut(false);
		},
	});

	function handleToggleOpen(open?: boolean) {
		const wasOpen = logsStore.isOpen;

		if (open === wasOpen) {
			return;
		}

		logsStore.toggleOpen(open);
		trackToggle(wasOpen ? 'collapsed' : 'attached');
	}

	function handlePopOut() {
		trackToggle('floating');
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
		[() => logsStore.state, resizer.size, isPoppedOut],
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
		height: resizer.size,
		chatPanelWidth: chatPanelResizer.size,
		overviewPanelWidth: overviewPanelResizer.size,
		canPopOut,
		isOpen,
		isCollapsingDetailsPanel,
		isPoppedOut,
		isOverviewPanelFullWidth: overviewPanelResizer.isFullSize,
		popOutWindow,
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
