<template>
	<slide-transition :absolute="true">
		<div
			:class="$style.categorizedItems"
			ref="mainPanelContainer"
			@click="onClickInside"
			:key="activeSubcategory ? activeSubcategory.key : 'subcategory'"
		>
			<div :class="$style.subcategoryHeader" v-if="activeSubcategory">
				<button :class="$style.subcategoryBackButton" @click="onSubcategoryClose">
					<font-awesome-icon :class="$style.subcategoryBackIcon" icon="arrow-left" size="2x" />
				</button>
				<span v-text="activeSubcategoryTitle" />
			</div>

			<div>
				<search-bar
					v-model="nodeFilter"
					:eventBus="searchEventBus"
					@keydown.native="nodeFilterKeyDown"
				/>
				<div v-if="searchFilter.length === 0" :class="$style.scrollable">
					<item-iterator
						:elements="renderedItems"
						:disabled="!!activeSubcategory"
						:activeIndex="activeIndex"
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
						:activeIndex="activeIndex"
						@selected="selected"
					/>
				</div>
				<no-results
					v-else
					@nodeTypeSelected="$emit('nodeTypeSelected', $event)"
				/>
			</div>
		</div>
	</slide-transition>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue';
import camelcase from 'lodash.camelcase';

import { externalHooks } from '@/components/mixins/externalHooks';

import mixins from 'vue-typed-mixins';
import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import TriggerHelperPanel from './TriggerHelperPanel.vue';
import { INodeCreateElement, INodeItemProps, ISubcategoryItemProps, ICategoriesWithNodes, ICategoryItemProps } from '@/Interface';
import { CORE_NODES_CATEGORY } from '@/constants';
import SlideTransition from '../transitions/SlideTransition.vue';
import { matchesNodeType, matchesSelectType } from './helpers';
import { BaseTextKey } from '@/plugins/i18n';

export default mixins(externalHooks).extend({
	name: 'CategorizedItems',
	components: {
		ItemIterator,
		NoResults,
		SlideTransition,
		SearchBar,
		TriggerHelperPanel,
	},
	props: {
		searchItems: {
			type: Object as PropType<INodeCreateElement[]>,
		},
		excludedCategories: {
			type: Array,
			default: () => [],
		},
		excludedSubcategories: {
			type: Array,
			default: () => [],
		},
		selectedSubcategory: {
			type: Array,
			default: () => [],
		},
	},
	data() {
		return {
			activeCategory: [] as string[],
			activeSubcategory: null as INodeCreateElement | null,
			activeIndex: 1,
			activeSubcategoryIndex: 0,
			nodeFilter: '',
			searchEventBus: new Vue(),
		};
	},
	computed: {
		selectedType(): string {
			return this.$store.getters['ui/selectedNodeCreatorType'];
		},
		categoriesWithNodes(): ICategoriesWithNodes {
			return this.$store.getters['nodeTypes/categoriesWithNodes'];
		},
		categorizedItems(): INodeCreateElement[] {
			return this.$store.getters['nodeTypes/categorizedItems'];
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
		filteredNodeTypes(): INodeCreateElement[] {
			const nodeTypes: INodeCreateElement[] = this.searchItems;
			const filter = this.searchFilter;
			const returnData = nodeTypes.filter((el: INodeCreateElement) => {
				return filter && matchesSelectType(el, this.selectedType) && matchesNodeType(el, filter);
			});

			setTimeout(() => {
				this.$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', {
					nodeFilter: this.nodeFilter,
					result: returnData,
					selectedType: this.selectedType,
				});
			}, 0);

			return returnData;
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

		subcategorizedNodes(): INodeCreateElement[] {
			const activeSubcategory = this.activeSubcategory as INodeCreateElement;
			if(!activeSubcategory) return [];

			const category = activeSubcategory.category;
			const subcategory = (activeSubcategory.properties as ISubcategoryItemProps).subcategory;

			// If there's no specific category, we use all nodes
			const nodes = category
				? this.categoriesWithNodes[category][subcategory].nodes
				: this.categorized;

			return nodes.filter((el: INodeCreateElement) => matchesSelectType(el, this.selectedType));
		},

		renderedItems(): INodeCreateElement[] {
			if(this.subcategorizedNodes.length === 0) return this.categorized;

			return this.subcategorizedNodes;
		},
	},
	watch: {
		nodeFilter(newValue, oldValue) {
			// Reset the index whenver the filter-value changes
			this.activeIndex = 0;
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
				workflow_id: this.$store.getters.workflowId,
			});
		},
	},
	methods: {
		nodeFilterKeyDown(e: KeyboardEvent) {
			if (!['Escape', 'Tab'].includes(e.key)) {
				// We only want to propagate 'Escape' as it closes the node-creator and
				// 'Tab' which toggles it
				e.stopPropagation();
			}

			if (this.activeSubcategory) {
				const activeList = this.subcategorizedNodes;
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
				}
				else if (e.key === 'ArrowLeft') {
					this.onSubcategoryClose();
				}

				return;
			}

			let activeList;
			if (this.searchFilter.length > 0) {
				activeList = this.filteredNodeTypes;
			} else {
				activeList = this.categorized;
			}
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
			} else if (e.key === 'ArrowRight' && activeNodeType && activeNodeType.type === 'subcategory') {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowRight' && activeNodeType && activeNodeType.type === 'category' && !(activeNodeType.properties as ICategoryItemProps).expanded) {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowLeft' && activeNodeType && activeNodeType.type === 'category' && (activeNodeType.properties as ICategoryItemProps).expanded) {
				this.selected(activeNodeType);
			}
		},
		selected(element: INodeCreateElement) {
			if (element.type === 'node') {
				this.$emit('nodeTypeSelected', (element.properties as INodeItemProps).nodeType.name);
			} else if (element.type === 'category') {
				this.onCategorySelected(element.category);
			} else if (element.type === 'subcategory') {
				this.onSubcategorySelected(element);
			}
		},
		onCategorySelected(category: string) {
			if (this.activeCategory.includes(category)) {
				this.activeCategory = this.activeCategory.filter(
					(active: string) => active !== category,
				);
			} else {
				this.activeCategory = [...this.activeCategory, category];
				this.$telemetry.trackNodesPanel('nodeCreateList.onCategoryExpanded', { category_name: category, workflow_id: this.$store.getters.workflowId });
			}

			this.activeIndex = this.categorized.findIndex(
				(el: INodeCreateElement) => el.category === category,
			);
		},
		onSubcategorySelected(selected: INodeCreateElement) {
			this.$store.commit('ui/setShowNodeCreatorTabs', false);
			this.activeSubcategoryIndex = 0;
			this.activeSubcategory = selected;
			this.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', { selected, workflow_id: this.$store.getters.workflowId });
		},

		onSubcategoryClose() {
			this.activeSubcategory = null;
			this.activeSubcategoryIndex = 0;
			this.nodeFilter = '';
			this.$store.commit('ui/setShowNodeCreatorTabs', true);
			this.$emit('subcategoryClose');
		},

		onClickInside() {
			this.searchEventBus.$emit('focus');
		},
	},
	mounted() {
		this.$nextTick(() => {
			// initial opening effect
			this.activeCategory = [CORE_NODES_CATEGORY];
		});
	},
});
</script>

<style lang="scss" module>
.categorizedItems {
	background: white;
	height: 100%;
}
.subcategoryHeader {
	border: $--node-creator-border-color solid 1px;
	height: 50px;
	background-color: $--node-creator-subcategory-panel-header-bacground-color;

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
	color: $--node-creator-arrow-color;
	height: 16px;
	margin-right: var(--spacing-s);
	padding: 0;
}

.scrollable {
	height: calc(100% - 160px);
	padding-top: 1px;
	overflow-y: auto;
	overflow-x: visible;

	&::-webkit-scrollbar {
		display: none;
	}

	> div {
		padding-bottom: 30px;
	}
}
</style>
