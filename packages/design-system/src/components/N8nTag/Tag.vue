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
	padding: var(--spacing-4xs);
	background-color: var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	font-size: var(--font-size-2xs);
	cursor: pointer;
}
</style>
