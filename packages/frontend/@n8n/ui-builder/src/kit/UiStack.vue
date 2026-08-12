<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'UiStack' });

const props = withDefaults(
	defineProps<{
		direction?: 'vertical' | 'horizontal';
		gap?: number | string;
	}>(),
	{ direction: 'vertical', gap: 12 },
);

const style = computed(() => ({
	flexDirection: props.direction === 'horizontal' ? ('row' as const) : ('column' as const),
	gap: `${Number(props.gap) || 0}px`,
	// A horizontal stack centres its children, so a label next to an input sits
	// on the input's middle rather than at the top of the row.
	alignItems: props.direction === 'horizontal' ? ('center' as const) : ('stretch' as const),
}));
</script>

<template>
	<div class="ui-stack" :style="style">
		<slot />
	</div>
</template>

<style scoped>
.ui-stack {
	display: flex;
}
</style>
