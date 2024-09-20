<script setup lang="ts">
import type { XYPosition } from '@/Interface';
import { useNDVStore } from '@/stores/ndv.store';
import { isPresent } from '@/utils/typesUtils';
import { type StyleValue, computed, ref } from 'vue';

type Props = {
	type: string;
	data?: string;
	tag?: string;
	targetDataKey?: string;
	disabled?: boolean;
};

const props = withDefaults(defineProps<Props>(), { tag: 'div', disabled: false });

const emit = defineEmits<{
	drag: [value: XYPosition];
	dragstart: [value: HTMLElement];
	dragend: [value: HTMLElement];
}>();

const isDragging = ref(false);
const draggingElement = ref<HTMLElement>();
const draggablePosition = ref<XYPosition>([0, 0]);
const animationFrameId = ref<number>();
const ndvStore = useNDVStore();

const draggableStyle = computed<StyleValue>(() => ({
	transform: `translate(${draggablePosition.value[0]}px, ${draggablePosition.value[1]}px)`,
}));

const canDrop = computed(() => ndvStore.canDraggableDrop);

const stickyPosition = computed(() => ndvStore.draggableStickyPos);

const onDragStart = (event: MouseEvent) => {
	if (props.disabled) {
		return;
	}

	draggingElement.value = event.target as HTMLElement;
	if (props.targetDataKey && draggingElement.value.dataset?.target !== props.targetDataKey) {
		draggingElement.value = draggingElement.value.closest(
			`[data-target="${props.targetDataKey}"]`,
		) as HTMLElement;
	}

	if (props.targetDataKey && draggingElement.value?.dataset?.target !== props.targetDataKey) {
		return;
	}

	event.preventDefault();
	event.stopPropagation();

	isDragging.value = false;
	draggablePosition.value = [event.pageX, event.pageY];

	window.addEventListener('mousemove', onDrag);
	window.addEventListener('mouseup', onDragEnd);

	// blur so that any focused inputs update value
	const activeElement = document.activeElement as HTMLElement;
	if (activeElement) {
		activeElement.blur();
	}
};

const onDrag = (event: MouseEvent) => {
	event.preventDefault();
	event.stopPropagation();

	if (props.disabled) {
		return;
	}

	if (!isDragging.value && draggingElement.value) {
		isDragging.value = true;

		const data = props.targetDataKey ? draggingElement.value.dataset.value : (props.data ?? '');

		ndvStore.draggableStartDragging({
			type: props.type,
			data: data ?? '',
			dimensions: draggingElement.value?.getBoundingClientRect() ?? null,
		});

		emit('dragstart', draggingElement.value);
		document.body.style.cursor = 'grabbing';
	}

	animationFrameId.value = window.requestAnimationFrame(() => {
		if (canDrop.value && stickyPosition.value) {
			draggablePosition.value = stickyPosition.value;
		} else {
			draggablePosition.value = [event.pageX, event.pageY];
		}
		emit('drag', draggablePosition.value);
	});
};

const onDragEnd = () => {
	if (props.disabled) {
		return;
	}

	document.body.style.cursor = 'unset';
	window.removeEventListener('mousemove', onDrag);
	window.removeEventListener('mouseup', onDragEnd);
	if (isPresent(animationFrameId.value)) {
		window.cancelAnimationFrame(animationFrameId.value);
	}

	setTimeout(() => {
		if (draggingElement.value) emit('dragend', draggingElement.value);
		isDragging.value = false;
		draggingElement.value = undefined;
		ndvStore.draggableStopDragging();
	}, 0);
};
</script>

<template>
	<component
		:is="tag"
		ref="wrapper"
		:class="{ [$style.dragging]: isDragging }"
		@mousedown="onDragStart"
	>
		<slot :is-dragging="isDragging"></slot>

		<Teleport to="body">
			<div v-show="isDragging" ref="draggable" :class="$style.draggable" :style="draggableStyle">
				<slot name="preview" :can-drop="canDrop" :el="draggingElement"></slot>
			</div>
		</Teleport>
	</component>
</template>

<style lang="scss" module>
.dragging {
	visibility: visible;
	cursor: grabbing;
}

.draggable {
	pointer-events: none;
	position: fixed;
	z-index: 9999999;
	top: 0;
	left: 0;
}

.draggable-data-transfer {
	width: 0;
	height: 0;
}
</style>
