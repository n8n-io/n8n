<template>
	<n8n-button
		:title="$locale.baseText('node.execute.hint', { interpolate: { nodeName } })"
		:loading="workflowRunning"
		:label="workflowRunning? $locale.baseText('node.execute.executing') : $locale.baseText('node.execute.executeNode')"
		@click.stop="runWorkflow(nodeName, 'RunData.ExecuteNodeButton')"
	/>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { workflowRun } from './mixins/workflowRun';

export default mixins(
	workflowRun,
).extend({
	props: {
		nodeName: {
			type: String,
		},
	},
	computed: {
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
	},
});
</script>
