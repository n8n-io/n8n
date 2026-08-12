<script setup lang="ts">
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useInjectWorkflowId } from '@/app/composables/useInjectWorkflowId';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useTelemetryContext } from '@/app/composables/useTelemetryContext';
import { computed, onMounted, watch, useTemplateRef, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useVueFlow } from '@vue-flow/core';
import { useActiveElement, useThrottleFn } from '@vueuse/core';
import { type CanvasNode, CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { type ContextMenuAction } from '@/features/shared/contextMenu/composables/useContextMenuItems';
import type { INodeUi, ResizeData } from '@/Interface';
import { N8nResizeWrapper } from '@n8n/design-system';
import FocusSidebarTabs from '@/features/setupPanel/components/FocusSidebarTabs.vue';
import SetupPanel from '@/features/setupPanel/components/SetupPanel.vue';
import FocusPanel from '@/app/components/FocusPanel.vue';
import TestsPanel from '@/features/ai/evaluation.ee/components/Tests/TestsPanel.vue';
import EvaluationsPaywall from '@/features/ai/evaluation.ee/components/Paywall/EvaluationsPaywall.vue';
import { useEvaluationsWizardSidepanelExperiment } from '@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment';
import { useEvaluationsLicense } from '@/features/ai/evaluation.ee/composables/useEvaluationsLicense';

defineOptions({ name: 'FocusSidebar' });

defineProps<{
	isCanvasReadOnly: boolean;
}>();

const emit = defineEmits<{
	contextMenuAction: [action: ContextMenuAction, nodeIds: string[]];
}>();

const wrapperRef = useTemplateRef('wrapper');

const workflowId = useInjectWorkflowId();
const focusPanelStore = useFocusPanelStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const experimentalNdvStore = useExperimentalNdvStore();
const setupPanelStore = useSetupPanelStore();
const telemetry = useTelemetry();
const deviceSupport = useDeviceSupport();
const vueFlow = useVueFlow(workflowId.value);
const activeElement = useActiveElement();
const lastTrackedNodeId = ref<string>();

useTelemetryContext({ view_shown: 'focus_panel' });

const { selectedTab } = storeToRefs(focusPanelStore);
const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);
const focusPanelWidth = computed(() => focusPanelStore.focusPanelWidth);
const resolvedParameter = computed(() => focusPanelStore.resolvedParameter);
const sidebarWidth = computed(() =>
	experimentalNdvStore.isNdvInFocusPanelEnabled
		? experimentalNdvStore.nodePanelWidth
		: focusPanelWidth.value,
);

const isSetupPanelEnabled = computed(() => setupPanelStore.isFeatureEnabled);
const { isFeatureEnabled: isEvaluationsWizardSidepanelEnabled } =
	useEvaluationsWizardSidepanelExperiment();
const { isLicensed, isResolved, ensureLicenseLoaded } = useEvaluationsLicense();

const showSetupPanel = computed(
	() => setupPanelStore.isFeatureEnabled && selectedTab.value === 'setup',
);
// The panel is shown regardless of whether the workflow has an AI node yet — the
// "add a node first" empty state is handled inside TestsPanel.
const showEvaluationsPanel = computed(
	() =>
		isEvaluationsWizardSidepanelEnabled.value &&
		selectedTab.value === 'evaluations' &&
		isResolved.value &&
		isLicensed.value,
);
const showEvaluationsPaywall = computed(
	() =>
		isEvaluationsWizardSidepanelEnabled.value &&
		selectedTab.value === 'evaluations' &&
		isResolved.value &&
		!isLicensed.value,
);

// Spike (anchored mode): place the panel beside the selected node rather than
// pinned to the right edge, to see whether staying next to the node survives
// tall nodes and canvas panning.
const ANCHOR_GAP = 16;
const ANCHOR_MARGIN = 8;

const isAnchored = computed(
	() => experimentalNdvStore.isNdvInFocusPanelEnabled && experimentalNdvStore.isPanelAnchored,
);

const anchorStyle = computed(() => {
	if (!isAnchored.value) return undefined;

	const selected = vueFlow.getSelectedNodes.value[0];
	const { x, y, zoom } = vueFlow.viewport.value;
	const host = wrapperRef.value?.parentElement;
	if (!selected || !host) return undefined;

	const hostRect = host.getBoundingClientRect();
	const nodeLeft = selected.computedPosition.x * zoom + x;
	const nodeTop = selected.computedPosition.y * zoom + y;
	const nodeWidth = (selected.dimensions?.width ?? 0) * zoom;

	// Prefer the right of the node; flip left when it would overflow the canvas.
	const rightOf = nodeLeft + nodeWidth + ANCHOR_GAP;
	const left =
		rightOf + sidebarWidth.value + ANCHOR_MARGIN > hostRect.width
			? Math.max(ANCHOR_MARGIN, nodeLeft - sidebarWidth.value - ANCHOR_GAP)
			: rightOf;

	// Cap the height so a filter-heavy node can't push the panel off-screen.
	const maxHeight = Math.max(240, hostRect.height * 0.75);
	const top = Math.min(
		Math.max(ANCHOR_MARGIN, nodeTop),
		Math.max(ANCHOR_MARGIN, hostRect.height - maxHeight - ANCHOR_MARGIN),
	);

	return {
		top: `${top}px`,
		left: `${left}px`,
		bottom: 'auto',
		right: 'auto',
		height: 'auto',
		maxHeight: `${maxHeight}px`,
	};
});

const node = computed<INodeUi | undefined>(() => {
	if (!experimentalNdvStore.isNdvInFocusPanelEnabled || resolvedParameter.value) {
		return resolvedParameter.value?.node;
	}

	const selected: CanvasNode | undefined = vueFlow.getSelectedNodes.value[0];

	return selected?.data?.render.type === CanvasNodeRenderType.Default
		? (workflowDocumentStore?.value?.allNodes ?? []).find((n) => n.id === selected.id)
		: undefined;
});

// The Node Panel owns its own tabs. Keep the shared sidebar tabs for setup and
// evaluations surfaces when the Node Panel itself is not visible.
const isNodePanelActive = computed(
	() =>
		experimentalNdvStore.isNdvInFocusPanelEnabled &&
		selectedTab.value === 'focus' &&
		!!node.value &&
		!resolvedParameter.value,
);
const showTabs = computed(
	() =>
		(isSetupPanelEnabled.value || isEvaluationsWizardSidepanelEnabled.value) &&
		!isNodePanelActive.value,
);

const labelOverrides = computed(() => {
	const focusLabel = resolvedParameter.value?.parameter.displayName ?? node.value?.name;
	return focusLabel ? { focus: focusLabel } : undefined;
});

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 's' && deviceSupport.isCtrlKeyPressed(event)) {
		event.stopPropagation();
		event.preventDefault();
		return;
	}

	if (
		experimentalNdvStore.isNdvInFocusPanelEnabled &&
		event.key === 'Escape' &&
		selectedTab.value === 'focus' &&
		node.value &&
		activeElement.value instanceof HTMLElement &&
		!wrapperRef.value?.contains(activeElement.value)
	) {
		if (activeElement.value.matches('input, textarea, [contenteditable="true"]')) {
			activeElement.value.blur();
		} else if (experimentalNdvStore.isMapperPinned) {
			experimentalNdvStore.setMapperPinned(false);
		} else {
			vueFlow.removeSelectedNodes(vueFlow.getSelectedNodes.value);
			focusPanelStore.closeFocusPanel();
		}
		event.stopPropagation();
		event.preventDefault();
		return;
	}

	if (
		experimentalNdvStore.isNdvInFocusPanelEnabled &&
		event.key === 'Enter' &&
		activeElement.value instanceof HTMLElement &&
		!wrapperRef.value?.contains(activeElement.value)
	) {
		const firstField = wrapperRef.value?.querySelector<HTMLElement>(
			'input:not([disabled]), textarea:not([disabled]), [role="combobox"]:not([aria-disabled="true"])',
		);
		if (firstField) {
			event.preventDefault();
			firstField.focus();
		}
	}
}

const registerKeyboardListener = () => {
	document.addEventListener('keydown', handleKeydown, true);
};

const unregisterKeyboardListener = () => {
	document.removeEventListener('keydown', handleKeydown, true);
};

watch(
	() => focusPanelStore.focusPanelActive,
	(newValue) => {
		if (newValue) {
			registerKeyboardListener();
		} else {
			unregisterKeyboardListener();
		}
	},
	{ immediate: true },
);

watch(activeElement, (active) => {
	if (!node.value || !active || !wrapperRef.value?.contains(active)) {
		return;
	}

	const path = active.closest('.parameter-input')?.getAttribute('data-parameter-path');

	if (!path) {
		return;
	}

	telemetry.track('User focused focus panel', {
		node_id: node.value.id,
		node_type: node.value.type,
		parameter_path: path,
	});
});

function onResize(event: ResizeData) {
	if (experimentalNdvStore.isNdvInFocusPanelEnabled) {
		experimentalNdvStore.updateNodePanelWidth(event.width);
		return;
	}

	focusPanelStore.updateWidth(event.width);
}

const onResizeThrottle = useThrottleFn(onResize, 10);

function onContextMenuAction(action: ContextMenuAction, nodeIds: string[]) {
	emit('contextMenuAction', action, nodeIds);
}

onMounted(() => {
	void ensureLicenseLoaded();
});

watch(
	[
		() => experimentalNdvStore.isNdvInFocusPanelEnabled,
		() => vueFlow.getSelectedNodes.value.map(({ id }) => id).join('|'),
	],
	([isEnabled]) => {
		if (!isEnabled || resolvedParameter.value) return;

		const selectedNodes = vueFlow.getSelectedNodes.value.filter(
			(selectedNode) => selectedNode.data.render.type === CanvasNodeRenderType.Default,
		);
		if (selectedNodes.length === 1) {
			if (focusPanelStore.focusPanelActive && focusPanelStore.selectedTab !== 'focus') return;
			const selectedNode = selectedNodes[0];
			if (!selectedNode) return;
			if (lastTrackedNodeId.value !== selectedNode.id) {
				lastTrackedNodeId.value = selectedNode.id;
				telemetry.track('User opened focus panel', {
					source: 'nodeSelection',
					parameters: [
						{
							nodeId: selectedNode.id,
							nodeType: node.value?.type ?? 'unresolved',
							parameterPath: '',
						},
					],
				});
			}

			focusPanelStore.setSelectedTab('focus');
			focusPanelStore.openFocusPanel();
		} else if (focusPanelStore.selectedTab === 'focus') {
			lastTrackedNodeId.value = undefined;
			focusPanelStore.closeFocusPanel();
		}
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	unregisterKeyboardListener();
});
</script>

<template>
	<div
		v-if="focusPanelActive"
		ref="wrapper"
		data-test-id="focus-sidebar"
		:class="[
			$style.wrapper,
			'ignore-key-press-canvas',
			{
				[$style.isNdvInFocusPanelEnabled]: experimentalNdvStore.isNdvInFocusPanelEnabled,
				[$style.isAnchored]: isAnchored,
			},
		]"
		:style="anchorStyle"
		@keydown.stop
	>
		<N8nResizeWrapper
			:width="sidebarWidth"
			:supported-directions="['left']"
			:min-width="experimentalNdvStore.isNdvInFocusPanelEnabled || isSetupPanelEnabled ? 420 : 300"
			:max-width="1000"
			:grid-size="8"
			:style="{
				width: `${sidebarWidth}px`,
				'--n8n--node-panel-width': `${sidebarWidth}px`,
			}"
			@resize="onResizeThrottle"
		>
			<div :class="$style.container">
				<div v-if="showTabs">
					<FocusSidebarTabs v-model="selectedTab" :tab-labels="labelOverrides" />
				</div>
				<div v-if="showSetupPanel" :class="$style['setup-panel-wrapper']">
					<SetupPanel />
				</div>
				<div v-else-if="showEvaluationsPanel" :class="$style['setup-panel-wrapper']">
					<TestsPanel />
				</div>
				<div
					v-else-if="showEvaluationsPaywall"
					:class="[$style['setup-panel-wrapper'], $style['evaluations-paywall-wrapper']]"
				>
					<EvaluationsPaywall />
				</div>
				<FocusPanel
					v-else
					:is-canvas-read-only="isCanvasReadOnly"
					@context-menu-action="onContextMenuAction"
				/>
			</div>
		</N8nResizeWrapper>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: row;
	flex-wrap: nowrap;
	border-left: 1px solid var(--color--foreground);
	background: var(--color--background--light-3);
	overflow: hidden;
	height: 100%;
	flex-grow: 0;
	flex-shrink: 0;

	&.isNdvInFocusPanelEnabled {
		position: absolute;
		inset: 0 0 0 auto;
		z-index: 2;
		border-left-color: var(--border-color);
		background: var(--background--surface);
		box-shadow: var(--shadow--md);
		overflow: visible;
	}

	// Spike: anchored to the selected node. Geometry comes from inline styles.
	&.isAnchored {
		inset: auto;
		border: 1px solid var(--border-color);
		border-radius: var(--radius--lg);
		overflow: hidden;
	}
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
}

.setup-panel-wrapper {
	display: flex;
	flex-direction: column;
	height: calc(100% - 36px);
	width: 100%;
}

// The paywall renders a bare action box; unlike the setup/tests panels it has no
// internal padding, so inset it from the panel edges here.
.evaluations-paywall-wrapper {
	padding: var(--spacing--sm);
}
</style>
