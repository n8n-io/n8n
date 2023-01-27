<template>
	<transition :name="`panel-slide-${state.transitionDirection}`">
		<div
			ref="mainPanelContainer"
			tabindex="0"
			data-test-id="categorized-items"
			:class="$style.categorizedItems"
			:key="`${activeSubcategoryTitle + selectedViewType}_transition`"
			@keydown.capture="nodeFilterKeyDown"
		>
			<div
				:class="{
					[$style.header]: true,
					[$style.headerWithBackground]: activeSubcategory,
				}"
				data-test-id="categorized-items-subcategory"
			>
				<button
					:class="$style.backButton"
					@click="onBackButton"
					v-if="nodeCreatorStore.rootViewHistory.length > 1 || activeSubcategory"
				>
					<font-awesome-icon :class="$style.subcategoryBackIcon" icon="arrow-left" size="2x" />
				</button>
				<div v-if="isRootView && $slots.header">
					<slot name="header" />
				</div>
				<template v-if="activeSubcategory">
					<node-icon
						v-if="showSubcategoryIcon && activeSubcategory.properties.nodeType"
						:class="$style.nodeIcon"
						:nodeType="activeSubcategory.properties.nodeType"
						:size="16"
						:shrink="false"
					/>
					<span v-text="activeSubcategoryTitle" />
				</template>
			</div>
			<div v-if="isRootView && $slots.description" :class="$style.description">
				<slot name="description" />
			</div>

			<search-bar
				v-if="alwaysShowSearch || isSearchVisible"
				:key="nodeCreatorStore.selectedView"
				:value="nodeCreatorStore.itemsFilter"
				:placeholder="
					searchPlaceholder
						? searchPlaceholder
						: $locale.baseText('nodeCreator.searchBar.searchNodes')
				"
				ref="searchBar"
				@input="onNodeFilterChange"
			/>

			<div :class="$style.scrollable" ref="scrollableContainer">
				<item-iterator
					:elements="searchFilter.length === 0 ? renderedItems : localGlobalDeltaNodeTypes"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					:with-actions-getter="withActionsGetter"
					:lazyRender="lazyRender"
					:enable-global-categories-counter="enableGlobalCategoriesCounter"
					@selected="selected"
					@actionsOpen="$listeners.actionsOpen"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
				/>
				<div :class="$style.footer" v-if="$slots.footer">
					<slot name="footer" />
				</div>
			</div>

			<!-- <template v-if="localGlobalDeltaNodeTypes.length > 0">
				Partial results
				<item-iterator
					:elements="localGlobalDeltaNodeTypes"
					:activeIndex="0"
					:with-actions-getter="withActionsGetter"
					:lazyRender="lazyRender"
					:enable-global-categories-counter="false"
					@selected="selected"
					@actionsOpen="$listeners.actionsOpen"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
				/>
				<!-- <slot name="noResults" v-bind="{ filteredNodeTypes, filteredAllNodeTypes }" /> -->
			<!-- </template> -->
		</div>
	</transition>
</template>

<script lang="ts" setup>
import {
	computed,
	reactive,
	onMounted,
	watch,
	getCurrentInstance,
	toRefs,
	ref,
	onUnmounted,
	nextTick,
} from 'vue';
import camelcase from 'lodash.camelcase';
import differenceBy from 'lodash.differenceby';
import { externalHooks } from '@/mixins/externalHooks';
import useGlobalLinkActions from '@/composables/useGlobalLinkActions';
import { INodeTypeDescription } from 'n8n-workflow';
import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import NodeIcon from '@/components/NodeIcon.vue';
import {
	INodeCreateElement,
	ISubcategoryItemProps,
	ICategoryItemProps,
	ICategoriesWithNodes,
	SubcategoryCreateElement,
	NodeCreateElement,
	CategoryCreateElement,
} from '@/Interface';
import {
	WEBHOOK_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	ALL_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	REGULAR_NODE_FILTER,
	NODE_TYPE_COUNT_MAPPER,
} from '@/constants';
import { BaseTextKey } from '@/plugins/i18n';
import { sublimeSearch, matchesNodeType, matchesSelectType } from '@/utils';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export interface Props {
	flatten?: boolean;
	filterByType?: boolean; // Delete?
	showSubcategoryIcon?: boolean;
	alwaysShowSearch?: boolean;
	expandAllCategories?: boolean;
	enableGlobalCategoriesCounter?: boolean; // Delete?
	lazyRender?: boolean;
	searchPlaceholder?: string;
	withActionsGetter?: (element: NodeCreateElement) => boolean;
	searchItems?: INodeCreateElement[];
	excludedSubcategories?: string[]; // Delete?
	firstLevelItems?: INodeCreateElement[];
	initialActiveCategories?: string[]; // Delete?
	initialActiveIndex?: number; // Delete?
	categorizedItems: INodeCreateElement[];
	categoriesWithNodes: ICategoriesWithNodes;
	subcategoryOverride?: SubcategoryCreateElement | undefined;
	allItems?: INodeCreateElement[];
}

const props = withDefaults(defineProps<Props>(), {
	filterByType: true,
	allItems: () => [],
	searchItems: () => [],
	excludedSubcategories: () => [],
	firstLevelItems: () => [],
	initialActiveCategories: () => [],
});

const emit = defineEmits<{
	(event: 'subcategoryClose', value: INodeCreateElement[]): void;
	(event: 'onSubcategorySelected', value: INodeCreateElement): void;
	(event: 'nodeTypeSelected', value: string[]): void;

	(event: 'actionSelected', value: INodeCreateElement): void;
	(event: 'actionsOpen', value: INodeTypeDescription): void;
}>();

const instance = getCurrentInstance();
const { $externalHooks } = new externalHooks();

const { defaultLocale } = useRootStore();
const { workflowId } = useWorkflowsStore();
const nodeCreatorStore = useNodeCreatorStore();

const state = reactive({
	activeCategories: props.initialActiveCategories,
	// Keep track of activated subcategories so we could traverse back more than one level
	activeSubcategoryHistory: [] as Array<{
		scrollPosition: number;
		subcategory: INodeCreateElement;
		activeIndex: number;
		filter: string;
	}>,
	activeViewHistory: [] as string[],
	activeIndex: props.initialActiveIndex || 0,
	activeSubcategoryIndex: 0,
	ALL_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	REGULAR_NODE_FILTER,
	mainPanelContainer: null as HTMLElement | null,
	transitionDirection: 'in',
});
const searchBar = ref<InstanceType<typeof SearchBar>>();
const scrollableContainer = ref<InstanceType<typeof HTMLElement>>();

const activeSubcategory = computed<INodeCreateElement | null>(
	() =>
		state.activeSubcategoryHistory[state.activeSubcategoryHistory.length - 1]?.subcategory || null,
);

const activeSubcategoryTitle = computed<string>(() => {
	if (!activeSubcategory.value || !activeSubcategory.value.properties) return '';

	const subcategory = (activeSubcategory.value.properties as ISubcategoryItemProps).subcategory;
	const subcategoryName = camelcase(subcategory);

	const titleLocaleKey = `nodeCreator.subcategoryTitles.${subcategoryName}` as BaseTextKey;
	const nameLocaleKey = `nodeCreator.subcategoryNames.${subcategoryName}` as BaseTextKey;

	const titleLocale = instance?.proxy?.$locale.baseText(titleLocaleKey) as string;
	const nameLocale = instance?.proxy?.$locale.baseText(nameLocaleKey) as string;
	// If resolved title locale is same as the locale key it means it doesn't exist
	// so we fallback to the subcategoryName
	if (titleLocale === titleLocaleKey)
		return nameLocale === nameLocaleKey ? subcategory : nameLocale;

	return titleLocale;
});

const searchFilter = computed<string>(() => nodeCreatorStore.itemsFilter.toLowerCase().trim());

const matchedTypeNodes = computed<INodeCreateElement[]>(() => {
	if (!props.filterByType) return props.searchItems;
	return props.searchItems.filter((el: INodeCreateElement) =>
		matchesSelectType(el, nodeCreatorStore.selectedView),
	);
});
const selectedViewType = computed(() => nodeCreatorStore.selectedView);
const filteredNodeTypes = computed<INodeCreateElement[]>(() => {
	const filter = searchFilter.value;
	const startTime = performance.now();

	let returnItems: INodeCreateElement[] = [];
	if (defaultLocale !== 'en') {
		returnItems = props.searchItems.filter((el: INodeCreateElement) => {
			return (
				filter &&
				matchesSelectType(el, nodeCreatorStore.selectedView) &&
				matchesNodeType(el, filter)
			);
		});
	} else {
		const matchingNodes = props.filterByType
			? props.searchItems.filter((el) => matchesSelectType(el, nodeCreatorStore.selectedView))
			: props.searchItems;

		const matchedCategorizedNodes = sublimeSearch<INodeCreateElement>(filter, matchingNodes, [
			{ key: 'properties.nodeType.displayName', weight: 2 },
			{ key: 'properties.nodeType.codex.alias', weight: 1 },
		]);
		returnItems = matchedCategorizedNodes.map(({ item }) => item);
	}

	const endTime = performance.now();
	console.log('Filtered node types took:' + (endTime - startTime).toFixed(3) + ' milliseconds');
	return returnItems;
});

const trimTriggerNodeName = (nodeName) => nodeName.toLowerCase().replace('trigger', '');
const globalFilteredNodeTypes = computed<INodeCreateElement[]>(() => {
	const startTime = performance.now();
	const result = (
		sublimeSearch<INodeCreateElement>(searchFilter.value, props.allItems, [
			{ key: 'properties.nodeType.displayName', weight: 2 },
			{ key: 'properties.nodeType.codex.alias', weight: 1 },
		]) || []
	).reduce((acc, { item }) => {
		if (acc.find((el) => trimTriggerNodeName(el.key) === trimTriggerNodeName(item.key))) {
			return acc;
		}

		return [...acc, item];
	}, []);
	const endTime = performance.now();
	console.log(
		'Global filterd node types took:' + (endTime - startTime).toFixed(3) + ' milliseconds',
	);
	return result;
});

const localGlobalDelta = computed(() => {
	const startTime = performance.now();
	const filteredData = globalFilteredNodeTypes.value.filter((el) => {
		return !filteredNodeTypes.value.find(
			(el2) => trimTriggerNodeName(el2.key) === trimTriggerNodeName(el.key),
		);
	});
	const endTime = performance.now();
	console.log('localglobal delta took:' + (endTime - startTime).toFixed(3) + ' milliseconds');
	return filteredData;
});

const localGlobalDeltaNodeTypes = computed<INodeCreateElement[]>(() => {
	const isExpanded = state.activeCategories.includes('searchAll');
	const searchCategory = {
		type: 'category',
		properties: {
			type: 'category',
			category: 'searchAll',
			name: `Results in other categories (${localGlobalDelta.value.length})`,
			expanded: isExpanded,
		},
	};
	const nodeTypes = [];
	nodeTypes.push(...filteredNodeTypes.value, searchCategory, ...localGlobalDelta.value);

	return nodeTypes;
});

const categorized = computed<INodeCreateElement[]>(() => {
	return props.categorizedItems.reduce((accu: INodeCreateElement[], el: INodeCreateElement) => {
		if (
			el.type === 'subcategory' &&
			(props.excludedSubcategories || []).includes(
				(el.properties as ISubcategoryItemProps).subcategory,
			)
		) {
			return accu;
		}

		if (el.type !== 'category' && !state.activeCategories.includes(el.key)) {
			return accu;
		}

		if (props.filterByType && !matchesSelectType(el, nodeCreatorStore.selectedView)) {
			return accu;
		}

		if (el.type === 'category') {
			accu.push({
				// includedByRegular: false,
				// includedByTrigger: true,
				type: 'category',
				// category: el.category,
				key: el.key,
				properties: {
					name: el.key,
					expanded: state.activeCategories.includes(el.key),
				},
			} as INodeCreateElement);
			return accu;
		}

		accu.push(el);
		return accu;
	}, []);
});

const isRootView = computed(() => activeSubcategory.value === null);

const subcategorizedItems = computed<INodeCreateElement[]>(() => {
	if (!activeSubcategory.value) return [];

	const category = activeSubcategory.value.category;
	const subcategory = (activeSubcategory.value.properties as ISubcategoryItemProps).subcategory;

	// If no category is set, we use all categorized nodes
	const nodes = category
		? props.categoriesWithNodes[category][subcategory].nodes
		: categorized.value;

	return nodes.filter((el: INodeCreateElement) =>
		matchesSelectType(el, nodeCreatorStore.selectedView),
	);
	// return nodes;
});

const renderedItems = computed<INodeCreateElement[]>(() => {
	if (props.firstLevelItems.length > 0 && activeSubcategory.value === null)
		return props.firstLevelItems;
	if (props.flatten) return matchedTypeNodes.value;
	if (subcategorizedItems.value.length === 0) return categorized.value;

	const isSingleCategory =
		subcategorizedItems.value.filter((item) => item.type === 'category').length === 1;
	return isSingleCategory ? subcategorizedItems.value.slice(1) : subcategorizedItems.value;
});

const isSearchVisible = computed<boolean>(() => {
	if (subcategorizedItems.value.length === 0) return true;

	let totalItems = 0;
	for (const item of subcategorizedItems.value) {
		// Category contains many nodes so we need to count all of them
		// for the current selectedType
		if (item.type === 'category') {
			const categoryItems = props.categoriesWithNodes[item.key];
			const categoryItemsCount = Object.values(categoryItems)?.[0];
			const countKeys = NODE_TYPE_COUNT_MAPPER[nodeCreatorStore.selectedView];

			for (const countKey of countKeys) {
				totalItems += categoryItemsCount[countKey as 'triggerCount' | 'regularCount'];
			}

			continue;
		}
		// If it's not category, it must be just a node item so we count it as 1
		totalItems += 1;
	}
	return totalItems > 9;
});

// Methods
function getScrollTop() {
	return scrollableContainer.value?.scrollTop || 0;
}
function setScrollTop(scrollTop: number) {
	if (scrollableContainer.value) {
		scrollableContainer.value.scrollTop = scrollTop;
	}
}
// function switchToAllTabAndFilter() {
// 	const currentFilter = nodeCreatorStore.itemsFilter;
// 	nodeCreatorStore.setShowTabs(true);
// 	nodeCreatorStore.setSelectedView(ALL_NODE_FILTER);
// 	state.activeSubcategoryHistory = [];

// 	nextTick(() => onNodeFilterChange(currentFilter));
// }

function onNodeFilterChange(filter: string) {
	nodeCreatorStore.setFilter(filter);
}

function selectWebhook() {
	emit('nodeTypeSelected', [WEBHOOK_NODE_TYPE]);
}

function nodeFilterKeyDown(e: KeyboardEvent) {
	// We only want to propagate 'Escape' as it closes the node-creator and
	// 'Tab' which toggles it
	if (!['Escape', 'Tab'].includes(e.key)) e.stopPropagation();

	// Prevent cursors position change
	if (['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();

	if (activeSubcategory.value) {
		const activeList =
			searchFilter.value.length > 0 ? filteredNodeTypes.value : renderedItems.value;
		const activeNodeType = activeList[state.activeSubcategoryIndex];

		if (e.key === 'ArrowDown' && activeSubcategory.value) {
			state.activeSubcategoryIndex++;
			state.activeSubcategoryIndex = Math.min(state.activeSubcategoryIndex, activeList.length - 1);
		} else if (e.key === 'ArrowUp' && activeSubcategory.value) {
			state.activeSubcategoryIndex--;
			state.activeSubcategoryIndex = Math.max(state.activeSubcategoryIndex, 0);
		} else if (e.key === 'Enter') {
			selected(activeNodeType);
		} else if (
			e.key === 'ArrowLeft' &&
			activeNodeType?.type === 'category' &&
			(activeNodeType.properties as ICategoryItemProps).expanded
		) {
			selected(activeNodeType);
		} else if (e.key === 'ArrowLeft') {
			onBackButton();
		} else if (
			e.key === 'ArrowRight' &&
			activeNodeType?.type === 'category' &&
			!(activeNodeType.properties as ICategoryItemProps).expanded
		) {
			selected(activeNodeType);
		} else if (e.key === 'ArrowRight' && ['node', 'action'].includes(activeNodeType?.type)) {
			selected(activeNodeType);
		}
		return;
	}

	const activeList = searchFilter.value.length > 0 ? filteredNodeTypes.value : renderedItems.value;
	const activeNodeType = activeList[state.activeIndex];

	if (e.key === 'ArrowDown') {
		state.activeIndex++;
		// Make sure that we stop at the last nodeType
		state.activeIndex = Math.min(state.activeIndex, activeList.length - 1);
	} else if (e.key === 'ArrowUp') {
		state.activeIndex--;
		// Make sure that we do not get before the first nodeType
		state.activeIndex = Math.max(state.activeIndex, 0);
	} else if (e.key === 'Enter' && activeNodeType) {
		selected(activeNodeType);
	} else if (e.key === 'ArrowRight' && activeNodeType?.type === 'subcategory') {
		selected(activeNodeType);
	} else if (
		e.key === 'ArrowRight' &&
		activeNodeType?.type === 'category' &&
		!(activeNodeType.properties as ICategoryItemProps).expanded
	) {
		selected(activeNodeType);
	} else if (
		e.key === 'ArrowLeft' &&
		activeNodeType?.type === 'category' &&
		(activeNodeType.properties as ICategoryItemProps).expanded
	) {
		selected(activeNodeType);
	} else if (e.key === 'ArrowRight' && ['node', 'action'].includes(activeNodeType?.type)) {
		selected(activeNodeType);
	}
}
function selected(element: INodeCreateElement) {
	console.log('🚀 ~ file: CategorizedItems.vue:467 ~ selected ~ element', element);
	const typeHandler = {
		category: () => onCategorySelected(element),
		subcategory: () => onSubcategorySelected(element),
		node: () => onNodeSelected(element as NodeCreateElement),
		action: () => onActionSelected(element),
		view: () => onViewSelected(element),
	};

	typeHandler[element.type]();
}
function onViewSelected(view: Record<string, any>) {
	state.transitionDirection = 'in';
	nodeCreatorStore.setSelectedView(view.key);
	emit('viewSelected', view.key);
}

function onNodeSelected(element: NodeCreateElement) {
	const hasActions = (element.properties.nodeType?.actions?.length || 0) > 0;
	if (props.withActionsGetter && props.withActionsGetter(element) === true && hasActions) {
		emit('actionsOpen', element.properties.nodeType);
		return;
	}
	emit('nodeTypeSelected', [element.key]);
}

function onCategorySelected(element: CategoryCreateElement) {
	const categoryKey = element.key;
	if (state.activeCategories.includes(categoryKey)) {
		state.activeCategories = state.activeCategories.filter(
			(active: string) => active !== categoryKey,
		);
	} else {
		state.activeCategories = [...state.activeCategories, categoryKey];
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', {
			category_name: categoryKey,
			workflow_id: workflowId,
		});
	}

	state.activeIndex = categorized.value.findIndex(
		(el: INodeCreateElement) => el.key === categoryKey,
	);
}
function onActionSelected(element: INodeCreateElement) {
	emit('actionSelected', element);
}

function onSubcategorySelected(selected: INodeCreateElement, track = true) {
	state.transitionDirection = 'in';
	// Store the current subcategory UI details in the state
	// so we could revert it when the user closes the subcategory
	state.activeSubcategoryHistory.push({
		subcategory: selected,
		activeIndex: state.activeSubcategoryIndex,
		scrollPosition: getScrollTop(),
		filter: nodeCreatorStore.itemsFilter,
	});
	nodeCreatorStore.setFilter('');
	emit('onSubcategorySelected', selected);
	nodeCreatorStore.setShowTabs(false);
	state.activeSubcategoryIndex = 0;

	if (track) {
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', {
			selected,
			workflow_id: workflowId,
		});
	}
}

async function onBackButton() {
	state.transitionDirection = 'out';
	// Switching views
	if (isRootView.value && nodeCreatorStore.rootViewHistory.length > 1) {
		nodeCreatorStore.closeCurrentView();
		return;
	}

	const poppedSubCategory = state.activeSubcategoryHistory.pop();
	onNodeFilterChange(poppedSubCategory?.filter || '');
	await nextTick();
	emit(
		'subcategoryClose',
		state.activeSubcategoryHistory.map((el) => el.subcategory),
	);
	await nextTick();
	setScrollTop(poppedSubCategory?.scrollPosition || 0);
	state.activeSubcategoryIndex = poppedSubCategory?.activeIndex || 0;

	if (!nodeCreatorStore.showScrim && state.activeSubcategoryHistory.length === 0) {
		nodeCreatorStore.setShowTabs(true);
	}
}

watch(
	() => props.expandAllCategories,
	(expandAll) => {
		if (expandAll) state.activeCategories = Object.keys(props.categoriesWithNodes);
	},
);

watch(
	() => props.subcategoryOverride,
	(subcategory) => {
		if (subcategory) onSubcategorySelected(subcategory, false);
	},
);

onUnmounted(() => {
	nodeCreatorStore.setFilter('');
});

watch(filteredNodeTypes, (returnItems) => {
	$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', {
		nodeFilter: nodeCreatorStore.itemsFilter,
		result: returnItems,
		selectedType: nodeCreatorStore.selectedView,
	});
});

watch(isSearchVisible, (isVisible) => {
	if (isVisible === false) {
		// Focus the root container when search is hidden to make sure
		// keyboard navigation still works
		nextTick(() => state.mainPanelContainer?.focus());
	}
});
watch(
	() => nodeCreatorStore.itemsFilter,
	(newValue, oldValue) => {
		// Reset the index whenver the filter-value changes
		state.activeIndex = 0;
		state.activeSubcategoryIndex = 0;
		$externalHooks().run('nodeCreateList.nodeFilterChanged', {
			oldValue,
			newValue,
			selectedType: nodeCreatorStore.selectedView,
			filteredNodes: filteredNodeTypes.value,
		});
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.nodeFilterChanged', {
			oldValue,
			newValue,
			selectedType: nodeCreatorStore.selectedView,
			filteredNodes: filteredNodeTypes.value,
			workflow_id: workflowId,
		});
	},
);

const { activeSubcategoryIndex, activeIndex, mainPanelContainer } = toRefs(state);
</script>

<style lang="scss" module>
:global(.panel-slide-in-leave-active),
:global(.panel-slide-in-enter-active),
:global(.panel-slide-out-leave-active),
:global(.panel-slide-out-enter-active) {
	transition: transform 300ms ease;
	position: absolute;
	left: 0;
	right: 0;
}

:global(.panel-slide-out-enter),
:global(.panel-slide-in-leave-to) {
	transform: translateX(0);
	z-index: -1;
}

:global(.panel-slide-out-leave-to),
:global(.panel-slide-in-enter) {
	transform: translateX(100%);
	// Make sure the leaving panel stays on top
	// for the slide-out panel effect
	z-index: 1;
}
.nodeIcon {
	margin-right: var(--spacing-s);
}
.categorizedItems {
	background: white;
	height: 100%;
	background-color: $node-creator-background-color;
	&:before {
		box-sizing: border-box;
		content: '';
		border-left: 1px solid $node-creator-border-color;
		width: 1px;
		position: absolute;
		height: 100%;
	}
}
.footer {
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	margin: 0 var(--spacing-xs) 0;
	padding: var(--spacing-4xs) 0;
	line-height: var(--font-line-height-regular);
	border-top: 1px solid #dbdfe7;
	z-index: 1;
	margin-top: -1px;
}
.header {
	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-compact);

	display: flex;
	align-items: center;
	padding: var(--spacing-s) var(--spacing-s) var(--spacing-2xs);

	&.headerWithBackground {
		border-bottom: $node-creator-border-color solid 1px;
		height: 50px;
		background-color: $node-creator-subcategory-panel-header-bacground-color;
		padding: var(--spacing-s) var(--spacing-s);
	}
}
.description {
	padding: 0 var(--spacing-s) var(--spacing-2xs) var(--spacing-s);
	margin-top: -4px;
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0 var(--spacing-s) 0 0;
}

.subcategoryBackIcon {
	color: $node-creator-arrow-color;
	height: 16px;
	padding: 0;
}

.scrollable {
	height: calc(100% - 120px);
	padding-top: 1px;
	padding-bottom: var(--spacing-xl);
	overflow-y: auto;
	overflow-x: visible;

	scrollbar-width: none; /* Firefox 64 */
	&::-webkit-scrollbar {
		display: none;
	}
}
</style>
