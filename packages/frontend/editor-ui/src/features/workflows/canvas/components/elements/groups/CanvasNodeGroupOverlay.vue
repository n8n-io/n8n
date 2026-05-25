<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { computed, nextTick, onMounted, useCssModule, useTemplateRef, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nInlineTextEdit } from '@n8n/design-system';

import type { IWorkflowGroup } from 'n8n-workflow';
import type { CanvasNodeGroupLayout } from '../../../composables/useCanvasNodeGroupsLayout';
import {
	GROUP_HEADER_HEIGHT as HEADER_HEIGHT,
	GROUP_TITLE_WIDTH as TITLE_WIDTH,
} from '../../../stores/canvasNodeGroups.constants';

const UNGROUP_NODES_SHORTCUT = { metaKey: true, shiftKey: true, keys: ['G'] };

const props = withDefaults(
	defineProps<{
		group: IWorkflowGroup;
		layout: CanvasNodeGroupLayout;
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
	'toggle:collapsed': [id: string];
	'header:dragstart': [id: string, event: MouseEvent];
}>();

const i18n = useI18n();
const $style = useCssModule();
const titleEdit = useTemplateRef<InstanceType<typeof N8nInlineTextEdit>>('titleEdit');

const visualHeight = computed(() => (props.layout.collapsed ? HEADER_HEIGHT : props.layout.height));

const wrapperClasses = computed(() => ({
	[$style.wrapper]: true,
	[$style.collapsed]: props.layout.collapsed,
	[$style.success]: props.layout.status === 'success',
	[$style.error]: props.layout.status === 'error',
	[$style.running]: props.layout.status === 'running',
	[$style.waiting]: props.layout.status === 'waiting',
}));

function onTitleUpdate(value: string) {
	emit('update:name', props.group.id, value);
}

function onUngroupClick() {
	emit('ungroup', props.group.id);
}

function onToggleCollapsed() {
	emit('toggle:collapsed', props.group.id);
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
		:class="wrapperClasses"
		:style="{
			left: `${layout.x}px`,
			top: `${layout.y}px`,
			width: `${layout.width}px`,
			height: `${visualHeight}px`,
		}"
		data-test-id="canvas-node-group"
		:data-group-id="group.id"
		:data-collapsed="layout.collapsed"
	>
		<div
			:class="[$style.header, { [$style.headerDraggable]: !readOnly }]"
			:style="{ height: `${HEADER_HEIGHT}px` }"
			data-test-id="canvas-node-group-header"
			@mousedown="onHeaderMouseDown"
		>
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
			<div :class="$style.titleRow">
				<N8nIconButton
					variant="ghost"
					size="small"
					icon="chevrons-down-up"
					:aria-label="
						layout.collapsed
							? i18n.baseText('canvas.nodeGroup.expand')
							: i18n.baseText('canvas.nodeGroup.collapse')
					"
					data-test-id="canvas-node-group-collapse-toggle"
					@click.stop="onToggleCollapsed"
					@mousedown.stop
				/>
				<div :class="$style.title" data-test-id="canvas-node-group-title">
					<N8nInlineTextEdit
						ref="titleEdit"
						:model-value="group.name"
						:read-only="readOnly"
						:min-width="0"
						:max-width="TITLE_WIDTH"
						:placeholder="i18n.baseText('canvas.nodeGroup.titlePlaceholder')"
						@update:model-value="onTitleUpdate"
						@mousedown.stop
					/>
				</div>
			</div>
		</div>
		<div
			v-if="!layout.collapsed"
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
	--canvas-node-group-border-color: var(--border-color);
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
	border: var(--border-width) solid var(--canvas-node-group-border-color);
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

.collapsed {
	.header {
		border-radius: var(--radius--lg);
	}
}

.success {
	--canvas-node-group-border-color: var(--color--success);
}

.error {
	--canvas-node-group-border-color: var(--color--danger);
}

.running,
.waiting {
	--canvas-node-group-border-color: var(--color--warning);
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

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.frame {
	position: absolute;
	left: 0;
	width: 100%;
	background: transparent;
	border: var(--border-width) dashed var(--canvas-node-group-border-color);
	border-top: none;
	border-radius: 0 0 var(--radius--lg) var(--radius--lg);
	pointer-events: none;
	box-sizing: border-box;
	z-index: -1;
}

.collapsed .frame {
	border-top: var(--border-width) solid var(--canvas-node-group-border-color);
	border-radius: var(--radius--lg);
}

.title {
	display: flex;
	align-items: center;
	width: 240px;
	min-width: 240px;
	max-width: 240px;
	height: 100%;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}
</style>
