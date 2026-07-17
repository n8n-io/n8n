<script setup lang="ts">
import {
	computed,
	inject,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	useCssModule,
	useTemplateRef,
	watch,
} from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nInlineTextEdit, N8nTooltip } from '@n8n/design-system';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import CanvasNodeStatusMark from '../nodes/render-types/parts/CanvasNodeStatusMark.vue';
import { useZoomAdjustedValues } from '../../../composables/useZoomAdjustedValues';
import { HOVER_DELAY } from '@/app/constants';
import {
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
	GROUP_DESCRIPTION_MAX_LENGTH,
	GROUP_DESCRIPTION_MIN_ZOOM,
} from '../../../stores/canvasNodeGroups.constants';
import { computeGroupFrameRects } from '../../../composables/useCanvasMapping.groups';
import { NodeGroupDescriptionVisibilityKey } from '../../../composables/useCanvasNodeGroupDescriptionVisibility';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	createCanvasGroupNodeId,
	type CanvasGroupNodeData,
} from '../../../canvas.types';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };
const EXTRACT_WORKFLOW_SHORTCUT = { altKey: true, keys: ['X'] };

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
		/** Whether the group's members form a selection that can be converted
		 * to a sub-workflow (extraction is stricter than grouping). */
		canExtract?: boolean;
	}>(),
	{
		autofocusGroupId: null,
		readOnly: false,
		selected: false,
		canExtract: false,
	},
);

const emit = defineEmits<{
	'update:name': [id: string, name: string];
	'update:description': [id: string, description: string];
	'title:focused': [id: string];
	ungroup: [id: string];
	extract: [id: string];
	toggle: [id: string];
	'open:contextmenu': [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const $style = useCssModule();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');
const collapsedTitle = useTemplateRef<HTMLElement>('collapsedTitle');

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
	if (isCollapsed.value) {
		const el = collapsedTitle.value;
		isTitleTruncated.value = el ? el.scrollHeight > el.clientHeight + 1 : false;
		return;
	}
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

function onExtractClick() {
	emit('extract', group.value.id);
}

// Matches the context menu wording for group targets:
// "Convert group to sub-workflow".
const extractLabel = computed(() =>
	i18n.baseText('contextMenu.extract', {
		adjustToNumber: 2,
		interpolate: { subject: i18n.baseText('contextMenu.nodeGroup') },
	}),
);

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

// Plain header clicks toggle collapse — handled at the canvas level
// (Canvas.onNodeClick), because VueFlow synthesizes node clicks that bypass
// this DOM tree when the pointer moved a little. Clicks on interactive
// children (title rename) must not bubble there, or they would select the
// group and toggle it.
function onWrapperClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	if (target?.closest('.nodrag')) {
		event.stopPropagation();
	}
}

async function focusTitleEdit() {
	// Collapsed groups have no inline rename — they rename through the modal
	// (see Canvas.onOpenGroupRenameModal).
	if (
		props.autofocusGroupId !== group.value.id ||
		props.readOnly ||
		isCollapsed.value ||
		!isAutofocusReady.value
	)
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

// Description visibility (pin) state — collapsed groups only.
const descriptionVisibility = inject(NodeGroupDescriptionVisibilityKey, null);
const descriptionTextarea = useTemplateRef<HTMLTextAreaElement>('descriptionTextarea');

const isEditingDescription = ref(false);
const editDescriptionText = ref('');
const isDescriptionHovered = ref(false);
let hoverShowTimer: ReturnType<typeof setTimeout> | undefined;
let hoverLeaveTimer: ReturnType<typeof setTimeout> | undefined;

// Hidden entirely below this zoom, both expanded and collapsed.
const isDescriptionEnabled = computed(() => viewport.value.zoom >= GROUP_DESCRIPTION_MIN_ZOOM);
const isDescriptionPinned = computed(
	() => descriptionVisibility?.isVisible(group.value.id) ?? false,
);
const isPermanentlyVisible = computed(
	() => isDescriptionEnabled.value && isDescriptionPinned.value,
);

const showExpandedDescription = computed(() => !isCollapsed.value && isDescriptionEnabled.value);
// Show the affordance when collapsed and there's either a description to read
// or (when editable) a description to add.
const showInfoIcon = computed(
	() =>
		isCollapsed.value &&
		isDescriptionEnabled.value &&
		!isPermanentlyVisible.value &&
		(!isDescriptionEmpty.value || !props.readOnly),
);
const showCollapsedDescription = computed(
	() =>
		isCollapsed.value &&
		isDescriptionEnabled.value &&
		(isPermanentlyVisible.value || isEditingDescription.value || isDescriptionHovered.value),
);

function clearHoverTimers() {
	clearTimeout(hoverShowTimer);
	clearTimeout(hoverLeaveTimer);
}

function scheduleDescriptionHide() {
	hoverLeaveTimer = setTimeout(() => {
		isDescriptionHovered.value = false;
	}, HOVER_DELAY.LEAVE);
}

// The info icon reveals the description after a short intent delay.
function onInfoMouseEnter() {
	clearTimeout(hoverLeaveTimer);
	hoverShowTimer = setTimeout(() => {
		isDescriptionHovered.value = true;
	}, HOVER_DELAY.SHOW);
}

// Leaving the icon only cancels a pending reveal; hiding is driven by leaving
// the whole group, so the cursor can travel from the icon down to the panel.
function onInfoMouseLeave() {
	clearTimeout(hoverShowTimer);
}

// Keep the revealed description alive while the cursor is anywhere over the
// group (header or panel); only start hiding once it leaves the group entirely.
function onGroupMouseEnter() {
	clearTimeout(hoverLeaveTimer);
}

function onGroupMouseLeave() {
	scheduleDescriptionHide();
}

function autoResizeTextarea() {
	const textarea = descriptionTextarea.value;
	if (!textarea) return;
	textarea.style.height = 'auto';
	textarea.style.height = `${textarea.scrollHeight}px`;
}

function startEditingDescription() {
	if (props.readOnly || isEditingDescription.value) return;
	editDescriptionText.value = group.value.description ?? '';
	isEditingDescription.value = true;
	void nextTick(() => {
		descriptionTextarea.value?.focus();
		descriptionTextarea.value?.select();
		autoResizeTextarea();
	});
}

function cancelEditingDescription() {
	isEditingDescription.value = false;
}

// A click anywhere on the panel opens the editor. Track editing state at
// pointerdown so the same click that blurs (and saves) the textarea doesn't
// immediately reopen it with stale text.
let wasEditingOnPointerDown = false;

function onDescriptionPanelPointerDown() {
	wasEditingOnPointerDown = isEditingDescription.value;
}

function onDescriptionPanelClick() {
	if (wasEditingOnPointerDown) return;
	startEditingDescription();
}

function saveDescription() {
	if (!isEditingDescription.value) return;
	isEditingDescription.value = false;
	const trimmed = editDescriptionText.value.trim();
	if (trimmed !== (group.value.description ?? '')) {
		emit('update:description', group.value.id, trimmed);
	}
}

function onDescriptionKeydown(event: KeyboardEvent) {
	event.stopPropagation();
	if (event.key === 'Escape') {
		event.preventDefault();
		cancelEditingDescription();
	} else if (event.key === 'Enter' && !event.shiftKey) {
		// Enter commits; Shift+Enter keeps inserting a newline.
		event.preventDefault();
		saveDescription();
	}
}

// Toggle the pin; opening an empty description drops straight into editing.
function onTogglePinDescription() {
	if (!descriptionVisibility) return;
	descriptionVisibility.toggleVisible(group.value.id);
	if (isDescriptionEmpty.value && descriptionVisibility.isVisible(group.value.id)) {
		startEditingDescription();
	}
}

onBeforeUnmount(clearHoverTimers);

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
		@click="onWrapperClick"
		@dblclick.stop
		@contextmenu="onOpenContextMenu"
		@mouseenter="onGroupMouseEnter"
		@mouseleave="onGroupMouseLeave"
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
					<KeyboardShortcutTooltip
						v-if="canExtract"
						:label="extractLabel"
						:shortcut="EXTRACT_WORKFLOW_SHORTCUT"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="workflow"
							:aria-label="extractLabel"
							data-test-id="canvas-node-group-extract"
							@click.stop="onExtractClick"
						/>
					</KeyboardShortcutTooltip>
				</div>
			</div>

			<div :class="$style.content" data-test-id="canvas-node-group-header">
				<div :class="$style.titleColumn">
					<div :class="$style.titleRow">
						<div :class="$style.title" data-test-id="canvas-node-group-title">
							<N8nTooltip
								:content="group.name"
								:disabled="!isTitleTruncated"
								:show-after="500"
								placement="bottom"
							>
								<div ref="titleText" :class="$style.titleText">
									<N8nInlineTextEdit
										v-if="!isCollapsed"
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
										v-else
										ref="collapsedTitle"
										:class="$style.collapsedTitle"
										data-test-id="canvas-node-group-collapsed-title"
									>
										{{ group.name }}
									</div>
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

						<N8nIcon
							v-if="showInfoIcon"
							class="nodrag"
							:class="$style.infoIcon"
							icon="info"
							:aria-label="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
							data-test-id="canvas-node-group-info"
							@mouseenter="onInfoMouseEnter"
							@mouseleave="onInfoMouseLeave"
						/>
					</div>

					<div
						v-if="showExpandedDescription"
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
				<N8nIconButton
					class="nodrag"
					:class="$style.toggle"
					variant="ghost"
					size="large"
					:icon="isCollapsed ? 'chevron-down' : 'chevron-up'"
					:aria-label="toggleLabel"
					:aria-expanded="!isCollapsed"
					data-test-id="canvas-node-group-toggle"
					@click.stop="onToggleClick"
				/>
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

		<!-- The gap below the card keeps the selection ring from overlapping the panel border. -->
		<div
			v-if="showCollapsedDescription"
			:class="[
				'nodrag',
				$style.descriptionPanel,
				{ [$style.descriptionPanelEditing]: isEditingDescription },
			]"
			:style="{
				top: `calc(${HEADER_HEIGHT}px + var(--spacing--2xs))`,
				cursor: !readOnly && !isEditingDescription ? 'text' : 'default',
			}"
			data-test-id="canvas-node-group-description-panel"
			@pointerdown="onDescriptionPanelPointerDown"
			@click="onDescriptionPanelClick"
		>
			<div :class="$style.descriptionPanelContent">
				<textarea
					v-if="isEditingDescription"
					ref="descriptionTextarea"
					v-model="editDescriptionText"
					:class="$style.descriptionPanelEdit"
					:maxlength="GROUP_DESCRIPTION_MAX_LENGTH"
					:placeholder="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
					data-test-id="canvas-node-group-description-input"
					@blur="saveDescription"
					@input="autoResizeTextarea"
					@keydown="onDescriptionKeydown"
				/>
				<div
					v-else
					:class="[$style.descriptionPanelText, { [$style.descriptionEmpty]: isDescriptionEmpty }]"
					data-test-id="canvas-node-group-description-text"
				>
					{{ group.description || i18n.baseText('canvas.nodeGroup.descriptionPlaceholder') }}
				</div>
			</div>

			<div v-if="!readOnly" :class="$style.descriptionPanelActions">
				<template v-if="isEditingDescription">
					<N8nTooltip :content="i18n.baseText('canvas.nodeGroup.cancelEdit')" placement="bottom">
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="x"
							:aria-label="i18n.baseText('canvas.nodeGroup.cancelEdit')"
							data-test-id="canvas-node-group-description-cancel"
							@mousedown.prevent
							@click.stop="cancelEditingDescription"
						/>
					</N8nTooltip>
					<N8nTooltip
						:content="i18n.baseText('canvas.nodeGroup.saveDescription')"
						placement="bottom"
					>
						<N8nIconButton
							class="nodrag"
							variant="solid"
							size="small"
							icon="check"
							:aria-label="i18n.baseText('canvas.nodeGroup.saveDescription')"
							data-test-id="canvas-node-group-description-save"
							@click.stop="saveDescription"
						/>
					</N8nTooltip>
				</template>
				<template v-else>
					<N8nTooltip
						:content="i18n.baseText('canvas.nodeGroup.editDescription')"
						placement="bottom"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="pen"
							:aria-label="i18n.baseText('canvas.nodeGroup.editDescription')"
							data-test-id="canvas-node-group-edit-description"
							@click.stop="startEditingDescription"
						/>
					</N8nTooltip>
					<N8nTooltip
						:content="
							isPermanentlyVisible
								? i18n.baseText('canvas.nodeGroup.unpinDescription')
								: i18n.baseText('canvas.nodeGroup.pinDescription')
						"
						placement="bottom"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							:icon="isPermanentlyVisible ? 'eye-off' : 'eye'"
							:aria-label="
								isPermanentlyVisible
									? i18n.baseText('canvas.nodeGroup.unpinDescription')
									: i18n.baseText('canvas.nodeGroup.pinDescription')
							"
							data-test-id="canvas-node-group-pin-description"
							@click.stop="onTogglePinDescription"
						/>
					</N8nTooltip>
				</template>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/common/var';
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
.toggle[aria-expanded='true']:not(:active) {
	background-color: transparent;
}

/* Hovering anywhere on the header highlights the toggle */
.titleBar:hover .toggle:not(:active) {
	background-color: var(--button--color--background-hover);
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

// Title text and the info icon sit side by side, the icon right after the title.
.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
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

.collapsedTitle {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
	// Names without break opportunities still wrap instead of overflowing
	overflow-wrap: anywhere;
	line-height: var(--line-height--md);
	min-width: 0;
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
	font-size: var(--font-size--sm);
}

.deactivatedLabel {
	flex-shrink: 0;
	white-space: nowrap;
}

.infoIcon {
	flex-shrink: 0;
	color: var(--text-color--subtler);
	cursor: pointer;
}

// Overlay the bottom-right corner, matching node status icons (CanvasNodeDefault)
.statusIcons {
	position: absolute;
	bottom: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: flex;
	align-items: center;
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
	padding-bottom: var(--spacing--2xs);
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

// Floating description shown below a collapsed group on hover or when pinned.
// Raised above the group's own layers; collapsed groups hide their members,
// so it doesn't cover any of the group's nodes.
.descriptionPanel {
	position: absolute;
	left: 0;
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	box-sizing: border-box;
	background: var(--background--subtle);
	@include styles.canvas-node-border;
	border-radius: var(--radius--xs);
	z-index: var.$index-popper;
}

.descriptionPanelEditing {
	border-color: var(--focus--border-color);
}

.descriptionPanelContent {
	min-width: 0;
}

.descriptionPanelText {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	cursor: text;
}

.descriptionPanelEdit {
	width: 100%;
	margin: 0;
	padding: 0;
	border: none;
	outline: none;
	background: none;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	resize: none;
	overflow: hidden;
	box-sizing: border-box;
}

.descriptionPanelActions {
	display: none;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

// Reveal the actions while hovering the collapsed group (header or panel).
.wrapper.collapsed:hover .descriptionPanelActions,
.descriptionPanelEditing .descriptionPanelActions {
	display: flex;
}

.descriptionEmpty {
	color: var(--text-color--disabled);
}
</style>
