<template>
	<div :class="{ [$style.triggerHelperContainer]: true, [$style.isRoot]: isRoot }">
		<categorized-items
			:expandAllCategories="isActionsActive"
			:subcategoryOverride="nodeAppSubcategory"
			:alwaysShowSearch="isActionsActive"
			:categorizedItems="computedCategorizedItems"
			:categoriesWithNodes="computedCategoriesWithNodes"
			:initialActiveIndex="0"
			:searchItems="searchItems"
			:withActionsGetter="shouldShowNodeActions"
			:firstLevelItems="firstLevelItems"
			:showSubcategoryIcon="isActionsActive"
			:flatten="!isActionsActive && isAppEventSubcategory"
			:filterByType="false"
			:lazyRender="true"
			:allItems="allNodes"
			:searchPlaceholder="searchPlaceholder"
			ref="categorizedItemsRef"
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="onNodeTypeSelected"
			@actionsOpen="setActiveActionsNodeType"
			@actionSelected="onActionSelected"
		>

			<template #noResultsTitle v-if="isActionsActive">
				<i />
			</template>
			<template #noResultsAction  v-if="isActionsActive">
				<p v-if="containsAPIAction" v-html="getCustomAPICallHintLocale('apiCallNoResult')" class="clickable" @click.stop="addHttpNode" />
				<p v-else v-text="$locale.baseText('nodeCreator.noResults.noMatchingActions')"/>
			</template>

			<template #header>
				<slot name="header" />
				<p
					v-if="isRoot"
					v-text="$locale.baseText('nodeCreator.triggerHelperPanel.title')"
					:class="$style.title"
				/>
			</template>
			<template #footer v-if="(activeNodeActions && containsAPIAction)">
				<slot name="footer" />
				<span v-html="getCustomAPICallHintLocale('apiCall')" class="clickable" @click.stop="addHttpNode" />
			</template>
		</categorized-items>
	</div>
</template>

<script setup lang="ts">
import { reactive, toRefs, getCurrentInstance, computed, onMounted, ref } from 'vue';
import { INodeTypeDescription, INodeActionTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';
import { INodeCreateElement, IActionItemProps, SubcategoryCreateElement, IUpdateInformation } from '@/Interface';
import { CORE_NODES_CATEGORY, WEBHOOK_NODE_TYPE, OTHER_TRIGGER_NODES_SUBCATEGORY, EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, SCHEDULE_TRIGGER_NODE_TYPE, EMAIL_IMAP_NODE_TYPE, CUSTOM_API_CALL_NAME, HTTP_REQUEST_NODE_TYPE, STICKY_NODE_TYPE } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { getCategoriesWithNodes, getCategorizedList } from "@/utils";
import { externalHooks } from '@/mixins/externalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { BaseTextKey } from '@/plugins/i18n';

const instance = getCurrentInstance();
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

const emit = defineEmits({
	"nodeTypeSelected": (nodeTypes: string[]) => true,
});

const state = reactive({
	isRoot: true,
	selectedSubcategory: '',
	activeNodeActions: null as INodeTypeDescription | null,
	latestNodeData: null as INodeTypeDescription | null,
});
const categorizedItemsRef = ref<InstanceType<typeof CategorizedItems>>();

const { $externalHooks } = new externalHooks();
const {
	mergedAppNodes,
	setShowTabs,
	getActionData,
	getNodeTypesWithManualTrigger,
	setAddedNodeActionParameters,
} = useNodeCreatorStore();

const telemetry = instance?.proxy.$telemetry;
const { categorizedItems: allNodes, isTriggerNode } = useNodeTypesStore();
const containsAPIAction = computed(() => state.latestNodeData?.properties.some((p) => p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME)) === true);

const computedCategorizedItems = computed(() => getCategorizedList(computedCategoriesWithNodes.value, true));

const nodeAppSubcategory = computed<(SubcategoryCreateElement | undefined)>(() => {
	if(!state.activeNodeActions) return undefined;

	return {
		type: 'subcategory',
		properties: {
			subcategory: state.activeNodeActions.displayName,
			nodeType: {
				description: '',
				key: state.activeNodeActions.name,
				iconUrl: state.activeNodeActions.iconUrl,
				icon: state.activeNodeActions.icon,
			},
		},
	};
});
const searchPlaceholder = computed(() => {
	const nodeNameTitle = state.activeNodeActions?.displayName?.trim() as string;
	const actionsSearchPlaceholder = instance?.proxy.$locale.baseText(
		'nodeCreator.actionsCategory.searchActions',
		{ interpolate: { nodeNameTitle }},
	);

	return isActionsActive.value ? actionsSearchPlaceholder : undefined;
});

const filteredMergedAppNodes = computed(() => {
	const WHITELISTED_APP_CORE_NODES = [
		EMAIL_IMAP_NODE_TYPE,
		WEBHOOK_NODE_TYPE,
	];

	if(isAppEventSubcategory.value) return mergedAppNodes.filter(node => {
		const isRegularNode = !isTriggerNode(node.name);
		const isStickyNode = node.name === STICKY_NODE_TYPE;
		const isCoreNode = node.codex?.categories?.includes(CORE_NODES_CATEGORY) && !WHITELISTED_APP_CORE_NODES.includes(node.name);
		const hasActions = (node.actions || []).length > 0;

		if(isRegularNode && !hasActions) return false;
		return !isCoreNode && !isStickyNode;
	});

	return mergedAppNodes;
});

const computedCategoriesWithNodes = computed(() => {
	if(!state.activeNodeActions) return getCategoriesWithNodes(filteredMergedAppNodes.value, []);

	return getCategoriesWithNodes(selectedNodeActions.value, [], state.activeNodeActions.displayName) ;
});

const selectedNodeActions = computed<INodeActionTypeDescription[]>(() => state.activeNodeActions?.actions ?? []);
const isAppEventSubcategory = computed(() => state.selectedSubcategory === "*");
const isActionsActive = computed(() => state.activeNodeActions !== null);
const firstLevelItems = computed(() => isRoot.value ? items : []);

const isSearchActive = computed(() => useNodeCreatorStore().itemsFilter !== '');
const searchItems = computed<INodeCreateElement[]>(() => {
	const sorted = state.activeNodeActions ? [...selectedNodeActions.value] : [...filteredMergedAppNodes.value];
	sorted.sort((a, b) => {
		const textA = a.displayName.toLowerCase();
		const textB = b.displayName.toLowerCase();
		return textA < textB ? -1 : textA > textB ? 1 : 0;
	});

	return sorted.map((nodeType) => ({
		type: 'node',
		category: '',
		key: nodeType.name,
		properties: {
			nodeType,
			subcategory: state.activeNodeActions ? state.activeNodeActions.displayName : '',
		},
		includedByTrigger: nodeType.group.includes('trigger'),
		includedByRegular: !nodeType.group.includes('trigger'),
	}));
});

function onNodeTypeSelected(nodeTypes: string[]) {
	emit("nodeTypeSelected", nodeTypes.length === 1 ? getNodeTypesWithManualTrigger(nodeTypes[0]) : nodeTypes);
}
function getCustomAPICallHintLocale(key: string) {
	if(!state.activeNodeActions) return '';

	const nodeNameTitle  = state.activeNodeActions.displayName;
	return instance?.proxy.$locale.baseText(
		`nodeCreator.actionsList.${key}` as BaseTextKey,
		{ interpolate: { nodeNameTitle }},
	);
}
// The nodes.json doesn't contain API CALL option so we need to fetch the node detail
// to determine if need to render the API CALL hint
async function fetchNodeDetails() {
	if(!state.activeNodeActions) return;

	const { getNodesInformation } = useNodeTypesStore();
	const { version, name } = state.activeNodeActions;
	const payload = {
		name,
		version: Array.isArray(version) ? version?.slice(-1)[0] : version,
	} as INodeTypeNameVersion;

	const nodesInfo = await getNodesInformation([payload], false);

	state.latestNodeData = nodesInfo[0];
}

function setActiveActionsNodeType(nodeType: INodeTypeDescription | null) {
	state.activeNodeActions = nodeType;
	setShowTabs(false);
	fetchNodeDetails();

	if(nodeType) trackActionsView();
}

function onActionSelected(actionCreateElement: INodeCreateElement) {
	const action = (actionCreateElement.properties as IActionItemProps).nodeType;
	const actionUpdateData = getActionData(action);
	emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionUpdateData.key));
	setAddedNodeActionParameters(actionUpdateData, telemetry);
}
function addHttpNode() {
	const updateData = {
		name: '',
		key: HTTP_REQUEST_NODE_TYPE,
		value: {
			authentication: "predefinedCredentialType",
		},
	} as IUpdateInformation;

	emit('nodeTypeSelected', [MANUAL_TRIGGER_NODE_TYPE, HTTP_REQUEST_NODE_TYPE]);
	setAddedNodeActionParameters(updateData, telemetry, false);

	const app_identifier = state.activeNodeActions?.name;
	$externalHooks().run('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
	telemetry?.trackNodesPanel('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
}

function onSubcategorySelected(subcategory: INodeCreateElement) {
	state.isRoot = false;
	state.selectedSubcategory = subcategory.key;
}
function onSubcategoryClose(activeSubcategories: INodeCreateElement[]) {
	if(isActionsActive.value === true) setActiveActionsNodeType(null);

	state.isRoot = activeSubcategories.length === 0;
	state.selectedSubcategory = activeSubcategories[activeSubcategories.length - 1]?.key ?? '';
}

function shouldShowNodeActions(node: INodeCreateElement) {
	if(isAppEventSubcategory.value) return true;
	if(state.isRoot && !isSearchActive.value) return false;
	// Do not show actions for core category when searching
	if(node.type === 'node') return !node.properties.nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY);

	return false;
}

function trackActionsView() {
	const trigger_action_count = selectedNodeActions.value
		.filter((action) => action.name.toLowerCase().includes('trigger')).length;

	const trackingPayload = {
		app_identifier: state.activeNodeActions?.name,
		actions: selectedNodeActions.value.map(action => action.displayName),
		regular_action_count: selectedNodeActions.value.length - trigger_action_count,
		trigger_action_count,
	};

	$externalHooks().run('nodeCreateList.onViewActions', trackingPayload);
	telemetry?.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
}

const { isRoot, activeNodeActions } = toRefs(state);
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
