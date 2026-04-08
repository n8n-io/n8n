<script setup lang="ts">
import type { DraggableMode, XYPosition } from '@/Interface';
import { isPresent } from '@/app/utils/typesUtils';
import { type StyleValue, computed, onBeforeUnmount, ref } from 'vue';

type Props = {
	type: DraggableMode;
	data?: string | null;
	tag?: keyof HTMLElementTagNameMap;
	targetDataKey?: string | null;
	disabled?: boolean;
	canDrop?: boolean;
	stickyPosition?: XYPosition | null;
	/** Minimum distance in pixels the mouse must move before drag operation starts. Prevents accidental drags. */
	dragThreshold?: number;
};

const props = withDefaults(defineProps<Props>(), {
	data: null,
	tag: 'div',
	targetDataKey: null,
	disabled: false,
	canDrop: false,
	stickyPosition: null,
	dragThreshold: 10,
});

const emit = defineEmits<{
	drag: [value: XYPosition];
	dragstart: [value: HTMLElement, data: string | undefined];
	dragend: [value: HTMLElement];
}>();

const isDragging = ref(false);
const draggingElement = ref<HTMLElement>();
const draggablePosition = ref<XYPosition>([0, 0]);
const animationFrameId = ref<number>();
const dragStartPosition = ref<XYPosition | null>(null);

const draggableStyle = computed<StyleValue>(() => ({
	transform: `translate(${draggablePosition.value[0]}px, ${draggablePosition.value[1]}px)`,
}));

const onDragStart = (event: MouseEvent) => {
	if (props.disabled || event.buttons !== 1) {
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
	dragStartPosition.value = [event.pageX, event.pageY];
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
		if (dragStartPosition.value && props.dragThreshold > 0) {
			const dx = event.pageX - dragStartPosition.value[0];
			const dy = event.pageY - dragStartPosition.value[1];
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < props.dragThreshold) {
				return;
			}
		}

		isDragging.value = true;

		const data = props.targetDataKey ? draggingElement.value.dataset.value : (props.data ?? '');

		emit('dragstart', draggingElement.value, data);
		document.body.style.cursor = 'grabbing';
	}

	animationFrameId.value = window.requestAnimationFrame(() => {
		if (props.canDrop && props.stickyPosition) {
			draggablePosition.value = props.stickyPosition;
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
		if (isDragging.value && draggingElement.value) emit('dragend', draggingElement.value);
		isDragging.value = false;
		draggingElement.value = undefined;
		dragStartPosition.value = null;
	});
};

onBeforeUnmount(() => {
	if (isDragging.value && draggingElement.value) {
		emit('dragend', draggingElement.value);
	}
});
</script>

<template>
	<component
		:is="tag"
		ref="wrapper"
		:class="{ [$style.dragging]: isDragging }"
		data-test-id="draggable"
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
