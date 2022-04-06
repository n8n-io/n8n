<template>
	<div :class="{[$style['node-item']]: true, [$style.bordered]: bordered}">
		<NodeIcon :class="$style['node-icon']" :nodeType="nodeType" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">
					{{ $locale.headerText({
							key: `headers.${shortNodeType}.displayName`,
							fallback: nodeType.displayName,
						})
					}}
				</span>
				<span :class="$style['trigger-icon']">
					<TriggerIcon v-if="$options.isTrigger(nodeType)" />
				</span>
			</div>
			<div :class="$style.description">
				{{ $locale.headerText({
						key: `headers.${shortNodeType}.description`,
						fallback: nodeType.description,
					})
				}}
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

export default Vue.extend({
	name: 'NodeItem',
	props: [
		'active',
		'filter',
		'nodeType',
		'bordered',
	],
	computed: {
		shortNodeType() {
			return this.$locale.shortNodeType(this.nodeType.name);
		},
	},
	// @ts-ignore
	isTrigger (nodeType: INodeTypeDescription): boolean {
		return nodeType.group.includes('trigger');
	},
});
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
	min-width: 26px;
	max-width: 26px;
	margin-right: 15px;
}

.name {
	font-weight: bold;
	font-size: 14px;
	line-height: 18px;
	margin-right: 5px;
}

.description {
	margin-top: 2px;
	font-size: 11px;
	line-height: 16px;
	font-weight: 400;
	color: $--node-creator-description-color;
}

.trigger-icon {
	height: 16px;
	width: 16px;
	display: flex;
}

</style>
