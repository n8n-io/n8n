<template>
	<transition :name="activeSubcategoryTitle ? 'panel-slide-in' : 'panel-slide-out'" >
		<div
			:class="$style.categorizedItems"
			@click="onClickInside"
			ref="mainPanelContainer"
			tabindex="0"
			@keydown.capture="nodeFilterKeyDown"
			:key="`${activeSubcategoryTitle}_transition`"
		>
			<div class="header" v-if="$slots.header">
				<slot name="header" />
			</div>

			<div :class="$style.subcategoryHeader" v-if="activeSubcategory">
				<button :class="$style.subcategoryBackButton" @click="onSubcategoryClose">
					<font-awesome-icon :class="$style.subcategoryBackIcon" icon="arrow-left" size="2x" />
				</button>
				<span v-text="activeSubcategoryTitle" />
			</div>

			<search-bar
				v-if="isSearchVisible"
				:value="nodeFilter"
				@input="onNodeFilterChange"
				:eventBus="searchEventBus"
				:placeholder="$locale.baseText('nodeCreator.searchBar.searchNodes')"
			/>
			<div v-if="searchFilter.length === 0" :class="$style.scrollable">
				<item-iterator
					:elements="renderedItems"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					:transitionsEnabled="true"
					@selected="selected"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
					:simple-node-style="withActions"
					:allow-actions="withActions"
				/>
			</div>
			<div
				:class="$style.scrollable"
				v-else-if="filteredNodeTypes.length > 0"
			>
				<item-iterator
					:elements="filteredNodeTypes"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					@selected="selected"
					@nodeTypeSelected="$listeners.nodeTypeSelected"
					:simple-node-style="withActions"
					:allow-actions="withActions"
				/>
			</div>
			<no-results v-else :showRequest="filteredAllNodeTypes.length === 0" :show-icon="filteredAllNodeTypes.length === 0">
					<!-- There are results in other sub-categories/tabs  -->
					<template v-if="filteredAllNodeTypes.length > 0">
						<p
							v-html="$locale.baseText('nodeCreator.noResults.clickToSeeResults')"
							slot="title"
						/>
					</template>

					<!-- Regular Search -->
					<template v-else>
						<p v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" slot="title" />
						<template slot="action">
							{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
							<n8n-link @click="selectHttpRequest" v-if="[REGULAR_NODE_FILTER, ALL_NODE_FILTER].includes(selectedType)">
								{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}
							</n8n-link>
							<template v-if="selectedType === ALL_NODE_FILTER">
								{{ $locale.baseText('nodeCreator.noResults.or') }}
							</template>

							<n8n-link @click="selectWebhook" v-if="[TRIGGER_NODE_FILTER, ALL_NODE_FILTER].includes(selectedType)">
								{{ $locale.baseText('nodeCreator.noResults.webhook') }}
							</n8n-link>
							{{ $locale.baseText('nodeCreator.noResults.node') }}
						</template>
					</template>
			</no-results>
		</div>
	</transition>
</template>

<script lang="ts" setup>
import Vue, { computed, reactive, onMounted, watch, getCurrentInstance, toRefs, onUnmounted } from 'vue';
import camelcase from 'lodash.camelcase';
import { externalHooks } from '@/components/mixins/externalHooks';
import useGlobalLinkActions from '@/components/composables/useGlobalLinkActions';

import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import { INodeCreateElement, ISubcategoryItemProps, ICategoriesWithNodes, ICategoryItemProps, INodeFilterType } from '@/Interface';
import { WEBHOOK_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, ALL_NODE_FILTER, TRIGGER_NODE_FILTER, REGULAR_NODE_FILTER, NODE_TYPE_COUNT_MAPPER } from '@/constants';
import { matchesNodeType, matchesSelectType } from './helpers';
import { BaseTextKey } from '@/plugins/i18n';
import { sublimeSearch } from './sortUtils';
import { store } from '@/store';

export interface Props {
	flatten?: boolean;
	withActions?: boolean;
	searchItems?: INodeCreateElement[];
	excludedCategories?: string[];
	excludedSubcategories?: string[];
	firstLevelItems?: INodeCreateElement[];
	initialActiveCategories?: string[];
	initialActiveIndex?: number;
	subcategoryItems?: {[key: string]: INodeCreateElement[]};
}

const props = withDefaults(defineProps<Props>(), {
	searchItems: () => [],
	excludedCategories: () => [],
	excludedSubcategories: () => [],
	firstLevelItems: () => [],
	initialActiveCategories: () => [],
});

const emit = defineEmits<{
	(event: 'subcategoryClose', value: INodeCreateElement): void,
	(event: 'onSubcategorySelected', value: INodeCreateElement): void,
	(event: 'nodeTypeSelected', value: string[]): void,
}>();

const instance = getCurrentInstance();
const { registerCustomAction, unregisterCustomAction } = useGlobalLinkActions();

const { $externalHooks } = new externalHooks();
const state = reactive({
	activeCategory: props.initialActiveCategories,
	// Keep track of activated subcategories so we could traverse back more than one level
	activeSubcategoryHistory: [] as INodeCreateElement[],
	activeIndex: props.initialActiveIndex || 0,
	activeSubcategoryIndex: 0,
	searchEventBus: new Vue(),
	ALL_NODE_FILTER,
	TRIGGER_NODE_FILTER,
	REGULAR_NODE_FILTER,
	mainPanelContainer: null as HTMLElement | null,
});

const activeSubcategory = computed<INodeCreateElement | null> (
	() => state.activeSubcategoryHistory[state.activeSubcategoryHistory.length - 1] || null,
);

const nodeFilter = computed<string> (() => store.getters['nodeCreator/itemsFilter']);

const selectedType = computed<INodeFilterType> (() => store.getters['nodeCreator/selectedType']);

const categoriesWithNodes = computed<ICategoriesWithNodes> (() => store.getters['nodeTypes/categoriesWithNodes']);

const categorizedItems = computed<INodeCreateElement[]> (() => {
  return store.getters['nodeTypes/categorizedItems'];
});

const activeSubcategoryTitle = computed<string> (() => {
  if(!activeSubcategory.value || !activeSubcategory.value.properties) return '';
  const subcategoryName = camelcase((activeSubcategory.value.properties as ISubcategoryItemProps).subcategory);

  const titleLocaleKey = `nodeCreator.subcategoryTitles.${subcategoryName}` as BaseTextKey;
  const nameLocaleKey = `nodeCreator.subcategoryNames.${subcategoryName}` as BaseTextKey;

  const titleLocale = instance?.proxy?.$locale.baseText(titleLocaleKey) as string;
  const nameLocale = instance?.proxy?.$locale.baseText(nameLocaleKey) as string;

  // If resolved title locale is same as the locale key it means it doesn't exist
  // so we fallback to the subcategoryName
  return titleLocale === titleLocaleKey ? nameLocale : titleLocale;
});

const searchFilter = computed<string> (() => nodeFilter.value.toLowerCase().trim());

const defaultLocale = computed<string> (() => store.getters.defaultLocale);

const matchedTypeNodes = computed<INodeCreateElement[]> (() => {
  const searchableNodes = subcategorizedNodes.value.length > 0 ? subcategorizedNodes.value : props.searchItems;

  if(isAppEventSubcategory.value) return searchableNodes;
  return searchableNodes.filter((el: INodeCreateElement) => matchesSelectType(el, selectedType.value));
});

const filteredNodeTypes = computed<INodeCreateElement[]> (() => {
  const filter = searchFilter.value;
  const searchableNodes = subcategorizedNodes.value.length > 0 ? subcategorizedNodes.value : props.searchItems;

  let returnItems: INodeCreateElement[] = [];
  if (defaultLocale.value !== 'en') {
    returnItems = searchableNodes.filter((el: INodeCreateElement) => {
      return filter && matchesSelectType(el, selectedType.value) && matchesNodeType(el, filter);
    });
  }
  else {
    const matchingNodes = searchableNodes.filter((el) => matchesSelectType(el, selectedType.value));
    const matchedCategorizedNodes = sublimeSearch<INodeCreateElement>(filter, matchingNodes, [{key: 'properties.nodeType.displayName', weight: 2}, {key: 'properties.nodeType.codex.alias', weight: 1}]);
    returnItems = matchedCategorizedNodes.map(({item}) => item);
  }

  return returnItems;
});

const filteredAllNodeTypes = computed<INodeCreateElement[]> (() => {
  if(filteredNodeTypes.value.length > 0) return [];

  const matchedAllNodex = props.searchItems.filter((el: INodeCreateElement) => {
    return searchFilter.value && matchesNodeType(el, searchFilter.value);
  });

  return matchedAllNodex;
});

const categorized = computed<INodeCreateElement[]> (() => {
  return categorizedItems.value
    .reduce((accu: INodeCreateElement[], el: INodeCreateElement) => {
      if((props.excludedCategories || []).includes(el.category)) return accu;

      if(
        el.type === 'subcategory' &&
        (props.excludedSubcategories || []).includes((el.properties as ISubcategoryItemProps).subcategory)
      ) {
        return accu;
      }

      if (
        el.type !== 'category' &&
        !state.activeCategory.includes(el.category)
      ) {
        return accu;
      }

      if (!matchesSelectType(el, selectedType.value)) {
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

const subcategorizedItems = computed<INodeCreateElement[]> (() => {
  if(!activeSubcategory.value) return [];

  const category = activeSubcategory.value.category;
  const subcategory = (activeSubcategory.value.properties as ISubcategoryItemProps).subcategory;

  // If no category is set, we use all categorized nodes
  const nodes = category
    ? categoriesWithNodes.value[category][subcategory].nodes
    : categorized.value;

  return nodes.filter((el: INodeCreateElement) => matchesSelectType(el, selectedType.value));
});

const isAppEventSubcategory = computed<boolean> (() => activeSubcategory.value?.key === 'app_nodes');

const subcategorizedNodes = computed<INodeCreateElement[]> (() => {
	const subcategorizedNodesOverride = props.subcategoryItems?.[activeSubcategory.value?.key as string];

  return subcategorizedNodesOverride || subcategorizedItems.value.filter(node => node.type === 'node');
});

const renderedItems = computed<INodeCreateElement[]> (() => {
  if(props.firstLevelItems.length > 0 && activeSubcategory.value === null) return props.firstLevelItems;
  if(props.flatten) return matchedTypeNodes.value;
  if(subcategorizedItems.value.length === 0) return categorized.value;

  return subcategorizedItems.value;
});

const isSearchVisible = computed<boolean> (() => {
  if(subcategorizedItems.value.length === 0) return true;

  let totalItems = 0;
  for (const item of subcategorizedItems.value) {
    // Category contains many nodes so we need to count all of them
    // for the current selectedType
    if(item.type === 'category') {
      const categoryItems = categoriesWithNodes.value[item.key];
      const categoryItemsCount = Object.values(categoryItems)?.[0];
      const countKeys = NODE_TYPE_COUNT_MAPPER[selectedType.value];

      for (const countKey of countKeys) {
        totalItems += categoryItemsCount[(countKey as "triggerCount" | "regularCount")];
      }

      continue;
    }
    // If it's not category, it must be just a node item so we count it as 1
    totalItems += 1;
  }
  return totalItems > 9;
});

// Methods
function switchToAllTabAndFilter() {
  const currentFilter = nodeFilter.value;
  store.commit('nodeCreator/setShowTabs', true);
  store.commit('nodeCreator/setSelectedType', ALL_NODE_FILTER);
  state.activeSubcategoryHistory = [];

  Vue.nextTick(() => store.commit('nodeCreator/setFilter', currentFilter));
}

function onNodeFilterChange(filter: string) {
  store.commit('nodeCreator/setFilter', filter);
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
  if(['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();

  if (activeSubcategory.value) {
    const activeList = subcategorizedItems.value;
    const activeNodeType = activeList[state.activeSubcategoryIndex];

    if (e.key === 'ArrowDown' && activeSubcategory.value) {
      state.activeSubcategoryIndex++;
      state.activeSubcategoryIndex = Math.min(
        state.activeSubcategoryIndex,
        activeList.length - 1,
      );
    }
    else if (e.key === 'ArrowUp' && activeSubcategory.value) {
      state.activeSubcategoryIndex--;
      state.activeSubcategoryIndex = Math.max(state.activeSubcategoryIndex, 0);
    }
    else if (e.key === 'Enter') {
      selected(activeNodeType);
    } else if (e.key === 'ArrowLeft' && activeNodeType?.type === 'category' && (activeNodeType.properties as ICategoryItemProps).expanded) {
      selected(activeNodeType);
    } else if (e.key === 'ArrowLeft') {
      onSubcategoryClose();
    } else if (e.key === 'ArrowRight' && activeNodeType?.type === 'category' && !(activeNodeType.properties as ICategoryItemProps).expanded) {
      selected(activeNodeType);
    }
    return;
  }

  const activeList = searchFilter.value.length > 0 ? filteredNodeTypes.value : renderedItems.value;
  const activeNodeType = activeList[state.activeIndex];

  if (e.key === 'ArrowDown') {
    state.activeIndex++;
    // Make sure that we stop at the last nodeType
    state.activeIndex = Math.min(
      state.activeIndex,
      activeList.length - 1,
    );
  } else if (e.key === 'ArrowUp') {
    state.activeIndex--;
    // Make sure that we do not get before the first nodeType
    state.activeIndex = Math.max(state.activeIndex, 0);
  } else if (e.key === 'Enter' && activeNodeType) {
    selected(activeNodeType);
  } else if (e.key === 'ArrowRight' && activeNodeType?.type === 'subcategory') {
    selected(activeNodeType);
  } else if (e.key === 'ArrowRight' && activeNodeType?.type === 'category' && !(activeNodeType.properties as ICategoryItemProps).expanded) {
    selected(activeNodeType);
  } else if (e.key === 'ArrowLeft' && activeNodeType?.type === 'category' && (activeNodeType.properties as ICategoryItemProps).expanded) {
    selected(activeNodeType);
  }
}
function selected(element: INodeCreateElement) {
  const typeHandler = {
    category: () => onCategorySelected(element.category),
    subcategory: () => onSubcategorySelected(element),
  };

  typeHandler[element.type as "category" | "subcategory"]();
}

function onCategorySelected(category: string) {
  if (state.activeCategory.includes(category)) {
    state.activeCategory = state.activeCategory.filter(
      (active: string) => active !== category,
    );
  } else {
    state.activeCategory = [...state.activeCategory, category];
    instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', { category_name: category, workflow_id: store.getters.workflowId });
  }

  state.activeIndex = categorized.value.findIndex(
    (el: INodeCreateElement) => el.category === category,
  );
}

function onSubcategorySelected(selected: INodeCreateElement) {
  emit('onSubcategorySelected', selected);
  store.commit('nodeCreator/setShowTabs', false);
  state.activeSubcategoryIndex = 0;
  state.activeSubcategoryHistory.push(selected);
  instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', { selected, workflow_id: store.getters.workflowId });
}

function onSubcategoryClose() {
  emit('subcategoryClose', activeSubcategory.value as INodeCreateElement);
  state.activeSubcategoryHistory.pop();
  state.activeSubcategoryIndex = 0;
  store.commit('nodeCreator/setFilter', '');

  if(!store.getters['nodeCshowScrimreator/']) {
    store.commit('nodeCreator/setShowTabs', true);
  }
}

function onClickInside() {
  state.searchEventBus.$emit('focus');
}

onMounted(() => {
	registerCustomAction('showAllNodeCreatorNodes', switchToAllTabAndFilter);
});

onUnmounted(() => {
	store.commit('nodeCreator/setFilter', '');
	unregisterCustomAction('showAllNodeCreatorNodes');
});

watch(filteredNodeTypes, (returnItems) => {
	$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', {
		nodeFilter: nodeFilter.value,
		result: returnItems,
		selectedType: selectedType.value,
	});
});

watch(isSearchVisible, (isVisible) => {
	if(isVisible === false) {
		// Focus the root container when search is hidden to make sure
		// keyboard navigation still works
		Vue.nextTick(() => state.mainPanelContainer?.focus());
	}
});
watch(nodeFilter, (newValue, oldValue) => {
	// Reset the index whenver the filter-value changes
	state.activeIndex = 0;
	state.activeSubcategoryIndex = 0;
	$externalHooks().run('nodeCreateList.nodeFilterChanged', {
		oldValue,
		newValue,
		selectedType: selectedType.value,
		filteredNodes: filteredNodeTypes.value,
	});
	instance?.proxy.$telemetry.trackNodesPanel('nodeCreateList.nodeFilterChanged', {
		oldValue,
		newValue,
		selectedType: selectedType.value,
		filteredNodes: filteredNodeTypes.value,
		workflow_id: store.getters.workflowId,
	});
});

const { searchEventBus, activeSubcategoryIndex, activeIndex, mainPanelContainer } = toRefs(state);
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
.subcategoryHeader {
	border-bottom: $node-creator-border-color solid 1px;
	height: 50px;
	background-color: $node-creator-subcategory-panel-header-bacground-color;

	font-size: 18px;
	font-weight: 600;
	line-height: 16px;

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
	overflow-y: auto;
	overflow-x: visible;

	&::-webkit-scrollbar {
		display: none;
	}
}
</style>
