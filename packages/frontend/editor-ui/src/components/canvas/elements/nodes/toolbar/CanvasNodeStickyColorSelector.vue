<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
// No longer needing UI store as we're using local state
import type { CanvasNodeStickyNoteRender } from '@/types';
import { N8nColorPicker } from '@n8n/design-system';

const emit = defineEmits<{
	update: [color: number | string]; // [ria] string for custom color selection
}>();

const i18n = useI18n();

const { render, eventBus } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

const autoHideTimeout = ref<NodeJS.Timeout | null>(null);

// Local state for color picker
const localStickyColor = ref(
	renderOptions.value.color && typeof renderOptions.value.color === 'string'
		? renderOptions.value.color
		: 'hsl(194, 88%, 67%)',
); // Default color if none set

// Generate array of numbers 1-7 for the standard fixed colors
const colors = computed(() => Array.from({ length: 7 }).map((_, index) => index + 1));

const isPopoverVisible = defineModel<boolean>('visible');

function hidePopover() {
	isPopoverVisible.value = false;
}

function showPopover() {
	isPopoverVisible.value = true;
}

function changeColor(index: number) {
	if (index === 8) {
		// Apply custom color when selecting 8th option
		emit('update', localStickyColor.value);
	} else {
		emit('update', index);
	}
}

// Handle color picker change events
function onColorPickerChange(value: string) {
	console.log('onColorPickerChange called with value:', value);
	localStickyColor.value = value;
	// Always emit the update with the HSL color directly
	emit('update', value);
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
		trigger="manual"
		placement="top"
		:popper-class="$style.popover"
		:popper-style="{ width: '240px' }"
		:teleported="true"
		@before-enter="onMouseEnter"
		@after-leave="onMouseLeave"
	>
		<template #reference>
			<div
				:class="$style.option"
				data-test-id="change-sticky-color"
				:title="i18n.baseText('node.changeColor')"
				@click="showPopover"
			>
				<FontAwesomeIcon icon="palette" />
			</div>
		</template>
		<div :class="$style.content" @click.stop>
			<!-- original fixed color options (1-7) -->
			<div :class="$style.presetColors" @click.stop>
				<div
					v-for="color in colors.slice(0, 7)"
					:key="color"
					data-test-id="color"
					:class="[
						$style.color,
						$style[`sticky-color-${color}`],
						renderOptions.color === color ? $style.selected : '',
					]"
					@click.stop="changeColor(color)"
				></div>
			</div>
			<!-- custom color (8th option) -->
			<div :class="$style.customColorOption" @click.stop>
				<div :class="$style.colorPickerContainer" @click.stop>
					<N8nColorPicker
						v-model="localStickyColor"
						size="small"
						:show-input="false"
						:color-format="'hsl'"
						@update:modelValue="onColorPickerChange"
						@change="onColorPickerChange"
						@active-change="onColorPickerChange"
						@click.stop
					/>
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
