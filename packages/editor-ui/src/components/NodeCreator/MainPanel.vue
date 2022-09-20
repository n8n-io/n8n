<template>
	<div
		class="container"
		ref="mainPanelContainer"
	>
		<div class="main-panel">
			<div class="type-selector" v-if="showNodeCreatorTabs" >
				<el-tabs v-model="selectedType" stretch>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.all')" :name="ALL_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.regular')" :name="REGULAR_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.trigger')" :name="TRIGGER_NODE_FILTER"></el-tab-pane>
				</el-tabs>
			</div>
			<TriggerHelperPanel
				v-if="selectedType === TRIGGER_NODE_FILTER"
				class="scrollable"
				:categorizedItems="categorizedItems"
				:categoriesWithNodes="categoriesWithNodes"
				:searchItems="searchItems"
			/>
			<CategorizedItems
				v-else
				:categorizedItems="categorizedItems"
				:categoriesWithNodes="categoriesWithNodes"
				:searchItems="searchItems"
				:selectedType="selectedType"
				:excludedSubcategories="[OTHER_TRIGGER_NODES_SUBCATEGORY]"
			/>
		</div>
	</div>
</template>

<script lang="ts">
import { externalHooks } from '@/components/mixins/externalHooks';
import mixins from 'vue-typed-mixins';
import TriggerHelperPanel from './TriggerHelperPanel.vue';
import { ALL_NODE_FILTER, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, OTHER_TRIGGER_NODES_SUBCATEGORY } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';

export default mixins(externalHooks).extend({
	name: 'NodeCreateList',
	components: {
		TriggerHelperPanel,
		CategorizedItems,
	},
	props: ['categorizedItems', 'categoriesWithNodes', 'searchItems'],
	data() {
		return {
			selectedType: ALL_NODE_FILTER,
			REGULAR_NODE_FILTER,
			TRIGGER_NODE_FILTER,
			ALL_NODE_FILTER,
			OTHER_TRIGGER_NODES_SUBCATEGORY,
		};
	},
	watch: {
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
	},
	computed: {
		showNodeCreatorTabs(): boolean {
			return this.$store.getters['ui/showNodeCreatorTabs'];
		},
	},
	async mounted() {
		this.$externalHooks().run('nodeCreateList.mounted');
		// Make sure tabs are visible on mount
		this.$store.commit('ui/setShowNodeCreatorTabs', true);
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

.type-selector {
	text-align: center;
	background-color: $--node-creator-select-background-color;

	::v-deep .el-tabs > div {
		margin-bottom: 0;

		.el-tabs__nav {
			height: 43px;
		}
	}
}
.main-panel {
	background-color: var(--color-background-xlight);
}
</style>
