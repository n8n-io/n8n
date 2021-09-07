<template>
	<div :class="{[$style['node-item']]: true, [$style.bordered]: bordered}">
		<NodeIcon :class="$style['node-icon']" :nodeType="nodeType" :style="{color: nodeType.defaults.color}" />
		<div>
			<div :class="$style.details">
				<span :class="$style.name">
          {{translateSpecific({
              key: `${nodeType.name}.displayName`,
              fallback: nodeType.displayName,
          })}}
        </span>
				<span :class="$style['trigger-icon']">
					<TriggerIcon v-if="nodeType.group.includes('trigger')" />
				</span>
			</div>
			<div :class="$style.description">
				{{translateSpecific({
            key: `${nodeType.name}.description`,
            fallback: nodeType.description,
        })}}
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import NodeIcon from '../NodeIcon.vue';
import TriggerIcon from '../TriggerIcon.vue';
import {addNodeTranslations} from "@/i18n/i18n";
import mixins from 'vue-typed-mixins';
import {translate} from "@/components/mixins/translate";

Vue.component('NodeIcon', NodeIcon);
Vue.component('TriggerIcon', TriggerIcon);

export default mixins(translate).extend({
	name: 'NodeItem',
	props: [
		'active',
		'filter',
		'nodeType',
		'bordered',
	],
	mounted() {
		if(this.nodeType.translation) {
			addNodeTranslations(this.nodeType.translation);
		}
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
