<template functional>
	<div :class="{[$style['node-item']]: true, [$style.bordered]: props.bordered}">
		<NodeIcon :class="$style['node-icon']" :nodeType="props.nodeType" :style="{color: props.nodeType.defaults.color}" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">{{props.nodeType.displayName}}</span>
				<span :class="$style['trigger-icon']">
					<TriggerIcon v-if="$options.isTrigger(props.nodeType)" />
				</span>
			</div>
			<div :class="$style.description">
				{{props.nodeType.description}}
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';
import { INodeTypeDescription } from 'n8n-workflow';

import NodeIcon from '../NodeIcon.vue';
import TriggerIcon from '../TriggerIcon.vue';

Vue.component('NodeIcon', NodeIcon);
Vue.component('TriggerIcon', TriggerIcon);

export default {
	props: [
		'active',
		'filter',
		'nodeType',
		'bordered',
	],
	isTrigger (nodeType: INodeTypeDescription): boolean {
		return nodeType.group.includes('trigger');
	},
};
</script>

<style lang="scss" module>
.node-item {
	padding: 11px 8px 11px 0;
	margin-left: 15px;
	margin-right: 12px;
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
	font-weight: 400;
}

.trigger-icon {
	height: 18px;
	width: 18px;
}

</style>
