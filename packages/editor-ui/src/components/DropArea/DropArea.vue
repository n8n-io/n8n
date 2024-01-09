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
	border: dashed 2px var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	padding: var(--spacing-s) var(--spacing-m);
	display: flex;
	align-items: baseline;
	justify-content: center;
	font-size: var(--font-size-s);
	transition: border-color 0.1s ease-in;
}

.droppable {
	border-color: var(--color-primary);
}

.active {
	border-color: var(--color-success);
	border-style: solid;
	background-color: var(--prim-color-alt-a-alpha-025);
}
</style>
