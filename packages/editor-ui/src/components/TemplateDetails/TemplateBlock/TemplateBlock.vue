<template>
	<div :class="$style.block">
		<div :class="$style.header">
			<n8n-heading tag="h3" size="small" color="text-base">{{ title }}</n8n-heading>
		</div>
		<div :class="$style.content">
			<slot name="content"></slot>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
export default Vue.extend({
	props: {
		title: {
			type: String,
		},
	},
});
</script>

<style lang="scss" module>
.block {
	padding-bottom: 36px;
}

.header {
	padding: 4px 0;
	border-bottom: 1px solid $--node-creator-border-color;
}

.content {
	padding: 12px 0;
}
</style>
