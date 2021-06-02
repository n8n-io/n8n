<template>
	<div @click="onClickInside" class="container">
		<SlideTransition>
			<SubcategoryPanel v-if="activeSubcategory" :elements="subcategorizedNodes" :title="activeSubcategory.subcategory" :activeIndex="activeNodeTypeIndex" @close="onSubcategoryClose" @nodeTypeSelected="nodeTypeSelected" />
		</SlideTransition>
		<div class="main-panel">
			<div>
				<el-input
					:class="{ custom: true, active: nodeFilter.length > 0 }"
					placeholder="Search nodes..."
					v-model="nodeFilter"
					ref="inputField"
					type="text"
					prefix-icon="el-icon-search"
					@keydown.native="nodeFilterKeyDown"
					clearable
				></el-input>
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
			<div
				class="node-create-list-wrapper scrollable"
				v-else-if="filteredNodeTypes.length > 0"
			>
				<NodeCreateIterator
					:elements="filteredNodeTypes"
					:activeIndex="activeNodeTypeIndex"
					@nodeTypeSelected="nodeTypeSelected"
				/>
			</div>
			<NoResults v-else @nodeTypeSelected="nodeTypeSelected" />
		</div>
	</div>
</template>

<script lang="ts">

import { externalHooks } from "@/components/mixins/externalHooks";
import { INodeTypeDescription } from "n8n-workflow";

import mixins from "vue-typed-mixins";
import NodeCreateIterator from "./NodeCreateIterator.vue";
import NoResults from "./NoResults.vue";
import SubcategoryPanel from "./SubcategoryPanel.vue";
import NodeCreateItem from "./NodeCreateItem.vue";
import { INodeCreateElement } from "@/Interface";
import { CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, SUBCATEGORY_DESCRIPTIONS, UNCATEGORIZED_CATEGORY, UNCATEGORIZED_SUBCATEGORY, HIDDEN_NODES  } from "@/constants";
import SlideTransition from "../transitions/SlideTransition.vue";

interface ICategoriesWithNodes {
	[category: string]: {
		[subcategory: string]: {
			regularCount: number;
			triggerCount: number;
			nodes: INodeCreateElement[];
		};
	};
}

// todo get rid of
interface IActiveSubCategory {
	category: string;
	subcategory: string;
}

export default mixins(externalHooks).extend({
	name: "NodeCreateList",
	components: {
		NodeCreateItem,
		NodeCreateIterator,
		NoResults,
		SubcategoryPanel,
		SlideTransition,
	},
	data() {
		return {
			activeCategory: [CORE_NODES_CATEGORY],
			activeSubcategory: null as IActiveSubCategory | null,
			activeNodeTypeIndex: 1,
			nodeFilter: "",
			selectedType: "All",
		};
	},
	computed: {
		basePath(): string {
			return this.$store.getters.getBaseUrl;
		},
		filteredNodeTypes(): INodeCreateElement[] {
			const filter = this.nodeFilter.toLowerCase();
			const nodeTypes: INodeTypeDescription[] = this.$store.getters
				.allNodeTypes;

			// Apply the filters
			const returnData = nodeTypes.filter((nodeType) => {
				if (HIDDEN_NODES.includes(nodeType.name)) {
					return false;
				}

				if (
					filter &&
					nodeType.displayName.toLowerCase().indexOf(filter) === -1
				) {
					return false;
				}
				if (this.selectedType !== "All") {
					if (
						this.selectedType === "Trigger" &&
						!nodeType.group.includes("trigger")
					) {
						return false;
					} else if (
						this.selectedType === "Regular" &&
						nodeType.group.includes("trigger")
					) {
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
				return textA < textB ? -1 : textA > textB ? 1 : 0;
			});

			this.$externalHooks().run("nodeCreateList.filteredNodeTypesComputed", {
				nodeFilter: this.nodeFilter,
				result: returnData,
				selectedType: this.selectedType,
			});

			return returnData.map((nodeType) => ({
				type: "node",
				nodeType,
				category: "",
			}));
		},

		categoriesWithNodes(): ICategoriesWithNodes {
			const nodeTypes = this.$store.getters.allNodeTypes;

			const categorized = nodeTypes.reduce(
				(accu: ICategoriesWithNodes, nodeType: INodeTypeDescription) => {
					if (HIDDEN_NODES.includes(nodeType.name)) {
						return accu;
					}

					if (!nodeType.codex || !nodeType.codex.categories) {
						accu[UNCATEGORIZED_CATEGORY][UNCATEGORIZED_SUBCATEGORY].nodes.push({
							type: "node",
							category: UNCATEGORIZED_CATEGORY,
							subcategory: UNCATEGORIZED_SUBCATEGORY,
							nodeType,
							includedByTrigger: nodeType.group.includes("trigger"),
							includedByRegular: !nodeType.group.includes("trigger"),
						});
						return accu;
					}
					nodeType.codex.categories.forEach((_category: string) => {
						const category = _category.trim();
						const subcategory =
							nodeType.codex &&
							nodeType.codex.subcategories &&
							nodeType.codex.subcategories[category]
								? nodeType.codex.subcategories[category][0]
								: UNCATEGORIZED_SUBCATEGORY;
						if (!accu[category]) {
							accu[category] = {};
						}
						if (!accu[category][subcategory]) {
							accu[category][subcategory] = {
								triggerCount: 0,
								regularCount: 0,
								nodes: [],
							};
						}
						const isTrigger = nodeType.group.includes("trigger");
						if (isTrigger) {
							accu[category][subcategory].triggerCount++;
						}
						if (!isTrigger) {
							accu[category][subcategory].regularCount++;
						}
						accu[category][subcategory].nodes.push({
							type: "node",
							category,
							nodeType,
							subcategory,
							includedByTrigger: isTrigger,
							includedByRegular: !isTrigger,
						});
					});
					return accu;
				},
				{
					[UNCATEGORIZED_CATEGORY]: {
						[UNCATEGORIZED_SUBCATEGORY]: {
							triggerCount: 0,
							regularCount: 0,
							nodes: [],
						},
					},
				},
			);

			return categorized;
		},

		categories(): string[] {
			const categories = Object.keys(this.categoriesWithNodes);
			const sorted = categories.filter(
				(category: string) =>
					category !== CORE_NODES_CATEGORY && category !== CUSTOM_NODES_CATEGORY,
			);
			sorted.sort();

			return [CORE_NODES_CATEGORY, CUSTOM_NODES_CATEGORY, ...sorted];
		},

		nodesWithCategories(): INodeCreateElement[] {
			const collapsed = this.categories.reduce(
				(accu: INodeCreateElement[], category: string) => {
					if (!this.categoriesWithNodes[category]) {
						return accu;
					}

					const categoryEl: INodeCreateElement = {
						type: "category",
						category,
					};

					const subcategories = Object.keys(this.categoriesWithNodes[category]);
					if (subcategories.length === 1) {
						const subcategory = this.categoriesWithNodes[category][
							subcategories[0]
						];
						if (subcategory.triggerCount > 0) {
							categoryEl.includedByTrigger = subcategory.triggerCount > 0;
						}
						if (subcategory.regularCount > 0) {
							categoryEl.includedByRegular = subcategory.regularCount > 0;
						}
						return [...accu, categoryEl, ...subcategory.nodes];
					}

					subcategories.sort();
					const subcategorized = subcategories.reduce(
						(accu: INodeCreateElement[], subcategory: string) => {
							const subcategoryEl: INodeCreateElement = {
								type: "subcategory",
								category,
								subcategory,
								description: SUBCATEGORY_DESCRIPTIONS[category][subcategory],
								includedByTrigger:
									this.categoriesWithNodes[category][subcategory].triggerCount >
									0,
								includedByRegular:
									this.categoriesWithNodes[category][subcategory].regularCount >
									0,
							};

							if (subcategoryEl.includedByTrigger) {
								categoryEl.includedByTrigger = true;
							}
							if (subcategoryEl.includedByRegular) {
								categoryEl.includedByRegular = true;
							}

							return [...accu, subcategoryEl];
						},
						[],
					);

					return [...accu, categoryEl, ...subcategorized];
				},
				[],
			);

			return collapsed;
		},

		categorized() {
			// @ts-ignore
			return this.nodesWithCategories
				.filter((el: INodeCreateElement) => {
					if (
						el.type !== "category" &&
						!this.activeCategory.includes(el.category)
					) {
						return false;
					}
					if (this.selectedType === "Trigger" && el.includedByTrigger) {
						return true;
					}
					if (this.selectedType === "Regular" && el.includedByRegular) {
						return true;
					}

					return this.selectedType === "All";
				})
				.map((el: INodeCreateElement) => {
					if (el.type === "category") {
						return {
							...el,
							expanded: this.activeCategory.includes(el.category),
						};
					}

					return el;
				});
		},

		subcategorizedNodes() {
			// @ts-ignore
			return (this.activeSubcategory && this.categoriesWithNodes[this.activeSubcategory.category][this.activeSubcategory.subcategory]
				.nodes.filter((el: INodeCreateElement) => {
					if (el.includedByTrigger && this.selectedType === "Trigger") {
						return true;
					}
					if (el.includedByRegular && this.selectedType === "Regular") {
						return true;
					}
					return this.selectedType === "All";
				})
			);
		},
	},
	watch: {
		nodeFilter(newValue, oldValue) {
			// Reset the index whenver the filter-value changes
			this.activeNodeTypeIndex = 0;
			this.$externalHooks().run("nodeCreateList.nodeFilterChanged", {
				oldValue,
				newValue,
				selectedType: this.selectedType,
				filteredNodes: this.filteredNodeTypes,
			});
		},
		selectedType(newValue, oldValue) {
			this.$externalHooks().run("nodeCreateList.selectedTypeChanged", {
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
			const activeNodeType = activeList[this.activeNodeTypeIndex];

			if (e.key === "ArrowDown") {
				this.activeNodeTypeIndex++;
				// Make sure that we stop at the last nodeType
				this.activeNodeTypeIndex = Math.min(
					this.activeNodeTypeIndex,
					activeList.length - 1,
				);
			} else if (e.key === "ArrowUp") {
				this.activeNodeTypeIndex--;
				// Make sure that we do not get before the first nodeType
				this.activeNodeTypeIndex = Math.max(this.activeNodeTypeIndex, 0);
			} else if (e.key === "Enter" && activeNodeType) {
				if (activeNodeType.type === "node" && activeNodeType.nodeType) {
					this.nodeTypeSelected(activeNodeType.nodeType.name);
				} else if (
					activeNodeType.type === "category" &&
					activeNodeType.category
				) {
					this.onCategorySelected(activeNodeType.category);
				} else if (
					activeNodeType.type === "subcategory" &&
					activeNodeType.subcategory
				) {
					this.onSubcategorySelected({
						category: activeNodeType.category,
						subcategory: activeNodeType.subcategory,
					});
				}
			}

			if (!["Escape", "Tab"].includes(e.key)) {
				// We only want to propagate "Escape" as it closes the node-creator and
				// "Tab" which toggles it
				e.stopPropagation();
			}
		},
		nodeTypeSelected(nodeTypeName: string) {
			this.$emit("nodeTypeSelected", nodeTypeName);
		},
		onCategorySelected(category: string) {
			if (this.activeCategory.includes(category)) {
				this.activeCategory = this.activeCategory.filter(
					(active: string) => active !== category,
				);
			} else {
				this.activeCategory = [...this.activeCategory, category];
			}

			this.activeNodeTypeIndex = this.categorized.findIndex(
				(el: INodeCreateElement) => el.category === category,
			);
		},
		onSubcategorySelected(selected: IActiveSubCategory) {
			this.activeSubcategory = selected;
			this.activeNodeTypeIndex = 0;
		},

		onSubcategoryClose() {
			this.activeSubcategory = null;
			this.activeNodeTypeIndex = 0;
			this.nodeFilter = "";
		},

		onClickInside() {
			// keep focus on input field as user clicks around
			(this.$refs.inputField as HTMLInputElement).focus();
		},

		selectWebhook() {
			this.$emit("nodeTypeSelected", "n8n-nodes-base.webhook");
		},

		selectHttpRequest() {
			this.$emit("nodeTypeSelected", "n8n-nodes-base.httpRequest");
		},
	},
	async mounted() {
		this.$externalHooks().run("nodeCreateList.mounted");
	},
	async destroyed() {
		this.$externalHooks().run("nodeCreateList.destroyed");
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

/deep/ .el-input {
	background-color: $--node-creator-search-background-color;
	color: $--node-creator-search-placeholder-color;
	font-size: 18px;

	input,
	input:focus {
		border: 1px solid $--node-creator-border-color;
		border-radius: 0;
		min-height: 60px;
	}

	&.active .el-icon-search {
		color: $--color-primary !important;
	}

	.el-icon-circle-close{
		&:hover {
			&:before {
				background-color: #3d3f46;
			}
		}

		&:before {
			content: "\E6DB";
			background-color: #8D939C;
			color: $--node-creator-search-background-color;
			border-radius: 50%;
			font-size: 12px;
			padding: 1px;
		}
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
</style>
