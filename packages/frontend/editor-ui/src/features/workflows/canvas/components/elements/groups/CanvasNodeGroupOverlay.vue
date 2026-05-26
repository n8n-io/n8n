<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nInlineTextEdit } from '@n8n/design-system';
import { getRectOfNodes } from '@vue-flow/core';
import type { GraphNode } from '@vue-flow/core';

import type { IWorkflowGroup } from 'n8n-workflow';
import {
	GROUP_PADDING_X as PADDING_X,
	GROUP_PADDING_Y_TOP as PADDING_Y_TOP,
	GROUP_PADDING_Y_BOTTOM as PADDING_Y_BOTTOM,
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
} from '../../../stores/canvasNodeGroups.constants';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };
const COLLAPSE_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['C'] };

const props = withDefaults(
	defineProps<{
		group: IWorkflowGroup;
		memberNodes: GraphNode[];
		readOnly?: boolean;
		autofocusTitle?: boolean;
	}>(),
	{
		readOnly: false,
		autofocusTitle: false,
	},
);

const emit = defineEmits<{
	'update:name': [id: string, name: string];
	'title:focused': [id: string];
	ungroup: [id: string];
	'toggle:collapse': [id: string];
	'header:dragstart': [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');

const layout = computed(() => {
	if (props.memberNodes.length === 0) {
		return null;
	}
	const rect = getRectOfNodes(props.memberNodes);
	const wrapperX = rect.x - PADDING_X;
	const wrapperY = rect.y - PADDING_Y_TOP - HEADER_HEIGHT;
	const wrapperWidth = rect.width + 2 * PADDING_X;
	const wrapperHeight = HEADER_HEIGHT + rect.height + PADDING_Y_TOP + PADDING_Y_BOTTOM;
	return {
		x: wrapperX,
		y: wrapperY,
		width: wrapperWidth,
		height: wrapperHeight,
		frameTop: HEADER_HEIGHT,
		frameHeight: rect.height + PADDING_Y_TOP + PADDING_Y_BOTTOM,
	};
});

function onTitleUpdate(value: string) {
	emit('update:name', props.group.id, value);
}

function onUngroupClick() {
	emit('ungroup', props.group.id);
}

function onCollapseClick() {
	emit('toggle:collapse', props.group.id);
}

function onHeaderMouseDown(event: MouseEvent) {
	if (props.readOnly || event.button !== 0) return;
	emit('header:dragstart', props.group.id, event);
}

async function focusTitleEdit() {
	if (!props.autofocusTitle || props.readOnly) return;

	await nextTick();
	titleEdit.value?.forceFocus();
	emit('title:focused', props.group.id);
}

onMounted(() => {
	void focusTitleEdit();
});

watch(
	() => props.autofocusTitle,
	() => {
		void focusTitleEdit();
	},
);
</script>

<template>
	<div
		v-if="layout"
		:class="$style.wrapper"
		:style="{
			left: `${layout.x}px`,
			top: `${layout.y}px`,
			width: `${layout.width}px`,
			height: `${layout.height}px`,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
	>
		<div
			:class="[$style.header, { [$style.headerDraggable]: !readOnly }]"
			:style="{ height: `${HEADER_HEIGHT}px` }"
			data-test-id="canvas-node-group-header"
			@mousedown="onHeaderMouseDown"
		>
			<KeyboardShortcutTooltip
				v-if="!readOnly"
				:label="i18n.baseText('canvas.nodeGroup.collapse')"
				:shortcut="COLLAPSE_NODES_SHORTCUT"
			>
				<N8nIconButton
					:class="$style.collapseToggle"
					variant="ghost"
					size="small"
					icon="chevrons-up-down"
					:aria-label="i18n.baseText('canvas.nodeGroup.collapse')"
					data-test-id="canvas-node-group-collapse"
					@click.stop="onCollapseClick"
					@mousedown.stop
				/>
			</KeyboardShortcutTooltip>
			<div v-if="!readOnly" :class="$style.toolbar" data-test-id="canvas-node-group-toolbar">
				<div :class="$style.toolbarItems">
					<KeyboardShortcutTooltip
						:label="i18n.baseText('canvas.selection.toolbar.ungroup')"
						:shortcut="UNGROUP_NODES_SHORTCUT"
					>
						<N8nIconButton
							variant="ghost"
							size="small"
							icon="ungroup"
							:aria-label="i18n.baseText('canvas.selection.toolbar.ungroup')"
							data-test-id="canvas-node-group-ungroup"
							@click.stop="onUngroupClick"
							@mousedown.stop
						/>
					</KeyboardShortcutTooltip>
				</div>
			</div>
			<div :class="$style.title" data-test-id="canvas-node-group-title">
				<N8nInlineTextEdit
					ref="titleEdit"
					:model-value="group.name"
					:read-only="readOnly"
					:min-width="0"
					max-width="100%"
					:placeholder="i18n.baseText('canvas.nodeGroup.titlePlaceholder')"
					@update:model-value="onTitleUpdate"
					@mousedown.stop
				/>
			</div>
		</div>
		<div
			:class="$style.frame"
			:style="{
				top: `${layout.frameTop}px`,
				height: `${layout.frameHeight}px`,
			}"
			data-test-id="canvas-node-group-frame"
		/>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	position: absolute;
	pointer-events: none;
}

.header {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	display: flex;
	align-items: center;
	padding: 0 var(--spacing--sm);
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg) var(--radius--lg) 0 0;
	pointer-events: auto;
	box-sizing: border-box;
	z-index: 2;

	.toolbarItems {
		opacity: 0;
		transition: opacity 0.1s ease-in;
	}

	&:hover .toolbarItems {
		opacity: 1;
	}
}

.headerDraggable {
	cursor: grab;

	&:active {
		cursor: grabbing;
	}
}

.toolbar {
	position: absolute;
	bottom: 100%;
	left: 50%;
	transform: translateX(-50%);
	padding-bottom: var(--spacing--3xs);
	z-index: 1;
	pointer-events: auto;
}

.toolbarItems {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--canvas--color--background);
	border-radius: var(--radius);
}

.frame {
	position: absolute;
	left: 0;
	width: 100%;
	background: transparent;
	border: var(--border-width) dashed var(--border-color);
	border-top: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	z-index: -1;
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

.collapseToggle {
	flex-shrink: 0;
	pointer-events: auto;
	margin-right: var(--spacing--3xs);
}
</style>
