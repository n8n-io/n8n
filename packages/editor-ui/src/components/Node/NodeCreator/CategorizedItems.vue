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
					v-if="isViewNavigated || activeSubcategory"
				>
					<font-awesome-icon :class="$style.subcategoryBackIcon" icon="arrow-left" size="2x" />
				</button>
				<div v-if="isRootView && $slots.header">
					<slot name="header" />
				</div>
				<template v-if="activeSubcategory">
					<n8n-node-icon
						:class="$style.nodeIcon"
						v-if="showSubcategoryIcon && activeSubcategory.properties.icon"
						:type="activeSubcategory.properties.iconType || 'unknown'"
						:src="activeSubcategory.properties.icon"
						:name="activeSubcategory.properties.icon"
						:color="activeSubcategory.properties.color"
						:circle="false"
						:showTooltip="false"
						:size="16"
					/>
					<span v-text="activeSubcategoryTitle" />
				</template>
			</div>
			<div
				v-if="isRootView && $slots.description"
				:class="{
					[$style.description]: true,
					[$style.descriptionOffset]: isViewNavigated || activeSubcategory,
				}"
			>
				<slot name="description" />
			</div>

			<search-bar
				v-if="alwaysShowSearch || isSearchVisible"
				:key="nodeCreatorStore.selectedView"
				:value="searchFilter"
				:placeholder="
					searchPlaceholder
						? searchPlaceholder
						: $locale.baseText('nodeCreator.searchBar.searchNodes')
				"
				@input="onNodeFilterChange"
			/>

			<div :class="$style.scrollable" ref="scrollableContainer">
				<item-iterator
					:elements="searchFilter.length === 0 ? renderedItems : mergedFilteredNodes"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					:with-actions-getter="withActionsGetter"
					:with-description-getter="withDescriptionGetter"
					:lazyRender="true"
					@selected="selected"
					@actionsOpen="$listeners.actionsOpen"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
				/>
				<div v-if="searchFilter.length > 0 && mergedFilteredNodes.length === 0">
					<slot name="noResults" />
				</div>
				<div :class="$style.footer" v-else-if="$slots.footer">
					<slot name="footer" />
				</div>
			</div>
		</div>
	</transition>
</template>

<script lang="ts" setup>
import {
	computed,
	reactive,
	watch,
	getCurrentInstance,
	toRefs,
	ref,
	onUnmounted,
	nextTick,
} from 'vue';
import { camelCase } from 'lodash-es';
import type { INodeTypeDescription } from 'n8n-workflow';
import ItemIterator from './ItemIterator.vue';
import SearchBar from './SearchBar.vue';
import type {
	INodeCreateElement,
	ISubcategoryItemProps,
	ICategoryItemProps,
	SubcategoryCreateElement,
	NodeCreateElement,
	CategoryCreateElement,
	INodeItemProps,
} from '@/Interface';
import type { BaseTextKey } from '@/plugins/i18n';
import { sublimeSearch, matchesNodeType, matchesSelectType } from '@/utils';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNodeCreatorStore } from '@/stores/nodeCreator';
import { useExternalHooks } from '@/composables';

export interface Props {
	showSubcategoryIcon?: boolean;
	alwaysShowSearch?: boolean;
	hideOtherCategoryItems?: boolean;

	lazyRender?: boolean;
	searchPlaceholder?: string;
	withActionsGetter?: (element: NodeCreateElement) => boolean;
	withDescriptionGetter?: (element: NodeCreateElement) => boolean;
	searchItems?: INodeCreateElement[];
	firstLevelItems?: INodeCreateElement[];
	categorizedItems: INodeCreateElement[];
	subcategoryOverride?: SubcategoryCreateElement | undefined;
	allItems?: INodeCreateElement[];
}

const OTHER_RESULT_CATEGORY = 'searchAll';
const props = withDefaults(defineProps<Props>(), {
	allItems: () => [],
	searchItems: () => [],
	firstLevelItems: () => [],
});

const emit = defineEmits<{
	(event: 'subcategoryClose', value: INodeCreateElement[]): void;
	(event: 'onSubcategorySelected', value: INodeCreateElement): void;
	(event: 'nodeTypeSelected', value: string[]): void;

	(event: 'actionSelected', value: INodeCreateElement): void;
	(event: 'actionsOpen', value: INodeTypeDescription): void;
}>();

const instance = getCurrentInstance();
const externalHooks = useExternalHooks();

const { defaultLocale } = useRootStore();
const { workflowId } = useWorkflowsStore();
const nodeCreatorStore = useNodeCreatorStore();

const state = reactive({
	activeCategories: [] as string[],
	// Keep track of activated subcategories so we could traverse back more than one level
	activeSubcategoryHistory: [] as Array<{
		scrollPosition: number;
		subcategory: INodeCreateElement;
		activeIndex: number;
		filter: string;
	}>,
	activeIndex: 0,
	activeSubcategoryIndex: 0,
	mainPanelContainer: null as HTMLElement | null,
	transitionDirection: 'in',
});
const searchBar = ref<InstanceType<typeof SearchBar>>();
const scrollableContainer = ref<InstanceType<typeof HTMLElement>>();

const activeSubcategory = computed<INodeCreateElement | null>(() => {
	return (
		state.activeSubcategoryHistory[state.activeSubcategoryHistory.length - 1]?.subcategory || null
	);
});

const categoriesKeys = computed(() =>
	props.categorizedItems.filter((item) => item.type === 'category').map((item) => item.key),
);
const activeSubcategoryTitle = computed<string>(() => {
	if (!activeSubcategory.value || !activeSubcategory.value.properties) return '';

	const subcategory = (activeSubcategory.value.properties as ISubcategoryItemProps).subcategory;
	const subcategoryName = camelCase(subcategory);

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

const selectedViewType = computed(() => nodeCreatorStore.selectedView);

const filteredNodeTypes = computed<INodeCreateElement[]>(() => {
	const filter = searchFilter.value;

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
		const matchingNodes =
			subcategorizedItems.value.length > 0 ? subcategorizedItems.value : props.searchItems;

		returnItems = getFilteredNodes(matchingNodes);
	}
	return returnItems;
});

const isViewNavigated = computed(() => nodeCreatorStore.rootViewHistory.length > 1);

const globalFilteredNodeTypes = computed<INodeCreateElement[]>(() => {
	const result = getFilteredNodes(props.allItems).reduce((acc, item) => {
		if (acc.find((el) => trimTriggerNodeName(el.key) === trimTriggerNodeName(item.key))) {
			return acc;
		}

		return [...acc, item];
	}, [] as INodeCreateElement[]);

	return result;
});

const otherCategoryNodes = computed(() => {
	const nodes = [];

	// Get diff of nodes between `globalFilteredNodeTypes` and `filteredNodeTypes`
	for (const node of globalFilteredNodeTypes.value) {
		const isNodeInFiltered = filteredNodeTypes.value.find(
			(el) => trimTriggerNodeName(el.key) === trimTriggerNodeName(node.key),
		);

		if (!isNodeInFiltered) nodes.push(node);
	}

	return nodes;
});

const mergedFilteredNodes = computed<INodeCreateElement[]>(() => {
	if (props.hideOtherCategoryItems) return filteredNodeTypes.value;

	const isExpanded = state.activeCategories.includes(OTHER_RESULT_CATEGORY);
	const searchCategory: CategoryCreateElement = {
		type: 'category',
		key: OTHER_RESULT_CATEGORY,
		properties: {
			category: OTHER_RESULT_CATEGORY,
			name: `Results in other categories (${otherCategoryNodes.value.length})`,
			expanded: isExpanded,
		},
	};
	const nodeTypes = [...filteredNodeTypes.value];

	if (otherCategoryNodes.value.length > 0) {
		nodeTypes.push(searchCategory);
	}
	if (isExpanded) {
		nodeTypes.push(...otherCategoryNodes.value);
	}

	return nodeTypes;
});

const isRootView = computed(() => activeSubcategory.value === null);

const subcategorizedItems = computed<INodeCreateElement[]>(() => {
	if (!activeSubcategory.value) return [];

	const items = props.searchItems.filter((el: INodeCreateElement) => {
		if (!activeSubcategory.value) return false;

		const subcategories = Object.values(
			(el.properties as INodeItemProps).nodeType.codex?.subcategories || {},
		).flat();
		return subcategories.includes(activeSubcategory.value.key);
	});

	return items.filter((el: INodeCreateElement) =>
		matchesSelectType(el, nodeCreatorStore.selectedView),
	);
});

const filteredCategorizedItems = computed<INodeCreateElement[]>(() => {
	let categoriesCount = 0;
	const reducedItems = props.categorizedItems.reduce(
		(acc: INodeCreateElement[], el: INodeCreateElement) => {
			if (el.type === 'category') {
				el.properties.expanded = state.activeCategories.includes(el.key);
				categoriesCount++;
				return [...acc, el];
			}

			if (el.type === 'action' && state.activeCategories.includes(el.category)) {
				return [...acc, el];
			}

			return acc;
		},
		[],
	);

	// If there is only one category we don't show it
	if (categoriesCount <= 1)
		return reducedItems.filter((el: INodeCreateElement) => el.type !== 'category');

	return reducedItems;
});

const renderedItems = computed<INodeCreateElement[]>(() => {
	if (props.firstLevelItems.length > 0 && activeSubcategory.value === null)
		return props.firstLevelItems;

	// If active subcategory is * then we show all items
	if (activeSubcategory.value?.key === '*') return props.searchItems;
	// Otherwise we show only items that match the subcategory
	if (subcategorizedItems.value.length > 0) return subcategorizedItems.value;

	// Finally if none of the above is true we show the categorized items
	return filteredCategorizedItems.value;
});

const isSearchVisible = computed<boolean>(() => {
	if (subcategorizedItems.value.length === 0) return true;

	return subcategorizedItems.value.length > 9;
});

// Methods
function trimTriggerNodeName(nodeName: string) {
	return nodeName.toLowerCase().replace('trigger', '');
}
function getFilteredNodes(items: INodeCreateElement[]) {
	// In order to support the old search we need to remove the 'trigger' part
	const trimmedFilter = searchFilter.value.toLowerCase().replace('trigger', '');
	return (
		sublimeSearch<INodeCreateElement>(trimmedFilter, items, [
			{ key: 'properties.nodeType.displayName', weight: 2 },
			{ key: 'properties.nodeType.codex.alias', weight: 1 },
		]) || []
	).map(({ item }) => item);
}
function getScrollTop() {
	return scrollableContainer.value?.scrollTop || 0;
}
function setScrollTop(scrollTop: number) {
	if (scrollableContainer.value) {
		scrollableContainer.value.scrollTop = scrollTop;
	}
}
function onNodeFilterChange(filter: string) {
	nodeCreatorStore.setFilter(filter);
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
	} else if (e.key === 'ArrowRight' && activeNodeType?.type === 'view') {
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
	} else if (e.key === 'ArrowLeft' && isViewNavigated.value) {
		onBackButton();
	} else if (e.key === 'ArrowRight' && ['node', 'action'].includes(activeNodeType?.type)) {
		selected(activeNodeType);
	}
}
function selected(element: INodeCreateElement) {
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
	state.activeIndex = 0;
	nodeCreatorStore.setSelectedView(view.key);
	nodeCreatorStore.setFilter('');
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
	const categoryKey = element.properties.category;
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
	if (isRootView.value && isViewNavigated.value) {
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
}

watch(
	() => props.subcategoryOverride,
	(subcategory) => {
		if (subcategory) onSubcategorySelected(subcategory, false);
	},
);
watch(
	() => props.categorizedItems,
	() => {
		state.activeCategories = [...categoriesKeys.value, OTHER_RESULT_CATEGORY];
	},
);

onUnmounted(() => {
	nodeCreatorStore.setFilter('');
});

watch(filteredNodeTypes, (returnItems) => {
	externalHooks.run('nodeCreateList.filteredNodeTypesComputed', {
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
		externalHooks.run('nodeCreateList.nodeFilterChanged', {
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
	--node-icon-size: 16px;
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
.descriptionOffset {
	margin-left: calc(var(--spacing-xl) + var(--spacing-4xs));
}
.backButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: 0 var(--spacing-xs) 0 0;
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
