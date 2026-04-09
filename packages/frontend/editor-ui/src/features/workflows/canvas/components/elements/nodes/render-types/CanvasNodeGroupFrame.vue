<script lang="ts" setup>
import { computed, ref, nextTick, useCssModule } from 'vue';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeGroupFrameRender } from '../../../../canvas.types';
import { N8nIcon } from '@n8n/design-system';

const $style = useCssModule();

const { id, isSelected, render } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeGroupFrameRender['options']);

const editingTitle = ref(false);
const editingDescription = ref(false);
const titleRef = ref<HTMLElement | null>(null);
const descriptionRef = ref<HTMLElement | null>(null);

const classes = computed(() => ({
	[$style.frame]: true,
	[$style.selected]: isSelected.value,
}));

const GROUP_COLORS = [
	{ name: 'Blue', value: 'rgb(0 90 255 / 0.08)', border: 'rgb(100 160 255 / 0.4)' },
	{ name: 'Purple', value: 'rgb(130 80 255 / 0.08)', border: 'rgb(160 120 255 / 0.4)' },
	{ name: 'Green', value: 'rgb(0 180 100 / 0.08)', border: 'rgb(60 200 130 / 0.4)' },
	{ name: 'Orange', value: 'rgb(255 140 0 / 0.08)', border: 'rgb(255 170 60 / 0.4)' },
	{ name: 'Red', value: 'rgb(255 60 60 / 0.08)', border: 'rgb(255 100 100 / 0.4)' },
	{ name: 'Teal', value: 'rgb(0 180 180 / 0.08)', border: 'rgb(60 200 200 / 0.4)' },
];

const currentColor = computed(() => {
	const c = renderOptions.value.color;
	return GROUP_COLORS.find((gc) => gc.value === c) ?? GROUP_COLORS[0];
});

const styles = computed(() => ({
	width: `${renderOptions.value.width}px`,
	height: `${renderOptions.value.height}px`,
	'--group-frame--bg': currentColor.value.value,
	'--group-frame--border': currentColor.value.border,
}));

async function startEditTitle() {
	if (editingTitle.value) return;
	editingTitle.value = true;
	await nextTick();
	titleRef.value?.focus();
	selectAll(titleRef.value);
}

async function startEditDescription() {
	if (editingDescription.value) return;
	editingDescription.value = true;
	await nextTick();
	descriptionRef.value?.focus();
	selectAll(descriptionRef.value);
}

function selectAll(el: HTMLElement | null) {
	if (!el) return;
	const range = document.createRange();
	range.selectNodeContents(el);
	const sel = window.getSelection();
	sel?.removeAllRanges();
	sel?.addRange(range);
}

function commitTitle() {
	editingTitle.value = false;
	const newValue = titleRef.value?.textContent?.trim() ?? '';
	window.dispatchEvent(
		new CustomEvent('update-group-field', {
			detail: { groupId: renderOptions.value.groupId, field: 'name', value: newValue },
		}),
	);
}

function commitDescription() {
	editingDescription.value = false;
	const newValue = descriptionRef.value?.innerText?.trim() ?? '';
	window.dispatchEvent(
		new CustomEvent('update-group-field', {
			detail: { groupId: renderOptions.value.groupId, field: 'description', value: newValue },
		}),
	);
}

function onTitleKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault();
		commitTitle();
	}
	if (event.key === 'Escape') {
		commitTitle();
	}
}

function onDescriptionKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		commitDescription();
	}
}
</script>

<template>
	<div :class="classes" :style="styles" data-test-id="canvas-group-frame" @dblclick.stop>
		<div :class="$style.header" @mousedown.stop>
			<div :class="$style.headerText">
				<div
					v-if="renderOptions.name || editingTitle"
					ref="titleRef"
					:class="[$style.title, { [$style.editing]: editingTitle }]"
					:contenteditable="editingTitle"
					@click.stop="startEditTitle"
					@blur="commitTitle"
					@keydown="onTitleKeydown"
				>
					{{ renderOptions.name }}
				</div>
				<div
					v-if="renderOptions.description || editingDescription"
					ref="descriptionRef"
					:class="[$style.description, { [$style.editing]: editingDescription }]"
					:contenteditable="editingDescription"
					@click.stop="startEditDescription"
					@blur="commitDescription"
					@keydown="onDescriptionKeydown"
				>
					{{ renderOptions.description }}
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.frame {
	position: relative;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	border: 2px dashed var(--group-frame--border, rgb(100 160 255 / 0.4));
	border-radius: var(--radius--xl);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background: var(--group-frame--bg, rgb(0 90 255 / 0.08));
	pointer-events: all;
	cursor: grab;

	&:active {
		cursor: grabbing;
	}
}

.header {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--xs) 0;
	gap: var(--spacing--2xs);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	cursor: text;
	border-radius: var(--radius--sm);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	margin: calc(-1 * var(--spacing--5xs)) calc(-1 * var(--spacing--4xs));

	&:hover:not(.editing) {
		background: light-dark(rgb(0 0 0 / 0.05), rgb(255 255 255 / 0.05));
	}

	&.editing {
		outline: 1px solid var(--color--primary--tint-1);
		background: light-dark(rgb(0 0 0 / 0.03), rgb(255 255 255 / 0.03));
	}
}

.description {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	cursor: text;
	border-radius: var(--radius--sm);
	padding: var(--spacing--5xs) var(--spacing--4xs);
	margin: calc(-1 * var(--spacing--5xs)) calc(-1 * var(--spacing--4xs));

	&:hover:not(.editing) {
		background: light-dark(rgb(0 0 0 / 0.05), rgb(255 255 255 / 0.05));
	}

	&.editing {
		outline: 1px solid var(--color--primary--tint-1);
		background: light-dark(rgb(0 0 0 / 0.03), rgb(255 255 255 / 0.03));
	}
}
</style>
