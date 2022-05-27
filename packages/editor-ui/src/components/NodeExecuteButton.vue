<template>
	<n8n-button
		:loading="nodeRunning"
		:disabled="workflowRunning && !nodeRunning"
		:label="buttonLabel"
		:type="type"
		:outline="outline"
		:size="size"
		:transparentBackground="transparent"
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
		label: {
			type: String,
		},
		type: {
			type: String,
		},
		outline: {
			type: Boolean,
		},
		size: {
			type: String,
		},
		transparent: {
			type: Boolean,
			default: false,
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
		nodeRunning (): boolean {
			const triggeredNode = this.$store.getters.executedNode;
			const executingNode = this.$store.getters.executingNode;
			return executingNode === this.node.name || triggeredNode === this.node.name;
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
		isScheduleTrigger (): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('schedule'));
		},
		buttonLabel(): string {
			if (this.label) {
				return this.label;
			}
			if (this.isPollingTypeNode) {
				return this.$locale.baseText('ndv.execute.fetchEvent');
			}

			if (this.isTriggerNode && !this.isScheduleTrigger) {
				return this.$locale.baseText('ndv.execute.listenForEvent');
			}

			return this.$locale.baseText('ndv.execute.executeNode');
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
