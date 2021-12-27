<template functional>
	<div :class="$style.tag" v-text="props.tag" />
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
	background-color: #dbdfe7;
	border-radius: var(--border-radius-base);
	font-size: 11px;
}
</style>
