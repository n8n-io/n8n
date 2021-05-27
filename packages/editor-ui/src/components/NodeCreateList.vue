<template>
	<div>
		<div class="input-wrapper">
			<el-input class="custom" placeholder="Search nodes..." v-model="nodeFilter" ref="inputField" type="text" prefix-icon="el-icon-search" @keydown.native="nodeFilterKeyDown" clearable ></el-input>
		</div>
		<div class="type-selector">
			<el-tabs v-model="selectedType" stretch>
				<el-tab-pane label="All" name="All"></el-tab-pane>
				<el-tab-pane label="Regular" name="Regular"></el-tab-pane>
				<el-tab-pane label="Trigger" name="Trigger"></el-tab-pane>
			</el-tabs>
		</div>
		<div class="node-create-list-wrapper">
			<div class="node-create-list">
				<div v-if="filteredNodeTypes.length === 0" class="no-results">
					🙃 no nodes matching your search criteria
				</div>
				<node-create-item :active="index === activeNodeTypeIndex" :nodeType="nodeType" v-for="(nodeType, index) in filteredNodeTypes" v-bind:key="nodeType.name" @nodeTypeSelected="nodeTypeSelected"></node-create-item>
			</div>
		</div>
	</div>
</template>

<script lang="ts">

import { externalHooks } from "@/components/mixins/externalHooks";
import { INodeTypeDescription } from 'n8n-workflow';
import NodeCreateItem from '@/components/NodeCreateItem.vue';

import mixins from "vue-typed-mixins";

export default mixins(externalHooks).extend({
	name: 'NodeCreateList',
	components: {
		NodeCreateItem,
	},
	data () {
		return {
			activeNodeTypeIndex: 0,
			nodeFilter: '',
			selectedType: 'All',
		};
	},
	computed: {
		nodeTypes (): INodeTypeDescription[] {
			return this.$store.getters.allNodeTypes;
		},
		filteredNodeTypes () {
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
			return returnData;
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
			const activeNodeType = this.filteredNodeTypes[this.activeNodeTypeIndex];

			if (e.key === 'ArrowDown') {
				this.activeNodeTypeIndex++;
				// Make sure that we stop at the last nodeType
				this.activeNodeTypeIndex = Math.min(this.activeNodeTypeIndex, this.filteredNodeTypes.length - 1);
			} else if (e.key === 'ArrowUp') {
				this.activeNodeTypeIndex--;
				// Make sure that we do not get before the first nodeType
				this.activeNodeTypeIndex = Math.max(this.activeNodeTypeIndex, 0);
			} else if (e.key === 'Enter' && activeNodeType) {
				this.nodeTypeSelected(activeNodeType.name);
			}

			if (!['Escape', 'Tab'].includes(e.key)) {
				// We only want to propagate "Escape" as it closes the node-creator and
				// "Tab" which toggles it
				e.stopPropagation();
			}
		},
		nodeTypeSelected (nodeTypeName: string) {
			this.$emit('nodeTypeSelected', nodeTypeName);
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
.node-create-list-wrapper {
	overflow-y: auto;
	overflow-x: hidden;
}

.node-create-list {
	position: relative;
	width: 100%;
}

.group-name {
	font-size: 0.9em;
	padding: 15px 0 5px 10px;
}

.el-input {
	background-color: #fff;
	min-height: 60px;

	/deep/ input, input:focus {
	  border: 1px solid #DBDFE7;
		border-radius: 0;
		min-height: 60px;
	}
}

.type-selector {
	height: 50px;
	text-align: center;
	background-color: $--node-creator-select-background-color;
}

.type-selector >>> .el-tabs__nav {
	padding-bottom: 10px;
}

.no-results {
	margin: 20px 10px 0 10px;
	line-height: 1.5em;
	text-align: center;
}

</style>
