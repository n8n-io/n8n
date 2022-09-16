<template>
	<div
	>
		<!-- <SlideTransition>
			<SubcategoryPanel
				v-if="activeSubcategory"
				:elements="subcategorizedNodes"
				:displayName="activeSubcategory.properties.subcategory"
				:activeIndex="activeSubcategoryIndex"
				@close="onSubcategoryClose"
				@selected="selected"
			/>
		</SlideTransition> -->
		<ItemIterator
			:elements="items"
			:transitionsEnabled="true"
			@selected="onSelected"
		/>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { externalHooks } from '@/components/mixins/externalHooks';

import mixins from 'vue-typed-mixins';
import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import SubcategoryPanel from './SubcategoryPanel.vue';
import { INodeCreateElement, INodeItemProps, ISubcategoryItemProps } from '@/Interface';
import { ALL_NODE_FILTER, CORE_NODES_CATEGORY, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER } from '@/constants';
import SlideTransition from '../transitions/SlideTransition.vue';
import { matchesNodeType, matchesSelectType } from './helpers';

const items = [
	{
		key: 'core_nodes',
		type: 'subcategory',
		category: 'Core Nodes',
		title: 'On App Events',
		icon: 'fa:satellite-dish',
		properties: {
			category: 'Core Nodes',
			subcategory: 'app',
			description: 'Runs the flow when something happens in an app like Telegram, Notion or Airtable',
		},
	}, {
		key: 'n8n-nodes-base.cron',
		type: 'node',
		properties: {
			nodeType: {
				group: [],
				name: 'n8n-nodes-base.cron',
				icon: 'fa:clock',
				displayName: 'On a Schedule',
				description: 'Runs the flow every day, hour, or custom interval',
			},
		},
	}, {
		key: 'n8n-nodes-base.webhook',
		type: 'node',
		properties: {
			nodeType: {
				group: [],
				name: 'n8n-nodes-base.webhook',
				description: 'Runs the flow when another app sends a webhook',
				icon: 'fa:clock',
				displayName: 'On Webhook Call',
			},
		},
	}, {
		key: 'n8n-nodes-base.manualTrigger',
		type: 'node',
		properties: {
			nodeType: {
				group: [],
				name: 'n8n-nodes-base.manualTrigger',
				displayName: 'Manually',
				description: 'On clicking a button in n8n',
				icon: 'fa:mouse-pointer',
			},
		},
	}, {
		key: 'n8n-nodes-base.WorkflowTrigger',
		type: 'node',
		properties: {
			nodeType: {
				group: [],
				name: 'n8n-nodes-base.workflowTrigger',
				displayName: 'When Called by Another Workflow',
				description: 'Runs the flow when called by the Execute Workflow node from a different workflow',
				icon: 'fa:network-wired',
			},
		},
	}, {
		key: 'other',
		type: 'subcategory',
		properties: {
			subcategory: 'Core Nodes',
			description: 'Runs the workflow on new emails, file changes, workflow events, and more',
		},
		icon: 'folder-open',
	},
];

export default mixins(externalHooks).extend({
	name: 'TriggerPanel',
	components: {
		ItemIterator,
		// NoResults,
		// SubcategoryPanel,
		SlideTransition,
		// SearchBar,
	},
	// props: ['categorizedItems', 'categoriesWithNodes', 'searchItems'],
	data() {
		return {
			items,
		};
	},
	computed: {

	},
	methods: {
		onSelected(item: any) {
			if(item.type === 'subcategory') {
				this.$emit('selected', {
						"type": "subcategory",
						"key": "Core Nodes_Helpers",
						"category": "Core Nodes",
						"properties": {
							"subcategory": "Other Trigger Nodes",
						},
						"includedByTrigger": true,
						"includedByRegular": false,
				});
			}
			console.log("🚀 ~ file: TriggerPanel.vue ~ line 110 ~ onSelected ~ item", item);
		},
	},
	async mounted() {
		console.log('Mounted Trigger Panel');
	},
	async destroyed() {
		console.log('Destroted Trigger Panel');
	},
});
</script>

<style lang="scss" module>
.triggerPanel {

}

</style>
