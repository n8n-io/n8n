<template>
	<NodeView ref="canvas">
		<WorkflowExecutionView :canvas="$refs.canvas" v-if="VIEWS.EXECUTION === pageName" />
	</NodeView>
</template>

<script lang="ts">
import { VIEWS } from '@/constants';
import NodeView from './NodeView.vue';
import WorkflowExecutionView from './WorkflowExecutionView.vue';

import Vue from 'vue';

export default Vue.extend({
	components: {
		NodeView,
		WorkflowExecutionView,
	},
	data() {
		return {
			VIEWS,
		};
	},
	computed: {
		pageName(): string {
			return this.$route.name || '';
		},
	},
});
</script>

<style>

</style>
