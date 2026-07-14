<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useCssModule, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nInlineTextEdit, N8nTooltip } from '@n8n/design-system';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import CanvasNodeStatusMark from '../nodes/render-types/parts/CanvasNodeStatusMark.vue';
import { useZoomAdjustedValues } from '../../../composables/useZoomAdjustedValues';
import {
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
	GROUP_DESCRIPTION_MAX_LENGTH,
} from '../../../stores/canvasNodeGroups.constants';
import { computeGroupFrameRects } from '../../../composables/useCanvasMapping.groups';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	createCanvasGroupNodeId,
	type CanvasGroupNodeData,
} from '../../../canvas.types';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };

// Only declare the props this component uses.
// Extra VueFlow slot props passed via v-bind are ignored.
defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		data: CanvasGroupNodeData;
		autofocusGroupId?: string | null;
		dimensions?: { width: number; height: number };
		selected?: boolean;
		readOnly?: boolean;
	}>(),
	{
		autofocusGroupId: null,
		readOnly: false,
		selected: false,
	},
);

const emit = defineEmits<{
	'update:name': [id: string, name: string];
	'update:description': [id: string, description: string];
	'title:focused': [id: string];
	ungroup: [id: string];
	toggle: [id: string];
	'open:contextmenu': [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const $style = useCssModule();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');

const group = computed(() => props.data.group);
const isAutofocusReady = computed(
	() => !props.dimensions || (props.dimensions.width > 0 && props.dimensions.height > 0),
);
const isCollapsed = computed(() => props.data.isCollapsed);
const isDescriptionEmpty = computed(() => !group.value.description?.trim());
const executionStatus = computed(() => props.data.executionStatus);
const allNodesDisabled = computed(() => props.data.allNodesDisabled ?? false);

// Statuses rendered as a status mark; running/waiting render as the animated border.
const MARK_STATUSES = ['success', 'error', 'warning'] as const;
const markStatus = computed(() => MARK_STATUSES.find((status) => status === executionStatus.value));

const wrapperClasses = computed(() => [
	$style.wrapper,
	{
		[$style.collapsed]: isCollapsed.value,
		[$style.selected]: props.selected,
		[$style.deactivated]: allNodesDisabled.value,
		[$style.success]: executionStatus.value === 'success',
		[$style.error]: executionStatus.value === 'error',
		[$style.warning]: executionStatus.value === 'warning',
		[$style.running]: executionStatus.value === 'running',
		[$style.waiting]: executionStatus.value === 'waiting',
	},
]);

const frameStyle = computed(() => {
	// Frame sits below the header, so exclude the header height
	const { expanded } = computeGroupFrameRects(props.data.nodesRect);
	return {
		top: `${HEADER_HEIGHT}px`,
		height: `${expanded.height - HEADER_HEIGHT}px`,
	};
});

// An expanded selected group shows one ring around header + frame; the
// title bar ring alone would read as only the header being selected.
const selectionRingStyle = computed(() => {
	const { expanded } = computeGroupFrameRects(props.data.nodesRect);
	return { height: `${expanded.height}px` };
});

const isTitleTruncated = ref(false);

function updateTruncated() {
	const el = titleText.value;
	if (!el) {
		isTitleTruncated.value = false;
		return;
	}
	isTitleTruncated.value = el.scrollWidth > el.clientWidth + 1;
}

watch(
	() => [group.value.name, props.data.nodesRect.width, isCollapsed.value],
	async () => {
		await nextTick();
		updateTruncated();
	},
	{ immediate: true },
);

function onTitleUpdate(value: string) {
	emit('update:name', group.value.id, value);
}

function onDescriptionUpdate(value: string) {
	emit('update:description', group.value.id, value);
}

function onUngroupClick() {
	emit('ungroup', group.value.id);
}

function onToggleClick() {
	emit('toggle', group.value.id);
}

function onOpenContextMenu(event: MouseEvent) {
	// While the title is being edited, the native text menu (copy/paste,
	// spellcheck) must win over the group menu. Other interactive children
	// (chevron, ungroup button, title preview) still get the group menu.
	const target = event.target as HTMLElement | null;
	if (target?.closest('input, textarea, [contenteditable]')) return;

	emit('open:contextmenu', group.value.id, event);
}

// Toggle collapse on double clicking
function onWrapperDblClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	// if happened inside an element with its own click behavior, do nothing
	if (target?.closest('.nodrag')) return;

	emit('toggle', group.value.id);
}

async function focusTitleEdit() {
	if (props.autofocusGroupId !== group.value.id || props.readOnly || !isAutofocusReady.value)
		return;
	await nextTick();
	titleEdit.value?.forceFocus();
	emit('title:focused', group.value.id);
}

onMounted(() => {
	void focusTitleEdit();
});

watch(
	() => [props.autofocusGroupId === group.value.id, isAutofocusReady.value],
	() => {
		void focusTitleEdit();
	},
);

const toggleLabel = computed(() =>
	isCollapsed.value
		? i18n.baseText('canvas.nodeGroup.expand')
		: i18n.baseText('canvas.nodeGroup.collapse'),
);

const { getSelectedNodes, removeSelectedNodes, viewport } = useVueFlow();

// Match the zoom-adjusted border opacity normal nodes use
const { calculateNodeBorderOpacityStyle } = useZoomAdjustedValues(viewport);
const nodeBorderOpacityStyle = calculateNodeBorderOpacityStyle();

// Clear unrelated pre-existing selection before VueFlow snapshots which
// nodes to drag — otherwise those nodes ride along with the group drag.
// Preserve the selection when this title bar is itself part of it
// (intentional multi-select drag).
function onWrapperPointerDown(event: PointerEvent) {
	// Clicks on .nodrag children (chevron, title edit, ungroup) aren't drag intent.
	const target = event.target as HTMLElement | null;
	if (target?.closest('.nodrag')) return;

	// Modifier-clicks add to the selection instead of replacing it.
	if (event.ctrlKey || event.metaKey) return;

	const selected = getSelectedNodes.value;
	if (selected.length === 0) return;

	// Multi-select drag that includes this title bar → preserve the selection.
	const myVueFlowId = createCanvasGroupNodeId(group.value.id);
	const isPartOfSelection = selected.some((n) => n.id === myVueFlowId);
	if (isPartOfSelection) return;

	removeSelectedNodes(selected);
}
</script>

<template>
	<div
		:class="wrapperClasses"
		:style="{
			width: '100%',
			height: `${HEADER_HEIGHT}px`,
			...nodeBorderOpacityStyle,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
		@pointerdown="onWrapperPointerDown"
		@dblclick.stop="onWrapperDblClick"
		@contextmenu="onOpenContextMenu"
	>
		<div :class="$style.titleBar">
			<Handle
				:id="CANVAS_NODE_GROUP_HANDLE_LEFT"
				type="target"
				:position="Position.Left"
				:class="$style.handle"
				:is-connectable="false"
			/>
			<Handle
				:id="CANVAS_NODE_GROUP_HANDLE_RIGHT"
				type="source"
				:position="Position.Right"
				:class="$style.handle"
				:is-connectable="false"
			/>

			<div
				v-if="!readOnly"
				:class="['nodrag', $style.toolbar]"
				data-test-id="canvas-node-group-toolbar"
			>
				<div :class="$style.toolbarItems">
					<KeyboardShortcutTooltip
						:label="i18n.baseText('canvas.selection.toolbar.ungroup')"
						:shortcut="UNGROUP_NODES_SHORTCUT"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="ungroup"
							:aria-label="i18n.baseText('canvas.selection.toolbar.ungroup')"
							data-test-id="canvas-node-group-ungroup"
							@click.stop="onUngroupClick"
						/>
					</KeyboardShortcutTooltip>
				</div>
			</div>

			<div :class="$style.content" data-test-id="canvas-node-group-header">
				<N8nIconButton
					class="nodrag"
					:class="$style.toggle"
					variant="ghost"
					size="large"
					:icon="isCollapsed ? 'chevrons-up-down' : 'chevrons-down-up'"
					:aria-label="toggleLabel"
					:aria-expanded="!isCollapsed"
					data-test-id="canvas-node-group-toggle"
					@click.stop="onToggleClick"
				/>
				<div :class="$style.titleColumn">
					<div :class="$style.title" data-test-id="canvas-node-group-title">
						<N8nTooltip
							:content="group.name"
							:disabled="!isTitleTruncated"
							:show-after="500"
							placement="bottom"
						>
							<div ref="titleText" :class="$style.titleText">
								<N8nInlineTextEdit
									ref="titleEdit"
									:class="['nodrag', $style.inlineEdit]"
									:model-value="group.name"
									:read-only="readOnly"
									:min-width="0"
									max-width="100%"
									:placeholder="i18n.baseText('canvas.nodeGroup.titlePlaceholder')"
									@update:model-value="onTitleUpdate"
								/>
								<div
									v-if="allNodesDisabled"
									:class="$style.deactivatedLabel"
									data-test-id="canvas-node-group-deactivated-label"
								>
									({{ i18n.baseText('node.disabled') }})
								</div>
							</div>
						</N8nTooltip>
					</div>

					<div
						v-if="!isCollapsed"
						:class="$style.description"
						data-test-id="canvas-node-group-description"
					>
						<N8nInlineTextEdit
							:class="[
								'nodrag',
								$style.inlineEdit,
								$style.descriptionInline,
								{ [$style.descriptionEmpty]: isDescriptionEmpty },
							]"
							:model-value="group.description ?? ''"
							:read-only="readOnly"
							:min-width="0"
							max-width="100%"
							:max-length="GROUP_DESCRIPTION_MAX_LENGTH"
							:placeholder="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
							@update:model-value="onDescriptionUpdate"
						/>
					</div>
				</div>
				<div
					v-if="isCollapsed && markStatus"
					:class="$style.statusIcons"
					:data-test-id="`canvas-node-group-status-${markStatus}`"
				>
					<CanvasNodeStatusMark :status="markStatus" />
				</div>
				<div
					v-else-if="isCollapsed && executionStatus === 'issues'"
					:class="[$style.statusIcons, $style.issues]"
					data-test-id="canvas-node-group-status-issues"
				>
					<N8nIcon icon="node-validation-error" size="large" />
				</div>
			</div>
		</div>

		<div
			v-if="!isCollapsed"
			:class="$style.frame"
			:style="frameStyle"
			data-test-id="canvas-node-group-frame"
		/>

		<div
			v-if="!isCollapsed && selected"
			:class="$style.selectionRing"
			:style="selectionRingStyle"
			data-test-id="canvas-node-group-selection-ring"
		/>
	</div>
</template>

<style lang="scss" module>
@use '../../../components/elements/nodes/render-types/_canvasNodeStyles.scss' as styles;

.wrapper {
	// Border defaults live on the wrapper as custom properties so the
	// frame inherits them through the cascade.
	@include styles.canvas-node-border-defaults;
	position: relative;
}

.titleBar {
	position: relative;
	width: 100%;
	height: 100%;
	background: var(--background--surface);
	background-clip: padding-box;
	@include styles.canvas-node-border;
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	box-sizing: border-box;
	.wrapper.collapsed & {
		border-radius: var(--radius--lg);
	}

	// When expanded, the selection ring is drawn by .selectionRing around the
	// whole group instead.
	.wrapper.collapsed.selected & {
		@include styles.canvas-node-selected-ring;
	}

	// Status only manifests when the group is collapsed — when expanded
	// the nodes render their own outlines.
	.wrapper.collapsed.success & {
		@include styles.status-success;
	}
	.wrapper.collapsed.error & {
		@include styles.status-error;
	}
	.wrapper.collapsed.warning & {
		@include styles.status-warning;
	}
	.wrapper.collapsed.running & {
		@include styles.status-running-border;
	}
	.wrapper.collapsed.waiting & {
		@include styles.status-waiting-border;
	}
}

/* stylelint-disable */
.wrapper.collapsed.running .titleBar::after,
.wrapper.collapsed.waiting .titleBar::after {
	@include styles.status-animated-after;
	border-radius: var(--radius--lg);
}
.wrapper.collapsed.running .titleBar::after {
	@include styles.status-running-animation;
}
.wrapper.collapsed.waiting .titleBar::after {
	@include styles.status-waiting-animation;
}

@include styles.status-animation-definitions;
/* stylelint-enable */

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: 100%;
	padding: var(--spacing--lg);
	overflow: hidden;
}

.toggle {
	flex-shrink: 0;
}

/*  Don't render the aria-expanded toggle as "pressed" while inactive */
.toggle[aria-expanded='true']:not(:hover):not(:active) {
	background-color: transparent;
}

// Stacks the title and, when expanded, the description within the header box.
.titleColumn {
	display: flex;
	flex: 1;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	height: 100%;
}

.title {
	display: flex;
	align-items: center;
	min-width: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.wrapper.deactivated .title {
	color: var(--text-color--subtler);
}

.titleText {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-width: 0;
	max-width: 100%;
	overflow: clip;
	overflow-clip-margin: var(--spacing--2xs);
}

.inlineEdit {
	width: fit-content;
	max-width: 100%;
}

// One-line description shown under the title in the header box.
.description {
	display: flex;
	min-width: 0;
	max-width: 100%;
}

.descriptionInline {
	color: var(--text-color--subtle);
}

.descriptionEmpty {
	color: var(--text-color--disabled);
}

.deactivatedLabel {
	flex-shrink: 0;
	white-space: nowrap;
}

.statusIcons {
	display: flex;
	align-items: center;
	margin-left: var(--spacing--xs);
	flex-shrink: 0;
}

// Validation issues mirror the single node: red triangle, no status border.
.issues {
	color: var(--color--danger);
}

.toolbar {
	position: absolute;
	bottom: 100%;
	left: 50%;
	transform: translateX(-50%);
	padding-bottom: var(--spacing--3xs);
	pointer-events: auto;
}

.toolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	border-radius: var(--radius);
	opacity: 0;
	transition: opacity 0.1s ease-in;
}

.titleBar:hover .toolbarItems {
	opacity: 1;
}

.frame {
	position: absolute;
	left: 0;
	width: 100%;
	background: var(--background--hover);
	@include styles.canvas-node-border(dashed);
	border-top: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	z-index: 0;
}

.selectionRing {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	border-radius: var(--radius--lg);
	pointer-events: none;
	@include styles.canvas-node-selected-ring;
}

.handle {
	opacity: 0;
	pointer-events: none;
}
</style>
