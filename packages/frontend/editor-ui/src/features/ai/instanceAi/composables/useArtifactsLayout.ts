import { useI18n } from '@n8n/i18n';
import { onClickOutside, useLocalStorage } from '@vueuse/core';
import { computed, ref, watch, type Ref, type ShallowRef } from 'vue';

import { LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO } from '@/app/constants';

import type { useCanvasPreview } from '../useCanvasPreview';

/**
 * The artifacts panel and preview layout that both Assistant thread views share,
 * so both show, hide and split the panels alike.
 */

/** From this width, the artifacts panel stays beside the chat. Below it, it shows over the chat. */
export const MIN_WIDTH_FOR_PINNED_ARTIFACTS_PANEL = 900;
const MIN_SPLIT_PANEL_WIDTH = 400;
const DEFAULT_CHAT_PANEL_CONTENT_WIDTH = 800;

type CanvasPreview = ReturnType<typeof useCanvasPreview>;

interface UseArtifactsPanelToggleOptions {
	/** Whether the view is wide enough to keep the panel beside the chat. */
	isInLayout: () => boolean;
	/** Whether the thread has anything for the panel to show. */
	canShow: () => boolean;
	isPreviewVisible: () => boolean;
	/** Hides the panel without changing the user's choice, for example during onboarding. */
	isHidden?: () => boolean;
	panelSlot: Readonly<ShallowRef<HTMLElement | null>>;
	/** The panel toggle button. A click on it does not count as a click outside the panel. */
	toggleSelector: string;
}

/**
 * A wide view keeps the artifacts panel beside the chat until the user hides it.
 * A narrow view shows it over the chat only when the user asks for it.
 */
export function useArtifactsPanelToggle(options: UseArtifactsPanelToggleOptions) {
	const i18n = useI18n();
	const isDismissedInLayout = ref(false);
	const isRevealed = ref(false);

	const showArtifactsPanel = computed(
		() =>
			options.canShow() &&
			!options.isHidden?.() &&
			!options.isPreviewVisible() &&
			(options.isInLayout() ? !isDismissedInLayout.value : isRevealed.value),
	);

	const artifactsPanelToggleLabel = computed(() =>
		i18n.baseText(
			showArtifactsPanel.value
				? 'instanceAi.artifactsPanel.hidePanel'
				: 'instanceAi.artifactsPanel.showPanel',
		),
	);

	function toggleArtifactsPanel(): void {
		if (!options.canShow() || options.isPreviewVisible()) return;
		if (options.isInLayout()) {
			isDismissedInLayout.value = showArtifactsPanel.value;
		} else {
			isRevealed.value = !showArtifactsPanel.value;
		}
	}

	watch(options.isInLayout, (isInLayout) => {
		isRevealed.value = false;
		if (isInLayout) isDismissedInLayout.value = false;
	});
	watch(options.canShow, (canShow) => {
		if (canShow) return;
		isRevealed.value = false;
		isDismissedInLayout.value = false;
	});
	// The preview replaces the panel, so closing the preview does not bring back a panel over the chat.
	watch(
		options.isPreviewVisible,
		(visible) => {
			if (visible) isRevealed.value = false;
		},
		{ flush: 'sync' },
	);

	// A click outside the panel over the chat closes it.
	onClickOutside(
		options.panelSlot,
		() => {
			if (options.isInLayout()) return;
			isRevealed.value = false;
		},
		{ ignore: [options.toggleSelector, '.n8n-tooltip'] },
	);

	return { showArtifactsPanel, artifactsPanelToggleLabel, toggleArtifactsPanel };
}

/**
 * The width of the preview beside the chat. The split is stored as the chat's
 * share of the thread area, so it survives window and sidebar resizes.
 */
export function usePreviewPanelWidth(options: {
	threadAreaWidth: Ref<number>;
	isExpanded: () => boolean;
}) {
	const { threadAreaWidth } = options;
	// -1 = no preference yet.
	const chatPanelWidthRatio = useLocalStorage(
		LOCAL_STORAGE_INSTANCE_AI_CHAT_PANEL_WIDTH_RATIO,
		-1,
		{
			writeDefaults: false,
		},
	);

	// Below two panel minimums the limits meet at half, so both panels share the space evenly.
	const halfThreadAreaWidth = computed(() => Math.round(threadAreaWidth.value / 2));
	const previewMinWidth = computed(() =>
		Math.min(MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value),
	);
	const previewMaxWidth = computed(() =>
		Math.max(threadAreaWidth.value - MIN_SPLIT_PANEL_WIDTH, halfThreadAreaWidth.value),
	);
	const previewPanelWidth = computed(() => {
		const ratio = chatPanelWidthRatio.value;
		const chatPanelWidth =
			ratio >= 0 && ratio <= 1 ? threadAreaWidth.value * ratio : DEFAULT_CHAT_PANEL_CONTENT_WIDTH;
		return Math.round(
			Math.min(
				Math.max(threadAreaWidth.value - chatPanelWidth, previewMinWidth.value),
				previewMaxWidth.value,
			),
		);
	});
	const isPreviewResizeEnabled = computed(
		() => !options.isExpanded() && previewMinWidth.value < previewMaxWidth.value,
	);

	function handlePreviewResize({ width }: { width: number }): void {
		// The wrapper clamps the width, so an unchanged value means the drag hit a limit: keep the stored ratio.
		if (Math.round(width) === previewPanelWidth.value) return;
		chatPanelWidthRatio.value = (threadAreaWidth.value - width) / threadAreaWidth.value;
	}

	return {
		previewMinWidth,
		previewMaxWidth,
		previewPanelWidth,
		isPreviewResizeEnabled,
		handlePreviewResize,
	};
}

/** Closes the preview, or opens it on the selected tab, else the first open tab. */
export function usePreviewToggle(preview: CanvasPreview) {
	const i18n = useI18n();

	const previewToggleLabel = computed(() =>
		i18n.baseText(
			preview.isPreviewVisible.value
				? 'instanceAi.artifactsPanel.hidePreview'
				: 'instanceAi.artifactsPanel.showPreview',
		),
	);

	function togglePreview(): void {
		if (preview.isPreviewVisible.value) {
			preview.closePreview();
			return;
		}
		const tab =
			preview.openTabs.value.find(({ id }) => id === preview.activeTabId.value) ??
			preview.openTabs.value[0];
		if (tab) preview.selectTab(tab.id);
	}

	return { previewToggleLabel, togglePreview };
}
