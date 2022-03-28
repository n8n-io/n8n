<template>
	<span :class="$style.container">
		<span :class="$style.iconWrapper"><NodeIcon :nodeType="nodeType" :size="18" /></span>
		{{name}}
	</span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'NodeTitle',
	props: {
		name: {
			type: String,
		},
		nodeType: {
		},
	},
});
</script>

<style lang="scss" module>
.container {
	font-weight: var(--font-weight-bold);
	display: flex;
	font-size: var(--font-size-m);
	line-height: var(--font-line-height-compact);
}

.iconWrapper {
	display: inline-flex;
	margin-right: var(--spacing-2xs);
}
</style>
