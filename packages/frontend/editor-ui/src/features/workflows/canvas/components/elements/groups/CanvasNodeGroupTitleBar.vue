<script setup lang="ts">
import {
	computed,
	inject,
	nextTick,
	onMounted,
	ref,
	useCssModule,
	useTemplateRef,
	watch,
} from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIcon, N8nIconButton, N8nInlineTextEdit, N8nText, N8nTooltip } from '@n8n/design-system';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import CanvasNodeStatusMark from '../nodes/render-types/parts/CanvasNodeStatusMark.vue';
import { useZoomAdjustedValues } from '../../../composables/useZoomAdjustedValues';
import { GROUP_HEADER_HEIGHT as HEADER_HEIGHT } from '../../../stores/canvasNodeGroups.constants';
import { computeGroupFrameRects } from '../../../composables/useCanvasMapping.groups';
import { NodeGroupDescriptionVisibilityKey } from '../../../composables/useCanvasNodeGroupDescriptionVisibility';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	createCanvasGroupNodeId,
	type CanvasGroupNodeData,
} from '../../../canvas.types';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };

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
}>();

const i18n = useI18n();
const $style = useCssModule();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');
const collapsedTitleText = useTemplateRef<HTMLElement>('collapsedTitleText');
const descriptionTextarea = useTemplateRef<HTMLTextAreaElement>('descriptionTextarea');

const group = computed(() => props.data.group);
const descriptionVisibility = inject(NodeGroupDescriptionVisibilityKey, null);
const isDescriptionPinned = computed(() =>
	descriptionVisibility ? descriptionVisibility.isVisible(group.value.id) : false,
);
const isAutofocusReady = computed(
	() => !props.dimensions || (props.dimensions.width > 0 && props.dimensions.height > 0),
);
const isCollapsed = computed(() => props.data.isCollapsed);
const executionStatus = computed(() => props.data.executionStatus);

const MARK_STATUSES = ['success', 'error', 'warning'] as const;
const markStatus = computed(() => MARK_STATUSES.find((status) => status === executionStatus.value));

const wrapperClasses = computed(() => [
	$style.wrapper,
	{
		[$style.collapsed]: isCollapsed.value,
		'group--collapsed': isCollapsed.value,
		[$style.selected]: props.selected,
		[$style.headerHovered]: headerHovered.value,
		[$style.success]: executionStatus.value === 'success',
		[$style.error]: executionStatus.value === 'error',
		[$style.warning]: executionStatus.value === 'warning',
		[$style.running]: executionStatus.value === 'running',
		[$style.waiting]: executionStatus.value === 'waiting',
	},
]);

const DESCRIPTION_HEIGHT = 48;

const frameStyle = computed(() => {
	const { expanded } = computeGroupFrameRects(props.data.nodesRect);
	return {
		top: `${HEADER_HEIGHT}px`,
		height: `${expanded.height - HEADER_HEIGHT}px`,
	};
});

const isTitleTruncated = ref(false);
const isEditingDescription = ref(false);
const headerHovered = ref(false);
const editDescriptionText = ref('');

const { getSelectedNodes, removeSelectedNodes, viewport } = useVueFlow();

const DESCRIPTION_MIN_ZOOM = 0.66;
const DESCRIPTION_MAX_LENGTH = 280;
const isDescriptionEnabled = computed(() => viewport.value.zoom >= DESCRIPTION_MIN_ZOOM);
const isDescriptionHovered = ref(false);
let hoverShowTimer: ReturnType<typeof setTimeout> | undefined;
let hoverHideTimer: ReturnType<typeof setTimeout> | undefined;

const isPermanentVisible = computed(() => isDescriptionEnabled.value && isDescriptionPinned.value);

const HOVER_SHOW_DELAY_MS = 500;
const HOVER_LEAVE_DELAY_MS = 150;
const isDescriptionEmpty = computed(() => !group.value.description?.trim());

const isGroupHovered = computed(() => headerHovered.value || isDescriptionHovered.value);

const showCollapsedDescription = computed(
	() =>
		isCollapsed.value &&
		isDescriptionEnabled.value &&
		(isPermanentVisible.value || isEditingDescription.value || isDescriptionHovered.value),
);

const showExpandedDescription = computed(() => !isCollapsed.value && isDescriptionEnabled.value);

function updateTruncated() {
	const el = isCollapsed.value ? collapsedTitleText.value : titleText.value;
	if (!el) {
		isTitleTruncated.value = false;
		return;
	}
	if (isCollapsed.value) {
		isTitleTruncated.value = el.scrollHeight > el.clientHeight + 1;
	} else {
		isTitleTruncated.value = el.scrollWidth > el.clientWidth + 1;
	}
}

watch(
	() => [group.value.name, props.data.nodesRect.width, isCollapsed.value],
	async () => {
		await nextTick();
		updateTruncated();
	},
	{ immediate: true },
);

watch(isDescriptionEnabled, (enabled) => {
	if (!enabled && isEditingDescription.value) {
		saveDescription();
	}
});

function onTitleUpdate(value: string) {
	emit('update:name', group.value.id, value);
}

function onUngroupClick() {
	emit('ungroup', group.value.id);
}

function onToggleClick() {
	emit('toggle', group.value.id);
}

function onWrapperClick(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	if (target?.closest('.nodrag')) return;
	emit('toggle', group.value.id);
}

function onInfoClick() {
	if (!descriptionVisibility) return;
	descriptionVisibility.toggleVisible(group.value.id);
	if (
		isDescriptionEmpty.value &&
		descriptionVisibility.isVisible(group.value.id) &&
		isCollapsed.value
	) {
		isEditingDescription.value = true;
		editDescriptionText.value = '';
		nextTick(() => {
			descriptionTextarea.value?.focus();
		});
	}
}

function onDescriptionUpdate(value: string) {
	const trimmed = value.trim();
	if (trimmed !== (group.value.description ?? '')) {
		emit('update:description', group.value.id, trimmed);
	}
}

function autoResizeTextarea() {
	const textarea = descriptionTextarea.value;
	if (!textarea) return;
	textarea.style.height = 'auto';
	textarea.style.height = `${textarea.scrollHeight}px`;
}
function onInfoMouseEnter() {
	clearTimeout(hoverHideTimer);
	hoverShowTimer = setTimeout(() => {
		isDescriptionHovered.value = true;
	}, HOVER_SHOW_DELAY_MS);
}

function onInfoMouseLeave() {
	clearTimeout(hoverShowTimer);
	hoverHideTimer = setTimeout(() => {
		if (!isEditingDescription.value && !isPermanentVisible.value) {
			isDescriptionHovered.value = false;
		}
	}, HOVER_LEAVE_DELAY_MS);
}

function onDescriptionMouseEnter() {
	clearTimeout(hoverHideTimer);
	isDescriptionHovered.value = true;
}

function onDescriptionMouseLeave() {
	hoverHideTimer = setTimeout(() => {
		isDescriptionHovered.value = false;
	}, HOVER_LEAVE_DELAY_MS);
}

function startEditing() {
	if (props.readOnly) return;
	isEditingDescription.value = true;
	editDescriptionText.value = group.value.description ?? '';
	nextTick(() => {
		const textarea = descriptionTextarea.value;
		textarea?.focus();
		textarea?.select();
		autoResizeTextarea();
	});
}

function cancelEditing() {
	isEditingDescription.value = false;
}

function onTextareaFocus() {
	descriptionTextarea.value?.select();
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
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		saveDescription();
	}
	if (event.key === 'Escape') {
		isEditingDescription.value = false;
	}
}

async function focusTitleEdit() {
	if (props.autofocusGroupId !== group.value.id || props.readOnly || !isAutofocusReady.value)
		return;
	await nextTick();
	if (isCollapsed.value) {
		emit('title:focused', group.value.id);
		return;
	}
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

const { calculateNodeBorderOpacityStyle } = useZoomAdjustedValues(viewport);
const nodeBorderOpacityStyle = calculateNodeBorderOpacityStyle();

function onWrapperPointerDown(event: PointerEvent) {
	const target = event.target as HTMLElement | null;
	if (target?.closest('.nodrag')) return;

	const selected = getSelectedNodes.value;
	if (selected.length === 0) return;

	const myVueFlowId = createCanvasGroupNodeId(group.value.id);
	const isPartOfSelection = selected.some((n) => n.id === myVueFlowId);
	if (isPartOfSelection) return;

	removeSelectedNodes(selected);
}

function onWrapperMouseOver(event: MouseEvent) {
	const target = event.target as HTMLElement | null;
	headerHovered.value = !target?.closest('.nodrag');
}

function onWrapperMouseOut(event: MouseEvent) {
	const relatedTarget = event.relatedTarget as HTMLElement | null;
	if (!(event.currentTarget as HTMLElement)?.contains(relatedTarget)) {
		headerHovered.value = false;
	}
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
		@click="onWrapperClick"
		@mouseover="onWrapperMouseOver"
		@mouseout="onWrapperMouseOut"
		@pointerdown="onWrapperPointerDown"
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
				<div :class="$style.titleColumn">
					<div :class="$style.title" data-test-id="canvas-node-group-title">
						<template v-if="isCollapsed">
							<N8nTooltip
								:content="group.name"
								:disabled="!isTitleTruncated"
								:show-after="500"
								placement="bottom"
							>
								<div ref="collapsedTitleText" :class="$style.titleTextCollapsed">
									{{ group.name }}
								</div>
							</N8nTooltip>
						</template>
						<template v-else>
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
							</div>
						</template>
					</div>

					<N8nInlineTextEdit
						v-if="!isCollapsed && showExpandedDescription"
						:class="['nodrag', $style.inlineEdit, $style.descriptionInline]"
						:model-value="group.description ?? ''"
						:read-only="readOnly"
						:min-width="0"
						max-width="100%"
						:placeholder="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
						data-test-id="canvas-node-group-description"
						@update:model-value="onDescriptionUpdate"
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

				<N8nIcon
					v-if="!readOnly && isCollapsed && isDescriptionEnabled && !isPermanentVisible"
					class="nodrag"
					:class="$style.infoIcon"
					icon="info"
					data-test-id="canvas-node-group-info"
					@mouseenter="onInfoMouseEnter"
					@mouseleave="onInfoMouseLeave"
				/>
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
		</div>

		<div
			v-if="showCollapsedDescription"
			:class="[
				'nodrag',
				$style.descriptionArea,
				$style.permanentCollapsed,
				{
					[$style.descriptionEditing]: isEditingDescription,
					[$style.descriptionHovered]: isDescriptionHovered,
				},
			]"
			data-test-id="canvas-node-group-description"
			@mouseenter="onDescriptionMouseEnter"
			@mouseleave="onDescriptionMouseLeave"
		>
			<div :class="$style.descriptionContent">
				<N8nText
					v-if="!isEditingDescription"
					:color="isDescriptionEmpty ? 'text-base' : 'text-base'"
					data-test-id="canvas-node-group-description-text"
					@click.stop="startEditing"
				>
					{{ group.description || i18n.baseText('canvas.nodeGroup.descriptionPlaceholder') }}
				</N8nText>
				<textarea
					v-else
					ref="descriptionTextarea"
					v-model="editDescriptionText"
					:class="$style.descriptionEdit"
					:maxlength="DESCRIPTION_MAX_LENGTH"
					:placeholder="i18n.baseText('canvas.nodeGroup.descriptionPlaceholder')"
					@blur="saveDescription"
					@focus="onTextareaFocus"
					@input="autoResizeTextarea"
					@keydown="onDescriptionKeydown"
				/>
			</div>
			<div v-if="!readOnly" :class="$style.descriptionActions">
				<template v-if="isEditingDescription">
					<N8nTooltip :content="i18n.baseText('canvas.nodeGroup.cancelEdit')" placement="bottom">
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							icon="times"
							:aria-label="i18n.baseText('canvas.nodeGroup.cancelEdit')"
							data-test-id="canvas-node-group-cancel-edit"
							@click.stop="cancelEditing"
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
							data-test-id="canvas-node-group-save-description"
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
							@click.stop="startEditing"
						/>
					</N8nTooltip>
					<N8nTooltip
						:content="
							isPermanentVisible
								? i18n.baseText('canvas.nodeGroup.unpinDescription')
								: i18n.baseText('canvas.nodeGroup.pinDescription')
						"
						placement="bottom"
					>
						<N8nIconButton
							class="nodrag"
							variant="ghost"
							size="small"
							:icon="isPermanentVisible ? 'eye-off' : 'eye'"
							:aria-label="
								isPermanentVisible
									? i18n.baseText('canvas.nodeGroup.unpinDescription')
									: i18n.baseText('canvas.nodeGroup.pinDescription')
							"
							data-test-id="canvas-node-group-pin-description"
							@click.stop="onInfoClick"
						/>
					</N8nTooltip>
				</template>
			</div>
		</div>

		<div
			v-if="!isCollapsed"
			:class="$style.frame"
			:style="frameStyle"
			data-test-id="canvas-node-group-frame"
		/>
	</div>
</template>

<style lang="scss" module>
@use '../../../components/elements/nodes/render-types/_canvasNodeStyles.scss' as styles;

$header-height: 96px;
$description-height: 48px;

.wrapper {
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

	.wrapper.selected & {
		@include styles.canvas-node-selected-ring;
	}

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

.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	height: 100%;
	padding: var(--spacing--lg) var(--spacing--sm) var(--spacing--lg) var(--spacing--lg);
	overflow: hidden;
}

.titleColumn {
	display: flex;
	flex-direction: column;
	justify-content: center;
	min-width: 0;
	height: 100%;
	gap: var(--spacing--3xs);
}

.title {
	display: flex;
	align-items: center;
	min-width: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
}

.titleText {
	display: block;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	overflow: clip;
	overflow-clip-margin: var(--spacing--2xs);
}

.titleTextCollapsed {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	overflow-wrap: anywhere;
	line-height: var(--line-height--sm);
	width: 100%;
	min-width: 0;
}

.inlineEdit {
	width: fit-content;
	max-width: 100%;
}

.statusIcons {
	display: flex;
	align-items: center;
	margin-left: var(--spacing--xs);
	flex-shrink: 0;
}

.issues {
	color: var(--color--danger);
}

.infoIcon {
	margin-right: auto;
	color: var(--text-color--subtler);
	flex-shrink: 0;
}

.toggle {
	margin-left: auto;
}

.toggle[aria-expanded='true']:not(:hover):not(:active) {
	background-color: transparent;
}

.wrapper.headerHovered .toggle:not(:hover):not(:active) {
	background-color: var(--background--hover);
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

.descriptionArea {
	position: absolute;
	display: flex;
	flex-direction: column;
	background: var(--background--subtle);
	border: 1px solid var(--border-color--strong);
	border-radius: var(--radius--xs);
	padding: var(--spacing--lg) var(--spacing--sm) var(--spacing--lg) var(--spacing--lg);
	box-sizing: border-box;
	z-index: 500;
	overflow: hidden;

	&.permanentCollapsed {
		top: calc($header-height + 4px);
		left: 0;
		width: 100%;
	}

	&.descriptionEditing {
		border-color: var(--color--secondary);
	}
}

.descriptionInline {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--text-color--subtle);
	max-height: 2em;
}

.descriptionText {
	font-size: var(--font-size--sm);
	color: var(--text-color--subtle);
	cursor: text;
}

.descriptionPlaceholder {
	font-size: var(--font-size--sm);
	color: var(--text-color--disabled);
	cursor: text;
}

.descriptionContent {
	flex: 1;
	min-width: 0;
}

.descriptionActions {
	display: none;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	margin-top: var(--spacing--xs);
}

.descriptionArea:hover .descriptionActions,
.descriptionArea.descriptionEditing .descriptionActions,
.descriptionArea.descriptionHovered .descriptionActions,
.wrapper.headerHovered .descriptionActions {
	display: flex;
}

.descriptionEdit {
	width: 100%;
	padding: 0;
	font-size: var(--font-size--sm);
	font-family: inherit;
	color: var(--color--text-subtle);
	background: var(--background--subtle);
	line-height: var(--line-height--lg);
	border: none;
	outline: none;
	resize: none;
	box-sizing: border-box;
	overflow: hidden;
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

.handle {
	opacity: 0;
	pointer-events: none;
}
</style>
