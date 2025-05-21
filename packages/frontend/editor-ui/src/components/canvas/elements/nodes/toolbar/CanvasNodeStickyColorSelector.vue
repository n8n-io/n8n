<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import { useUIStore } from '@/stores/ui.store'; // [ria] uses UIStore to store custom hex color selection
import type { CanvasNodeStickyNoteRender } from '@/types';
import { N8nColorPicker } from '@n8n/design-system';

const emit = defineEmits<{
	update: [color: number | string]; // [ria] string for custom hex color selection
}>();

const i18n = useI18n();
const uiStore = useUIStore(); // [ria] initialize UIStore to store custom hex color selection

const { render, eventBus } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

const autoHideTimeout = ref<NodeJS.Timeout | null>(null);

// [ria] get or initialize custom color from UI store
const customStickyColor = computed({
	get: () => uiStore.customStickyColor, // [ria] maybe use default color here
	set: (color: string) => {
		uiStore.customStickyColor = color;
	},
});

// [ria] keep standard fixed colors
const colors = computed(() => Array.from({ length: 7 }).map((_, index) => index + 1)); // [ria] need to make changes here

const isPopoverVisible = defineModel<boolean>('visible');

function hidePopover() {
	isPopoverVisible.value = false;
}

function showPopover() {
	isPopoverVisible.value = true;
}

function changeColor(index: number) {
	if (index === 8) {
		// [ria] apply custom color when selecting 8th option
		emit('update', customStickyColor.value);
	} else {
		emit('update', index);
	}
	hidePopover();
}

// [ria] to update and use custom color in the UI store
function onColorPickerChange(value: string) {
	customStickyColor.value = value;
	if (renderOptions.value.color === 8 || typeof renderOptions.value.color === 'string') {
		emit('update', value);
	}
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
	<N8nPopover
		v-model:visible="isPopoverVisible"
		effect="dark"
		trigger="click"
		placement="top"
		:popper-class="$style.popover"
		:popper-style="{ width: '208px' }"
		:teleported="true"
		@before-enter="onMouseEnter"
		@after-leave="onMouseLeave"
	>
		<template #reference>
			<div
				:class="$style.option"
				data-test-id="change-sticky-color"
				:title="i18n.baseText('node.changeColor')"
			>
				<FontAwesomeIcon icon="palette" />
			</div>
		</template>
		<div :class="$style.content">
			<!-- original fixed color options (1-7) -->
			<div :class="$style.presetColors">
				<div
					v-for="color in colors.slice(0, 7)"
					:key="color"
					data-test-id="color"
					:class="[
						$style.color,
						$style[`sticky-color-${color}`],
						renderOptions.color === color ? $style.selected : '',
					]"
					@click="changeColor(color)"
				></div>
			</div>
			<!-- custom color (8th option) -->
			<div :class="$style.customColorOption">
				<div
					:class="[
						$style.color,
						$style.customColor,
						renderOptions.color === 8 || typeof renderOptions.color === 'string'
							? $style.selected
							: '',
					]"
					:style="{ backgroundColor: customStickyColor }"
					@click="changeColor(8)"
				></div>
				<div :class="$style.colorPickerContainer">
					<N8nColorPicker v-model="customStickyColor" size="small" @change="onColorPickerChange" />
				</div>
			</div>
		</div>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	min-width: 208px;
	margin-bottom: -8px;
	margin-left: -2px;
}

.content {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing-2xs);
}

.presetColors {
	display: flex;
	flex-direction: row;
	width: fit-content;
	gap: var(--spacing-2xs);
}

.customColorOption {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	margin-top: var(--spacing-2xs);
	padding-top: var(--spacing-2xs);
	border-top: 1px solid var(--color-foreground-light);
}

.colorPickerContainer {
	flex-grow: 1;
}

.color {
	width: 24px;
	height: 24px;
	border-width: 1px;
	border-style: solid;
	border-color: var(--color-foreground-xdark);
	border-radius: 50%;
	background: var(--color-sticky-background);

	&:hover {
		cursor: pointer;
	}

	&.selected {
		box-shadow: 0 0 0 1px var(--color-sticky-background);
	}

	&.sticky-color-1 {
		--color-sticky-background: var(--color-sticky-background-1);
	}

	&.sticky-color-2 {
		--color-sticky-background: var(--color-sticky-background-2);
	}

	&.sticky-color-3 {
		--color-sticky-background: var(--color-sticky-background-3);
	}

	&.sticky-color-4 {
		--color-sticky-background: var(--color-sticky-background-4);
	}

	&.sticky-color-5 {
		--color-sticky-background: var(--color-sticky-background-5);
	}

	&.sticky-color-6 {
		--color-sticky-background: var(--color-sticky-background-6);
	}

	&.sticky-color-7 {
		--color-sticky-background: var(--color-sticky-background-7);
	}
	&.customColor {
		flex-shrink: 0;
	}
}

.option {
	display: inline-block;
	padding: var(--spacing-3xs);
	color: var(--color-text-light);

	svg {
		width: var(--font-size-s) !important;
	}

	&:hover {
		color: var(--color-primary);
	}
}
</style>
