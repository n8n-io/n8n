<script setup lang="ts">
import { useFocusPanelStore } from '@/app/stores/focusPanel.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useExperimentalNdvStore } from '@/features/workflows/canvas/experimental/experimentalNdv.store';
import { useSetupPanelStore } from '@/features/setupPanel/setupPanel.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useTelemetryContext } from '@/app/composables/useTelemetryContext';
import { computed, watch, useTemplateRef, onBeforeUnmount } from 'vue';
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

defineOptions({ name: 'FocusSidebar' });

defineProps<{
	isCanvasReadOnly: boolean;
}>();

const emit = defineEmits<{
	contextMenuAction: [action: ContextMenuAction, nodeIds: string[]];
}>();

const wrapperRef = useTemplateRef('wrapper');

const focusPanelStore = useFocusPanelStore();
const workflowsStore = useWorkflowsStore();
const experimentalNdvStore = useExperimentalNdvStore();
const setupPanelStore = useSetupPanelStore();
const telemetry = useTelemetry();
const deviceSupport = useDeviceSupport();
const vueFlow = useVueFlow(workflowsStore.workflowId);
const activeElement = useActiveElement();

useTelemetryContext({ view_shown: 'focus_panel' });

const { selectedTab } = storeToRefs(focusPanelStore);
const focusPanelActive = computed(() => focusPanelStore.focusPanelActive);
const focusPanelWidth = computed(() => focusPanelStore.focusPanelWidth);
const resolvedParameter = computed(() => focusPanelStore.resolvedParameter);

const isSetupPanelEnabled = computed(() => setupPanelStore.isFeatureEnabled);

const showSetupPanel = computed(
	() => setupPanelStore.isFeatureEnabled && selectedTab.value === 'setup',
);

const node = computed<INodeUi | undefined>(() => {
	if (!experimentalNdvStore.isNdvInFocusPanelEnabled || resolvedParameter.value) {
		return resolvedParameter.value?.node;
	}

	const selected: CanvasNode | undefined = vueFlow.getSelectedNodes.value[0];

	return selected?.data?.render.type === CanvasNodeRenderType.Default
		? workflowsStore.allNodes.find((n) => n.id === selected.id)
		: undefined;
});

const labelOverrides = computed(() => {
	const focusLabel = resolvedParameter.value?.parameter.displayName ?? node.value?.name;
	return focusLabel ? { focus: focusLabel } : undefined;
});

function handleKeydown(event: KeyboardEvent) {
	if (event.key === 's' && deviceSupport.isCtrlKeyPressed(event)) {
		event.stopPropagation();
		event.preventDefault();
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
	focusPanelStore.updateWidth(event.width);
}

const onResizeThrottle = useThrottleFn(onResize, 10);

function onContextMenuAction(action: ContextMenuAction, nodeIds: string[]) {
	emit('contextMenuAction', action, nodeIds);
}

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
			{ [$style.isNdvInFocusPanelEnabled]: experimentalNdvStore.isNdvInFocusPanelEnabled },
		]"
		@keydown.stop
	>
		<N8nResizeWrapper
			:width="focusPanelWidth"
			:supported-directions="['left']"
			:min-width="isSetupPanelEnabled ? 420 : 300"
			:max-width="experimentalNdvStore.isNdvInFocusPanelEnabled ? undefined : 1000"
			:grid-size="8"
			:style="{ width: `${focusPanelWidth}px` }"
			@resize="onResizeThrottle"
		>
			<div :class="$style.container">
				<div v-if="isSetupPanelEnabled">
					<FocusSidebarTabs v-model="selectedTab" :tab-labels="labelOverrides" />
				</div>
				<div v-if="showSetupPanel" :class="$style['setup-panel-wrapper']">
					<SetupPanel />
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
}

.container {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.setup-panel-wrapper {
	display: flex;
	flex-direction: column;
	height: calc(100% - 36px);
	width: 100%;
}
</style>
