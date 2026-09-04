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
	GROUP_EMPTY_BODY_HEIGHT as EMPTY_BODY_HEIGHT,
	GROUP_DESCRIPTION_MAX_LENGTH,
	GROUP_DESCRIPTION_MIN_ZOOM,
} from '../../../stores/canvasNodeGroups.constants';
import {
	computeGroupFrameRects,
	getGroupCardHeight,
} from '../../../composables/useCanvasMapping.groups';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	createCanvasGroupNodeId,
	type CanvasGroupNodeData,
} from '../../../canvas.types';
import { useIsNodeContextEnabled } from '@/features/ai/instanceAi/composables/useIsNodeContextEnabled';

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
	generate: [id: string];
	'add-node': [id: string];
	'add-nodes-to-chat': [id: string];
	toggle: [id: string];
	'open:contextmenu': [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const isNodeContextEnabled = useIsNodeContextEnabled();
const $style = useCssModule();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');
const collapsedTitle = useTemplateRef<HTMLElement>('collapsedTitle');

const group = computed(() => props.data.group);
const isAutofocusReady = computed(
	() => !props.dimensions || (props.dimensions.width > 0 && props.dimensions.height > 0),
);
const isCollapsed = computed(() => props.data.isCollapsed);
const isEmptyGroup = computed(() => props.data.isEmptyGroup);
// The mapping forces an empty group collapsed; the body renders on that state.
const showEmptyBody = computed(() => isEmptyGroup.value && isCollapsed.value);

// The card is exactly as tall as the VueFlow node the mapping created, so the
// side handles (at 50% of this element) sit at the middle of the whole card.
const cardHeight = computed(() =>
	getGroupCardHeight({ isCollapsed: isCollapsed.value, isEmptyGroup: isEmptyGroup.value }),
);

// Collapsed cards re-anchor their edges onto the side handles, so the dots are
// shown; only an empty card accepts a new connection, which then lands on its
// placeholder node (see NodeView.resolveGroupEndpoint).
const isHandleConnectable = computed(() => isEmptyGroup.value && !props.readOnly);
const handleClass = computed(() => [
	$style.handle,
	{
		[$style.handleVisible]: isCollapsed.value,
		[$style.handleConnectable]: isHandleConnectable.value,
	},
]);

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
		[$style.empty]: isEmptyGroup.value,
		[$style.readOnly]: props.readOnly,
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

function onUngroupClick() {
	emit('ungroup', group.value.id);
}

function onAddNodeClick() {
	emit('add-node', group.value.id);
}

// Build = save the objective, then generate. saveDescription emits
// update:description first, so the generator sees the committed text.
function onBuildClick() {
	saveDescription();
	emit('generate', group.value.id);
}

function onExtractClick() {
	emit('extract', group.value.id);
}

function onAddToChatClick() {
	emit('add-nodes-to-chat', group.value.id);
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
	// While the title or description is being edited, the native text menu
	// (copy/paste, spellcheck) must win over the group menu. Other interactive
	// children (chevron, ungroup button, title preview) still get the group menu.
	const target = event.target as HTMLElement | null;
	if (target?.closest('input, textarea, [contenteditable]')) return;

	emit('open:contextmenu', group.value.id, event);
}

// Plain header clicks toggle collapse — handled at the canvas level
// (Canvas.onNodeClick), because VueFlow synthesizes node clicks that bypass
// this DOM tree when the pointer moved a little. Clicks on interactive
// children (title rename, description editor) must not bubble there, or they
// would select the group and toggle it.
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

/**
 * Description — always inline under the title, in every state. Clamped to one
 * line when expanded (the frame below carries the detail) and two when the
 * card is all there is. Hidden below the zoom threshold; the header keeps its
 * height so the card does not jump.
 */
const descriptionTextarea = useTemplateRef<HTMLTextAreaElement>('descriptionTextarea');
const isEditingDescription = ref(false);
const editDescriptionText = ref('');

const showDescription = computed(() => viewport.value.zoom >= GROUP_DESCRIPTION_MIN_ZOOM);
const descriptionText = computed(
	() => group.value.description || i18n.baseText('canvas.nodeGroup.descriptionPlaceholder'),
);

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
		// Measure after the browser lays out the textarea with its content: a
		// bare nextTick can run before layout, so scrollHeight reads the collapsed
		// one-line height and the editor opens too short until the next keystroke.
		requestAnimationFrame(autoResizeTextarea);
	});
}

function cancelEditingDescription() {
	isEditingDescription.value = false;
}

// A click anywhere on the description opens the editor. Track editing state
// at pointerdown so the same click that blurs (and saves) the textarea
// doesn't immediately reopen it with stale text.
let wasEditingOnPointerDown = false;

function onDescriptionPointerDown() {
	wasEditingOnPointerDown = isEditingDescription.value;
}

function onDescriptionClick() {
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
			height: `${cardHeight}px`,
			...nodeBorderOpacityStyle,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
		@pointerdown="onWrapperPointerDown"
		@click="onWrapperClick"
		@dblclick.stop
		@contextmenu="onOpenContextMenu"
	>
		<div :class="$style.card">
			<Handle
				:id="CANVAS_NODE_GROUP_HANDLE_LEFT"
				type="target"
				:position="Position.Left"
				:class="handleClass"
				:is-connectable="isHandleConnectable"
			/>
			<Handle
				:id="CANVAS_NODE_GROUP_HANDLE_RIGHT"
				type="source"
				:position="Position.Right"
				:class="handleClass"
				:is-connectable="isHandleConnectable"
			/>

			<div
				v-if="!readOnly"
				:class="['nodrag', $style.toolbar]"
				data-test-id="canvas-node-group-toolbar"
			>
				<div :class="$style.toolbarItems">
					<!-- Ungrouping an empty group would leave its placeholder bare on the canvas. -->
					<KeyboardShortcutTooltip
						v-if="!isEmptyGroup"
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
					<!-- An empty group has no nodes to add to the chat. -->
					<KeyboardShortcutTooltip
						v-if="isNodeContextEnabled && !isEmptyGroup"
						:label="i18n.baseText('canvas.nodeGroup.addToChat')"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="sparkles"
							:aria-label="i18n.baseText('canvas.nodeGroup.addToChat')"
							data-test-id="canvas-node-group-add-to-chat"
							@click.stop="onAddToChatClick"
						/>
					</KeyboardShortcutTooltip>
				</div>
			</div>

			<div
				:class="[$style.header, { [$style.headerEditing]: isEditingDescription }]"
				:style="{ height: `${HEADER_HEIGHT}px` }"
				data-test-id="canvas-node-group-header"
			>
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

					<!-- Right slot: an empty group is labelled, a filled one collapses. -->
					<span
						v-if="isEmptyGroup"
						:class="$style.emptyBadge"
						data-test-id="canvas-node-group-empty-badge"
					>
						{{ i18n.baseText('canvas.nodeGroup.emptyBadge') }}
					</span>
					<N8nIconButton
						v-else
						class="nodrag"
						:class="$style.toggle"
						variant="ghost"
						size="small"
						:icon="isCollapsed ? 'chevron-down' : 'chevron-up'"
						:aria-label="toggleLabel"
						:aria-expanded="!isCollapsed"
						data-test-id="canvas-node-group-toggle"
						@click.stop="onToggleClick"
					/>
				</div>

				<div
					v-if="showDescription"
					:class="[
						$style.description,
						{ nodrag: !readOnly, [$style.descriptionEditing]: isEditingDescription },
					]"
					data-test-id="canvas-node-group-description"
					@pointerdown="onDescriptionPointerDown"
					@click="onDescriptionClick"
				>
					<!-- The editor overlays the card so a long objective can grow while
					the card keeps the height the mapping gave it. -->
					<div v-if="isEditingDescription" :class="$style.descriptionEditor">
						<textarea
							ref="descriptionTextarea"
							v-model="editDescriptionText"
							:class="$style.descriptionInput"
							:maxlength="GROUP_DESCRIPTION_MAX_LENGTH"
							:placeholder="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
							data-test-id="canvas-node-group-description-input"
							@blur="saveDescription"
							@input="autoResizeTextarea"
							@keydown="onDescriptionKeydown"
						/>
						<div :class="$style.descriptionActions">
							<N8nTooltip
								:content="i18n.baseText('canvas.nodeGroup.cancelEdit')"
								placement="bottom"
							>
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
									variant="ghost"
									size="small"
									icon="check"
									:aria-label="i18n.baseText('canvas.nodeGroup.saveDescription')"
									data-test-id="canvas-node-group-description-save"
									@mousedown.prevent
									@click.stop="saveDescription"
								/>
							</N8nTooltip>
							<!-- Build = save the objective, then generate. Empty groups only. -->
							<N8nTooltip
								v-if="isEmptyGroup"
								:content="i18n.baseText('canvas.nodeGroup.build')"
								placement="bottom"
							>
								<N8nIconButton
									class="nodrag"
									variant="solid"
									size="small"
									icon="sparkles"
									:aria-label="i18n.baseText('canvas.nodeGroup.build')"
									data-test-id="canvas-node-group-description-build"
									@mousedown.prevent
									@click.stop="onBuildClick"
								/>
							</N8nTooltip>
						</div>
					</div>
					<div
						v-else
						:class="[
							$style.descriptionText,
							isCollapsed ? $style.twoLines : $style.oneLine,
							{ [$style.descriptionEmpty]: isDescriptionEmpty },
						]"
						data-test-id="canvas-node-group-description-text"
					>
						{{ descriptionText }}
					</div>
				</div>
			</div>

			<!-- An empty group fills by picking a node here instead of expanding. -->
			<div
				v-if="showEmptyBody"
				:class="$style.body"
				:style="{ height: `${EMPTY_BODY_HEIGHT}px` }"
				data-test-id="canvas-node-group-body"
			>
				<N8nTooltip
					v-if="!readOnly"
					:content="i18n.baseText('canvas.nodeGroup.addNode')"
					placement="bottom"
				>
					<N8nIconButton
						class="nodrag"
						variant="subtle"
						size="small"
						icon="plus"
						:aria-label="i18n.baseText('canvas.nodeGroup.addNode')"
						data-test-id="canvas-node-group-add-node"
						@click.stop="onAddNodeClick"
					/>
				</N8nTooltip>
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

// The card: header (+ body when empty). A group reads as a plan block, so it
// carries a dashed border in every state, matching the frame below it.
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	background: var(--background--surface);
	background-clip: padding-box;
	@include styles.canvas-node-border(dashed);
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
.wrapper.collapsed.running .card::after,
.wrapper.collapsed.waiting .card::after {
	@include styles.status-animated-after;
	border-radius: var(--radius--lg);
}
.wrapper.collapsed.running .card::after {
	@include styles.status-running-animation;
}
.wrapper.collapsed.waiting .card::after {
	@include styles.status-waiting-animation;
}

@include styles.status-animation-definitions;
/* stylelint-enable */

// Title row on top, description under it. Fixed height (from the mapping) with
// the description clamped, so no DOM measurement is ever needed for layout.
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	padding: var(--spacing--sm) var(--spacing--md);
	box-sizing: border-box;
	overflow: hidden;
}

// The description editor overlay grows below the header height; the header's
// clip would cut off its action buttons, so stop clipping while editing.
// The header keeps its fixed height, so the card layout is unchanged.
.headerEditing {
	overflow: visible;
}

.titleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	min-width: 0;
}

.title {
	display: flex;
	align-items: center;
	flex: 1;
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
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
	min-width: 0;
	max-width: 100%;
}

.deactivatedLabel {
	flex-shrink: 0;
	white-space: nowrap;
}

// Small uppercase tag in the header's right slot, muted next to the title.
.emptyBadge {
	flex-shrink: 0;
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--text-color--subtler);
}

.toggle {
	flex-shrink: 0;
}

/*  Don't render the aria-expanded toggle as "pressed" while inactive */
.toggle[aria-expanded='true']:not(:active) {
	background-color: transparent;
}

/* Hovering anywhere on the card highlights the toggle */
.card:hover .toggle:not(:active) {
	background-color: var(--button--color--background-hover);
}

.description {
	position: relative;
	flex: 1;
	min-width: 0;
	min-height: 0;
}

.descriptionText {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	overflow: hidden;
	overflow-wrap: anywhere;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
}

.oneLine {
	-webkit-line-clamp: 1;
	line-clamp: 1;
}

.twoLines {
	-webkit-line-clamp: 2;
	line-clamp: 2;
}

// No description yet: the italic prompt to add one.
.descriptionEmpty {
	font-style: italic;
	color: var(--text-color--subtler);
}

.wrapper:not(.readOnly) .descriptionText {
	cursor: text;
}

// While editing, the editor floats over the card from the description's top
// edge so it can grow with the text without resizing the card.
.descriptionEditor {
	position: absolute;
	top: calc(-1 * var(--spacing--2xs));
	left: calc(-1 * var(--spacing--2xs));
	right: calc(-1 * var(--spacing--2xs));
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
	background: var(--background--surface);
	border: var(--border-width, 1px) solid var(--focus--border-color);
	border-radius: var(--radius--xs);
	box-sizing: border-box;
	// Elevate the overlay so it reads as a popover floating above the member
	// nodes it covers, not as a box glued on top of them.
	box-shadow: var(--shadow--md);
	// A description can run to GROUP_DESCRIPTION_MAX_LENGTH; cap the editor
	// so a long one scrolls instead of covering the canvas.
	max-height: 40vh;
	z-index: var.$index-popper;
}

.descriptionInput {
	display: block;
	width: 100%;
	// One line tall to start; autoResizeTextarea grows it to fit the content.
	// A fixed starting height (not the browser's default rows=2) keeps the
	// measurement stable across the canvas zoom transform. 1lh is one line box.
	height: 1lh;
	margin: 0;
	padding: 0;
	border: none;
	outline: none;
	background: none;
	color: var(--text-color--subtle);
	font-family: inherit;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	resize: none;
	overflow: auto;
	box-sizing: border-box;
}

.descriptionActions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

// Empty group only: the centered add-node button under the header.
.body {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	box-sizing: border-box;
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

.card:hover .toolbarItems {
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

// Expanded groups wire through their member nodes, so the card's own handles
// stay out of the way.
.handle {
	opacity: 0;
	pointer-events: none;
}

// A collapsed card re-anchors its edges onto these dots.
.handleVisible {
	width: 14px;
	height: 14px;
	opacity: 1;
	background: var(--color--foreground--shade-1);
	border: var(--border);
}

// Only an empty card accepts a new connection. Enlarge the pointer target
// well past the dot so a dropped connection lands without pixel-perfect aim,
// matching how nodes accept a drop.
.handleConnectable {
	pointer-events: all;

	&::before {
		content: '';
		position: absolute;
		inset: -10px;
		border-radius: 50%;
	}
}
</style>
