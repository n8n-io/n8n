<template>
	<div
		class="container"
		ref="mainPanelContainer"
	>
		<div class="main-panel">
			<div class="type-selector" v-if="showNodeCreatorTabs" >
				<el-tabs stretch :value="selectedType" @input="setType">
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.all')" :name="ALL_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.regular')" :name="REGULAR_NODE_FILTER"></el-tab-pane>
					<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.trigger')" :name="TRIGGER_NODE_FILTER"></el-tab-pane>
				</el-tabs>
			</div>
			<SlideTransition :absolute="true">
				<!-- We only want the transition from/to Trigger Helper Panel so we key boolean -->
				<div :key="selectedType === TRIGGER_NODE_FILTER">
					<TriggerHelperPanel
						v-if="selectedType === TRIGGER_NODE_FILTER"
						class="scrollable"
						:searchItems="searchItems"
					/>
					<CategorizedItems
						v-else
						:searchItems="searchItems"
						:excludedSubcategories="[OTHER_TRIGGER_NODES_SUBCATEGORY]"
					/>
				</div>
			</SlideTransition>
		</div>
	</div>
</template>

<script lang="ts">
import { externalHooks } from '@/components/mixins/externalHooks';
import mixins from 'vue-typed-mixins';
import TriggerHelperPanel from './TriggerHelperPanel.vue';
import { ALL_NODE_FILTER, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER, OTHER_TRIGGER_NODES_SUBCATEGORY } from '@/constants';
import CategorizedItems from './CategorizedItems.vue';
import SlideTransition from '@/components/transitions/SlideTransition.vue';

export default mixins(externalHooks).extend({
	name: 'NodeCreateList',
	components: {
		TriggerHelperPanel,
		CategorizedItems,
		SlideTransition,
	},
	props: ['searchItems'],
	data() {
		return {
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
		setType(type: string) {
			this.$store.commit('ui/setSelectedNodeCreatorType', type);
		},
	},
	computed: {
		showNodeCreatorTabs(): boolean {
			return this.$store.getters['ui/showNodeCreatorTabs'];
		},
		selectedType(): string {
			return this.$store.getters['ui/selectedNodeCreatorType'];
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
