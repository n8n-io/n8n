<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import { getRectOfNodes } from '@vue-flow/core';
import type { GraphNode } from '@vue-flow/core';

import { useCanvasNodeGroupsStore } from '../../../stores/canvasNodeGroups.store';
import { useVueFlowTransformPaneTeleport } from '../../../composables/useVueFlowTransformPaneTeleport';
import { useSelectionValidation } from '@/app/composables/useSelectionValidation';

const TOOLBAR_OFFSET_PX = 12;

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
const groupsStore = useCanvasNodeGroupsStore();
const { isSelectionGroupable, expandSelectionWithSubNodes } = useSelectionValidation();
const { teleportTarget } = useVueFlowTransformPaneTeleport();

const emit = defineEmits<{
	'group-created': [id: string];
}>();

const expandedSelectionIds = computed(() => {
	if (props.readOnly || props.selectedNodes.length < 2) return [];
	return expandSelectionWithSubNodes(props.selectedNodes.map((n) => n.id));
});

const anyMemberGrouped = computed(() =>
	expandedSelectionIds.value.some((id) => groupsStore.getGroupForNode(id) !== undefined),
);

const canGroup = computed(() => {
	if (expandedSelectionIds.value.length < 2) return false;
	if (anyMemberGrouped.value) return false;
	return isSelectionGroupable(expandedSelectionIds.value).valid;
});

const position = computed(() => {
	const rect = getRectOfNodes(props.selectedNodes);
	return {
		left: rect.x + rect.width / 2,
		top: rect.y - TOOLBAR_OFFSET_PX,
	};
});

function onGroupClick() {
	const title = groupsStore.getNextDefaultTitle(i18n.baseText('canvas.nodeGroup.defaultTitle'));
	const group = groupsStore.createGroup(expandedSelectionIds.value, title);
	emit('group-created', group.id);
}
</script>

<template>
	<Teleport :to="teleportTarget" :disabled="!teleportTarget">
		<div
			v-if="canGroup"
			:class="$style.toolbar"
			:style="{
				transform: `translate(${position.left}px, ${position.top}px) translate(-50%, -100%)`,
			}"
			data-test-id="canvas-selection-toolbar"
			@mousedown.stop
		>
			<N8nTooltip placement="top" :content="i18n.baseText('canvas.selection.toolbar.group')">
				<N8nIconButton
					size="small"
					variant="ghost"
					icon="group"
					data-test-id="canvas-selection-toolbar-group"
					:aria-label="i18n.baseText('canvas.selection.toolbar.group')"
					@click.stop="onGroupClick"
				/>
			</N8nTooltip>
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
