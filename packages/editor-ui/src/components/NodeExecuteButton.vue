<template>
	<div>
		<n8n-tooltip placement="bottom" :disabled="!disabledHint">
			<template #content>
				<div>{{ disabledHint }}</div>
			</template>
			<div>
				<n8n-button
					v-bind="$attrs"
					:loading="nodeRunning && !isListeningForEvents && !isListeningForWorkflowEvents"
					:disabled="disabled || !!disabledHint"
					:label="buttonLabel"
					:type="type"
					:size="size"
					:icon="!isListeningForEvents && !hideIcon ? 'flask' : undefined"
					:transparent-background="transparent"
					:title="!isTriggerNode ? $locale.baseText('ndv.execute.testNode.description') : ''"
					@click="onClick"
				/>
			</div>
		</n8n-tooltip>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapStores } from 'pinia';
import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
} from '@/constants';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { nodeViewEventBus } from '@/event-bus';
import { usePinnedData } from '@/composables/usePinnedData';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useUIStore } from '@/stores/ui.store';
import { useRouter } from 'vue-router';

export default defineComponent({
	inheritAttrs: false,
	props: {
		nodeName: {
			type: String,
			required: true,
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
		hideIcon: {
			type: Boolean,
		},
	},
	emits: ['stopExecution', 'execute'],
	setup(props) {
		const router = useRouter();
		const workflowsStore = useWorkflowsStore();
		const node = workflowsStore.getNodeByName(props.nodeName);
		const pinnedData = usePinnedData(node);
		const externalHooks = useExternalHooks();
		const { runWorkflow, stopCurrentExecution } = useRunWorkflow({ router });

		return {
			externalHooks,
			pinnedData,
			runWorkflow,
			stopCurrentExecution,
			...useToast(),
			...useMessage(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useWorkflowsStore, useUIStore),
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
			return (
				this.workflowRunning &&
				(this.workflowsStore.isNodeExecuting(this.node?.name ?? '') ||
					triggeredNode === this.node?.name)
			);
		},
		workflowRunning(): boolean {
			return this.uiStore.isActionActive('workflowRunning');
		},
		isTriggerNode(): boolean {
			if (!this.node) {
				return false;
			}
			return this.nodeTypesStore.isTriggerNode(this.node.type);
		},
		isManualTriggerNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === MANUAL_TRIGGER_NODE_TYPE);
		},
		isChatNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === CHAT_TRIGGER_NODE_TYPE);
		},
		isChatChild(): boolean {
			return this.workflowsStore.checkIfNodeHasChatParent(this.nodeName);
		},
		isFormTriggerNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === FORM_TRIGGER_NODE_TYPE);
		},
		isPollingTypeNode(): boolean {
			return !!this.nodeType?.polling;
		},
		isScheduleTrigger(): boolean {
			return !!this.nodeType?.group.includes('schedule');
		},
		isWebhookNode(): boolean {
			return Boolean(this.nodeType && this.nodeType.name === WEBHOOK_NODE_TYPE);
		},
		isListeningForEvents(): boolean {
			const waitingOnWebhook = this.workflowsStore.executionWaitingForWebhook;
			const executedNode = this.workflowsStore.executedNode;

			return (
				!!this.node &&
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
				this.node?.issues && (this.node.issues.parameters || this.node.issues.credentials),
			);
		},
		disabledHint(): string {
			if (this.isListeningForEvents) {
				return '';
			}

			if (this.isTriggerNode && this.node?.disabled) {
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

			if (this.isChatNode) {
				return this.$locale.baseText('ndv.execute.testChat');
			}

			if (this.isWebhookNode) {
				return this.$locale.baseText('ndv.execute.listenForTestEvent');
			}

			if (this.isFormTriggerNode) {
				return this.$locale.baseText('ndv.execute.testStep');
			}

			if (this.isPollingTypeNode || this.nodeType?.mockManualExecution) {
				return this.$locale.baseText('ndv.execute.fetchEvent');
			}

			return this.$locale.baseText('ndv.execute.testNode');
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
			// Show chat if it's a chat node or a child of a chat node with no input data
			if (this.isChatNode || (this.isChatChild && this.ndvStore.isNDVDataEmpty('input'))) {
				this.ndvStore.setActiveNodeName(null);
				nodeViewEventBus.emit('openChat');
			} else if (this.isListeningForEvents) {
				await this.stopWaitingForWebhook();
			} else if (this.isListeningForWorkflowEvents) {
				await this.stopCurrentExecution();
				this.$emit('stopExecution');
			} else {
				let shouldUnpinAndExecute = false;
				if (this.pinnedData.hasData.value) {
					const confirmResult = await this.confirm(
						this.$locale.baseText('ndv.pinData.unpinAndExecute.description'),
						this.$locale.baseText('ndv.pinData.unpinAndExecute.title'),
						{
							confirmButtonText: this.$locale.baseText('ndv.pinData.unpinAndExecute.confirm'),
							cancelButtonText: this.$locale.baseText('ndv.pinData.unpinAndExecute.cancel'),
						},
					);
					shouldUnpinAndExecute = confirmResult === MODAL_CONFIRM;

					if (shouldUnpinAndExecute && this.node) {
						this.pinnedData.unsetData('unpin-and-execute-modal');
					}
				}

				if (!this.pinnedData.hasData.value || shouldUnpinAndExecute) {
					const telemetryPayload = {
						node_type: this.nodeType ? this.nodeType.name : null,
						workflow_id: this.workflowsStore.workflowId,
						source: this.telemetrySource,
						push_ref: this.ndvStore.pushRef,
					};
					this.$telemetry.track('User clicked execute node button', telemetryPayload);
					await this.externalHooks.run('nodeExecuteButton.onClick', telemetryPayload);

					await this.runWorkflow({
						destinationNode: this.nodeName,
						source: 'RunData.ExecuteNodeButton',
					});
					this.$emit('execute');
				}
			}
		},
	},
});
</script>
