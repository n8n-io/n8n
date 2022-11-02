<template>
	<div class="type-selector" v-if="showTabs">
		<el-tabs stretch :value="selectedType" @input="setType">
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.all')" :name="ALL_NODE_FILTER"></el-tab-pane>
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.regular')" :name="REGULAR_NODE_FILTER"></el-tab-pane>
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.trigger')" :name="TRIGGER_NODE_FILTER"></el-tab-pane>
		</el-tabs>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ALL_NODE_FILTER, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER } from '@/constants';
import { store } from '@/store';

const showTabs = computed<boolean>(() => store.getters['nodeCreator/showTabs']);
const selectedType = computed<string>(() => store.getters['nodeCreator/selectedType']);

function setType(type: string) {
	store.commit('nodeCreator/setSelectedType', type);
}
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
