<template functional>
	<div :class="$style.tags">
		<n8n-tag v-for="(tag, key) in props.tags" :key="'tag-'+ key" :tag="tag.name" />
	</div>
</template>

<script lang="ts">
import N8nTag from '../N8nTag';

export default {
	name: 'n8n-tags',
	components: {
		N8nTag,
	},
	props: {
		tags: {
			type: Array,
		},
	},
};
</script>

<style lang="scss" module>
.tags {
	display: flex;
}
</style>
