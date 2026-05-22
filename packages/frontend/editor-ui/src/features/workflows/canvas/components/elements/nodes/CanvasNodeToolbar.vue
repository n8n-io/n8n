<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import type { CanvasNodeData, CanvasNodeEventBusEvents } from '../../../canvas.types';
import { CanvasNodeRenderType } from '../../../canvas.types';
import { useCanvas } from '../../../composables/useCanvas';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useExperimentalNdvStore } from '../../../experimental/experimentalNdv.store';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import CanvasNodeStatusIcons from './render-types/parts/CanvasNodeStatusIcons.vue';

import { N8nIconButton, N8nTooltip } from '@n8n/design-system';
import CanvasNodeStickyColorSelector from './toolbar/CanvasNodeStickyColorSelector.vue';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
	update: [parameters: Record<string, unknown>];
	'open:contextmenu': [event: MouseEvent];
	focus: [id: string];
	'add:ai': [id: string];
}>();

const props = withDefaults(
	defineProps<{
		readOnly?: boolean;
		canExecute?: boolean;
		showStatusIcons: boolean;
		itemsClass: string;
		name: string;
		type: string;
		disabled: boolean;
		render: CanvasNodeData['render'];
		issues: CanvasNodeData['issues'];
		execution: CanvasNodeData['execution'];
		runData: CanvasNodeData['runData'];
		eventBus: EventBus<CanvasNodeEventBusEvents>;
	}>(),
	{
		canExecute: false,
	},
);

const $style = useCssModule();
const i18n = useI18n();

const { isExecuting, isExperimentalNdvActive } = useCanvas();

const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const experimentalNdvStore = useExperimentalNdvStore();
const focusedNodesStore = useFocusedNodesStore();

const node = computed(() =>
	props.name ? workflowDocumentStore?.value?.getNodeByName(props.name) : null,
);
const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const nodeDisabledTitle = computed(() => {
	return props.disabled ? i18n.baseText('node.enable') : i18n.baseText('node.disable');
});

const dirtiness = computed(() =>
	props.render.type === CanvasNodeRenderType.Default ? props.render.options.dirtiness : undefined,
);

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
		(!props.readOnly || props.canExecute) &&
		props.render.type === CanvasNodeRenderType.Default &&
		'configuration' in props.render.options &&
		(!props.render.options.configuration || isToolNode.value)
	);
});

const isDisableNodeVisible = computed(() => {
	return !props.readOnly && props.render.type === CanvasNodeRenderType.Default;
});

const isDeleteNodeVisible = computed(() => !props.readOnly);

const isFocusNodeVisible = computed(() => experimentalNdvStore.isZoomedViewEnabled);

const isAddToAiVisible = computed(() => !props.readOnly && focusedNodesStore.isFeatureEnabled);

const isStickyNoteChangeColorVisible = computed(
	() => !props.readOnly && props.render.type === CanvasNodeRenderType.StickyNote,
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

function onChangeStickyColor(color: number | string) {
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

function onAddToAi() {
	if (node.value) {
		emit('add:ai', node.value.id);
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
				:disabled="!disabled"
				:content="i18n.baseText('ndv.execute.deactivated')"
			>
				<N8nIconButton
					variant="ghost"
					data-test-id="execute-node-button"
					size="small"
					icon="node-play"
					:disabled="isExecuting || disabled"
					:title="i18n.baseText('node.testStep')"
					@click.stop="executeNode"
				/>
			</N8nTooltip>
			<N8nIconButton
				variant="ghost"
				v-if="isDisableNodeVisible"
				data-test-id="disable-node-button"
				size="small"
				icon="node-power"
				:title="nodeDisabledTitle"
				@click.stop="onToggleNode"
			/>
			<N8nIconButton
				variant="ghost"
				v-if="isDeleteNodeVisible"
				data-test-id="delete-node-button"
				size="small"
				icon="node-trash"
				:title="i18n.baseText('node.delete')"
				@click.stop="onDeleteNode"
			/>
			<N8nIconButton
				variant="ghost"
				v-if="isFocusNodeVisible"
				size="small"
				icon="crosshair"
				:aria-label="i18n.baseText('node.focusNode')"
				@click.stop="onFocusNode"
			/>
			<CanvasNodeStickyColorSelector
				v-if="isStickyNoteChangeColorVisible"
				v-model:visible="isStickyColorSelectorOpen"
				:render="render"
				:event-bus="eventBus"
				@update="onChangeStickyColor"
			/>
			<N8nTooltip v-if="isAddToAiVisible" placement="top" :content="i18n.baseText('node.addToAi')">
				<N8nIconButton
					data-test-id="add-to-ai-button"
					variant="ghost"
					size="small"
					text
					icon="sparkles"
					:aria-label="i18n.baseText('node.addToAi')"
					@click.stop="onAddToAi"
				/>
			</N8nTooltip>
			<N8nIconButton
				variant="ghost"
				data-test-id="overflow-node-button"
				size="small"
				icon="node-ellipsis"
				:aria-label="i18n.baseText('node.moreActions')"
				@click.stop="onOpenContextMenu"
			/>
		</div>
		<CanvasNodeStatusIcons
			v-if="showStatusIcons"
			:class="$style.statusIcons"
			spinner-layout="static"
			:name="name"
			:type="type"
			:disabled="disabled"
			:validation-errors="issues.validation"
			:execution-status="execution.status"
			:has-run-data="runData.visible"
			:run-data-iterations="runData.iterations"
			:dirtiness="dirtiness"
		/>
	</div>
</template>

<style lang="scss" module>
.canvasNodeToolbar {
	padding-bottom: var(--spacing--xs);
	display: flex;
	justify-content: center;
	width: 100%;
	cursor: default;
	pointer-events: none;

	&.isExperimentalNdvActive {
		justify-content: space-between;
		align-items: center;
		padding-bottom: var(--spacing--3xs);
		/* stylelint-disable-next-line @n8n/css-var-naming */
		zoom: var(--canvas-zoom-compensation-factor, 1);
		margin-bottom: var(--spacing--2xs);
	}
}

.canvasNodeToolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	border-radius: var(--radius);
	pointer-events: auto;

	:global(.button) {
		--button--color--text: var(--color--text--tint-1);
	}
}

.forceVisible {
	opacity: 1 !important;
}

.statusIcons {
	margin-inline-end: var(--spacing--3xs);
}
</style>
