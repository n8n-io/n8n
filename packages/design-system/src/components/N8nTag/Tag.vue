<template functional>
	<div :class="$style.tag" v-text="props.tag" @click="(e) => listeners.click && listeners.click(e)" />
</template>

<script lang="ts">
export default {
	name: 'n8n-tag',
	props: {
		tag: {
			type: String,
		},
	},
};
</script>

<style lang="scss" module>
.tag {
  width: fit-content;
	margin: 0 var(--spacing-4xs) var(--spacing-4xs) 0;
	padding: var(--spacing-4xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
}
</style>
