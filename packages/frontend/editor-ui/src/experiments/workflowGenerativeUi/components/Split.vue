<script setup lang="ts">
import { computed } from 'vue';
import { visualPropsSchema, type VisualProps } from '../visualGrammar';
import VisualPrimitive from './VisualPrimitive.vue';

const props = withDefaults(
	defineProps<
		VisualProps & {
			ratio?: '1fr-1fr' | '1fr-2fr' | '2fr-1fr';
		}
	>(),
	{ ratio: '1fr-1fr' },
);

const visual = computed(() => visualPropsSchema.parse(props));
const columns = computed(() => props.ratio.replace(/-/g, ' '));
</script>

<template>
	<VisualPrimitive v-bind="visual">
		<div :class="$style.split" :style="{ '--generative-split-columns': columns }">
			<slot />
		</div>
	</VisualPrimitive>
</template>

<style lang="scss" module>
.split {
	display: grid;
	grid-template-columns: var(--generative-split-columns, 1fr 1fr);
	gap: var(--spacing--md);
	align-items: start;
	min-width: 0;

	> * {
		min-width: 0;
	}

	@media (max-width: 48rem) {
		grid-template-columns: 1fr;
	}
}
</style>
