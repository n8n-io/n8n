<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { computed, defineAsyncComponent } from 'vue';
import { getMidCanvasPosition } from '@/utils/nodeViewUtils';
import {
	DEFAULT_STICKY_HEIGHT,
	DEFAULT_STICKY_WIDTH,
	FOCUS_PANEL_EXPERIMENT,
	NODE_CREATOR_OPEN_SOURCES,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useUIStore } from '@/stores/ui.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { usePostHog } from '@/stores/posthog.store';
import type {
	AddedNodesAndConnections,
	NodeFilterType,
	NodeTypeSelectedPayload,
	ToggleNodeCreatorOptions,
} from '@/Interface';
import { useActions } from './NodeCreator/composables/useActions';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { useI18n } from '@n8n/i18n';

type Props = {
	nodeViewScale: number;
	createNodeActive?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const LazyNodeCreator = defineAsyncComponent(
	async () => await import('@/components/Node/NodeCreator/NodeCreator.vue'),
);

const props = withDefaults(defineProps<Props>(), {
	createNodeActive: false, // Determines if the node creator is open
});

const emit = defineEmits<{
	addNodes: [value: AddedNodesAndConnections];
	toggleNodeCreator: [value: ToggleNodeCreatorOptions];
}>();

const uiStore = useUIStore();
const focusPanelStore = useFocusPanelStore();
const posthogStore = usePostHog();
const i18n = useI18n();

const { getAddedNodesAndConnections } = useActions();

const isOpenFocusPanelButtonVisible = computed(() => {
	return posthogStore.getVariant(FOCUS_PANEL_EXPERIMENT.name) === FOCUS_PANEL_EXPERIMENT.variant;
});

function openNodeCreator(nodeCreatorView?: NodeFilterType) {
	emit('toggleNodeCreator', {
		source: NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
		createNodeActive: true,
		nodeCreatorView,
	});
}

function addStickyNote() {
	if (document.activeElement) {
		(document.activeElement as HTMLElement).blur();
	}

	const offset: [number, number] = [...uiStore.nodeViewOffsetPosition];

	const position = getMidCanvasPosition(props.nodeViewScale, offset);
	position[0] -= DEFAULT_STICKY_WIDTH / 2;
	position[1] -= DEFAULT_STICKY_HEIGHT / 2;

	emit('addNodes', getAddedNodesAndConnections([{ type: STICKY_NODE_TYPE, position }]));
}

function closeNodeCreator(hasAddedNodes = false) {
	if (props.createNodeActive) {
		emit('toggleNodeCreator', { createNodeActive: false, hasAddedNodes });
	}
}

function nodeTypeSelected(value: NodeTypeSelectedPayload[]) {
	emit('addNodes', getAddedNodesAndConnections(value));
	closeNodeCreator(true);
}
</script>

<template>
	<div :class="$style.fillControls">
		<Suspense>
			<LazyNodeCreator
				:active="createNodeActive"
				@node-type-selected="nodeTypeSelected"
				@close-node-creator="closeNodeCreator"
			/>
		</Suspense>
		<KeyboardShortcutTooltip
			:label="i18n.baseText('nodeView.openNodesPanel')"
			:shortcut="{ keys: ['Tab'] }"
		>
			<n8n-icon-button
				text
				square
				size="large"
				type="tertiary"
				icon="square-plus"
				data-test-id="node-creator-plus-button"
				@click="() => openNodeCreator('Regular')"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip label="AI nodes">
			<n8n-icon-button
				text
				square
				size="large"
				type="tertiary"
				icon="robot"
				@click="() => openNodeCreator('AI')"
			/>
		</KeyboardShortcutTooltip>
		<KeyboardShortcutTooltip label="Action nodes">
			<n8n-icon-button
				text
				square
				size="large"
				type="tertiary"
				icon="globe"
				@click="() => openNodeCreator('Actions')"
			/>
		</KeyboardShortcutTooltip>
	</div>

	<KeyboardShortcutTooltip
		:label="i18n.baseText('nodeView.addStickyHint')"
		:shortcut="{ keys: ['s'], shiftKey: true }"
	>
		<n8n-icon-button
			text
			square
			size="large"
			type="tertiary"
			icon="sticky-note"
			data-test-id="add-sticky-button"
			@click="addStickyNote"
		/>
	</KeyboardShortcutTooltip>
</template>

<style module>
.fillControls {
	position: relative;
	width: fit-content;
	height: fit-content;
}
</style>
