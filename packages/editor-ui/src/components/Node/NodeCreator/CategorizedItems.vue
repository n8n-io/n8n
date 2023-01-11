<template>
	<transition :name="`panel-slide-${state.transitionDirection}`">
		<div
			ref="mainPanelContainer"
			tabindex="0"
			data-test-id="categorized-items"
			:class="$style.categorizedItems"
			:key="`${activeSubcategoryTitle}_transition`"
			@keydown.capture="nodeFilterKeyDown"
		>
			<div v-if="$slots.header">
				<slot name="header" />
			</div>

			<div
				:class="$style.subcategoryHeader"
				v-if="activeSubcategory"
				data-test-id="categorized-items-subcategory"
			>
				<button :class="$style.subcategoryBackButton" @click="onSubcategoryClose">
					<font-awesome-icon :class="$style.subcategoryBackIcon" icon="arrow-left" size="2x" />
				</button>
				<node-icon
					v-if="showSubcategoryIcon && activeSubcategory.properties.nodeType"
					:class="$style.nodeIcon"
					:nodeType="activeSubcategory.properties.nodeType"
					:size="16"
					:shrink="false"
				/>
				<span v-text="activeSubcategoryTitle" />
			</div>

			<search-bar
				v-if="alwaysShowSearch || isSearchVisible"
				:key="nodeCreatorStore.selectedType"
				:value="nodeCreatorStore.itemsFilter"
				:placeholder="
					searchPlaceholder
						? searchPlaceholder
						: $locale.baseText('nodeCreator.searchBar.searchNodes')
				"
				ref="searchBar"
				@input="onNodeFilterChange"
			/>

			<template v-if="searchFilter.length > 0 && filteredNodeTypes.length === 0">
				<no-results
					data-test-id="categorized-no-results"
					:showRequest="
						!$slots.noResultsTitle && !$slots.noResultsAction && filteredAllNodeTypes.length === 0
					"
					:show-icon="
						!$slots.noResultsTitle && !$slots.noResultsAction && filteredAllNodeTypes.length === 0
					"
				>
					<template v-if="$slots.noResultsTitle" #title>
						<slot name="noResultsTitle" />
					</template>
					<!-- There are results in other sub-categories/tabs  -->
					<template v-else-if="filteredAllNodeTypes.length > 0" #title>
						<p v-html="$locale.baseText('nodeCreator.noResults.clickToSeeResults')" />
					</template>
					<template v-else #title>
						<p v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
					</template>

					<template v-if="$slots.noResultsAction" #action>
						<slot name="noResultsAction" />
					</template>
					<template v-else-if="filteredAllNodeTypes.length === 0" #action>
						{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
						<n8n-link
							@click="selectHttpRequest"
							v-if="[REGULAR_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedType)"
						>
							{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}
						</n8n-link>
						<template v-if="nodeCreatorStore.selectedType === ALL_NODE_FILTER">
							{{ $locale.baseText('nodeCreator.noResults.or') }}
						</template>

						<n8n-link
							@click="selectWebhook"
							v-if="[TRIGGER_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedType)"
						>
							{{ $locale.baseText('nodeCreator.noResults.webhook') }}
						</n8n-link>
						{{ $locale.baseText('nodeCreator.noResults.node') }}
					</template>

					<n8n-link
						@click="selectWebhook"
						v-if="[TRIGGER_NODE_FILTER, ALL_NODE_FILTER].includes(nodeCreatorStore.selectedType)"
					>
						{{ $locale.baseText('nodeCreator.noResults.webhook') }}
						{{ $locale.baseText('nodeCreator.noResults.node') }}
					</n8n-link>
				</no-results>
			</template>
			<div :class="$style.scrollable" ref="scrollableContainer" v-else>
				<item-iterator
					:elements="searchFilter.length === 0 ? renderedItems : filteredNodeTypes"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					:with-actions-getter="withActionsGetter"
					:lazyRender="lazyRender"
					:enable-global-categories-counter="enableGlobalCategoriesCounter"
					@selected="selected"
					@actionsOpen="$listeners.actionsOpen"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
				>
				</item-iterator>
				<div :class="$style.footer" v-if="$slots.footer">
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
	onMounted,
	watch,
	getCurrentInstance,
	toRefs,
	ref,
	onUnmounted,
	nextTick,
} from 'vue';
import camelcase from 'lodash.camelcase';

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
	filterByType?: boolean;
	showSubcategoryIcon?: boolean;
	alwaysShowSearch?: boolean;
	expandAllCategories?: boolean;
	enableGlobalCategoriesCounter?: boolean;
	lazyRender?: boolean;
	searchPlaceholder?: string;
	withActionsGetter?: (element: NodeCreateElement) => boolean;
	searchItems?: INodeCreateElement[];
	excludedSubcategories?: string[];
	firstLevelItems?: INodeCreateElement[];
	initialActiveCategories?: string[];
	initialActiveIndex?: number;
	categorizedItems: INodeCreateElement[];
	allItems: INodeCreateElement[];
	categoriesWithNodes: ICategoriesWithNodes;
	subcategoryOverride?: SubcategoryCreateElement | undefined;
}

const props = withDefaults(defineProps<Props>(), {
	filterByType: true,
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
const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();

const { $externalHooks } = new externalHooks();

const { defaultLocale } = useRootStore();
const { workflowId } = useWorkflowsStore();
const nodeCreatorStore = useNodeCreatorStore();

const state = reactive({
	activeCategory: props.initialActiveCategories,
	// Keep track of activated subcategories so we could traverse back more than one level
	activeSubcategoryHistory: [] as Array<{
		scrollPosition: number;
		subcategory: INodeCreateElement;
		activeIndex: number;
		filter: string;
	}>,
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
		matchesSelectType(el, nodeCreatorStore.selectedType),
	);
});

const filteredNodeTypes = computed<INodeCreateElement[]>(() => {
	const filter = searchFilter.value;

	let returnItems: INodeCreateElement[] = [];
	if (defaultLocale !== 'en') {
		returnItems = props.searchItems.filter((el: INodeCreateElement) => {
			return (
				filter &&
				matchesSelectType(el, nodeCreatorStore.selectedType) &&
				matchesNodeType(el, filter)
			);
		});
	} else {
		const matchingNodes = props.filterByType
			? props.searchItems.filter((el) => matchesSelectType(el, nodeCreatorStore.selectedType))
			: props.searchItems;

		const matchedCategorizedNodes = sublimeSearch<INodeCreateElement>(filter, matchingNodes, [
			{ key: 'properties.nodeType.displayName', weight: 2 },
			{ key: 'properties.nodeType.codex.alias', weight: 1 },
		]);
		returnItems = matchedCategorizedNodes.map(({ item }) => item);
	}

	return returnItems;
});

const filteredAllNodeTypes = computed<INodeCreateElement[]>(() => {
	if (filteredNodeTypes.value.length > 0) return [];

	const matchedAllNodex = props.allItems.filter((el: INodeCreateElement) => {
		return searchFilter.value && el.type === 'node' && matchesNodeType(el, searchFilter.value);
	});

	return matchedAllNodex;
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

		if (el.type !== 'category' && !state.activeCategory.includes(el.category)) {
			return accu;
		}

		if (!matchesSelectType(el, nodeCreatorStore.selectedType)) {
			return accu;
		}

		if (el.type === 'category') {
			accu.push({
				...el,
				properties: {
					expanded: state.activeCategory.includes(el.category),
				},
			} as INodeCreateElement);
			return accu;
		}

		accu.push(el);
		return accu;
	}, []);
});

const subcategorizedItems = computed<INodeCreateElement[]>(() => {
	if (!activeSubcategory.value) return [];

	const category = activeSubcategory.value.category;
	const subcategory = (activeSubcategory.value.properties as ISubcategoryItemProps).subcategory;

	// If no category is set, we use all categorized nodes
	const nodes = category
		? props.categoriesWithNodes[category][subcategory].nodes
		: categorized.value;

	return nodes.filter((el: INodeCreateElement) =>
		matchesSelectType(el, nodeCreatorStore.selectedType),
	);
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
			const countKeys = NODE_TYPE_COUNT_MAPPER[nodeCreatorStore.selectedType];

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
function switchToAllTabAndFilter() {
	const currentFilter = nodeCreatorStore.itemsFilter;
	nodeCreatorStore.setShowTabs(true);
	nodeCreatorStore.setSelectedType(ALL_NODE_FILTER);
	state.activeSubcategoryHistory = [];

	nextTick(() => onNodeFilterChange(currentFilter));
}

function onNodeFilterChange(filter: string) {
	nodeCreatorStore.setFilter(filter);
}

function selectWebhook() {
	emit('nodeTypeSelected', [WEBHOOK_NODE_TYPE]);
}

function selectHttpRequest() {
	emit('nodeTypeSelected', [HTTP_REQUEST_NODE_TYPE]);
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
			onSubcategoryClose();
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
	const typeHandler = {
		category: () => onCategorySelected(element.category),
		subcategory: () => onSubcategorySelected(element),
		node: () => onNodeSelected(element as NodeCreateElement),
		action: () => onActionSelected(element),
	};

	typeHandler[element.type]();
}

function onNodeSelected(element: NodeCreateElement) {
	const hasActions = (element.properties.nodeType?.actions?.length || 0) > 0;
	if (props.withActionsGetter && props.withActionsGetter(element) === true && hasActions) {
		emit('actionsOpen', element.properties.nodeType);
		return;
	}
	emit('nodeTypeSelected', [element.key]);
}

function onCategorySelected(category: string) {
	if (state.activeCategory.includes(category)) {
		state.activeCategory = state.activeCategory.filter((active: string) => active !== category);
	} else {
		state.activeCategory = [...state.activeCategory, category];
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', {
			category_name: category,
			workflow_id: workflowId,
		});
	}

	state.activeIndex = categorized.value.findIndex(
		(el: INodeCreateElement) => el.category === category,
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

async function onSubcategoryClose() {
	state.transitionDirection = 'out';
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
		if (expandAll) state.activeCategory = Object.keys(props.categoriesWithNodes);
	},
);

watch(
	() => props.subcategoryOverride,
	(subcategory) => {
		if (subcategory) onSubcategorySelected(subcategory, false);
	},
);

onMounted(() => {
	registerCustomAction('showAllNodeCreatorNodes', switchToAllTabAndFilter);
});

onUnmounted(() => {
	nodeCreatorStore.setFilter('');
	unregisterCustomAction('showAllNodeCreatorNodes');
});

watch(filteredNodeTypes, (returnItems) => {
	$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', {
		nodeFilter: nodeCreatorStore.itemsFilter,
		result: returnItems,
		selectedType: nodeCreatorStore.selectedType,
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
			selectedType: nodeCreatorStore.selectedType,
			filteredNodes: filteredNodeTypes.value,
		});
		instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.nodeFilterChanged', {
			oldValue,
			newValue,
			selectedType: nodeCreatorStore.selectedType,
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
.subcategoryHeader {
	border-bottom: $node-creator-border-color solid 1px;
	height: 50px;
	background-color: $node-creator-subcategory-panel-header-bacground-color;

	font-size: var(--font-size-l);
	font-weight: var(--font-weight-bold);
	line-height: var(--font-line-height-compact);

	display: flex;
	align-items: center;
	padding: 11px 15px;
}

.subcategoryBackButton {
	background: transparent;
	border: none;
	cursor: pointer;
	padding: var(--spacing-s) 0;
}

.subcategoryBackIcon {
	color: $node-creator-arrow-color;
	height: 16px;
	margin-right: var(--spacing-s);
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
