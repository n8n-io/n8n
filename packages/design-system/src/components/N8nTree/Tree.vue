<template>
	<div class="n8n-tree">
		<n8n-tree-node :input="input" :path="path"></n8n-tree-node>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import N8nTreeNode from './TreeNode.vue';

export default Vue.extend({
	name: 'n8n-tree',
	components: {
		N8nTreeNode,
	},
	props: {
		input: {
			type: Object,
		},
		path: {
			type: String,
			default: '',
		},
	},
	computed: {
	},
});
</script>

<style lang="scss" module>
</style>
