<template>
	<n8n-tooltip placement="bottom" :disabled="!disabledHint">
		<template #content>
			<div>{{ disabledHint }}</div>
		</template>
		<div>
			<n8n-button
				:loading="nodeRunning && !isListeningForEvents && !isListeningForWorkflowEvents"
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
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import { WEBHOOK_NODE_TYPE, MANUAL_TRIGGER_NODE_TYPE, MODAL_CONFIRM } from '@/constants';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { workflowRun } from '@/mixins/workflowRun';
import { pinData } from '@/mixins/pinData';
import { dataPinningEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useToast, useMessage } from '@/composables';

export default defineComponent({
	mixins: [workflowRun, pinData],
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
	setup(props) {
		return {
			...useToast(),
			...useMessage(),
			...workflowRun.setup?.(props),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useWorkflowsStore),
		node(): INodeUi | null {
			return this.workflowsStore.getNodeByName(this.nodeName);
		},
		nodeType(): INodeTypeDescription | null {
			if (this.node) {
				return this.nodeTypesStore.getNodeType(this.node.type, this.node.typeVersion);
			}
			return null;
		},
		nodeRunning(): boolean {
			const triggeredNode = this.workflowsStore.executedNode;
			const executingNode = this.workflowsStore.executingNode;
			return (
				this.workflowRunning &&
				(executingNode === this.node.name || triggeredNode === this.node.name)
			);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		isTriggerNode(): boolean {
			return this.nodeTypesStore.isTriggerNode(this.node.type);
		},
		isManualTriggerNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === MANUAL_TRIGGER_NODE_TYPE);
		},
		isPollingTypeNode(): boolean {
			return !!(this.nodeType && this.nodeType.polling);
		},
		isScheduleTrigger(): boolean {
			return !!(this.nodeType && this.nodeType.group.includes('schedule'));
		},
		isWebhookNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === WEBHOOK_NODE_TYPE);
		},
		isListeningForEvents(): boolean {
			const waitingOnWebhook = this.workflowsStore.executionWaitingForWebhook;
			const executedNode = this.workflowsStore.executedNode;

			return (
				this.node &&
				!this.node.disabled &&
				this.isTriggerNode &&
				waitingOnWebhook &&
				(!executedNode || executedNode === this.nodeName)
			);
		},
		isListeningForWorkflowEvents(): boolean {
			return (
				this.nodeRunning &&
				this.isTriggerNode &&
				!this.isScheduleTrigger &&
				!this.isManualTriggerNode
			);
		},
		hasIssues(): boolean {
			return Boolean(
				this.node &&
					this.node.issues &&
					(this.node.issues.parameters || this.node.issues.credentials),
			);
		},
		disabledHint(): string {
			if (this.isListeningForEvents) {
				return '';
			}

			if (this.isTriggerNode && this.node.disabled) {
				return this.$locale.baseText('ndv.execute.nodeIsDisabled');
			}

			if (this.isTriggerNode && this.hasIssues) {
				const activeNode = this.ndvStore.activeNode;
				if (activeNode && activeNode.name !== this.nodeName) {
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
			if (this.isListeningForEvents || this.isListeningForWorkflowEvents) {
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

			if (this.isTriggerNode && !this.isScheduleTrigger && !this.isManualTriggerNode) {
				return this.$locale.baseText('ndv.execute.listenForEvent');
			}

			return this.$locale.baseText('ndv.execute.executeNode');
		},
	},
	methods: {
		async stopWaitingForWebhook() {
			try {
				await this.workflowsStore.removeTestWebhook(this.workflowsStore.workflowId);
			} catch (error) {
				this.showError(error, this.$locale.baseText('ndv.execute.stopWaitingForWebhook.error'));
				return;
			}
		},

		async onClick() {
			if (this.isListeningForEvents) {
				await this.stopWaitingForWebhook();
			} else if (this.isListeningForWorkflowEvents) {
				this.$emit('stopExecution');
			} else {
				let shouldUnpinAndExecute = false;
				if (this.hasPinData) {
					const confirmResult = await this.confirm(
						this.$locale.baseText('ndv.pinData.unpinAndExecute.description'),
						this.$locale.baseText('ndv.pinData.unpinAndExecute.title'),
						{
							confirmButtonText: this.$locale.baseText('ndv.pinData.unpinAndExecute.confirm'),
							cancelButtonText: this.$locale.baseText('ndv.pinData.unpinAndExecute.cancel'),
						},
					);
					shouldUnpinAndExecute = confirmResult === MODAL_CONFIRM;

					if (shouldUnpinAndExecute) {
						dataPinningEventBus.emit('data-unpinning', { source: 'unpin-and-execute-modal' });
						this.workflowsStore.unpinData({ node: this.node });
					}
				}

				if (!this.hasPinData || shouldUnpinAndExecute) {
					const telemetryPayload = {
						node_type: this.nodeType ? this.nodeType.name : null,
						workflow_id: this.workflowsStore.workflowId,
						source: this.telemetrySource,
					};
					this.$telemetry.track('User clicked execute node button', telemetryPayload);
					await this.$externalHooks().run('nodeExecuteButton.onClick', telemetryPayload);

					await this.runWorkflow(this.nodeName, 'RunData.ExecuteNodeButton');
					this.$emit('execute');
				}
			}
		},
	},
});
</script>
