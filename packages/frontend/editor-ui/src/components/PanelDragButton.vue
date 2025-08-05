<script setup lang="ts">
import Draggable from '@/components/Draggable.vue';
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
		type="panel-resize"
		:class="$style.dragContainer"
		@drag="onDrag"
		@dragstart="onDragStart"
		@dragend="onDragEnd"
	>
		<template #default="{ isDragging }">
			<div :class="{ [$style.dragButton]: true }" data-test-id="panel-drag-button">
				<span
					v-if="canMoveLeft"
					:class="{ [$style.leftArrow]: true, [$style.visible]: isDragging }"
				>
					<n8n-icon icon="arrow-left" />
				</span>
				<span
					v-if="canMoveRight"
					:class="{ [$style.rightArrow]: true, [$style.visible]: isDragging }"
				>
					<n8n-icon icon="arrow-right" />
				</span>
				<div :class="$style.grid">
					<div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>
					<div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
						<div></div>
					</div>
				</div>
			</div>
		</template>
	</Draggable>
</template>

<style lang="scss" module>
.dragContainer {
	pointer-events: all;
}
.dragButton {
	background-color: var(--color-background-base);
	width: 64px;
	height: 21px;
	border-top-left-radius: var(--border-radius-base);
	border-top-right-radius: var(--border-radius-base);
	cursor: grab;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: visible;
	position: relative;
	z-index: 3;

	&:hover {
		.leftArrow,
		.rightArrow {
			visibility: visible;
		}
	}
}

.visible {
	visibility: visible !important;
}

.arrow {
	position: absolute;
	color: var(--color-background-xlight);
	font-size: var(--font-size-3xs);
	visibility: hidden;
	top: 0;
}

.leftArrow {
	composes: arrow;
	left: -16px;
}

.rightArrow {
	composes: arrow;
	right: -16px;
}

.grid {
	> div {
		display: flex;

		&:first-child {
			> div {
				margin-bottom: 2px;
			}
		}

		> div {
			height: 2px;
			width: 2px;
			border-radius: 50%;
			background-color: var(--color-foreground-xdark);
			margin-right: 4px;

			&:last-child {
				margin-right: 0;
			}
		}
	}
}
</style>
