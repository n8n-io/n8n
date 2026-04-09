<script setup lang="ts">
import { computed, ref, useCssModule } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '../../../composables/useCanvasNode';
import { CanvasNodeRenderType } from '../../../canvas.types';
import { useCanvas } from '../../../composables/useCanvas';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useExperimentalNdvStore } from '../../../experimental/experimentalNdv.store';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import CanvasNodeStatusIcons from './render-types/parts/CanvasNodeStatusIcons.vue';

import { N8nIconButton, N8nPopover, N8nTooltip } from '@n8n/design-system';
import CanvasNodeStickyColorSelector from './toolbar/CanvasNodeStickyColorSelector.vue';
import type { CanvasNodeGroupFrameRender } from '../../../canvas.types';

const emit = defineEmits<{
	delete: [];
	toggle: [];
	run: [];
	update: [parameters: Record<string, unknown>];
	'open:contextmenu': [event: MouseEvent];
	focus: [id: string];
	'add:ai': [id: string];
	'expand:group': [];
}>();

const props = defineProps<{
	readOnly?: boolean;
	showStatusIcons: boolean;
	itemsClass: string;
}>();

const $style = useCssModule();
const i18n = useI18n();

const { isExecuting, isExperimentalNdvActive } = useCanvas();
const { id, isDisabled, render, name } = useCanvasNode();

const isCollapsedGroup = computed(
	() =>
		id.value.startsWith('collapsed-group-') ||
		id.value.startsWith('tool-group-') ||
		id.value.startsWith('semantic-group-'),
);

const isExpandedFrame = computed(() => id.value.startsWith('frame-'));

const isGroupNode = computed(() => isCollapsedGroup.value || isExpandedFrame.value);

const groupId = computed(() => {
	if (isCollapsedGroup.value) return id.value;
	if (isExpandedFrame.value) {
		const opts = render.value.options as CanvasNodeGroupFrameRender['options'];
		return opts.groupId;
	}
	return '';
});

const GROUP_COLORS = [
	{ name: 'Blue', value: 'rgb(0 90 255 / 0.08)', border: 'rgb(100 160 255 / 0.4)' },
	{ name: 'Purple', value: 'rgb(130 80 255 / 0.08)', border: 'rgb(160 120 255 / 0.4)' },
	{ name: 'Green', value: 'rgb(0 180 100 / 0.08)', border: 'rgb(60 200 130 / 0.4)' },
	{ name: 'Orange', value: 'rgb(255 140 0 / 0.08)', border: 'rgb(255 170 60 / 0.4)' },
	{ name: 'Red', value: 'rgb(255 60 60 / 0.08)', border: 'rgb(255 100 100 / 0.4)' },
	{ name: 'Teal', value: 'rgb(0 180 180 / 0.08)', border: 'rgb(60 200 200 / 0.4)' },
];

const isGroupColorSelectorOpen = ref(false);

const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const experimentalNdvStore = useExperimentalNdvStore();
const focusedNodesStore = useFocusedNodesStore();

const node = computed(() =>
	name.value ? workflowDocumentStore?.value?.getNodeByName(name.value) : null,
);
const isToolNode = computed(() => !!node.value && nodeTypesStore.isToolNode(node.value.type));

const nodeDisabledTitle = computed(() => {
	return isDisabled.value ? i18n.baseText('node.enable') : i18n.baseText('node.disable');
});

const isStickyColorSelectorOpen = ref(false);
const isHovered = ref(false);

const classes = computed(() => ({
	[$style.canvasNodeToolbar]: true,
	[$style.readOnly]: props.readOnly,
	[$style.forceVisible]:
		isHovered.value || isStickyColorSelectorOpen.value || isGroupColorSelectorOpen.value,
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

const isAddToAiVisible = computed(() => !props.readOnly && focusedNodesStore.isFeatureEnabled);

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

function onUngroupGroup() {
	window.dispatchEvent(new CustomEvent('ungroup-group', { detail: { groupId: groupId.value } }));
}

function onExpandGroup() {
	window.dispatchEvent(new CustomEvent('expand-group', { detail: { groupId: groupId.value } }));
}

function onCollapseGroup() {
	window.dispatchEvent(new CustomEvent('collapse-group', { detail: { groupId: groupId.value } }));
}

function onChangeGroupColor(color: string) {
	isGroupColorSelectorOpen.value = false;
	window.dispatchEvent(
		new CustomEvent('update-group-field', {
			detail: { groupId: groupId.value, field: 'color', value: color },
		}),
	);
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
			<template v-if="isGroupNode">
				<N8nIconButton
					v-if="isCollapsedGroup"
					variant="ghost"
					size="small"
					icon="maximize-2"
					title="Expand group"
					@click.stop="onExpandGroup"
				/>
				<N8nIconButton
					v-if="isExpandedFrame"
					variant="ghost"
					size="small"
					icon="minimize-2"
					title="Collapse group"
					@click.stop="onCollapseGroup"
				/>
				<N8nPopover
					v-model:open="isGroupColorSelectorOpen"
					side="top"
					width="auto"
					:enable-scrolling="false"
				>
					<template #trigger>
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="palette"
							title="Change color"
							@click.stop
						/>
					</template>
					<template #content>
						<div :class="$style.groupColorPicker">
							<div
								v-for="gc in GROUP_COLORS"
								:key="gc.name"
								:class="$style.groupColorSwatch"
								:style="{ background: gc.border }"
								:title="gc.name"
								@click="onChangeGroupColor(gc.value)"
							/>
						</div>
					</template>
				</N8nPopover>
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="split"
					title="Ungroup"
					@click.stop="onUngroupGroup"
				/>
			</template>
			<template v-else>
				<N8nTooltip
					v-if="isExecuteNodeVisible"
					placement="top"
					:disabled="!isDisabled"
					:content="i18n.baseText('ndv.execute.deactivated')"
				>
					<N8nIconButton
						variant="ghost"
						data-test-id="execute-node-button"
						size="small"
						icon="node-play"
						:disabled="isExecuting || isDisabled"
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
					@update="onChangeStickyColor"
				/>
				<N8nTooltip
					v-if="isAddToAiVisible"
					placement="top"
					:content="i18n.baseText('node.addToAi')"
				>
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
			</template>
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

.groupColorPicker {
	display: flex;
	gap: var(--spacing--2xs);
}

.groupColorSwatch {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	cursor: pointer;
	border: 2px solid transparent;

	&:hover {
		transform: scale(1.15);
	}
}
</style>
