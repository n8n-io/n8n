<template functional>
	<div :class="$style.tags">
		<n8n-tag v-for="(tag, key) in props.tags" :key="'tag-' + key" :tag="tag.name" @click="props.clickButton(tag)"/>
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
		clickButton: {
			type: Function,
		},
	},
};
</script>

<style lang="scss" module>
.tags {
	display: flex;
	flex-wrap: wrap;
}
</style>
