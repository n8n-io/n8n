<template>
	<div :class="{ [$style.triggerHelperContainer]: true, [$style.isRoot]: isRoot }">
		<categorized-items
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="$listeners.nodeTypeSelected"
			:initialActiveIndex="0"
			:searchItems="searchItems"
			:firstLevelItems="isRoot ? items : []"
			:excludedCategories="[CORE_NODES_CATEGORY]"
			:initialActiveCategories="[COMMUNICATION_CATEGORY]"
			:flatten="true"
		>
			<template #header>
				<slot name="header" />
				<p v-if="isRoot" v-text="$locale.baseText('nodeCreator.triggerHelperPanel.title')" :class="$style.title" />
			</template>
		</categorized-items>
	</div>
</template>

<script setup lang="ts">
import { reactive, toRefs, getCurrentInstance } from 'vue';

import { INodeCreateElement } from '@/Interface';
import { CORE_NODES_CATEGORY, WEBHOOK_NODE_TYPE, OTHER_TRIGGER_NODES_SUBCATEGORY, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, COMMUNICATION_CATEGORY, SCHEDULE_TRIGGER_NODE_TYPE } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';

export interface Props {
	searchItems: INodeCreateElement[];
}

defineProps<Props>();

const instance = getCurrentInstance();
const state = reactive({
	isRoot: true,
});

const items = [{
		key: "app_nodes",
		type: "subcategory",
		title: instance?.proxy.$locale.baseText('nodeCreator.subcategoryNames.appTriggerNodes'),
		properties: {
			subcategory: "App Trigger Nodes",
			description: instance?.proxy.$locale.baseText('nodeCreator.subcategoryDescriptions.appTriggerNodes'),
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
				displayName: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName'),
				description: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.scheduleTriggerDescription'),
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
				displayName: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDisplayName'),
				description: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.webhookTriggerDescription'),
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
				displayName: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDisplayName'),
				description: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.manualTriggerDescription'),
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
				displayName: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDisplayName'),
				description: instance?.proxy.$locale.baseText('nodeCreator.triggerHelperPanel.workflowTriggerDescription'),
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
			description: instance?.proxy.$locale.baseText('nodeCreator.subcategoryDescriptions.otherTriggerNodes'),
			icon: "fa:folder-open",
			defaults: {
				color: "#7D838F",
			},
		},
	},
];

function isRootSubcategory(subcategory: INodeCreateElement) {
	return items.find(item => item.key === subcategory.key) !== undefined;
}
function onSubcategorySelected() {
	state.isRoot = false;
}
function onSubcategoryClose(subcategory: INodeCreateElement) {
	state.isRoot = isRootSubcategory(subcategory);
}

const { isRoot } = toRefs(state);
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
