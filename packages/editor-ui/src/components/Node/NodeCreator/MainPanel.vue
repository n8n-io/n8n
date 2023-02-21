<template>
	<div :class="{ [$style.mainPanel]: true, [$style.isRoot]: isRoot }">
		<CategorizedItems
			:subcategoryOverride="nodeAppSubcategory"
			:alwaysShowSearch="isActionsActive"
			:hideOtherCategoryItems="isActionsActive"
			:categorizedItems="computedCategorizedItems"
			:searchItems="searchItems"
			:withActionsGetter="shouldShowNodeActions"
			:withDescriptionGetter="shouldShowNodeDescription"
			:firstLevelItems="firstLevelItems"
			:showSubcategoryIcon="isActionsActive"
			:allItems="transformCreateElements(mergedAppNodes)"
			:searchPlaceholder="searchPlaceholder"
			@subcategoryClose="onSubcategoryClose"
			@onSubcategorySelected="onSubcategorySelected"
			@nodeTypeSelected="onNodeTypeSelected"
			@actionsOpen="setActiveActionsNodeType"
			@actionSelected="onActionSelected"
		>
			<template #noResults>
				<no-results
					data-test-id="categorized-no-results"
					:showRequest="!isActionsActive"
					:show-icon="!isActionsActive"
				>
					<template #title v-if="!isActionsActive">
						<p v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
					</template>

					<template v-if="isActionsActive" #action>
						<p
							v-if="containsAPIAction"
							v-html="getCustomAPICallHintLocale('apiCallNoResult')"
							class="clickable"
							@click.stop="addHttpNode(true)"
						/>
						<p v-else v-text="$locale.baseText('nodeCreator.noResults.noMatchingActions')" />
					</template>

					<template v-else #action>
						{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
						<n8n-link v-if="[REGULAR_NODE_FILTER].includes(selectedView)" @click="addHttpNode">
							{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}
						</n8n-link>

						<n8n-link v-if="[TRIGGER_NODE_FILTER].includes(selectedView)" @click="addWebHookNode()">
							{{ $locale.baseText('nodeCreator.noResults.webhook') }}
						</n8n-link>
						{{ $locale.baseText('nodeCreator.noResults.node') }}
					</template>
				</no-results>
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
					@click.stop="addHttpNode(true)"
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
	NodeCreateElement,
	IActionItemProps,
	SubcategoryCreateElement,
	IUpdateInformation,
} from '@/Interface';
import {
	CORE_NODES_CATEGORY,
	WEBHOOK_NODE_TYPE,
	EMAIL_IMAP_NODE_TYPE,
	CUSTOM_API_CALL_NAME,
	HTTP_REQUEST_NODE_TYPE,
	STICKY_NODE_TYPE,
	REGULAR_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	N8N_NODE_TYPE,
} from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { getCategoriesWithNodes, getCategorizedList } from '@/utils';
import { externalHooks } from '@/mixins/externalHooks';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { BaseTextKey } from '@/plugins/i18n';
import NoResults from './NoResults.vue';
import { useRootStore } from '@/stores/n8nRootStore';
import useMainPanelView from './useMainPanelView';

const instance = getCurrentInstance();

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const state = reactive({
	isRoot: true,
	selectedSubcategory: '',
	activeNodeActions: null as INodeTypeDescription | null,
});
const { baseUrl } = useRootStore();
const { $externalHooks } = new externalHooks();
const {
	mergedAppNodes,
	getActionData,
	getNodeTypesWithManualTrigger,
	setAddedNodeActionParameters,
} = useNodeCreatorStore();
const { activeView } = useMainPanelView();
const telemetry = instance?.proxy.$telemetry;
const { isTriggerNode } = useNodeTypesStore();
const containsAPIAction = computed(
	() =>
		state.activeNodeActions?.properties.some((p) =>
			p.options?.find((o) => o.name === CUSTOM_API_CALL_NAME),
		) === true,
);

const selectedView = computed(() => useNodeCreatorStore().selectedView);
const computedCategorizedItems = computed(() => {
	if (isActionsActive.value) {
		return sortActions(getCategorizedList(computedCategoriesWithNodes.value, true));
	}

	return getCategorizedList(computedCategoriesWithNodes.value, true);
});

const nodeAppSubcategory = computed<SubcategoryCreateElement | undefined>(() => {
	if (!state.activeNodeActions) return undefined;

	const icon = state.activeNodeActions.iconUrl
		? `${baseUrl}${state.activeNodeActions.iconUrl}`
		: state.activeNodeActions.icon?.split(':')[1];

	return {
		type: 'subcategory',
		key: state.activeNodeActions.name,
		properties: {
			subcategory: state.activeNodeActions.displayName,
			description: '',
			iconType: state.activeNodeActions.iconUrl ? 'file' : 'icon',
			icon,
			color: state.activeNodeActions.defaults.color,
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
					? selectedView.value === REGULAR_NODE_FILTER
					: selectedView.value === TRIGGER_NODE_FILTER;
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

const searchItems = computed<INodeCreateElement[]>(() => {
	return state.activeNodeActions
		? transformCreateElements(selectedNodeActions.value, 'action')
		: transformCreateElements(filteredMergedAppNodes.value);
});

// If the user is in the root view, we want to show trigger nodes first
// otherwise we want to show them last
function sortActions(nodeCreateElements: INodeCreateElement[]): INodeCreateElement[] {
	const elements = {
		trigger: [] as INodeCreateElement[],
		regular: [] as INodeCreateElement[],
	};

	nodeCreateElements.forEach((el) => {
		const isTriggersCategory = el.type === 'category' && el.key === 'Triggers';
		const isTriggerAction = el.type === 'action' && el.category === 'Triggers';

		elements[isTriggersCategory || isTriggerAction ? 'trigger' : 'regular'].push(el);
	});

	if (selectedView.value === TRIGGER_NODE_FILTER) {
		return [...elements.trigger, ...elements.regular];
	}

	return [...elements.regular, ...elements.trigger];
}

function transformCreateElements(
	createElements: Array<INodeTypeDescription | INodeActionTypeDescription>,
	type: 'node' | 'action' = 'node',
): INodeCreateElement[] {
	const sorted = [...createElements];

	sorted.sort((a, b) => {
		const textA = a.displayName.toLowerCase();
		const textB = b.displayName.toLowerCase();
		return textA < textB ? -1 : textA > textB ? 1 : 0;
	});

	return sorted.map((nodeType) => {
		// N8n node is a special case since it's the only core node that is both trigger and regular
		// if we have more cases like this we should add more robust logic
		const isN8nNode = nodeType.name.includes(N8N_NODE_TYPE);
		return {
			type,
			category: nodeType.codex?.categories,
			key: nodeType.name,
			properties: {
				nodeType,
				subcategory: state.activeNodeActions?.displayName ?? '',
			},
			includedByTrigger: isN8nNode || nodeType.group.includes('trigger'),
			includedByRegular: isN8nNode || !nodeType.group.includes('trigger'),
		} as INodeCreateElement;
	});
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

function setActiveActionsNodeType(nodeType: INodeTypeDescription | null) {
	state.activeNodeActions = nodeType;

	if (nodeType) trackActionsView();
}

function onActionSelected(actionCreateElement: INodeCreateElement) {
	const action = (actionCreateElement.properties as IActionItemProps).nodeType;
	const actionUpdateData = getActionData(action);
	emit('nodeTypeSelected', getNodeTypesWithManualTrigger(actionUpdateData.key));
	setAddedNodeActionParameters(actionUpdateData, telemetry);
}
function addWebHookNode() {
	emit('nodeTypeSelected', [WEBHOOK_NODE_TYPE]);
}

function addHttpNode(isAction: boolean) {
	const updateData = {
		name: '',
		key: HTTP_REQUEST_NODE_TYPE,
		value: {
			authentication: 'predefinedCredentialType',
		},
	} as IUpdateInformation;

	emit('nodeTypeSelected', [HTTP_REQUEST_NODE_TYPE]);
	if (isAction) {
		setAddedNodeActionParameters(updateData, telemetry, false);

		const app_identifier = state.activeNodeActions?.name;
		$externalHooks().run('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
		telemetry?.trackNodesPanel('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
	}
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

function shouldShowNodeDescription(node: NodeCreateElement) {
	return (node.category || []).includes(CORE_NODES_CATEGORY);
}

function shouldShowNodeActions(node: INodeCreateElement) {
	if (state.isRoot && useNodeCreatorStore().itemsFilter === '') return false;

	return true;
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
