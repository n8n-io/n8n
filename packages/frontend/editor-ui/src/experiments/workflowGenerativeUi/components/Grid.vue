<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = withDefaults(
	defineProps<
		VisualProps & {
			columns?: number;
		}
	>(),
	{ columns: 2 },
);

const visual = computed(() => visualPropsSchema.parse(props));
const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`,
}));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<div :class="$style.grid" :style="gridStyle"><slot /></div>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.grid {
	display: grid;
	gap: var(--spacing--sm);
	align-items: start;
	min-width: 0;

	@media (max-width: 48rem) {
		grid-template-columns: 1fr !important;
	}
}
</style>
