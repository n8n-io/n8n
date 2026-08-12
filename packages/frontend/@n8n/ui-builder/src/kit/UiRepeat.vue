<script setup lang="ts">
// `items` is the renderer's, not the div's: inherited, the resolved array
// would be stringified onto the element as an attribute.
defineOptions({ name: 'UiRepeat', inheritAttrs: false });

withDefaults(defineProps<{ direction?: string; gap?: number }>(), {
	direction: 'vertical',
	gap: 8,
});
</script>

<template>
	<div
		class="ui-repeat"
		:style="{
			flexDirection: direction === 'horizontal' ? 'row' : 'column',
			gap: `${gap}px`,
		}"
	>
		<slot />
	</div>
</template>

<style scoped>
.ui-repeat {
	display: flex;
}
</style>
