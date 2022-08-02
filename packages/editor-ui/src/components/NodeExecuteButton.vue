<template>
	<n8n-tooltip placement="bottom" :disabled="!disabledHint">
		<div slot="content">{{ disabledHint }}</div>
		<div>
			<n8n-button
				:loading="nodeRunning && !isListeningForEvents"
				:disabled="disabled || !!disabledHint"
				:label="buttonLabel"
				:type="type"
				:size="size"
				:transparentBackground="transparent"
				@click="onClick"
			/>
		</div>
	</n8n-tooltip>
</template>

<script lang="ts">
import { WEBHOOK_NODE_TYPE } from '@/constants';
import { INodeUi } from '@/Interface';
import { INodeTypeDescription } from 'n8n-workflow';
import mixins from 'vue-typed-mixins';
import { workflowRun } from './mixins/workflowRun';
import { pinData } from './mixins/pinData';
import { dataPinningEventBus } from '@/event-bus/data-pinning-event-bus';

export default mixins(
	workflowRun,
	pinData,
).extend({
	props: {
		nodeName: {
			type: String,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		label: {
			type: String,
		},
		type: {
			type: String,
		},
		size: {
			type: String,
		},
		transparent: {
			type: Boolean,
			default: false,
		},
		telemetrySource: {
			type: String,
		},
	},
	computed: {
		node (): INodeUi {
			return this.$store.getters.getNodeByName(this.nodeName);
		},
		nodeType (): INodeTypeDescription | null {
			if (this.node) {
				return this.$store.getters['nodeTypes/getNodeType'](this.node.type, this.node.typeVersion);
			}
			return null;
		},
		nodeRunning (): boolean {
			const triggeredNode = this.$store.getters.executedNode;
			const executingNode = this.$store.getters.executingNode;
			return this.workflowRunning && (executingNode === this.node.name || triggeredNode === this.node.name);
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
		isWebhookNode (): boolean {
			return Boolean(this.nodeType && this.nodeType.name === WEBHOOK_NODE_TYPE);
		},
		isListeningForEvents(): boolean {
			const waitingOnWebhook = this.$store.getters.executionWaitingForWebhook as boolean;
			const executedNode = this.$store.getters.executedNode as string | undefined;

			return (
				this.node &&
				!this.node.disabled &&
				this.isTriggerNode &&
				waitingOnWebhook &&
				(!executedNode || executedNode === this.nodeName)
			);
		},
		hasIssues (): boolean {
			return Boolean(this.node && this.node.issues && (this.node.issues.parameters || this.node.issues.credentials));
		},
		disabledHint(): string {
			if (this.isListeningForEvents) {
				return '';
			}

			if (this.isTriggerNode && this.node.disabled) {
				return this.$locale.baseText('ndv.execute.nodeIsDisabled');
			}

			if (this.isTriggerNode && this.hasIssues) {
				if (this.$store.getters.activeNode && this.$store.getters.activeNode.name !== this.nodeName) {
					return this.$locale.baseText('ndv.execute.fixPrevious');
				}

				return this.$locale.baseText('ndv.execute.requiredFieldsMissing');
			}

			if (this.workflowRunning && !this.nodeRunning) {
				return this.$locale.baseText('ndv.execute.workflowAlreadyRunning');
			}

			return '';
		},
		buttonLabel(): string {
			if (this.isListeningForEvents) {
				return this.$locale.baseText('ndv.execute.stopListening');
			}

			if (this.label) {
				return this.label;
			}

			if (this.isWebhookNode) {
				return this.$locale.baseText('ndv.execute.listenForTestEvent');
			}

			if (this.isPollingTypeNode || (this.nodeType && this.nodeType.mockManualExecution)) {
				return this.$locale.baseText('ndv.execute.fetchEvent');
			}

			if (this.isTriggerNode && !this.isScheduleTrigger) {
				return this.$locale.baseText('ndv.execute.listenForEvent');
			}

			return this.$locale.baseText('ndv.execute.executeNode');
		},
	},
	methods: {
		async stopWaitingForWebhook () {
			try {
				await this.restApi().removeTestWebhook(this.$store.getters.workflowId);
			} catch (error) {
				this.$showError(
					error,
					this.$locale.baseText('ndv.execute.stopWaitingForWebhook.error'),
				);
				return;
			}

			this.$showMessage({
				title: this.$locale.baseText('ndv.execute.stopWaitingForWebhook.success'),
				type: 'success',
			});
		},

		async onClick() {
			if (this.isListeningForEvents) {
				this.stopWaitingForWebhook();
			} else {
				let shouldUnpinAndExecute = false;
				if (this.hasPinData) {
					shouldUnpinAndExecute = await this.confirmMessage(
						this.$locale.baseText('ndv.pinData.unpinAndExecute.description'),
						this.$locale.baseText('ndv.pinData.unpinAndExecute.title'),
						null,
						this.$locale.baseText('ndv.pinData.unpinAndExecute.confirm'),
						this.$locale.baseText('ndv.pinData.unpinAndExecute.cancel'),
					);

					if (shouldUnpinAndExecute) {
						dataPinningEventBus.$emit('data-unpinning', { source: 'unpin-and-execute-modal' });
						this.$store.commit('unpinData', { node: this.node });
					}
				}

				if (!this.hasPinData || shouldUnpinAndExecute) {
					this.$telemetry.track('User clicked execute node button', { node_type: this.nodeType ? this.nodeType.name : null, workflow_id: this.$store.getters.workflowId, source: this.telemetrySource });
					this.runWorkflow(this.nodeName, 'RunData.ExecuteNodeButton');
					this.$emit('execute');
				}
			}
		},
	},
});
</script>
