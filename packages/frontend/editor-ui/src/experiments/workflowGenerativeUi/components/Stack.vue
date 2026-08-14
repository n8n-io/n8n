<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = withDefaults(
	defineProps<
		VisualProps & {
			direction?: 'row' | 'column';
		}
	>(),
	{ direction: 'column' },
);

const visual = computed(() => visualPropsSchema.parse(props));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<div :class="[$style.stack, $style[direction]]"><slot /></div>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.stack {
	display: flex;
	gap: var(--spacing--sm);
	min-width: 0;
}
.row {
	flex-flow: row wrap;
	align-items: flex-start;
}
.column {
	flex-direction: column;
}
</style>
