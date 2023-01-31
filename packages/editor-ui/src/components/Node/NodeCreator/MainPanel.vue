<template>
	<div :class="{ [$style.mainPanel]: true, [$style.isRoot]: isRoot }">
		<CategorizedItems
			:subcategoryOverride="nodeAppSubcategory"
			:alwaysShowSearch="isActionsActive"
			:hideOtherCategoryItems="isActionsActive"
			:categorizedItems="computedCategorizedItems"
			:searchItems="searchItems"
			:withActionsGetter="shouldShowNodeActions"
			:firstLevelItems="firstLevelItems"
			:showSubcategoryIcon="isActionsActive"
			:allItems="transformCreateElements(mergedAppNodes)"
			:searchPlaceholder="searchPlaceholder"
			ref="categorizedItemsRef"
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="onNodeTypeSelected"
			@actionsOpen="setActiveActionsNodeType"
			@actionSelected="onActionSelected"
		>
			<template #noResults="{ filteredAllNodeTypes }">
				<no-results
					data-test-id="categorized-no-results"
					:showRequest="!isActionsActive && filteredAllNodeTypes.length === 0"
					:show-icon="!isActionsActive && filteredAllNodeTypes.length === 0"
				>
					<!-- Partial results -->
					<!-- <template v-else #title>
						<p v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
					</template> -->

					<!-- <template v-if="isActionsActive" #action>
						<p
							v-if="containsAPIAction"
							v-html="getCustomAPICallHintLocale('apiCallNoResult')"
							class="clickable"
							@click.stop="addHttpNode"
						/>
						<p v-else v-text="$locale.baseText('nodeCreator.noResults.noMatchingActions')" />
					</template> -->

					<!-- <template v-else-if="filteredAllNodeTypes.length === 0" #action>
						{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
						<n8n-link
							@click="selectHttpRequest"
							v-if="[REGULAR_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedView)"
						>
							{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}
						</n8n-link>
						<template v-if="nodeCreatorStore.selectedView === ALL_NODE_FILTER">
							{{ $locale.baseText('nodeCreator.noResults.or') }}
						</template> -->

					<!-- <n8n-link
							@click="selectWebhook"
							v-if="[TRIGGER_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedView)"
						>
							{{ $locale.baseText('nodeCreator.noResults.webhook') }}
						</n8n-link> -->
					<!-- {{ $locale.baseText('nodeCreator.noResults.node') }}
					</template> -->

					<!-- <n8n-link
						@click="selectWebhook"
						v-if="[TRIGGER_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedView)"
					>
						{{ $locale.baseText('nodeCreator.noResults.webhook') }}
						{{ $locale.baseText('nodeCreator.noResults.node') }}
					</n8n-link> -->
				</no-results>
				<!-- <p>{{ filteredAllNodeTypes.length }}<p -->
			</template>

			<template #header>
				<p
					v-if="isRoot && activeView && activeView.title"
					v-text="activeView.title"
					:class="$style.title"
				/>
			</template>
			<template #description>
				<p
					v-if="isRoot && activeView && activeView.description"
					v-text="activeView.description"
					:class="$style.description"
				/>
			</template>
			<template #footer v-if="activeNodeActions && containsAPIAction">
				<span
					v-html="getCustomAPICallHintLocale('apiCall')"
					class="clickable"
					@click.stop="addHttpNode"
				/>
			</template>
		</CategorizedItems>
	</div>
</template>

<script setup lang="ts">
import { reactive, toRefs, getCurrentInstance, computed, onUnmounted, ref } from 'vue';
import {
	INodeTypeDescription,
	INodeActionTypeDescription,
	INodeTypeNameVersion,
} from 'n8n-workflow';
import {
	INodeCreateElement,
	IActionItemProps,
	SubcategoryCreateElement,
	IUpdateInformation,
} from '@/Interface';
import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	OTHER_TRIGGER_NODES_SUBCATEGORY,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	EMAIL_IMAP_NODE_TYPE,
	CUSTOM_API_CALL_NAME,
	HTTP_REQUEST_NODE_TYPE,
	STICKY_NODE_TYPE,
	REGULAR_NODE_FILTER,
	TRANSFORM_DATA_SUBCATEGORY,
	FILES_SUBCATEGORY,
	FLOWS_CONTROL_SUBCATEGORY,
	HELPERS_SUBCATEGORY,
	TRIGGER_NODE_FILTER,
} from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { getCategoriesWithNodes, getCategorizedList } from '@/utils';
import { externalHooks } from '@/mixins/externalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { BaseTextKey } from '@/plugins/i18n';
import NoResults from './NoResults.vue';
import { useRootStore } from '@/stores/n8nRootStore';

const instance = getCurrentInstance();

const VIEWS = [
	{
		value: REGULAR_NODE_FILTER,
		title: 'What happens next?',
		items: [
			{
				key: '*',
				type: 'subcategory',
				title: 'Action in an app',
				properties: {
					subcategory: 'App Regular Nodes',
					icon: 'info-circle',
				},
			},
			{
				type: 'subcategory',
				key: TRANSFORM_DATA_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					subcategory: TRANSFORM_DATA_SUBCATEGORY,
					icon: 'pen',
				},
			},
			{
				type: 'subcategory',
				key: FILES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					subcategory: FILES_SUBCATEGORY,
					icon: 'file-alt',
					color: '#7D838F',
				},
			},
			{
				type: 'subcategory',
				key: FLOWS_CONTROL_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					subcategory: FLOWS_CONTROL_SUBCATEGORY,
					icon: 'code-branch',
					color: '#7D838F',
				},
			},
			{
				type: 'subcategory',
				key: HELPERS_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					subcategory: HELPERS_SUBCATEGORY,
					icon: 'toolbox',
					color: '#7D838F',
				},
			},
			{
				key: TRIGGER_NODE_FILTER,
				type: 'view',
				properties: {
					title: 'Add another trigger',
					icon: 'bolt',
					color: '#7D838F',
					withTopBorder: true,
					description: 'Triggers start your workflow. Workflows can have multiple triggers.',
				},
			},
		],
	},
	{
		value: TRIGGER_NODE_FILTER,
		title: 'Select a trigger',
		description: 'A trigger is a step that starts your workflow',
		items: [
			{
				key: '*',
				type: 'subcategory',
				title: instance?.proxy.$locale.baseText('nodeCreator.subcategoryNames.appTriggerNodes'),
				properties: {
					subcategory: 'App Trigger Nodes',
					icon: 'satellite-dish',
				},
			},
			{
				key: SCHEDULE_TRIGGER_NODE_TYPE,
				type: 'node',
				properties: {
					nodeType: {
						group: [],
						name: SCHEDULE_TRIGGER_NODE_TYPE,
						displayName: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.scheduleTriggerDisplayName',
						),
						description: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.scheduleTriggerDescription',
						),
						icon: 'fa:clock',
						defaults: {
							color: '#7D838F',
						},
					},
				},
			},
			{
				key: WEBHOOK_NODE_TYPE,
				type: 'node',
				properties: {
					nodeType: {
						group: [],
						name: WEBHOOK_NODE_TYPE,
						displayName: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.webhookTriggerDisplayName',
						),
						description: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.webhookTriggerDescription',
						),
						iconData: {
							type: 'file',
							icon: 'webhook',
							fileBuffer: '/static/webhook-icon.svg',
						},
						defaults: {
							color: '#7D838F',
						},
					},
				},
			},
			{
				key: MANUAL_TRIGGER_NODE_TYPE,
				type: 'node',
				properties: {
					nodeType: {
						group: [],
						name: MANUAL_TRIGGER_NODE_TYPE,
						displayName: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.manualTriggerDisplayName',
						),
						description: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.manualTriggerDescription',
						),
						icon: 'fa:mouse-pointer',
						defaults: {
							color: '#7D838F',
						},
					},
				},
			},
			{
				key: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
				type: 'node',
				properties: {
					nodeType: {
						group: [],
						name: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
						displayName: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.workflowTriggerDisplayName',
						),
						description: instance?.proxy.$locale.baseText(
							'nodeCreator.triggerHelperPanel.workflowTriggerDescription',
						),
						icon: 'fa:sign-out-alt',
						defaults: {
							color: '#7D838F',
						},
					},
				},
			},
			{
				type: 'subcategory',
				key: OTHER_TRIGGER_NODES_SUBCATEGORY,
				category: CORE_NODES_CATEGORY,
				properties: {
					subcategory: OTHER_TRIGGER_NODES_SUBCATEGORY,
					icon: 'folder-open',
				},
			},
		],
	},
];

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const state = reactive({
	isRoot: true,
	selectedSubcategory: '',
	activeNodeActions: null as INodeTypeDescription | null,
	latestNodeData: null as INodeTypeDescription | null,
});
const categorizedItemsRef = ref<InstanceType<typeof CategorizedItems>>();
const { baseUrl } = useRootStore();
const { $externalHooks } = new externalHooks();
const {
	mergedAppNodes,
	getActionData,
	itemsFilter,
	getNodeTypesWithManualTrigger,
	setAddedNodeActionParameters,
} = useNodeCreatorStore();

const activeView = computed(() => {
	return VIEWS.find((v) => v.value === useNodeCreatorStore().selectedView) || VIEWS[0];
});
const telemetry = instance?.proxy.$telemetry;
const { categorizedItems: allNodes, isTriggerNode } = useNodeTypesStore();
const containsAPIAction = computed(
	() =>
		state.latestNodeData?.properties.some((p) =>
			p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME),
		) === true,
);

const computedCategorizedItems = computed(() => {
	if(isActionsActive.value) {
		return sortActions(getCategorizedList(computedCategoriesWithNodes.value, true));
	}


	return getCategorizedList(computedCategoriesWithNodes.value, true);
}
);

const nodeAppSubcategory = computed<SubcategoryCreateElement | undefined>(() => {
	if (!state.activeNodeActions) return undefined;

	return {
		type: 'subcategory',
		key: state.activeNodeActions.name,
		properties: {
			subcategory: state.activeNodeActions.displayName,
			description: '',
			icon: `${baseUrl}/${state.activeNodeActions.iconUrl}`,
		},
	};
});
const searchPlaceholder = computed(() => {
	const nodeNameTitle = state.activeNodeActions?.displayName?.trim() as string;
	const actionsSearchPlaceholder = instance?.proxy.$locale.baseText(
		'nodeCreator.actionsCategory.searchActions',
		{ interpolate: { nodeNameTitle } },
	);

	return isActionsActive.value ? actionsSearchPlaceholder : undefined;
});

const filteredMergedAppNodes = computed(() => {
	const WHITELISTED_APP_CORE_NODES = [EMAIL_IMAP_NODE_TYPE, WEBHOOK_NODE_TYPE];

	if (isAppEventSubcategory.value)
		return mergedAppNodes.filter((node) => {
			const isTrigger = isTriggerNode(node.name);
			const isRegularNode = !isTrigger;
			const isStickyNode = node.name === STICKY_NODE_TYPE;
			const isCoreNode =
				node.codex?.categories?.includes(CORE_NODES_CATEGORY) &&
				!WHITELISTED_APP_CORE_NODES.includes(node.name);
			const hasActions = (node.actions || []).length > 0;

			// Never show core nodes and sticky node in the Apps subcategory
			if (isCoreNode || isStickyNode) return false;

			// Only show nodes without action within their view
			if (!hasActions) {
				return isRegularNode
					? useNodeCreatorStore().selectedView === REGULAR_NODE_FILTER
					: useNodeCreatorStore().selectedView === TRIGGER_NODE_FILTER;
			}

			return true;
		});

	return mergedAppNodes;
});

const computedCategoriesWithNodes = computed(() => {
	if (!state.activeNodeActions) return getCategoriesWithNodes(filteredMergedAppNodes.value);

	return getCategoriesWithNodes(selectedNodeActions.value, state.activeNodeActions.displayName);
});

const selectedNodeActions = computed<INodeActionTypeDescription[]>(
	() => state.activeNodeActions?.actions ?? [],
);
const isAppEventSubcategory = computed(() => state.selectedSubcategory === '*');
const isActionsActive = computed(() => state.activeNodeActions !== null);
const firstLevelItems = computed(() => (isRoot.value ? activeView.value.items : []));

const items = computed(() => activeView.value.items);

const searchItems = computed<INodeCreateElement[]>(() => {
	return state.activeNodeActions
		? transformCreateElements(selectedNodeActions.value)
		: transformCreateElements(filteredMergedAppNodes.value);
});

// If the user is in the root view, we want to show trigger nodes first
// otherwise we want to show them last
function sortActions(nodeCreateElements: INodeCreateElement[]): INodeCreateElement[] {
	const elements = {
		trigger: [] as INodeCreateElement[],
		regular: [] as INodeCreateElement[],
	}

	nodeCreateElements.forEach((el) => {
		const isTriggersCategory = el.type === 'category' && el.key === 'Triggers';
		const isTriggerAction = el.type === 'action' && el.category === 'Triggers';

		elements[isTriggersCategory || isTriggerAction ? 'trigger' : 'regular'].push(el);
	});

	if(useNodeCreatorStore().selectedView === TRIGGER_NODE_FILTER) {
		return [...elements.trigger, ...elements.regular];
	}

	return [...elements.regular, ...elements.trigger];
}

function transformCreateElements(
	createElements: Array<INodeTypeDescription | INodeActionTypeDescription>,
): INodeCreateElement[] {
	const sorted = [...createElements];

	sorted.sort((a, b) => {
		const textA = a.displayName.toLowerCase();
		const textB = b.displayName.toLowerCase();
		return textA < textB ? -1 : textA > textB ? 1 : 0;
	});

	return sorted.map((nodeType) => ({
		type: 'node',
		category: nodeType.codex?.categories,
		key: nodeType.name,
		properties: {
			nodeType,
			subcategory: state.activeNodeActions?.displayName ?? '',
		},
		includedByTrigger: nodeType.group.includes('trigger'),
		includedByRegular: !nodeType.group.includes('trigger'),
	}));
}

function onNodeTypeSelected(nodeTypes: string[]) {
	emit(
		'nodeTypeSelected',
		nodeTypes.length === 1 ? getNodeTypesWithManualTrigger(nodeTypes[0]) : nodeTypes,
	);
}
function getCustomAPICallHintLocale(key: string) {
	if (!state.activeNodeActions) return '';

	const nodeNameTitle = state.activeNodeActions.displayName;
	return instance?.proxy.$locale.baseText(`nodeCreator.actionsList.${key}` as BaseTextKey, {
		interpolate: { nodeNameTitle },
	});
}
// The nodes.json doesn't contain API CALL option so we need to fetch the node detail
// to determine if need to render the API CALL hint
async function fetchNodeDetails() {
	if (!state.activeNodeActions) return;

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
	fetchNodeDetails();

	if (nodeType) trackActionsView();
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
			authentication: 'predefinedCredentialType',
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
	if (isActionsActive.value === true) setActiveActionsNodeType(null);

	state.isRoot = activeSubcategories.length === 0;
	state.selectedSubcategory = activeSubcategories[activeSubcategories.length - 1]?.key ?? '';
}

function shouldShowNodeActions(node: INodeCreateElement) {
	if(state.isRoot && useNodeCreatorStore().itemsFilter === '') return false;
	// Do not show actions for core categories
	if (node.type === 'node')
		return !node.properties.nodeType.codex?.categories?.includes(CORE_NODES_CATEGORY);

	return false;
}

function trackActionsView() {
	const trigger_action_count = selectedNodeActions.value.filter((action) =>
		action.name.toLowerCase().includes('trigger'),
	).length;

	const trackingPayload = {
		app_identifier: state.activeNodeActions?.name,
		actions: selectedNodeActions.value.map((action) => action.displayName),
		regular_action_count: selectedNodeActions.value.length - trigger_action_count,
		trigger_action_count,
	};

	$externalHooks().run('nodeCreateList.onViewActions', trackingPayload);
	telemetry?.trackNodesPanel('nodeCreateList.onViewActions', trackingPayload);
}

onUnmounted(() => {
	useNodeCreatorStore().resetRootViewHistory();
});
const { isRoot, activeNodeActions } = toRefs(state);
</script>

<style lang="scss" module>
.mainPanel {
	--node-icon-color: var(--color-text-base);
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
}
.description {
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-loose);
	color: var(--color-text-base);
}
</style>
