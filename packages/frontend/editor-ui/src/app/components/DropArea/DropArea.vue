<script setup lang="ts">
import DraggableTarget from '@/app/components/DraggableTarget.vue';

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
	border: dashed 1px var(--color--foreground--shade-1);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-2);
	padding: var(--spacing--sm) var(--spacing--md);
	display: flex;
	align-items: baseline;
	justify-content: center;
	font-size: var(--font-size--sm);
	transition: border-color 0.1s ease-in;
	box-shadow: inset 0 0 0 1.5px var(--color--background--light-3);

	&:not(.active):hover {
		border-color: var(--ndv--droppable-parameter--color);
		background: var(--ndv--droppable-parameter--color--background);
	}
}

.droppable {
	border-color: var(--ndv--droppable-parameter--color);
	border-width: 1.5px;
	background: var(--ndv--droppable-parameter--color--background);
}

.active {
	border-color: var(--color--success);
	background: var(--ndv--droppable-parameter--color--background--active);
}
</style>
