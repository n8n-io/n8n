<template functional>
	<div :class="$style.tags">
		<component :is="$options.components.N8nTag" v-for="tag in props.tags" :key="tag.id" :text="tag.name" @click="(e) => listeners.click && listeners.click(tag.id, e)"/>
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
	flex-wrap: wrap;

	* {
		margin: 0 var(--spacing-4xs) var(--spacing-4xs) 0;
	}
}
</style>
