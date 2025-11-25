<script setup lang="ts">
/* eslint-disable vue/no-multiple-template-root */
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeFrameRender } from '../../../../canvas.types';
import { ref, computed, useCssModule, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { NodeResizer } from '@vue-flow/node-resizer';
import type { OnResize } from '@vue-flow/node-resizer';
import type { XYPosition } from '@vue-flow/core';
import { N8nIconButton, N8nPopover } from '@n8n/design-system';

defineOptions({
	inheritAttrs: false,
});

const emit = defineEmits<{
	update: [parameters: Record<string, unknown>];
	move: [position: XYPosition];
	activate: [id: string];
	deactivate: [id: string];
	'open:contextmenu': [event: MouseEvent];
}>();

const $style = useCssModule();

const { id, isSelected, isReadOnly, render, eventBus, label } = useCanvasNode();

const renderOptions = computed(() => render.value.options as CanvasNodeFrameRender['options']);

const isEditingLabel = ref(false);
const editedLabel = ref('');
const labelInputRef = ref<HTMLInputElement | null>(null);
const isColorPickerOpen = ref(false);

const frameColorClass = computed(() => `color-${renderOptions.value.color ?? 1}`);
const colors = computed(() => Array.from({ length: 7 }).map((_, index) => index + 1));
const labelText = computed(() => (typeof label.value === 'string' ? label.value : ''));

const classes = computed(() => ({
	[$style.frame]: true,
	[$style.selected]: isSelected.value,
	[$style[frameColorClass.value]]: true,
}));

/**
 * Resizing
 */

function onResize(event: OnResize) {
	emit('move', {
		x: event.params.x,
		y: event.params.y,
	});

	emit('update', {
		...(event.params.width ? { width: event.params.width } : {}),
		...(event.params.height ? { height: event.params.height } : {}),
	});
}

/**
 * Label editing
 */

function onStartEditLabel() {
	if (isReadOnly.value) return;
	isEditingLabel.value = true;
	editedLabel.value = renderOptions.value.label ?? labelText.value ?? '';
	void nextTick(() => {
		labelInputRef.value?.focus();
		labelInputRef.value?.select();
	});
}

function onFinishEditLabel() {
	if (!isEditingLabel.value) return;
	isEditingLabel.value = false;
	if (editedLabel.value !== renderOptions.value.label) {
		emit('update', { label: editedLabel.value });
	}
}

function onLabelKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		onFinishEditLabel();
	} else if (event.key === 'Escape') {
		isEditingLabel.value = false;
	}
}

/**
 * Color change
 */

function onChangeColor(color: number) {
	emit('update', { color });
	isColorPickerOpen.value = false;
}

/**
 * Context menu
 */

function openContextMenu(event: MouseEvent) {
	emit('open:contextmenu', event);
}

/**
 * Activation (for color selector, etc.)
 */

function onActivate() {
	emit('activate', id.value);
}

/**
 * Lifecycle
 */

onMounted(() => {
	eventBus.value?.on('update:node:activated', onActivate);
});

onBeforeUnmount(() => {
	eventBus.value?.off('update:node:activated', onActivate);
});
</script>

<template>
	<NodeResizer
		:min-height="100"
		:min-width="200"
		:height="renderOptions.height"
		:width="renderOptions.width"
		:is-visible="!isReadOnly && isSelected"
		@resize="onResize"
	/>
	<div
		v-bind="$attrs"
		:class="classes"
		:style="{
			width: `${renderOptions.width}px`,
			height: `${renderOptions.height}px`,
		}"
		data-test-id="canvas-frame"
		@contextmenu="openContextMenu"
	>
		<div :class="$style.header">
			<div :class="$style.labelArea" @dblclick.stop="onStartEditLabel">
				<input
					v-if="isEditingLabel"
					ref="labelInputRef"
					v-model="editedLabel"
					:class="$style.labelInput"
					type="text"
					@blur="onFinishEditLabel"
					@keydown="onLabelKeydown"
				/>
				<span v-else :class="$style.label">{{ renderOptions.label || labelText || 'Frame' }}</span>
			</div>
			<div v-if="!isReadOnly" :class="$style.headerActions">
				<N8nPopover
					v-model:visible="isColorPickerOpen"
					effect="dark"
					trigger="click"
					placement="bottom"
					:popper-style="{ width: '208px' }"
					:teleported="true"
				>
					<template #reference>
						<N8nIconButton
							data-test-id="change-frame-color"
							type="tertiary"
							text
							size="mini"
							icon="palette"
							title="Change color"
							@click.stop
						/>
					</template>
					<div :class="$style.colorPicker">
						<div
							v-for="color in colors"
							:key="color"
							data-test-id="color"
							:class="[
								$style.colorOption,
								$style[`frame-color-${color}`],
								renderOptions.color === color ? $style.colorSelected : '',
							]"
							@click="onChangeColor(color)"
						></div>
					</div>
				</N8nPopover>
			</div>
		</div>
		<div :class="$style.content">
			<!-- Frame content area - nodes inside render on top via z-index -->
		</div>
	</div>
</template>

<style lang="scss" module>
.frame {
	position: relative;
	border: 2px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
	pointer-events: auto;
	display: flex;
	flex-direction: column;

	// Color variants
	&.color-1 {
		border-color: var(--color--foreground);
		background-color: rgba(var(--color--foreground--shade-1-rgb, 68, 68, 68), 0.05);
	}

	&.color-2 {
		border-color: var(--color--primary);
		background-color: rgba(var(--color--primary-rgb, 255, 116, 0), 0.05);
	}

	&.color-3 {
		border-color: var(--color--success);
		background-color: rgba(var(--color--success-rgb, 30, 132, 73), 0.05);
	}

	&.color-4 {
		border-color: var(--color--warning);
		background-color: rgba(var(--color--warning-rgb, 255, 170, 0), 0.05);
	}

	&.color-5 {
		border-color: var(--color--danger);
		background-color: rgba(var(--color--danger-rgb, 255, 74, 51), 0.05);
	}

	&.color-6 {
		border-color: #7b61ff;
		background-color: rgba(123, 97, 255, 0.05);
	}

	&.color-7 {
		border-color: #00b4d8;
		background-color: rgba(0, 180, 216, 0.05);
	}

	&.selected {
		box-shadow: 0 0 0 4px var(--canvas--color--selected);
	}
}

.header {
	padding: var(--spacing--2xs) var(--spacing--xs);
	pointer-events: auto;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.labelArea {
	flex: 1;
	cursor: text;
	min-width: 0;
}

.label {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	user-select: none;
}

.labelInput {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	background: transparent;
	border: none;
	outline: none;
	padding: 0;
	margin: 0;
	width: 100%;

	&:focus {
		outline: none;
	}
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	opacity: 0;
	transition: opacity 0.15s ease-in-out;

	.frame:hover &,
	.frame.selected & {
		opacity: 1;
	}
}

.colorPicker {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing--2xs);
}

.colorOption {
	width: 20px;
	height: 20px;
	border-width: 1px;
	border-style: solid;
	border-color: var(--color--foreground--shade-2);
	border-radius: 50%;
	cursor: pointer;

	&:hover {
		transform: scale(1.1);
	}

	&.colorSelected {
		box-shadow:
			0 0 0 2px var(--color--background),
			0 0 0 4px currentColor;
	}

	// Frame colors matching the frame component colors
	&.frame-color-1 {
		background-color: var(--color--foreground);
	}

	&.frame-color-2 {
		background-color: var(--color--primary);
	}

	&.frame-color-3 {
		background-color: var(--color--success);
	}

	&.frame-color-4 {
		background-color: var(--color--warning);
	}

	&.frame-color-5 {
		background-color: var(--color--danger);
	}

	&.frame-color-6 {
		background-color: #7b61ff;
	}

	&.frame-color-7 {
		background-color: #00b4d8;
	}
}

.content {
	flex: 1;
	pointer-events: none; // Allow click-through to nodes inside
}
</style>
