<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCanvasNode } from '@/composables/useCanvasNode';
import type { CanvasNodeStickyNoteRender } from '@/types';

const emit = defineEmits<{
	update: [color: number];
}>();

const i18n = useI18n();

const { render, eventBus } = useCanvasNode();
const renderOptions = computed(() => render.value.options as CanvasNodeStickyNoteRender['options']);

const autoHideTimeout = ref<NodeJS.Timeout | null>(null);

const colors = computed(() => Array.from({ length: 7 }).map((_, index) => index + 1));

const isPopoverVisible = defineModel<boolean>('visible');

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
				@click.stop
			>
				<N8nIcon size="small" icon="palette" />
			</div>
		</template>
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

.color {
	width: 20px;
	height: 20px;
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
