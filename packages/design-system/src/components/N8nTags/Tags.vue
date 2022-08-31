<template>
	<div :class="['n8n-tags', $style.tags]">
		<n8n-tag v-for="tag in tags" :key="tag.id" :text="tag.name" @click="$emit('click', tag.id, $event)"/>
	</div>
</template>

<script lang="ts">
import N8nTag from '../N8nTag';
import Vue from 'vue';

export default Vue.extend({
	name: 'n8n-tags',
	components: {
		N8nTag,
	},
	props: {
		tags: {
			type: Array,
		},
	},
});
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
