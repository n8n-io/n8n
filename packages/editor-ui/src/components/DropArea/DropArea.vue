<script setup lang="ts">
import DraggableTarget from '@/components/DraggableTarget.vue';
import type { XYPosition } from '@/Interface';

type Props = {
	stickyOffset?: XYPosition;
};

withDefaults(defineProps<Props>(), { stickyOffset: () => [0, 0] as XYPosition });

const emit = defineEmits<{ (event: 'drop', value: string): void }>();

const onDrop = (value: string) => {
	emit('drop', value);
};
</script>

<template>
	<DraggableTarget
		sticky
		sticky-origin="center"
		:sticky-offset="stickyOffset"
		type="mapping"
		@drop="onDrop"
	>
		<template #default="{ droppable, activeDrop }">
			<div
				:class="{ [$style.area]: true, [$style.active]: activeDrop, [$style.droppable]: droppable }"
			>
				<slot :active="activeDrop"></slot>
			</div>
		</template>
	</DraggableTarget>
</template>

<style lang="scss" module>
.area {
	border: dashed 1px var(--color-foreground-dark);
	border-radius: var(--border-radius-large);
	background: var(--color-background-light);
	padding: var(--spacing-s) var(--spacing-m);
	display: flex;
	align-items: baseline;
	justify-content: center;
	font-size: var(--font-size-s);
	transition: border-color 0.1s ease-in;
	box-shadow: inset 0 0 0px 1.5px var(--color-background-xlight);

	&:not(.active):hover {
		border-color: var(--color-ndv-droppable-parameter);
		background: var(--color-ndv-droppable-parameter-background);
	}
}

.droppable {
	border-color: var(--color-ndv-droppable-parameter);
	background: var(--color-ndv-droppable-parameter-background);
}

.active {
	border-color: var(--color-success);
	background: var(--color-ndv-droppable-parameter-active-background);
}
</style>
