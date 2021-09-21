<template functional>
	<a :href="href">
		<n8n-text :size="size">
			<slot></slot>
		</n8n-text>
	</a>
</template>

<script lang="ts">
export default {
	name: 'n8n-link',
	props: {
		size: {
			type: String,
		},
		href: {
			type: String,
		},
	},
};
</script>

<style lang="scss" module>
</style>
