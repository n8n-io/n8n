<template>
	<div :class="{ [$style.mainPanel]: true, [$style.isRoot]: isRoot }">
		<CategorizedItems
			:subcategoryOverride="nodeAppActionsSubcategory"
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
			@actionsOpen="setActiveActions"
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

						<n8n-link v-if="[TRIGGER_NODE_FILTER].includes(selectedView)" @click="addWebHookNode">
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
			<template #footer v-if="isActionsActive && containsAPIAction">
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
import useMainPanelView from './composables/useMainPanelView';
import useActions from './composables/useActions';

const instance = getCurrentInstance();

const emit = defineEmits({
	nodeTypeSelected: (nodeTypes: string[]) => true,
});

const { $externalHooks } = new externalHooks();
const { mergedAppNodes, getNodeTypesWithManualTrigger, setAddedNodeActionParameters } =
	useNodeCreatorStore();

const {
	activeView,
	transformCreateElements,
	isRoot,
	selectedSubcategory,
	setIsRoot,
	setSelectedSubcategory,
} = useMainPanelView();
const telemetry = instance?.proxy.$telemetry;
const { isTriggerNode } = useNodeTypesStore();
const {
	categorizedActions,
	containsAPIAction,
	searchableActions,
	isActionsActive,
	actionsSearchPlaceholder,
	categoriesWithActions,
	nodeAppActionsSubcategory,
	getCustomAPICallHintLocale,
	setActiveActions,
	onActionSelected,
	shouldShowNodeActions,
} = useActions();

const selectedView = computed(() => useNodeCreatorStore().selectedView);

const filteredMergedAppNodes = computed(() => {
	const WHITELISTED_APP_CORE_NODES = [EMAIL_IMAP_NODE_TYPE, WEBHOOK_NODE_TYPE];
	const isAppEventSubcategory = selectedSubcategory.value === '*';

	if (isAppEventSubcategory)
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

const firstLevelItems = computed(() => (isRoot.value ? activeView.value.items : []));

const computedCategorizedItems = computed(() => {
	return isActionsActive.value
		? categorizedActions.value
		: getCategorizedList(computedCategoriesWithNodes.value, true);
});

const searchPlaceholder = computed(() => {
	return isActionsActive.value ? actionsSearchPlaceholder.value : undefined;
});

const computedCategoriesWithNodes = computed(() => {
	return isActionsActive.value
		? categoriesWithActions.value
		: getCategoriesWithNodes(filteredMergedAppNodes.value);
});

const searchItems = computed<INodeCreateElement[]>(() => {
	return isActionsActive.value
		? computedCategorizedItems.value
		: transformCreateElements(filteredMergedAppNodes.value);
});

function onNodeTypeSelected(nodeTypes: string[]) {
	emit(
		'nodeTypeSelected',
		nodeTypes.length === 1 ? getNodeTypesWithManualTrigger(nodeTypes[0]) : nodeTypes,
	);
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

		const app_identifier = selectedSubcategory.value;
		$externalHooks().run('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
		telemetry?.trackNodesPanel('nodeCreateList.onActionsCustmAPIClicked', { app_identifier });
	}
}

function onSubcategorySelected(subcategory: INodeCreateElement) {
	setIsRoot(false);
	setSelectedSubcategory(subcategory.key);
}
function onSubcategoryClose(activeSubcategories: INodeCreateElement[]) {
	if (isActionsActive.value === true) setActiveActions(null);

	setIsRoot(activeSubcategories.length === 0);
	setSelectedSubcategory(activeSubcategories[activeSubcategories.length - 1]?.key ?? '');
}

function shouldShowNodeDescription(node: NodeCreateElement) {
	return (node.category || []).includes(CORE_NODES_CATEGORY);
}

onUnmounted(() => {
	useNodeCreatorStore().resetRootViewHistory();
});
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
