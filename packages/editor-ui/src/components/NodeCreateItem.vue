<template>
	<div class="node-item clickable" :class="{active: active}" :data-node-name="nodeName" @click="nodeTypeSelected(nodeType)">
		<NodeIcon class="node-icon" :nodeType="nodeType" :style="nodeIconStyle" />
		<div class="name">
			{{nodeType.displayName}}
		</div>
		<div class="description">
			{{nodeType.description}}
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { INodeTypeDescription } from 'n8n-workflow';

import NodeIcon from '@/components/NodeIcon.vue';

export default Vue.extend({
	name: 'NodeCreateItem',
	components: {
		NodeIcon,
	},
	props: [
		'active',
		'filter',
		'nodeType',
	],
	computed: {
		nodeIconStyle (): object {
			return {
				color: this.nodeType.defaults.color,
			};
		},
		nodeName (): string {
			return this.nodeType.name;
		},
	},
	methods: {
		nodeTypeSelected (nodeType: INodeTypeDescription) {
			this.$emit('nodeTypeSelected', nodeType.name);
		},
	},
});
</script>

<style scoped lang="scss">

.node-item {
	position: relative;
	border-bottom: 1px solid #eee;
	background-color: #fff;
	padding: 6px;
	border-left: 3px solid #fff;

	&:hover {
		border-left: 3px solid #ccc;
	}
}

.active {
	border-left: 3px solid $--color-primary;
}

.node-icon {
	display: inline-block;
	position: absolute;
	left: 12px;
	top: calc(50% - 15px);
}

.name {
	font-weight: bold;
	font-size: 0.9em;
	padding-left: 50px;
}

.description {
	margin-top: 3px;
	line-height: 1.7em;
	font-size: 0.8em;
	padding-left: 50px;
}
</style>
