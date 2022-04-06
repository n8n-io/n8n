<template>
	<n8n-button
		:loading="workflowRunning"
		:label="label"
		@click="onClick"
	/>
</template>

<script lang="ts">
import { INodeUi } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
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
		node (): INodeUi {
			return this.$store.getters.getNodeByName(this.nodeName);
		},
		nodeType (): INodeTypeDescription | null {
			if (this.node) {
				return this.$store.getters.nodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		workflowRunning (): boolean {
			return this.$store.getters.isActionActive('workflowRunning');
		},
		isTriggerNode (): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('trigger'));
		},
		isPollingTypeNode (): boolean {
			return !!(this.nodeType && this.nodeType.polling);
		},
		label(): string {
			if (this.isPollingTypeNode) {
				return this.$locale.baseText('node.execute.fetchEvent');
			}

			if (this.isTriggerNode) {
				return this.$locale.baseText('node.execute.listenForEvent');
			}

			return this.$locale.baseText('node.execute.executeNode');
		},
	},
	methods: {
		onClick() {
			this.runWorkflow(this.nodeName, 'RunData.ExecuteNodeButton');
			this.$emit('execute');
		},
	},
});
</script>
