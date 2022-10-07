<template>
	<div
		class="container"
		ref="mainPanelContainer"
		@click="onClickInside"
	>
		<SlideTransition>
			<SubcategoryPanel
				v-if="activeSubcategory"
				:elements="subcategorizedNodes"
				:title="activeSubcategory.properties.subcategory"
				:activeIndex="activeSubcategoryIndex"
				@close="onSubcategoryClose"
				@selected="selected"
			/>
		</SlideTransition>
		<div class="main-panel">
			<SearchBar
				v-model="nodeFilter"
				:eventBus="searchEventBus"
				@keydown.native="nodeFilterKeyDown"
			/>
			<div class="type-selector">
				<el-tabs v-model="selectedType" stretch>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.all')" :name="ALL_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.regular')" :name="REGULAR_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.trigger')" :name="TRIGGER_NODE_FILTER"></el-tab-pane>
				</el-tabs>
			</div>
			<div v-if="searchFilter.length === 0" class="scrollable">
				<ItemIterator
					:elements="categorized"
					:disabled="!!activeSubcategory"
					:activeIndex="activeIndex"
					:transitionsEnabled="true"
					@selected="selected"
				/>
			</div>
			<div
				class="scrollable"
				v-else-if="filteredNodeTypes.length > 0"
			>
				<ItemIterator
					:elements="filteredNodeTypes"
					:activeIndex="activeIndex"
					@selected="selected"
				/>
			</div>
			<NoResults
				v-else
				@nodeTypeSelected="$emit('nodeTypeSelected', $event)"
			/>
		</div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import { externalHooks } from '@/components/mixins/externalHooks';

import mixins from 'vue-typed-mixins';
import ItemIterator from './ItemIterator.vue';
import NoResults from './NoResults.vue';
import SearchBar from './SearchBar.vue';
import SubcategoryPanel from './SubcategoryPanel.vue';
import { INodeCreateElement, INodeItemProps, ISubcategoryItemProps } from '@/Interface';
import { ALL_NODE_FILTER, CORE_NODES_CATEGORY, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER } from '@/constants';
import SlideTransition from '../transitions/SlideTransition.vue';
import { matchesNodeType, matchesSelectType } from './helpers';

export default mixins(externalHooks).extend({
	name: 'NodeCreateList',
	components: {
		ItemIterator,
		NoResults,
		SubcategoryPanel,
		SlideTransition,
		SearchBar,
	},
	props: ['categorizedItems', 'categoriesWithNodes', 'searchItems'],
	data() {
		return {
			activeCategory: [] as string[],
			activeSubcategory: null as INodeCreateElement | null,
			activeIndex: 1,
			activeSubcategoryIndex: 0,
			nodeFilter: '',
			selectedType: ALL_NODE_FILTER,
			searchEventBus: new Vue(),
			REGULAR_NODE_FILTER,
			TRIGGER_NODE_FILTER,
			ALL_NODE_FILTER,
		};
	},
	computed: {
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

		categorized() {
			return this.categorizedItems && this.categorizedItems
				.reduce((accu: INodeCreateElement[], el: INodeCreateElement) => {
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

		subcategorizedNodes() {
			const activeSubcategory = this.activeSubcategory as INodeCreateElement;
			const category = activeSubcategory.category;
			const subcategory = (activeSubcategory.properties as ISubcategoryItemProps).subcategory;

			return activeSubcategory && this.categoriesWithNodes[category][subcategory]
				.nodes.filter((el: INodeCreateElement) => matchesSelectType(el, this.selectedType));
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
		selectedType(newValue, oldValue) {
			this.$externalHooks().run('nodeCreateList.selectedTypeChanged', {
				oldValue,
				newValue,
			});
			this.$telemetry.trackNodesPanel('nodeCreateList.selectedTypeChanged', {
				old_filter: oldValue,
				new_filter: newValue,
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
			} else if (e.key === 'ArrowRight' && activeNodeType && activeNodeType.type === 'category' && !activeNodeType.properties.expanded) {
				this.selected(activeNodeType);
			} else if (e.key === 'ArrowLeft' && activeNodeType && activeNodeType.type === 'category' && activeNodeType.properties.expanded) {
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
			this.activeSubcategoryIndex = 0;
			this.activeSubcategory = selected;
			this.$telemetry.trackNodesPanel('nodeCreateList.onSubcategorySelected', { selected, workflow_id: this.$store.getters.workflowId });
		},

		onSubcategoryClose() {
			this.activeSubcategory = null;
			this.activeSubcategoryIndex = 0;
			this.nodeFilter = '';
		},

		onClickInside() {
			this.searchEventBus.$emit('focus');
		},
	},
	async mounted() {
		this.$nextTick(() => {
			// initial opening effect
			this.activeCategory = [CORE_NODES_CATEGORY];
		});
		this.$externalHooks().run('nodeCreateList.mounted');
	},
	async destroyed() {
		this.$externalHooks().run('nodeCreateList.destroyed');
		this.$telemetry.trackNodesPanel('nodeCreateList.destroyed', { workflow_id: this.$store.getters.workflowId });
	},
});
</script>

<style lang="scss" scoped>
::v-deep .el-tabs__item {
	padding: 0;
}

::v-deep .el-tabs__active-bar {
	height: 1px;
}

::v-deep .el-tabs__nav-wrap::after {
	height: 1px;
}

.container {
	height: 100%;

	> div {
		height: 100%;
	}
}

.main-panel .scrollable {
	height: calc(100% - 160px);
	padding-top: 1px;
}

.scrollable {
	overflow-y: auto;
	overflow-x: visible;

	&::-webkit-scrollbar {
		display: none;
	}

	> div {
		padding-bottom: 30px;
	}
}

.type-selector {
	text-align: center;
	background-color: $node-creator-select-background-color;

	::v-deep .el-tabs > div {
		margin-bottom: 0;

		.el-tabs__nav {
			height: 43px;
		}
	}
}
</style>
