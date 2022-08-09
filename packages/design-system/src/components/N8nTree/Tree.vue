<template>
	<div class="n8n-tree">
		<n8n-tree-node :input="input" :path="path" :nodeClass="nodeClass">
			<template v-for="(index, name) in $scopedSlots" v-slot:[name]="data">
				<slot :name="name" v-bind="data"></slot>
			</template>
		</n8n-tree-node>
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
		},
		path: {
			type: Array,
			default: () => [],
		},
		nodeClass: {
			type: String,
		},
	},
	computed: {
	},
});
</script>

<style lang="scss" module>
</style>
