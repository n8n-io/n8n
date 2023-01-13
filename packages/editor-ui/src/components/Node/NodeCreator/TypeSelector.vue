<template>
	<div
		class="type-selector"
		v-if="nodeCreatorStore.showTabs"
		data-test-id="node-creator-type-selector"
	>
		<el-tabs
			stretch
			:value="nodeCreatorStore.selectedType"
			@input="nodeCreatorStore.setSelectedType"
		>
			<el-tab-pane
				:label="$locale.baseText('nodeCreator.mainPanel.all')"
				:name="ALL_NODE_FILTER"
			></el-tab-pane>
			<el-tab-pane
				:label="$locale.baseText('nodeCreator.mainPanel.regular')"
				:name="REGULAR_NODE_FILTER"
			></el-tab-pane>
			<el-tab-pane
				:label="$locale.baseText('nodeCreator.mainPanel.trigger')"
				:name="TRIGGER_NODE_FILTER"
			></el-tab-pane>
		</el-tabs>
	</div>
</template>

<script setup lang="ts">
import { ALL_NODE_FILTER, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER } from '@/constants';
import { useNodeCreatorStore } from '@/stores/nodeCreator';

const nodeCreatorStore = useNodeCreatorStore();
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

.type-selector {
	text-align: center;
	background-color: $node-creator-select-background-color;
	::v-deep .el-tabs > div {
		margin-bottom: 0;
		z-index: 1;

		.el-tabs__nav {
			height: 43px;
		}
	}
}
</style>
