<script setup lang="ts">
import type { XYPosition } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { v4 as uuid } from 'uuid';
import { computed, ref, watch } from 'vue';

type Props = {
	type: string;
	disabled?: boolean;
	sticky?: boolean;
	stickyOffset?: XYPosition;
	stickyOrigin?: 'top-left' | 'center';
};

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	sticky: false,
	stickyOffset: () => [0, 0],
	stickyOrigin: 'top-left',
});

const emit = defineEmits<{
	drop: [value: string, event: MouseEvent];
}>();

const hovering = ref(false);
const targetRef = ref<HTMLElement>();
const id = ref(uuid());

const ndvStore = useNDVStore();
const isDragging = computed(() => ndvStore.isDraggableDragging);
const draggableType = computed(() => ndvStore.draggableType);
const draggableDimensions = computed(() => ndvStore.draggable.dimensions);
const droppable = computed(
	() => !props.disabled && isDragging.value && draggableType.value === props.type,
);
const activeDrop = computed(() => droppable.value && hovering.value);

watch(activeDrop, (active) => {
	if (active) {
		const stickyPosition = getStickyPosition();
		ndvStore.setDraggableTarget({ id: id.value, stickyPosition });
	} else if (ndvStore.draggable.activeTarget?.id === id.value) {
		// Only clear active target if it is this one
		ndvStore.setDraggableTarget(null);
	}
});

function onMouseEnter() {
	hovering.value = true;
}

function onMouseLeave() {
	hovering.value = false;
}

function onMouseUp(event: MouseEvent) {
	if (activeDrop.value) {
		const data = ndvStore.draggableData;
		emit('drop', data, event);
	}
}

function getStickyPosition(): XYPosition | null {
	if (props.disabled || !props.sticky || !hovering.value || !targetRef.value) {
		return null;
	}

	const { left, top, width, height } = targetRef.value.getBoundingClientRect();

	if (props.stickyOrigin === 'center') {
		return [
			left + props.stickyOffset[0] + width / 2 - (draggableDimensions.value?.width ?? 0) / 2,
			top + props.stickyOffset[1] + height / 2 - (draggableDimensions.value?.height ?? 0) / 2,
		];
	}

	return [left + props.stickyOffset[0], top + props.stickyOffset[1]];
}
</script>

<template>
	<div ref="targetRef" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave" @mouseup="onMouseUp">
		<slot :droppable="droppable" :active-drop="activeDrop"></slot>
	</div>
</template>
