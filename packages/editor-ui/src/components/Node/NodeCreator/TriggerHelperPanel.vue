<template>
	<div :class="{ [$style.triggerHelperContainer]: true, [$style.isRoot]: isRoot }">
		<categorized-items
			ref="categorizedItems"
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="nodeType => $emit('nodeTypeSelected', nodeType)"
			:initialActiveIndex="0"
			:searchItems="searchItems"
			:firstLevelItems="isRoot ? items : []"
			:excludedCategories="isRoot ? [] : [CORE_NODES_CATEGORY]"
			:initialActiveCategories="[COMMUNICATION_CATEGORY]"
		>
			<template #header>
				<slot name="header" />
				<p v-if="isRoot" v-text="$locale.baseText('nodeCreator.triggerHelperPanel.title')" :class="$style.title" />
			</template>
		</categorized-items>
	</div>
</template>

<script lang="ts">
import { PropType } from 'vue';
import mixins from 'vue-typed-mixins';

import { externalHooks } from '@/components/mixins/externalHooks';
import { INodeCreateElement } from '@/Interface';
import { CORE_NODES_CATEGORY, WEBHOOK_NODE_TYPE, OTHER_TRIGGER_NODES_SUBCATEGORY, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, COMMUNICATION_CATEGORY, SCHEDULE_TRIGGER_NODE_TYPE } from '@/constants';

import ItemIterator from './ItemIterator.vue';
import CategorizedItems from './CategorizedItems.vue';
import SearchBar from './SearchBar.vue';

export default mixins(externalHooks).extend({
	name: 'TriggerHelperPanel',
	components: {
		ItemIterator,
		CategorizedItems,
		SearchBar,
	},
	props: {
		searchItems: {
			type: Array as PropType<INodeCreateElement[] | null>,
		},
	},
	data() {
		return {
			CORE_NODES_CATEGORY,
			COMMUNICATION_CATEGORY,
			isRoot: true,
		};
	},
	computed: {
		items() {
			return [{
					key: "*",
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
					key: SCHEDULE_TRIGGER_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {

							group: [],
							name: SCHEDULE_TRIGGER_NODE_TYPE,
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
					key: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
					type: "node",
					properties: {
						nodeType: {
							group: [],
							name: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
							displayName: this.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDisplayName'),
							description: this.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDescription'),
							icon: "fa:sign-out-alt",
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
		isRootSubcategory(subcategory: INodeCreateElement) {
			return this.items.find(item => item.key === subcategory.key) !== undefined;
		},
		onSubcategorySelected() {
			this.isRoot = false;
		},
		onSubcategoryClose(subcategory: INodeCreateElement) {
			this.isRoot = this.isRootSubcategory(subcategory);
		},
	},
});
</script>

<style lang="scss" module>
.triggerHelperContainer {
	height: 100%;
	display: flex;
	flex-direction: column;

	// Remove node item border on the root level
	&.isRoot {
		--node-item-border: none;
	}
}
.itemCreator {
	height: calc(100% - 120px);
	padding-top: 1px;
	overflow-y: auto;
	overflow-x: visible;

	&::-webkit-scrollbar {
		display: none;
	}
}

.title {
	font-size: var(--font-size-l);
	line-height: var(--font-line-height-xloose);
	font-weight: var(--font-weight-bold);
	color: var(--color-text-dark);
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-3xs);
}
</style>
