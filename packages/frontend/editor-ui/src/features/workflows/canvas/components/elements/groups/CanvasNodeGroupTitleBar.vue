<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nInlineTextEdit, N8nTooltip } from '@n8n/design-system';
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import {
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
	GROUP_PADDING_Y_BOTTOM as PADDING_Y_BOTTOM,
	GROUP_PADDING_Y_TOP as PADDING_Y_TOP,
} from '../../../stores/canvasNodeGroups.constants';
import {
	CANVAS_NODE_GROUP_HANDLE_LEFT,
	CANVAS_NODE_GROUP_HANDLE_RIGHT,
	CANVAS_NODE_GROUP_ID_PREFIX,
	type CanvasGroupViewState,
} from '../../../canvas.types';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };

// Only declare the props this component uses.
// Extra VueFlow slot props passed via v-bind are ignored.
defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		data: CanvasGroupViewState;
		selected?: boolean;
		readOnly?: boolean;
	}>(),
	{
		readOnly: false,
		selected: false,
	},
);

const emit = defineEmits<{
	'update:name': [id: string, name: string];
	'title:focused': [id: string];
	ungroup: [id: string];
}>();

const i18n = useI18n();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');
const titleText = useTemplateRef<HTMLElement>('titleText');

const group = computed(() => props.data.group);

const frameStyle = computed(() => ({
	top: `${HEADER_HEIGHT}px`,
	height: `${props.data.memberRect.height + PADDING_Y_TOP + PADDING_Y_BOTTOM}px`,
}));

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
	() => [group.value.name, props.data.memberRect.width],
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

async function focusTitleEdit() {
	if (!props.data.autofocusTitle || props.readOnly) return;
	await nextTick();
	titleEdit.value?.forceFocus();
	emit('title:focused', group.value.id);
}

watch(
	() => props.data.autofocusTitle,
	() => {
		void focusTitleEdit();
	},
	{ immediate: true },
);

const { getSelectedNodes, removeSelectedNodes } = useVueFlow();

// Clear unrelated pre-existing selection before VueFlow snapshots which
// nodes to drag — otherwise those nodes ride along with the group drag.
// Preserve the selection when this title bar is itself part of it
// (intentional multi-select drag).
function onWrapperPointerDown(event: PointerEvent) {
	// Clicks on .nodrag children (chevron, title edit, ungroup) aren't drag intent.
	const target = event.target as HTMLElement | null;
	if (target?.closest('.nodrag')) return;

	const selected = getSelectedNodes.value;
	if (selected.length === 0) return;

	// Multi-select drag that includes this title bar → preserve the selection.
	const myVueFlowId = `${CANVAS_NODE_GROUP_ID_PREFIX}${group.value.id}`;
	const isPartOfSelection = selected.some((n) => n.id === myVueFlowId);
	if (isPartOfSelection) return;

	removeSelectedNodes(selected);
}
</script>

<template>
	<div
		:class="[$style.wrapper, selected ? $style.selected : '']"
		:style="{
			width: '100%',
			height: `${HEADER_HEIGHT}px`,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
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
								class="nodrag"
								:model-value="group.name"
								:read-only="readOnly"
								:min-width="0"
								max-width="100%"
								:placeholder="i18n.baseText('canvas.nodeGroup.titlePlaceholder')"
								@update:model-value="onTitleUpdate"
							/>
						</div>
					</N8nTooltip>
				</div>
			</div>
		</div>

		<div :class="$style.frame" :style="frameStyle" data-test-id="canvas-node-group-frame" />
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
	border: var(--canvas-node--border-width) solid var(--canvas-node--border-color);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	box-sizing: border-box;

	.wrapper.selected & {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		box-shadow: 0 0 0 calc(6px * var(--canvas-zoom-compensation-factor, 1))
			var(--canvas--color--selected-transparent);
	}
}

.content {
	display: flex;
	align-items: center;
	gap: 0;
	height: 100%;
	padding: 0 var(--spacing--sm);
	overflow: hidden;
}

.title {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	height: 100%;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.titleText {
	display: block;
	width: 100%;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
	background: transparent;
	border: var(--canvas-node--border-width, 1.5px) dashed var(--canvas-node--border-color);
	border-top: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	z-index: 0;
}

.handle {
	top: 50%;
	transform: translateY(-50%);
	opacity: 0;
	pointer-events: none;
}
</style>
