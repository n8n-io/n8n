<template>
	<div :class="{ [$style.triggerHelperContainer]: true, [$style.isRoot]: isRoot }">
		<categorized-items
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="$listeners.nodeTypeSelected"
			@filterChange="onFilterChange"
			:initialActiveIndex="0"
			:searchItems="mergedNodes"
			:withActionsGetter="shouldShowNodeActions"
			:firstLevelItems="firstLevelItems"
			:flatten="isAppEventSubcategory"
			:filterByType="!isAppEventSubcategory"
		>
			<template #header>
				<slot name="header" />
				<p v-if="isRoot" v-text="$locale.baseText('nodeCreator.triggerHelperPanel.title')" :class="$style.title" />
			</template>
		</categorized-items>
	</div>
</template>

<script setup lang="ts">
import { reactive, toRefs, getCurrentInstance, computed, onMounted } from 'vue';

import { INodeCreateElement, INodeItemProps } from '@/Interface';
import { CORE_NODES_CATEGORY, WEBHOOK_NODE_TYPE, OTHER_TRIGGER_NODES_SUBCATEGORY, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, EMAIL_IMAP_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { deepCopy } from 'n8n-workflow';

export interface Props {
	searchItems: INodeCreateElement[];
}

const props = defineProps<Props>();
const instance = getCurrentInstance();

const state = reactive({
	isRoot: true,
	selectedSubcategory: '',
	showMergedActions: false,
	filter: '',
});

const items: INodeCreateElement[] = [{
		key: "*",
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

function onFilterChange(filter: string) {
	state.filter = filter;
}

function isRootSubcategory(subcategory: INodeCreateElement) {
	return items.find(item => item.key === subcategory.key) !== undefined;
}
function onSubcategorySelected(subcategory: INodeCreateElement) {
	state.isRoot = false;
	state.selectedSubcategory = subcategory.key;
}
function onSubcategoryClose(subcategory: INodeCreateElement) {
	state.isRoot = isRootSubcategory(subcategory);
	state.selectedSubcategory = '';
	state.filter = '';
}

function shouldShowNodeActions(node: INodeCreateElement) {
	if(isAppEventSubcategory.value) return true;
	if(state.isRoot && !isSearchActive.value) return false;
	// Do not show actions for core category when searching
	if(node.type === 'node') return !node.properties.nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY);

	return false;
}

const isAppEventSubcategory = computed(() => state.selectedSubcategory === "*");

const firstLevelItems = computed(() => isRoot.value ? items : []);

const isSearchActive = computed(() => state.filter !== '');

// On App Event is a special subcategory because we want to
// show merged regular nodes with actions and trigger nodes
const mergedNodes = computed(() => Object.values(
	props.searchItems.reduce((acc: Record<string, INodeCreateElement>, node: INodeCreateElement) => {
		const clonedNode = deepCopy(node);
		const isRegularNode = clonedNode.includedByRegular === true;
		const nodeType = (clonedNode.properties as INodeItemProps).nodeType;
		const actions = nodeType.actions || [];
		const isCoreNode = nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY) && node.key !== EMAIL_IMAP_NODE_TYPE;
		const hasActions = actions?.length > 0;
		const normalizedName = clonedNode.key.toLowerCase().replace('trigger', '');
		const isAppEventsSearch = isSearchActive.value && isAppEventSubcategory.value;

		const excludedCoreNode = isCoreNode && isAppEventsSearch;
		const excludedRegularNode = isRegularNode && (!hasActions || !state.showMergedActions);

		if(excludedCoreNode || excludedRegularNode) return acc;

		const existingNode = acc[normalizedName];
		if(existingNode) {
			(existingNode.properties as INodeItemProps).nodeType.actions?.push(...actions);
		} else {
			acc[normalizedName] = clonedNode;
		}

		return acc;

	}, {}),
));

onMounted(() => {
	const isLocal = window.location.href.includes('localhost');
	state.showMergedActions = isLocal || window?.posthog?.getFeatureFlag('merged-actions-nodes') === 'merge-actions';
});

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
