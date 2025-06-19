<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { CanvasNodeRenderType } from '@/types';
import { useCanvas } from '@/composables/useCanvas';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
	update: [parameters: Record<string, unknown>];
	'open:contextmenu': [event: MouseEvent];
}>();

const props = defineProps<{
	readOnly?: boolean;
}>();

const $style = useCssModule();
const i18n = useI18n();

const { isExecuting } = useCanvas();
const { isDisabled, render, name } = useCanvasNode();

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();

const node = computed(() => !!name.value && workflowsStore.getNodeByName(name.value));
const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const nodeDisabledTitle = computed(() => {
	return isDisabled.value ? i18n.baseText('node.enable') : i18n.baseText('node.disable');
});

const isStickyColorSelectorOpen = ref(false);
const isHovered = ref(false);

const classes = computed(() => ({
	[$style.canvasNodeToolbar]: true,
	[$style.readOnly]: props.readOnly,
	[$style.forceVisible]: isHovered.value || isStickyColorSelectorOpen.value,
}));

const isExecuteNodeVisible = computed(() => {
	return (
		!props.readOnly &&
		render.value.type === CanvasNodeRenderType.Default &&
		'configuration' in render.value.options &&
		(!render.value.options.configuration || isToolNode.value)
	);
});

const isDisableNodeVisible = computed(() => {
	return !props.readOnly && render.value.type === CanvasNodeRenderType.Default;
});

const isDeleteNodeVisible = computed(() => !props.readOnly);

const isStickyNoteChangeColorVisible = computed(
	() => !props.readOnly && render.value.type === CanvasNodeRenderType.StickyNote,
);

function executeNode() {
	emit('run');
}

function onToggleNode() {
	emit('toggle');
}

function onDeleteNode() {
	emit('delete');
}

function onChangeStickyColor(color: number) {
	emit('update', {
		color,
	});
}

function onOpenContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

function onMouseEnter() {
	isHovered.value = true;
}

function onMouseLeave() {
	isHovered.value = false;
}
</script>

<template>
	<div
		data-test-id="canvas-node-toolbar"
		:class="classes"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
	>
		<div :class="$style.canvasNodeToolbarItems">
			<N8nTooltip
				placement="top"
				:disabled="!isDisabled"
				:content="i18n.baseText('ndv.execute.deactivated')"
			>
				<N8nIconButton
					v-if="isExecuteNodeVisible"
					data-test-id="execute-node-button"
					type="tertiary"
					text
					size="small"
					icon="play"
					:disabled="isExecuting || isDisabled"
					:title="i18n.baseText('node.testStep')"
					@click="executeNode"
				/>
			</N8nTooltip>
			<N8nIconButton
				v-if="isDisableNodeVisible"
				data-test-id="disable-node-button"
				type="tertiary"
				text
				size="small"
				icon="power-off"
				:title="nodeDisabledTitle"
				@click="onToggleNode"
			/>
			<N8nIconButton
				v-if="isDeleteNodeVisible"
				data-test-id="delete-node-button"
				type="tertiary"
				size="small"
				text
				icon="trash"
				:title="i18n.baseText('node.delete')"
				@click="onDeleteNode"
			/>
			<CanvasNodeStickyColorSelector
				v-if="isStickyNoteChangeColorVisible"
				v-model:visible="isStickyColorSelectorOpen"
				@update="onChangeStickyColor"
			/>
			<N8nIconButton
				data-test-id="overflow-node-button"
				type="tertiary"
				size="small"
				text
				icon="ellipsis-h"
				@click="onOpenContextMenu"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.canvasNodeToolbar {
	padding-bottom: var(--spacing-xs);
	display: flex;
	justify-content: flex-end;
	width: 100%;
}

.canvasNodeToolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color-canvas-background);
	border-radius: var(--border-radius-base);

	:global(.button) {
		--button-font-color: var(--color-text-light);
	}
}

.forceVisible {
	opacity: 1 !important;
}
</style>
