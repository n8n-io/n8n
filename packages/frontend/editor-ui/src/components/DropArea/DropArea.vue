<script setup lang="ts">
import DraggableTarget from '@/components/DraggableTarget.vue';

const emit = defineEmits<{ drop: [value: string] }>();

const onDrop = (value: string) => {
	emit('drop', value);
};
</script>

<template>
	<DraggableTarget type="mapping" @drop="onDrop">
		<template #default="{ droppable, activeDrop }">
			<div
				data-test-id="drop-area"
				:class="{ [$style.area]: true, [$style.active]: activeDrop, [$style.droppable]: droppable }"
			>
				<slot :active="activeDrop" :droppable="droppable"></slot>
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
	box-shadow: inset 0 0 0 1.5px var(--color-background-xlight);

	&:not(.active):hover {
		border-color: var(--color-ndv-droppable-parameter);
		background: var(--color-ndv-droppable-parameter-background);
	}
}

.droppable {
	border-color: var(--color-ndv-droppable-parameter);
	border-width: 1.5px;
	background: var(--color-ndv-droppable-parameter-background);
}

.active {
	border-color: var(--color-success);
	background: var(--color-ndv-droppable-parameter-active-background);
}
</style>
