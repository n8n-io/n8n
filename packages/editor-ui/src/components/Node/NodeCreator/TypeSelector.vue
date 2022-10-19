<template>
	<div class="type-selector" v-if="showTabs">
		<el-tabs stretch :value="selectedType" @input="setType">
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.all')" :name="ALL_NODE_FILTER"></el-tab-pane>
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.regular')" :name="REGULAR_NODE_FILTER"></el-tab-pane>
			<el-tab-pane :label="$locale.baseText('nodeCreator.mainPanel.trigger')" :name="TRIGGER_NODE_FILTER"></el-tab-pane>
		</el-tabs>
	</div>
</template>

<script lang="ts">
import { ALL_NODE_FILTER, REGULAR_NODE_FILTER, TRIGGER_NODE_FILTER } from '@/constants';
import Vue from 'vue';

export default Vue.extend({
	name: 'NodeCreateTypeSelector',
	data() {
		return {
			REGULAR_NODE_FILTER,
			TRIGGER_NODE_FILTER,
			ALL_NODE_FILTER,
		};
	},
	methods: {
		setType(type: string) {
			this.$store.commit('nodeCreator/setSelectedType', type);
		},
	},
	computed: {
		showTabs(): boolean {
			return this.$store.getters['nodeCreator/showTabs'];
		},
		selectedType(): string {
			return this.$store.getters['nodeCreator/selectedType'];
		},
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
