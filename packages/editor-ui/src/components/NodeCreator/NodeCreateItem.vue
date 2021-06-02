<template>
	<div :class="{'node-item': true, bordered}" :data-node-name="nodeName">
		<NodeIcon class="node-icon" :nodeType="nodeType" :style="nodeIconStyle" />
		<div>
			<div class="details">
				<span class="name">{{nodeType.displayName}}</span>
				<TriggerIcon v-if="isTrigger" class="trigger-icon" />
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

import NodeIcon from '../NodeIcon.vue';
import TriggerIcon from '../TriggerIcon.vue';

export default Vue.extend({
	name: 'NodeCreateItem',
	components: {
		NodeIcon,
		TriggerIcon,
	},
	props: [
		'active',
		'filter',
		'nodeType',
		'bordered',
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
		isTrigger (): boolean {
			return (this.nodeType as INodeTypeDescription).group.includes('trigger');
		},
	},
});
</script>

<style scoped lang="scss">

.node-item {
	padding: 11px 20px 11px 0;
	margin-left: 15px;
	display: flex;

	&.bordered {
		border-bottom: 1px solid $--node-creator-border-color;
	}
}

.details {
	display: flex;
	align-items: center;
}

.node-icon {
	min-width: 30px;
	max-width: 30px;
	margin-right: 15px;
}

.name {
	font-weight: bold;
  font-size: 14px;
  line-height: 18px;
	margin-right: 5px;
}

.description {
	margin-top: 4px;
  font-size: 11px;
  line-height: 15px;
}

.trigger-icon {
	height: 18px;
	width: 18px;
}

</style>
