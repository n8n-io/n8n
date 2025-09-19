<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { CanvasNodeRenderType } from '@/types';
import { useCanvas } from '@/composables/useCanvas';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useExperimentalNdvStore } from '../../experimental/experimentalNdv.store';
import CanvasNodeStatusIcons from '@/components/canvas/elements/nodes/render-types/parts/CanvasNodeStatusIcons.vue';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
	update: [parameters: Record<string, unknown>];
	'open:contextmenu': [event: MouseEvent];
	focus: [id: string];
}>();

const props = defineProps<{
	readOnly?: boolean;
	showStatusIcons: boolean;
	itemsClass: string;
}>();

const $style = useCssModule();
const i18n = useI18n();

const { isExecuting, isExperimentalNdvActive } = useCanvas();
const { isDisabled, render, name } = useCanvasNode();

const workflowsStore = useWorkflowsStore();
const nodeTypesStore = useNodeTypesStore();
const experimentalNdvStore = useExperimentalNdvStore();

const node = computed(() => (name.value ? workflowsStore.getNodeByName(name.value) : null));
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
	[$style.isExperimentalNdvActive]: isExperimentalNdvActive.value,
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

const isFocusNodeVisible = computed(() => experimentalNdvStore.isZoomedViewEnabled);

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

function onFocusNode() {
	if (node.value) {
		emit('focus', node.value.id);
	}
}
</script>

<template>
	<div
		data-test-id="canvas-node-toolbar"
		:class="classes"
		@mouseenter="onMouseEnter"
		@mouseleave="onMouseLeave"
		@mousedown.stop
		@click.stop
	>
		<div :class="[$style.canvasNodeToolbarItems, itemsClass]">
			<N8nTooltip
				v-if="isExecuteNodeVisible"
				placement="top"
				:disabled="!isDisabled"
				:content="i18n.baseText('ndv.execute.deactivated')"
			>
				<N8nIconButton
					data-test-id="execute-node-button"
					type="tertiary"
					text
					size="small"
					icon="node-play"
					:disabled="isExecuting || isDisabled"
					:title="i18n.baseText('node.testStep')"
					@click.stop="executeNode"
				/>
			</N8nTooltip>
			<N8nIconButton
				v-if="isDisableNodeVisible"
				data-test-id="disable-node-button"
				type="tertiary"
				text
				size="small"
				icon="node-power"
				:title="nodeDisabledTitle"
				@click.stop="onToggleNode"
			/>
			<N8nIconButton
				v-if="isDeleteNodeVisible"
				data-test-id="delete-node-button"
				type="tertiary"
				size="small"
				text
				icon="node-trash"
				:title="i18n.baseText('node.delete')"
				@click.stop="onDeleteNode"
			/>
			<N8nIconButton
				v-if="isFocusNodeVisible"
				type="tertiary"
				size="small"
				text
				icon="crosshair"
				@click.stop="onFocusNode"
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
				icon="node-ellipsis"
				@click.stop="onOpenContextMenu"
			/>
		</div>
		<CanvasNodeStatusIcons
			v-if="showStatusIcons"
			:class="$style.statusIcons"
			spinner-layout="static"
		/>
	</div>
</template>

<style lang="scss" module>
.canvasNodeToolbar {
	padding-bottom: var(--spacing-xs);
	display: flex;
	justify-content: flex-end;
	width: 100%;
	cursor: default;

	&.isExperimentalNdvActive {
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--spacing-3xs);
		zoom: var(--canvas-zoom-compensation-factor, 1);
		margin-bottom: var(--spacing-2xs);
	}
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

.statusIcons {
	margin-inline-end: var(--spacing-3xs);
}
</style>
