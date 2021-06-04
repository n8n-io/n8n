<template>
	<div @click="onClickInside" class="container">
		<SlideTransition>
			<SubcategoryPanel v-if="activeSubcategory" :elements="subcategorizedNodes" :title="activeSubcategory.properties.subcategory" :activeIndex="activeIndex" @close="onSubcategoryClose" @selected="selected" />
		</SlideTransition>
		<div class="main-panel">
			<SearchBar
				v-model="nodeFilter"	
				:eventBus="searchEventBus"
				@keydown.native="nodeFilterKeyDown"
			/>
			<div class="type-selector">
				<el-tabs v-model="selectedType" stretch>
					<el-tab-pane label="All" name="All"></el-tab-pane>
					<el-tab-pane label="Regular" name="Regular"></el-tab-pane>
					<el-tab-pane label="Trigger" name="Trigger"></el-tab-pane>
				</el-tabs>
			</div>
			<div v-if="nodeFilter.length === 0" class="scrollable">
				<ItemIterator
					:elements="categorized"
					:disabled="!!activeSubcategory"
					:activeIndex="activeIndex"
					:transitionsEnabled="true"
					@selected="selected"
				/>
			</div>
			<div
				class="node-create-list-wrapper scrollable"
				v-else-if="filteredNodeTypes.length > 0"
			>
				<ItemIterator
					:elements="filteredNodeTypes"
					:activeIndex="activeIndex"
					@selected="selected"
				/>
			</div>
			<NoResults v-else @nodeTypeSelected="nodeTypeSelected" />
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
import { CORE_NODES_CATEGORY  } from '@/constants';
import SlideTransition from '../transitions/SlideTransition.vue';
import { matchesSelectType } from './helpers';


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
			nodeFilter: '',
			selectedType: 'All',
			searchEventBus: new Vue(),
		};
	},
	computed: {
		filteredNodeTypes(): INodeCreateElement[] {
			const nodeTypes: INodeCreateElement[] = this.searchItems;
			const filter = this.nodeFilter.toLowerCase();

			const returnData = nodeTypes.filter((el: INodeCreateElement) => {
				const nodeType = (el.properties as INodeItemProps).nodeType;
				return filter && matchesSelectType(el, this.selectedType) && nodeType.displayName.toLowerCase().indexOf(filter) !== -1;
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
						return [...accu, {
							...el,
							expanded: this.activeCategory.includes(el.category),
						}];
					}

					return [...accu, el];
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
		},
		selectedType(newValue, oldValue) {
			this.$externalHooks().run('nodeCreateList.selectedTypeChanged', {
				oldValue,
				newValue,
			});
		},
	},
	methods: {
		nodeFilterKeyDown(e: KeyboardEvent) {
			let activeList;
			if (this.nodeFilter.length > 0) {
				activeList = this.filteredNodeTypes;
			} else if (this.activeSubcategory) {
				activeList = this.subcategorizedNodes;
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
			}

			if (!['Escape', 'Tab'].includes(e.key)) {
				// We only want to propagate 'Escape' as it closes the node-creator and
				// 'Tab' which toggles it
				e.stopPropagation();
			}
		},
		selected(element: INodeCreateElement) {
			if (element.type === 'node') {
				const properties = element.properties as INodeItemProps;

				this.nodeTypeSelected(properties.nodeType.name);
			} else if (element.type === 'category') {
				this.onCategorySelected(element.category);
			} else if (element.type === 'subcategory') {
				this.onSubcategorySelected(element);
			}
		},
		nodeTypeSelected(nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		onCategorySelected(category: string) {
			if (this.activeCategory.includes(category)) {
				this.activeCategory = this.activeCategory.filter(
					(active: string) => active !== category,
				);
			} else {
				this.activeCategory = [...this.activeCategory, category];
			}

			this.activeIndex = this.categorized.findIndex(
				(el: INodeCreateElement) => el.category === category,
			);
		},
		onSubcategorySelected(selected: INodeCreateElement) {
			this.activeSubcategory = selected;
			this.activeIndex = 0;
		},

		onSubcategoryClose() {
			this.activeSubcategory = null;
			this.activeIndex = 0;
			this.nodeFilter = '';
		},

		onClickInside() {
			this.searchEventBus.$emit('focus');
		},
	},
	async mounted() {
		setTimeout(() => {
			// initial opening effect
			this.activeCategory = [CORE_NODES_CATEGORY];
		}, 0);
		this.$externalHooks().run('nodeCreateList.mounted');
	},
	async destroyed() {
		this.$externalHooks().run('nodeCreateList.destroyed');
	},
});
</script>

<style lang="scss" scoped>
/deep/ .el-tabs__active-bar {
	height: 1px;
}

/deep/ .el-tabs__nav-wrap::after {
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
}

.type-selector {
	text-align: center;
	background-color: $--node-creator-select-background-color;
	border-right: 1px solid $--node-creator-border-color;
	border-left: 1px solid $--node-creator-border-color;

	/deep/ .el-tabs > div {
		margin-bottom: 0;

		.el-tabs__nav {
			height: 43px;
		}
	}
}
</style>
