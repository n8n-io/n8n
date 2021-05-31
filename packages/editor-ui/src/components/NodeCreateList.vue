<template>
	<div @click="onClickInside" class="container">
		<transition name="slide">
			<div v-if="activeSubcategory" class="subcategory-panel">
				<div class="border"></div>
				<div class="subcategory-header">
					<div class="clickable" @click="onBackArrowClick">
						<font-awesome-icon class="back-arrow" icon="arrow-left" />
					</div>
					<span>{{activeSubcategory.subcategory}}</span>
				</div>
				
				<NodeCreateIterator class="scrollable" :elements="subcategorizedNodes" :activeIndex="activeNodeTypeIndex" @nodeTypeSelected="nodeTypeSelected" />
			</div>
		</transition>
		<div>
			<div>
				<el-input :class="{custom: true, active: nodeFilter.length > 0}" placeholder="Search nodes..." v-model="nodeFilter" ref="inputField" type="text" prefix-icon="el-icon-search" @keydown.native="nodeFilterKeyDown" clearable ></el-input>
			</div>
			<div class="type-selector">
				<el-tabs v-model="selectedType" stretch>
					<el-tab-pane label="All" name="All"></el-tab-pane>
					<el-tab-pane label="Regular" name="Regular"></el-tab-pane>
					<el-tab-pane label="Trigger" name="Trigger"></el-tab-pane>
				</el-tabs>
			</div>
			<div v-if="nodeFilter.length === 0" class="scrollable">
				<NodeCreateIterator
					:elements="categorized"
					:disabled="!!activeSubcategory"
					:activeIndex="activeNodeTypeIndex"
					@categorySelected="onCategorySelected"
					@nodeTypeSelected="nodeTypeSelected"
					@subcategorySelected="onSubcategorySelected"
				/>
			</div>
			<div class="node-create-list-wrapper scrollable" v-else-if="filteredNodeTypes.length > 0">
				<NodeCreateIterator :elements="filteredNodeTypes" :activeIndex="activeNodeTypeIndex" @nodeTypeSelected="nodeTypeSelected" />
			</div>
			<div v-else class="no-results">
				<div class="img">
					<img :src="require('@/assets/no-nodes-icon.png')" alt="trigger" />
				</div>
				<div class="title">
					<div>We didn't make that... yet</div>
					<div class="action">Don’t worry, you can probably do it with the <a @click="selectHttpRequest">HTTP Request</a> or <a @click="selectWebhook">Webhook</a> node</div>
				</div>

				<div class="action">
					<div>Want us to make it faster?</div>
					<div><a href="https://n8n-community.typeform.com/to/K1fBVTZ3" target="_blank">Request the node</a></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

const descriptions: {[category: string]: {[subcategory: string]: string}} = {
	'Core Nodes': {
		Flow: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit nulla fun sup yo what',
		Files: 'Lorem ipsum dolor sit amet',
		'Data Transformation': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit nulla',
		Helpers: 'Sup',
	},
};

const UNCATEGORIZED_CATEGORY = 'Miscellaneous';
const UNCATEGORIZED_SUBCATEGORY = 'Other';

import { externalHooks } from "@/components/mixins/externalHooks";
import { INodeTypeDescription } from 'n8n-workflow';
import NodeCreateItem from '@/components/NodeCreateItem.vue';

import mixins from "vue-typed-mixins";
import NodeCreateIterator from "./NodeCreateIterator.vue";
import { INodeCreateElement, INodeTypeTemp } from "@/Interface";
import { CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY } from "@/constants";

interface ICategoriesWithNodes {
	[category: string]: {
		[subcategory: string]: INodeCreateElement[]
	};
}

// todo get rid of 
interface IActiveSubCategory {
	category: string;
	subcategory: string;
}

export default mixins(externalHooks).extend({
	name: 'NodeCreateList',
	components: {
		NodeCreateItem,
		NodeCreateIterator,
	},
	data () {
		return {
			activeCategory: [CORE_NODES_CATEGORY],
			activeSubcategory: null as IActiveSubCategory | null,
			activeNodeTypeIndex: 1,
			nodeFilter: '',
			selectedType: 'All',
			basePath: this.$store.getters.getBaseUrl,
		};
	},
	computed: {
		filteredNodeTypes (): INodeCreateElement[] {
			const filter = this.nodeFilter.toLowerCase();
			const nodeTypes: INodeTypeDescription[] = this.$store.getters.allNodeTypes;

			// Apply the filters
			const returnData = nodeTypes.filter((nodeType) => {
				if (filter && nodeType.displayName.toLowerCase().indexOf(filter) === -1) {
					return false;
				}
				if (this.selectedType !== 'All') {
					if (this.selectedType === 'Trigger' && !nodeType.group.includes('trigger')) {
						return false;
					} else if (this.selectedType === 'Regular' && nodeType.group.includes('trigger')) {
						return false;
					}
				}
				return true;
			});

			// Sort the node types
			let textA, textB;
			returnData.sort((a, b) => {
				textA = a.displayName.toLowerCase();
				textB = b.displayName.toLowerCase();
				return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
			});

			this.$externalHooks().run('nodeCreateList.filteredNodeTypesComputed', { nodeFilter: this.nodeFilter, result: returnData, selectedType: this.selectedType });

			return returnData.map((nodeType) => ({
				type: 'node',
				nodeType,
			}));
		},

		categoriesWithNodes(): ICategoriesWithNodes {
			const nodeTypes = this.$store.getters.allNodeTypes;

			// temp
			const subcategories = ['Flow', 'Helpers', 'Files', 'Data Transformation'];
			// @ts-ignore
			const mockNodeTypes = nodeTypes.map((nodeType: INodeTypeTemp, i: number): INodeTypeTemp => {
				if (!nodeType.codex || !nodeType.codex.categories) {
					return nodeType;
				}
				if (nodeType.codex.categories.includes('Core Nodes')) {
					const subcategory: string = subcategories[i % 4];
					return {
						...nodeType,
						codex: {
							...nodeType.codex,
							subcategories: {
								'Core Nodes': [subcategory],
							},
						},
					};
				}
				return nodeType;
			});

			// todo move logic elsewhere
			const categorized = mockNodeTypes.reduce((accu: ICategoriesWithNodes, nodeType: INodeTypeTemp) => {
				if (!nodeType.codex || !nodeType.codex.categories) {
					accu[UNCATEGORIZED_CATEGORY][UNCATEGORIZED_SUBCATEGORY].push({
						type: 'node',
						category: UNCATEGORIZED_CATEGORY,
						subcategory: UNCATEGORIZED_SUBCATEGORY,
						nodeType,
						isTrigger: nodeType.group.includes('trigger'),
					});
					return accu;
				}
				nodeType.codex.categories.forEach((_category: string) => {
					const category = _category.trim();
					const subcategory = nodeType.codex && nodeType.codex.subcategories && nodeType.codex.subcategories[category]?
						nodeType.codex.subcategories[category][0] : UNCATEGORIZED_SUBCATEGORY;
					if (!accu[category]) {
						accu[category] = {};
					}
					if (!accu[category][subcategory]) {
						accu[category][subcategory] = [];
					}
					accu[category][subcategory].push({
						type: 'node',
						category,
						nodeType,
						subcategory,
						isTrigger: nodeType.group.includes('trigger'),
					});
				});
				return accu;
			}, {
				[UNCATEGORIZED_CATEGORY]: {
					[UNCATEGORIZED_SUBCATEGORY]: [],
				},
			});

			return categorized;
		},

		categories(): string[] {
			const categories = Object.keys(this.categoriesWithNodes);
			const sorted = categories 
				.filter((category: string) => category !== CORE_NODES_CATEGORY && category !== CUSTOM_NODES_CATEGORY);
			sorted.sort();

			if (categories.includes(CUSTOM_NODES_CATEGORY)) {
				return [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, ...sorted];
			}

			return [CORE_NODES_CATEGORY, ...sorted];
		},

		nodesWithCategories(): INodeCreateElement[] {
			const collapsed = this.categories.reduce((accu: INodeCreateElement[], category: string) => {
				const categoryEl = {
					type: 'category',
					active: false,
					category,
				};

				const subcategories = Object.keys(this.categoriesWithNodes[category]);
				if (subcategories.length === 1) {
					return [...accu, categoryEl, ...this.categoriesWithNodes[category][subcategories[0]]];
				}

				const subcategorized = subcategories.reduce((accu: INodeCreateElement[], subcategory: string) => {
					const subcategoryEl = {
						type: 'subcategory',
						category,
						subcategory,
						description: descriptions[category][subcategory],
					};

					return [...accu, subcategoryEl];
				}, []);

				return [...accu, categoryEl, ...subcategorized];
			}, []);

			return collapsed;
		},

		categorized() {
			// @ts-ignore
			return this.nodesWithCategories.map((el: INodeCreateElement) => {
				if (el.type === 'category' && el.category) {
					return {
						...el,
						expanded: this.activeCategory.includes(el.category),
					};
				}
				else if (el.type === 'subcategory' && el.category && this.activeCategory.includes(el.category)) {
					return el;
				}
				else if (el.type === 'node' && el.category && this.activeCategory.includes(el.category)) {
					if (this.selectedType === 'All' || (this.selectedType === 'Trigger' && el.isTrigger)) {
						return el;
					}
					if (this.selectedType === 'Regular' && !el.isTrigger) {
						return el;
					}
				}

				return null;
			})
				.filter((el: INodeCreateElement) => !!el);
		},

		subcategorizedNodes() {
			// @ts-ignore
			return this.activeSubcategory && this.categoriesWithNodes[this.activeSubcategory.category][this.activeSubcategory.subcategory]
				.filter((el: INodeCreateElement) => {
					if (el.isTrigger && this.selectedType === 'Trigger') {
						return true;
					}
					if (!el.isTrigger && this.selectedType === 'Regular') {
						return true;
					}
					return this.selectedType === 'All';
				});
		},
	},
	watch: {
		nodeFilter (newValue, oldValue) {
			// Reset the index whenver the filter-value changes
			this.activeNodeTypeIndex = 0;
			this.$externalHooks().run('nodeCreateList.nodeFilterChanged', { oldValue, newValue, selectedType: this.selectedType, filteredNodes: this.filteredNodeTypes });
		},
		selectedType (newValue, oldValue) {
			this.$externalHooks().run('nodeCreateList.selectedTypeChanged', { oldValue, newValue });
		},
	},
	methods: {
		nodeFilterKeyDown (e: KeyboardEvent) {
			let activeList;
			if (this.nodeFilter.length > 0) {
				activeList = this.filteredNodeTypes;
			}
			else if (this.activeSubcategory) {
				activeList = this.subcategorizedNodes;
			}
			else {
				activeList = this.categorized;
			}
			const activeNodeType = activeList[this.activeNodeTypeIndex];

			if (e.key === 'ArrowDown') {
				this.activeNodeTypeIndex++;
				// Make sure that we stop at the last nodeType
				this.activeNodeTypeIndex = Math.min(this.activeNodeTypeIndex, this.filteredNodeTypes.length - 1);
			} else if (e.key === 'ArrowUp') {
				this.activeNodeTypeIndex--;
				// Make sure that we do not get before the first nodeType
				this.activeNodeTypeIndex = Math.max(this.activeNodeTypeIndex, 0);
			} else if (e.key === 'Enter' && activeNodeType) {
				if (activeNodeType.type === 'node' && activeNodeType.nodeType) {
					this.nodeTypeSelected(activeNodeType.nodeType.name);
				}
				else if (activeNodeType.type === 'category' && activeNodeType.category) {
					this.onCategorySelected(activeNodeType.category);
				}
				else if (activeNodeType.type === 'subcategory' && activeNodeType.subcategory) {
					this.onSubcategorySelected({
						category: activeNodeType.category,
						subcategory: activeNodeType.subcategory,
					});
				}
			}

			if (!['Escape', 'Tab'].includes(e.key)) {
				// We only want to propagate "Escape" as it closes the node-creator and
				// "Tab" which toggles it
				e.stopPropagation();
			}
		},
		nodeTypeSelected (nodeTypeName: string) {
			console.log(nodeTypeName);
			this.$emit('nodeTypeSelected', nodeTypeName);
		},
		onCategorySelected(category: string) {
			if (this.activeCategory.includes(category)) {
				this.activeCategory = this.activeCategory.filter((active: string) => active !== category);
			}
			else {
				this.activeCategory = [...this.activeCategory, category];
			}

			this.activeNodeTypeIndex = this.categorized.findIndex((el: INodeCreateElement) => el.category === category);
		},
		onSubcategorySelected(selected: IActiveSubCategory) {
			this.activeSubcategory = selected;
			this.activeNodeTypeIndex = 0;
		},

		onBackArrowClick() {
			this.activeSubcategory = null;
			this.activeNodeTypeIndex = 0;
		},

		onClickInside() {
			// keep focus on input field as user clicks around
			(this.$refs.inputField as HTMLInputElement).focus();
		},

		selectWebhook() {
			this.$emit('nodeTypeSelected', 'n8n-nodes-base.webhook');
		},

		selectHttpRequest() {
			this.$emit('nodeTypeSelected', 'n8n-nodes-base.httpRequest');
		},
	},
	async mounted() {
		this.$externalHooks().run('nodeCreateList.mounted');
	},
	async destroyed() {
		this.$externalHooks().run('nodeCreateList.destroyed');
	},
});
</script>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}

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

.subcategory-panel {
	position: absolute;
	background: $--node-creator-search-background-color;
	z-index: 100;
	height: 100%;
	width: 100%;
}

.border {
	position: absolute;
	height: 100%;
	width: 100%;
	border-left: 1px solid $--node-creator-border-color;
	z-index: -1;
}

.subcategory-header {
	border: #DBDFE7 solid 1px;
  height: 50px;
  background-color: #F2F4F8;

  font-size: 18px;
  font-weight: 600;
  line-height: 16px;

	display: flex;
	align-items: center;
	padding: 11px 15px;
}

.back-arrow {
  color: #8D939C;
	height: 16px;
	width: 16px;
	margin-right: 24px;
}

.scrollable {
	overflow-y: auto;
	max-height: 100vh;
	margin-bottom: 30px;

	&::-webkit-scrollbar {
 		display: none;
	}
}

.el-input {
	background-color: $--node-creator-search-background-color;
  color: $--node-creator-search-placeholder-color;
  font-size: 18px;

	/deep/ input, input:focus {
	  border: 1px solid $--node-creator-border-color;
		border-radius: 0;
		min-height: 60px;
	}

	/deep/ &.active .el-icon-search {
		color: $--color-primary !important;
	}
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

.slide-leave-active,
.slide-enter-active {
  transition: .3s ease;
}
.slide-enter, .slide-leave-to {
  transform: translate(100%);
}

.no-results {
	background-color: #F8F9FB;
	text-align: center;
	height: 100%;
	border-left: 1px solid $--node-creator-border-color;
	padding: 100px 56px 60px 56px;
	display: flex;
	flex-direction: column;

	.title {
		font-size: 22px;
		line-height: 16px;
		margin-top: 50px;
		margin-bottom: 200px;

		div {
			margin-bottom: 15px;
		}
	}

	.action {
		font-size: 14px;
		line-height: 19px;
	}

	a {
		font-weight: 600;
		color: $--color-primary;
		text-decoration: none;
		cursor: pointer;
	}
}

</style>
