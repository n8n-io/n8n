<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton } from '@n8n/design-system';
import { getRectOfNodes } from '@vue-flow/core';
import type { GraphNode } from '@vue-flow/core';

import { useVueFlowTransformPaneTeleport } from '../../../composables/useVueFlowTransformPaneTeleport';
import { useCanvasNodeGroupActions } from '../../../composables/useCanvasNodeGroupActions';
import { useSelectionValidation } from '@/app/composables/useSelectionValidation';

const TOOLBAR_OFFSET_PX = 12;
const GROUP_NODES_SHORTCUT = { metaKey: true, keys: ['G'] };
const EXTRACT_WORKFLOW_SHORTCUT = { altKey: true, keys: ['X'] };

const props = withDefaults(
	defineProps<{
		selectedNodes: GraphNode[];
		readOnly?: boolean;
	}>(),
	{
		readOnly: false,
	},
);

const i18n = useI18n();
const { teleportTarget } = useVueFlowTransformPaneTeleport();
const { isSelectionExtractable } = useSelectionValidation();
const { canGroup, groupSelection } = useCanvasNodeGroupActions(() => props.selectedNodes, {
	readOnly: () => props.readOnly,
});

const emit = defineEmits<{
	'group-created': [id: string];
	'extract-workflow': [ids: string[]];
}>();

const selectedNodeIds = computed(() => props.selectedNodes.map((node) => node.id));

const canExtractWorkflow = computed(
	() => !props.readOnly && isSelectionExtractable(selectedNodeIds.value).valid,
);

const isToolbarVisible = computed(
	() => (canGroup.value || canExtractWorkflow.value) && selectedNodeIds.value.length > 1,
);

const extractWorkflowLabel = computed(() =>
	i18n.baseText('contextMenu.extract', { adjustToNumber: props.selectedNodes.length }),
);

const position = computed(() => {
	const rect = getRectOfNodes(props.selectedNodes);
	return {
		left: rect.x + rect.width / 2,
		top: rect.y - TOOLBAR_OFFSET_PX,
	};
});

function onGroupClick() {
	const group = groupSelection();
	if (group) emit('group-created', group.id);
}

function onExtractWorkflowClick() {
	emit('extract-workflow', selectedNodeIds.value);
}
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<div
			v-if="isToolbarVisible"
			:class="$style.toolbar"
			:style="{
				transform: `translate(${position.left}px, ${position.top}px) translate(-50%, -100%)`,
			}"
			data-test-id="canvas-selection-toolbar"
			@mousedown.stop
		>
			<KeyboardShortcutTooltip
				v-if="canGroup"
				placement="top"
				:label="i18n.baseText('canvas.selection.toolbar.group')"
				:shortcut="GROUP_NODES_SHORTCUT"
			>
				<N8nIconButton
					size="small"
					variant="ghost"
					icon="group"
					icon-size="large"
					data-test-id="canvas-selection-toolbar-group"
					:aria-label="i18n.baseText('canvas.selection.toolbar.group')"
					@click.stop="onGroupClick"
				/>
			</KeyboardShortcutTooltip>
			<KeyboardShortcutTooltip
				v-if="canExtractWorkflow"
				placement="top"
				:label="extractWorkflowLabel"
				:shortcut="EXTRACT_WORKFLOW_SHORTCUT"
			>
				<N8nIconButton
					size="small"
					variant="ghost"
					icon="workflow"
					icon-size="large"
					data-test-id="canvas-selection-toolbar-extract"
					:aria-label="extractWorkflowLabel"
					@click.stop="onExtractWorkflowClick"
				/>
			</KeyboardShortcutTooltip>
		</div>
	</Teleport>
</template>

<style lang="scss" module>
.toolbar {
	position: absolute;
	top: 0;
	left: 0;
	// Matches the design-system $index-popper tier (var.scss) — sits above
	// vue-flow's elevated selected nodes so the per-node hover toolbar can't
	// occlude it.
	z-index: 2000;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	border-radius: var(--radius);
	pointer-events: auto;
}
</style>
