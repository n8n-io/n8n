<template functional>
	<span :class="$style.tag" v-text="props.text" @click="(e) => listeners.click && listeners.click(e)" />
</template>

<script lang="ts">
export default {
	name: 'n8n-tag',
	props: {
		text: {
			type: String,
		},
	},
};
</script>

<style lang="scss" module>
.tag {
	min-width: max-content;
	padding: var(--spacing-4xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
}
</style>
