<template>
	<div class="node-item clickable" :class="{active: active}" :data-node-name="nodeName" @click="nodeTypeSelected(nodeType)">
		<NodeIcon class="node-icon" :nodeType="nodeType" :style="nodeIconStyle" />
		<div>
			<div class="name">
				{{nodeType.displayName}}
			</div>
			<div class="description">
				{{nodeType.description}}
			</div>
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
	border-bottom: 1px solid $--node-creator-border-color;
	padding: 11px 20px 11px 15px;
	border-left: 1px solid $--node-creator-border-color;
	display: flex;

	&:hover {
		border-left: 1px solid $--node-creator-item-hover-border-color;
		background-color: $--node-creator-item-hover-background-color;
	}
}

.node-icon {
	margin-right: 15px;
}

.active {
	border-left: 1px solid $--color-primary;
}

.name {
	font-weight: bold;
  font-size: 14px;
  line-height: 16px;
}

.description {
	margin-top: 4px;
  font-size: 11px;
  line-height: 15px;
}

</style>
