<template>
	<div>
		<slide-transition :absolute="true">
			<div :key="view">
				<template v-if="view === 'help'">
					<p v-text="$locale.baseText('nodeCreator.triggerHelperPanel.title')" :class="$style.title" />
					<item-iterator
						:transitionsEnabled="true"
						:borderless="true"
						:elements="items"
						@selected="onSelected"
					/>
				</template>
				<categorized-items
					v-else
					ref="categorizedItems"
					@subcategoryClose="onSubcategoryClose"
					:searchItems="searchItems"
					:excludedCategories="[CORE_NODES_CATEGORY]"
				/>
			</div>
		</slide-transition>
	</div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';

import { externalHooks } from '@/components/mixins/externalHooks';

import mixins from 'vue-typed-mixins';
import ItemIterator from './ItemIterator.vue';
import SlideTransition from '../transitions/SlideTransition.vue';
import { CORE_NODES_CATEGORY, CRON_NODE_TYPE, WEBHOOK_NODE_TYPE, OTHER_TRIGGER_NODES_SUBCATEGORY, WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { INodeCreateElement } from '@/Interface';

Vue.component('categorized-items', CategorizedItems);
export default mixins(externalHooks).extend({
	name: 'TriggerPanel',
	components: {
		ItemIterator,
		SlideTransition,
	},
	props: {
		searchItems: {
			type: Array as PropType<INodeCreateElement[] | null>,
		},
	},
	data() {
		return {
			CORE_NODES_CATEGORY,
			view: 'help',
		};
	},
	computed: {
		items() {
			return [{
					key: "core_nodes",
					type: "subcategory",
					title: this.$locale.baseText('nodeCreator.subcategoryNames.appTriggerNodes'),
					properties: {
						subcategory: "App Trigger Nodes",
						description: this.$locale.baseText('nodeCreator.subcategoryDescriptions.appTriggerNodes'),
						icon: "fa:satellite-dish",
						defaults: {
							color: "#7D838F",
						},
					},
				},
				{
					key: CRON_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {

							group: [],
							name: CRON_NODE_TYPE,
							displayName: this.$locale.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName'),
							description: this.$locale.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDescription'),
							icon: "fa:clock",
							defaults: {
								color: "#7D838F",
							},
						},
					},
				},
				{
					key: WEBHOOK_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {
							group: [],
							name: WEBHOOK_NODE_TYPE,
							displayName: this.$locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDisplayName'),
							description: this.$locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDescription'),
							iconData: {
								type: "file",
								icon: "webhook",
								fileBuffer: "/static/webhook-icon.svg",
							},
							defaults: {
								color: "#7D838F",
							},
						},
					},
				},
				{
					key: MANUAL_TRIGGER_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {
							group: [],
							name: MANUAL_TRIGGER_NODE_TYPE,
							displayName: this.$locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDisplayName'),
							description: this.$locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDescription'),
							icon: "fa:mouse-pointer",
							defaults: {
								color: "#7D838F",
							},
						},
					},
				},
				{
					key: WORKFLOW_TRIGGER_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {
							group: [],
							name: WORKFLOW_TRIGGER_NODE_TYPE,
							displayName: this.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDisplayName'),
							description: this.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDescription'),
							icon: "fa:network-wired",
							defaults: {
								color: "#7D838F",
							},
						},
					},
				},
				{
					type: "subcategory",
					key: OTHER_TRIGGER_NODES_SUBCATEGORY,
					category: CORE_NODES_CATEGORY,
					properties: {
						subcategory: OTHER_TRIGGER_NODES_SUBCATEGORY,
						description: this.$locale.baseText('nodeCreator.subcategoryDescriptions.otherTriggerNodes'),
						icon: "fa:folder-open",
						defaults: {
							color: "#7D838F",
						},
					},
				},
			];
		},
	},
	methods: {
		onSubcategoryClose() {
			this.view = 'help';
		},
		onSelected(item: INodeCreateElement) {
			if(item.type === 'subcategory') {
				this.view = "appTriggers";
				this.$nextTick(() => (this.$refs.categorizedItems as unknown as Record<string, Function>).onSubcategorySelected(item));
			}
		},
	},
});
</script>

<style lang="scss" module>
	.title {
		font-size: var(--font-size-l);
		line-height: var(--font-line-height-xloose);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-dark);
		padding: var(--spacing-l) var(--spacing-s) ;
	}
</style>
