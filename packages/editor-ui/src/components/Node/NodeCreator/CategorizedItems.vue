<template>
	<transition :name="activeSubcategoryTitle ? 'panel-slide-in' : 'panel-slide-out'" >
		<div
			:class="$style.categorizedItems"
			ref="mainPanelContainer"
			@click="onClickInside"
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
			/>
			<div v-if="searchFilter.length === 0" :class="$style.scrollable">
				<item-iterator
					:elements="renderedItems"
					:activeIndex="activeSubcategory ? activeSubcategoryIndex : activeIndex"
					:transitionsEnabled="true"
					@selected="selected"
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
				/>
			</div>
			<no-results v-else :showRequest="filteredAllNodeTypes.length === 0" :show-icon="filteredAllNodeTypes.length === 0">
				<!-- There are results in other sub-categories/tabs  -->
				<template #title>
					<p v-if="filteredAllNodeTypes.length === 0" v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
					<p v-else v-html="$locale.baseText('nodeCreator.noResults.clickToSeeResults')" />
				</template>

				<!-- Regular Search -->
				<template v-if="filteredAllNodeTypes.length === 0" #action>
					{{ $locale.baseText('nodeCreator.noResults.dontWorryYouCanProbablyDoItWithThe') }}
					<n8n-link @click="selectHttpRequest" v-if="[REGULAR_NODE_FILTER, ALL_NODE_FILTER].includes(selectedType)">
						{{ $locale.baseText('nodeCreator.noResults.httpRequest') }}
					</n8n-link>
					<template v-if="selectedType === ALL_NODE_FILTER">
						{{ $locale.baseText('nodeCreator.noResults.or') }}
					</template>

					<no-results v-else :showRequest="filteredAllNodeTypes.length === 0" :show-icon="filteredAllNodeTypes.length === 0">
						<!-- There are results in other sub-categories/tabs  -->
						<template #title>
							<p v-html="$locale.baseText('nodeCreator.noResults.clickToSeeResults')" />
							<p v-if="filteredAllNodeTypes.length === 0" v-text="$locale.baseText('nodeCreator.noResults.weDidntMakeThatYet')" />
							<p v-else v-html="$locale.baseText('nodeCreator.noResults.clickToSeeResults')" />
						</template>

						<!-- Regular Search -->
						<template v-if="filteredAllNodeTypes.length === 0" #action>
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
					</no-results>
				</template>
			</no-results>
		</div>
	</transition>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import camelcase from 'lodash.camelcase';

import { externalHooks } from '@/mixins/externalHooks';
import { globalLinkActions } from '@/mixins/globalLinkActions';

import mixins from 'vue-typed-mixins';
import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import { INodeCreateElement, INodeItemProps, ISubcategoryItemProps, ICategoriesWithNodes, ICategoryItemProps, INodeFilterType } from '@/Interface';
import { WEBHOOK_NODE_TYPE, HTTP_REQUEST_NODE_TYPE, ALL_NODE_FILTER, TRIGGER_NODE_FILTER, REGULAR_NODE_FILTER, NODE_TYPE_COUNT_MAPPER } from '@/constants';
import { BaseTextKey } from '@/plugins/i18n';
import { intersection, sublimeSearch, matchesNodeType, matchesSelectType  } from '@/utils';
import { mapStores } from 'pinia';
import { useWorkflowsStore } from '@/stores/workflows';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNodeTypesStore } from '@/stores/nodeTypes';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

export default mixins(externalHooks, globalLinkActions).extend({
	name: 'CategorizedItems',
	components: {
		ItemIterator,
		NoResults,
		SearchBar,
	},
	props: {
		searchItems: {
			type: Array as PropType<INodeCreateElement[]>,
		},
		excludedCategories: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		excludedSubcategories: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		firstLevelItems: {
			type: Array as PropType<INodeCreateElement[]>,
			default: () => [],
		},
		initialActiveCategories: {
			type: Array as PropType<string[]>,
			default: () => [],
		},
		initialActiveIndex: {
			type: Number,
			default: 1,
		},
	},
	data() {
		return {
			activeCategory: this.initialActiveCategories || [] as string[],
			// Keep track of activated subcategories so we could traverse back more than one level
			activeSubcategoryHistory: [] as INodeCreateElement[],
			activeIndex: this.initialActiveIndex,
			activeSubcategoryIndex: 0,
			searchEventBus: new Vue(),
			ALL_NODE_FILTER,
			TRIGGER_NODE_FILTER,
			REGULAR_NODE_FILTER,
		};
	},
	mounted() {
		this.registerCustomAction('showAllNodeCreatorNodes', this.switchToAllTabAndFilter);
	},
	destroyed() {
		this.nodeCreatorStore.itemsFilter = '';
		this.unregisterCustomAction('showAllNodeCreatorNodes');
	},
	computed: {
		...mapStores(
			useNodeCreatorStore,
			useNodeTypesStore,
			useRootStore,
			useWorkflowsStore,
		),
		activeSubcategory(): INodeCreateElement | null {
			return this.activeSubcategoryHistory[this.activeSubcategoryHistory.length - 1] || null;
		},
		nodeFilter(): string {
			return this.nodeCreatorStore.itemsFilter;
		},
		selectedType(): INodeFilterType {
			return this.nodeCreatorStore.selectedType;
		},
		categoriesWithNodes(): ICategoriesWithNodes {
			return this.nodeTypesStore.categoriesWithNodes;
		},
		categorizedItems(): INodeCreateElement[] {
			return this.nodeTypesStore.categorizedItems;
		},
		activeSubcategoryTitle(): string {
			if(!this.activeSubcategory || !this.activeSubcategory.properties) return '';
			const subcategoryName = camelcase((this.activeSubcategory.properties as ISubcategoryItemProps).subcategory);
			const titleLocaleKey = `nodeCreator.subcategoryTitles.${subcategoryName}` as BaseTextKey;
			const nameLocaleKey = `nodeCreator.subcategoryNames.${subcategoryName}` as BaseTextKey;

			const titleLocale = this.$locale.baseText(titleLocaleKey);
			const nameLocale = this.$locale.baseText(nameLocaleKey);

			// If resolved title locale is same as the locale key it means it doesn't exist
			// so we fallback to the subcategoryName
			return titleLocale === titleLocaleKey ? nameLocale : titleLocale;
		},
		searchFilter(): string {
			return this.nodeFilter.toLowerCase().trim();
		},
		defaultLocale (): string {
			return this.rootStore.defaultLocale;
		},
		filteredNodeTypes(): INodeCreateElement[] {
			const filter = this.searchFilter;

			const searchableNodes = this.subcategorizedNodes.length > 0 && this.activeSubcategory?.key !== '*'
				? this.subcategorizedNodes
				: this.searchItems;

			let returnItems: INodeCreateElement[] = [];
			if (this.defaultLocale !== 'en') {
				returnItems = searchableNodes.filter((el: INodeCreateElement) => {
					return filter && matchesSelectType(el, this.selectedType) && matchesNodeType(el, filter);
				});
			}
			else {
				const matchingNodes = searchableNodes.filter((el) => matchesSelectType(el, this.selectedType));
				const matchedCategorizedNodes = sublimeSearch<INodeCreateElement>(filter, matchingNodes, [{key: 'properties.nodeType.displayName', weight: 2}, {key: 'properties.nodeType.codex.alias', weight: 1}]);
				returnItems = matchedCategorizedNodes.map(({item}) => item);;
			}


			const filteredNodeTypes = this.excludedCategories.length === 0
				? returnItems
				: this.filterOutNodexFromExcludedCategories(returnItems);

			setTimeout(() => {
				this.$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', {
					nodeFilter: this.nodeFilter,
					result: filteredNodeTypes,
					selectedType: this.selectedType,
				});
			}, 0);

			return filteredNodeTypes;
		},
		filteredAllNodeTypes(): INodeCreateElement[] {
			if(this.filteredNodeTypes.length > 0) return [];

			const matchedAllNodex = this.searchItems.filter((el: INodeCreateElement) => {
				return this.searchFilter && matchesNodeType(el, this.searchFilter);
			});

			return matchedAllNodex;
		},
		categorized(): INodeCreateElement[] {
			return this.categorizedItems && this.categorizedItems
				.reduce((accu: INodeCreateElement[], el: INodeCreateElement) => {
					if((this.excludedCategories || []).includes(el.category)) return accu;

					if(
						el.type === 'subcategory' &&
						(this.excludedSubcategories || []).includes((el.properties as ISubcategoryItemProps).subcategory)
					) {
						return accu;
					}

					if (
						el.type !== 'category' &&
						!this.activeCategory.includes(el.category)
					) {
						return accu;
					}

					if (!matchesSelectType(el, this.selectedType)) {
						return accu;
					}

					if (el.type === 'category') {
						accu.push({
							...el,
							properties: {
								expanded: this.activeCategory.includes(el.category),
							},
						} as INodeCreateElement);
						return accu;
					}

					accu.push(el);
					return accu;
				}, []);
		},

		subcategorizedItems(): INodeCreateElement[] {
			const activeSubcategory = this.activeSubcategory;
			if(!activeSubcategory) return [];

			const category = activeSubcategory.category;
			const subcategory = (activeSubcategory.properties as ISubcategoryItemProps).subcategory;

			// If no category is set, we use all categorized nodes
			const nodes = category
				? this.categoriesWithNodes[category][subcategory].nodes
				: this.categorized;

			return nodes.filter((el: INodeCreateElement) => matchesSelectType(el, this.selectedType));
		},

		subcategorizedNodes(): INodeCreateElement[] {
			return this.subcategorizedItems.filter(node => node.type === 'node');
		},

		renderedItems(): INodeCreateElement[] {
			if(this.firstLevelItems.length > 0 && this.activeSubcategory === null) return this.firstLevelItems;
			if(this.subcategorizedItems.length === 0) return this.categorized;

			return this.subcategorizedItems;
		},

		isSearchVisible(): boolean {
			if(this.subcategorizedItems.length === 0) return true;

			let totalItems = 0;
			for (const item of this.subcategorizedItems) {
				// Category contains many nodes so we need to count all of them
				// for the current selectedType
				if(item.type === 'category') {
					const categoryItems = this.categoriesWithNodes[item.key];
					const categoryItemsCount = Object.values(categoryItems)?.[0];
					const countKeys = NODE_TYPE_COUNT_MAPPER[this.selectedType];

					for (const countKey of countKeys) {
						totalItems += categoryItemsCount[(countKey as "triggerCount" | "regularCount")];
					}

					continue;
				}
				// If it's not category, it must be just a node item so we count it as 1
				totalItems += 1;
			}

			return totalItems > 9;
		},
	},
	watch: {
		isSearchVisible(isVisible) {
			if(isVisible === false) {
				// Focus the root container when search is hidden to make sure
				// keyboard navigation still works
				this.$nextTick(() => {
					(this.$refs.mainPanelContainer as HTMLElement).focus();
				});
			}
		},
		nodeFilter(newValue, oldValue) {
			// Reset the index whenver the filter-value changes
			this.activeIndex = 0;
			this.activeSubcategoryIndex = 0;
			this.$externalHooks().run('nodeCreateList.nodeFilterChanged', {
				oldValue,
				newValue,
				selectedType: this.selectedType,
				filteredNodes: this.filteredNodeTypes,
			});
			this.$telemetry.trackNodesPanel('nodeCreateList.nodeFilterChanged', {
				oldValue,
				newValue,
				selectedType: this.selectedType,
				filteredNodes: this.filteredNodeTypes,
				workflow_id: this.workflowsStore.workflowId,
			});
		},
	},
	methods: {
		filterOutNodexFromExcludedCategories(nodes: INodeCreateElement[]) {
			return nodes.filter(node => {
				const excludedCategoriesIntersect = intersection(
					this.excludedCategories,
					((node.properties as INodeItemProps)?.nodeType.codex?.categories || []),
				);

				return excludedCategoriesIntersect.length === 0;
			});
		},
		switchToAllTabAndFilter() {
			const currentFilter = this.nodeFilter;
			this.nodeCreatorStore.showTabs = true;
			this.nodeCreatorStore.selectedType = ALL_NODE_FILTER;
			this.activeSubcategoryHistory = [];

			this.$nextTick(() => this.nodeCreatorStore.itemsFilter = currentFilter);
		},
		onNodeFilterChange(filter: string) {
			this.nodeCreatorStore.itemsFilter = filter;
		},
		selectWebhook() {
			this.$emit('nodeTypeSelected', WEBHOOK_NODE_TYPE);
		},
		selectHttpRequest() {
			this.$emit('nodeTypeSelected', HTTP_REQUEST_NODE_TYPE);
		},
		nodeFilterKeyDown(e: KeyboardEvent) {
			// We only want to propagate 'Escape' as it closes the node-creator and
			// 'Tab' which toggles it
			if (!['Escape', 'Tab'].includes(e.key)) e.stopPropagation();

			// Prevent cursors position change
			if(['ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();

			if (this.activeSubcategory) {
				const activeList = this.subcategorizedItems;
				const activeNodeType = activeList[this.activeSubcategoryIndex];

				if (e.key === 'ArrowDown' && this.activeSubcategory) {
					this.activeSubcategoryIndex++;
					this.activeSubcategoryIndex = Math.min(
						this.activeSubcategoryIndex,
						activeList.length - 1,
					);
				}
				else if (e.key === 'ArrowUp' && this.activeSubcategory) {
					this.activeSubcategoryIndex--;
					this.activeSubcategoryIndex = Math.max(this.activeSubcategoryIndex, 0);
				}
				else if (e.key === 'Enter') {
					this.selected(activeNodeType);
				} else if (e.key === 'ArrowLeft' && activeNodeType?.type === 'category' && (activeNodeType.properties as ICategoryItemProps).expanded) {
					this.selected(activeNodeType);
				} else if (e.key === 'ArrowLeft') {
					this.onSubcategoryClose();
				} else if (e.key === 'ArrowRight' && activeNodeType?.type === 'category' && !(activeNodeType.properties as ICategoryItemProps).expanded) {
					this.selected(activeNodeType);
				}
				return;
			}

			const activeList = this.searchFilter.length > 0 ? this.filteredNodeTypes : this.renderedItems;
			const activeNodeType = activeList[this.activeIndex];

			if (e.key === 'ArrowDown') {
				this.activeIndex++;
				// Make sure that we stop at the last nodeType
				this.activeIndex = Math.min(
					this.activeIndex,
					activeList.length - 1,
				);
			} else if (e.key === 'ArrowUp') {
				this.activeIndex--;
				// Make sure that we do not get before the first nodeType
				this.activeIndex = Math.max(this.activeIndex, 0);
			} else if (e.key === 'Enter' && activeNodeType) {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowRight' && activeNodeType?.type === 'subcategory') {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowRight' && activeNodeType?.type === 'category' && !(activeNodeType.properties as ICategoryItemProps).expanded) {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowLeft' && activeNodeType?.type === 'category' && (activeNodeType.properties as ICategoryItemProps).expanded) {
				this.selected(activeNodeType);
			}
		},
		selected(element: INodeCreateElement) {
			const typeHandler = {
				node: () => this.$emit('nodeTypeSelected', (element.properties as INodeItemProps).nodeType.name),
				category: () => this.onCategorySelected(element.category),
				subcategory: () => this.onSubcategorySelected(element),
			};

			typeHandler[element.type]();
		},
		onCategorySelected(category: string) {
			if (this.activeCategory.includes(category)) {
				this.activeCategory = this.activeCategory.filter(
					(active: string) => active !== category,
				);
			} else {
				this.activeCategory = [...this.activeCategory, category];
				this.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', { category_name: category, workflow_id: this.workflowsStore.workflowId });
			}

			this.activeIndex = this.categorized.findIndex(
				(el: INodeCreateElement) => el.category === category,
			);
		},
		onSubcategorySelected(selected: INodeCreateElement) {
			this.$emit('onSubcategorySelected', selected);
			this.nodeCreatorStore.showTabs = false;
			this.activeSubcategoryIndex = 0;
			this.activeSubcategoryHistory.push(selected);
			this.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', { selected, workflow_id: this.workflowsStore.workflowId });
		},

		onSubcategoryClose() {
			this.$emit('subcategoryClose', this.activeSubcategory);
			this.activeSubcategoryHistory.pop();
			this.activeSubcategoryIndex = 0;
			this.nodeCreatorStore.itemsFilter = '';

			if (!this.nodeCreatorStore.showScrim) {
				this.nodeCreatorStore.showTabs = true;
			}
		},

		onClickInside() {
			this.searchEventBus.$emit('focus');
		},
	},
});
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
