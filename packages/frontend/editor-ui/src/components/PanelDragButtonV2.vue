<script setup lang="ts">
import { N8nIcon } from '@n8n/design-system';
import Draggable from './Draggable.vue';
import type { XYPosition } from '@/Interface';

defineProps<{
	canMoveRight: boolean;
	canMoveLeft: boolean;
}>();

const emit = defineEmits<{
	drag: [e: XYPosition];
	dragstart: [];
	dragend: [];
}>();

const onDrag = (e: XYPosition) => {
	emit('drag', e);
};

const onDragEnd = () => {
	emit('dragend');
};

const onDragStart = () => {
	emit('dragstart');
};
</script>

<template>
	<Draggable
		:class="$style.dragContainer"
		type="panel-resize"
		cursor="ew-resize"
		data-test-id="panel-drag-button"
		@drag="onDrag"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
	>
		<template #default="{ isDragging }">
			<button :class="[$style.dragButton, { [$style.dragging]: isDragging }]">
				<N8nIcon v-if="canMoveLeft" :class="$style.arrow" icon="arrow-left" />
				<N8nIcon :class="$style.handle" icon="menu" />
				<N8nIcon v-if="canMoveRight" :class="$style.arrow" icon="arrow-right" />
			</button>
		</template>
	</Draggable>
</template>

<style lang="scss" module>
.dragButton {
	cursor: ew-resize;
	border: none;
	outline: none;
	background: var(--color--background--light-3);

	display: flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) var(--spacing--3xs) 0 var(--spacing--3xs);
	color: var(--color--foreground--shade-1);
	border: var(--border);
	border-bottom: none;
	border-top-left-radius: var(--radius);
	border-top-right-radius: var(--radius);

	.arrow {
		opacity: 0;
		width: 10px;
	}

	.handle {
		width: 11px;
		transform: rotate(90deg);
	}

	&:hover,
	&.dragging {
		.arrow {
			opacity: 1;
		}
	}
}
</style>
