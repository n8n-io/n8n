<script setup lang="ts">
withDefaults(defineProps<{ direction?: 'row' | 'column' }>(), {
	direction: 'column',
});
</script>

<template>
	<div :class="[$style.stack, $style[direction]]"><slot /></div>
</template>

<style lang="scss" module>
.stack {
	display: flex;
	gap: var(--spacing--sm);
}
.row {
	flex-flow: row wrap;
	align-items: flex-start;
}
.column {
	flex-direction: column;
}
</style>
