<script setup lang="ts">
import { computed } from 'vue';
const props = withDefaults(defineProps<{ columns?: number }>(), {
	columns: 2,
});
const gridStyle = computed(() => ({
	gridTemplateColumns: `repeat(${Math.max(1, props.columns)}, minmax(0, 1fr))`,
}));
</script>

<template>
	<div :class="$style.grid" :style="gridStyle"><slot /></div>
</template>

<style lang="scss" module>
.grid {
	display: grid;
	gap: var(--spacing--sm);
	align-items: start;
}
</style>
