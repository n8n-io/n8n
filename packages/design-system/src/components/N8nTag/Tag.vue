<template>
	<span :class="['n8n-tag', $style.tag]" v-on="$listeners">
		{{ text }}
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-tag',
	props: {
		text: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.tag {
	min-width: max-content;
	padding: 1px var(--spacing-4xs);
	color: var(--color-text-dark);
	background-color: var(--color-background-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
	transition: background-color 0.3s ease;

	&:hover {
		background-color: hsl(var(--color-background-base-h), var(--color-background-base-s), calc(var(--color-background-base-l) - 4%));
	}
}
</style>
