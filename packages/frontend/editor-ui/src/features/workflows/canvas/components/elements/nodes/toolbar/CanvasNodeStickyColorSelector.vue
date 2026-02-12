<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '../../../../composables/useCanvasNode';
import type { CanvasNodeStickyNoteRender } from '../../../../canvas.types';

import { N8nIcon, N8nPopover } from '@n8n/design-system';

const emit = defineEmits<{
	update: [color: number | string];
}>();

const i18n = useI18n();

const { render, eventBus } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

const autoHideTimeout = ref<NodeJS.Timeout | null>(null);

const colors = computed(() => Array.from({ length: 7 }).map((_, index) => index + 1));

const isPopoverVisible = defineModel<boolean>('visible');

const colorInputRef = ref<HTMLInputElement | null>(null);

function hidePopover() {
	isPopoverVisible.value = false;
}

function showPopover() {
	isPopoverVisible.value = true;
}

function changeColor(index: number) {
	emit('update', index);
	hidePopover();
}

function openNativeColorPicker() {
	colorInputRef.value?.click();
}

function onNativeColorChange(event: Event) {
	const input = event.target as HTMLInputElement;
	emit('update', input.value.toUpperCase());
	hidePopover();
}

function onMouseEnter() {
	if (autoHideTimeout.value) {
		clearTimeout(autoHideTimeout.value);
		autoHideTimeout.value = null;
	}
}

function onMouseLeave() {
	autoHideTimeout.value = setTimeout(() => {
		hidePopover();
	}, 1000);
}

onMounted(() => {
	eventBus.value?.on('update:sticky:color', showPopover);
});

onBeforeUnmount(() => {
	eventBus.value?.off('update:sticky:color', showPopover);
});
</script>

<template>
	<div>
		<N8nPopover
			v-model:open="isPopoverVisible"
			side="top"
			width="240px"
			:content-class="$style.popover"
			:enable-scrolling="false"
			@before-enter="onMouseEnter"
			@after-leave="onMouseLeave"
		>
			<template #trigger>
				<div
					:class="$style.option"
					data-test-id="change-sticky-color"
					:title="i18n.baseText('node.changeColor')"
				>
					<N8nIcon size="small" icon="palette" />
				</div>
			</template>
			<template #content>
				<div :class="$style.content">
					<div
						v-for="color in colors"
						:key="color"
						data-test-id="color"
						:class="[
							$style.color,
							$style[`sticky-color-${color}`],
							renderOptions.color === color ? $style.selected : '',
						]"
						@click="changeColor(color)"
					></div>

					<div
						data-test-id="custom-color"
						:class="[
							$style.color,
							$style.customColorButton,
							typeof renderOptions.color === 'string' ? $style.selected : '',
						]"
						:style="
							typeof renderOptions.color === 'string'
								? { backgroundColor: renderOptions.color }
								: {}
						"
						:title="i18n.baseText('node.customColor')"
						@click.stop="openNativeColorPicker"
					>
						<N8nIcon icon="plus" size="xsmall" :class="$style.plusIcon" />
					</div>
				</div>
			</template>
		</N8nPopover>

		<input
			ref="colorInputRef"
			type="color"
			:class="$style.hiddenColorInput"
			data-test-id="native-color-input"
			@change="onNativeColorChange"
		/>
	</div>
</template>

<style lang="scss" module>
.popover {
	min-width: 240px;
	margin-bottom: calc(-1 * var(--spacing--2xs));
	margin-left: calc(-1 * var(--spacing--5xs));
}

.content {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing--2xs);
}

.color {
	width: 20px;
	height: 20px;
	border-width: 1px;
	border-style: solid;
	border-color: var(--color--foreground--shade-2);
	border-radius: 50%;
	background: var(--sticky--color--background);

	&:hover {
		cursor: pointer;
	}

	&.selected {
		box-shadow: 0 0 0 1px var(--sticky--color--background);
	}

	&.sticky-color-1 {
		--sticky--color--background: var(--sticky--color--background--variant-1);
	}

	&.sticky-color-2 {
		--sticky--color--background: var(--sticky--color--background--variant-2);
	}

	&.sticky-color-3 {
		--sticky--color--background: var(--sticky--color--background--variant-3);
	}

	&.sticky-color-4 {
		--sticky--color--background: var(--sticky--color--background--variant-4);
	}

	&.sticky-color-5 {
		--sticky--color--background: var(--sticky--color--background--variant-5);
	}

	&.sticky-color-6 {
		--sticky--color--background: var(--sticky--color--background--variant-6);
	}

	&.sticky-color-7 {
		--sticky--color--background: var(--sticky--color--background--variant-7);
	}
}

.option {
	display: inline-block;
	padding: var(--spacing--3xs);
	color: var(--color--text--tint-1);

	svg {
		width: var(--font-size--sm) !important;
	}

	&:hover {
		color: var(--color--primary);
	}
}

.customColorButton {
	position: relative;
	background: conic-gradient(
		from 0deg,
		hsl(0, 100%, 50%),
		hsl(60, 100%, 50%),
		hsl(120, 100%, 50%),
		hsl(180, 100%, 50%),
		hsl(240, 100%, 50%),
		hsl(300, 100%, 50%),
		hsl(360, 100%, 50%)
	);

	&:hover {
		cursor: pointer;
	}
}

.plusIcon {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	color: white;
	filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.hiddenColorInput {
	position: absolute;
	opacity: 0;
	width: 0;
	height: 0;
	pointer-events: none;
}
</style>
