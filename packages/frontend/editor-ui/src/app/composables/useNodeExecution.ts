import { computed, ref, toValue, type ComputedRef, type MaybeRef } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system';

import type { INodeUi } from '@/Interface';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { needsAgentInput } from '@/app/utils/nodes/nodeTransforms';

import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	FROM_AI_PARAMETERS_MODAL_KEY,
} from '@/app/constants';

export type ExecuteAction =
	| 'executed'
	| 'stopped-webhook'
	| 'stopped-execution'
	| 'opened-chat'
	| 'opened-modal'
	| 'cancelled'
	| 'noop';

export type UseNodeExecutionOptions = {
	telemetrySource?: string;
	executionMode?: MaybeRef<'inclusive' | 'exclusive'>;
	source?: string;
};

export type NodeExecutionState = {
	isExecuting: ComputedRef<boolean>;
	isListening: ComputedRef<boolean>;
	isListeningForWorkflowEvents: ComputedRef<boolean>;
	buttonLabel: ComputedRef<string>;
	buttonIcon: ComputedRef<IconName | undefined>;
	disabledReason: ComputedRef<string>;
	isTriggerNode: ComputedRef<boolean>;
	hasIssues: ComputedRef<boolean>;
};

export type NodeExecutionActions = {
	execute: () => Promise<ExecuteAction>;
	stopExecution: () => Promise<void>;
};

/**
 * Composable that provides node execution state and actions.
 * Used by both NodeExecuteButton component and SetupPanel.
 * @param node - The node to execute (can be a ref, computed, or raw value; may be null/undefined)
 * @param options - Configuration options for execution behavior
 */
export function useNodeExecution(
	node: MaybeRef<INodeUi | null | undefined>,
	options: UseNodeExecutionOptions = {},
): NodeExecutionState & NodeExecutionActions {
	const {
		telemetrySource = 'setupPanel',
		executionMode = 'inclusive',
		source = 'SetupPanel.ExecuteNodeButton',
	} = options;

	const router = useRouter();
	const i18n = useI18n();
	const telemetry = useTelemetry();
	const toast = useToast();
	const message = useMessage();
	const externalHooks = useExternalHooks();

	const workflowsStore = useWorkflowsStore();
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();

	const workflowDocumentStore = injectWorkflowDocumentStore();
	const ndvStore = computed(() => useNDVStore(workflowDocumentStore.value.documentId));
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();

	const { runWorkflow, stopCurrentExecution } = useRunWorkflow({ router });
	const nodeHelpers = useNodeHelpers();

	const nodeRef = computed(() => toValue(node) ?? null);

	const pinnedData = usePinnedData(nodeRef);

	const nodeType = computed(() =>
		nodeRef.value
			? nodeTypesStore.getNodeType(nodeRef.value.type, nodeRef.value.typeVersion)
			: null,
	);

	const isTriggerNode = computed(() =>
		nodeRef.value ? nodeTypesStore.isTriggerNode(nodeRef.value.type) : false,
	);

	const isManualTriggerNode = computed(() => nodeType.value?.name === MANUAL_TRIGGER_NODE_TYPE);

	const isChatNode = computed(() => nodeType.value?.name === CHAT_TRIGGER_NODE_TYPE);

	const isChatChild = computed(() =>
		nodeRef.value
			? workflowDocumentStore.value.checkIfNodeHasChatParent(nodeRef.value.name)
			: false,
	);

	const isFormTriggerNode = computed(() => nodeType.value?.name === FORM_TRIGGER_NODE_TYPE);

	const isPollingTypeNode = computed(() => !!nodeType.value?.polling);

	const isScheduleTrigger = computed(() => !!nodeType.value?.group.includes('schedule'));

	const isWebhookNode = computed(() => nodeType.value?.name === WEBHOOK_NODE_TYPE);

	const isNodeRunning = computed(() => {
		if (!workflowExecutionStateStore.value.isWorkflowRunning) return false;
		const triggeredNode = workflowExecutionStateStore.value.activeExecutionExecutedNode;
		return (
			workflowExecutionStateStore.value.executingNode.isNodeExecuting(nodeRef.value?.name ?? '') ||
			triggeredNode === nodeRef.value?.name
		);
	});

	const isListening = computed(() => {
		const waitingOnWebhook = workflowExecutionStateStore.value.executionWaitingForWebhook;
		const executedNode = workflowExecutionStateStore.value.activeExecutionExecutedNode;

		return (
			!!nodeRef.value &&
			!nodeRef.value.disabled &&
			isTriggerNode.value &&
			waitingOnWebhook &&
			(!executedNode || executedNode === nodeRef.value.name)
		);
	});

	const isListeningForWorkflowEvents = computed(
		() =>
			isNodeRunning.value &&
			isTriggerNode.value &&
			!isScheduleTrigger.value &&
			!isManualTriggerNode.value,
	);

	const isExecuting = computed(
		() => isNodeRunning.value && !isListening.value && !isListeningForWorkflowEvents.value,
	);

	const hasIssues = computed(() =>
		Boolean(
			nodeRef.value?.issues &&
				(nodeRef.value.issues.parameters || nodeRef.value.issues.credentials),
		),
	);

	const disabledReason = computed(() => {
		if (isListening.value) {
			return '';
		}

		if (nodeRef.value?.disabled) {
			return i18n.baseText('ndv.execute.nodeIsDisabled');
		}

		if (isTriggerNode.value && hasIssues.value) {
			return i18n.baseText('ndv.execute.requiredFieldsMissing');
		}

		if (workflowExecutionStateStore.value.isWorkflowRunning && !isNodeRunning.value) {
			return i18n.baseText('ndv.execute.workflowAlreadyRunning');
		}

		return '';
	});

	const buttonLabel = computed(() => {
		if (isListening.value || isListeningForWorkflowEvents.value) {
			return i18n.baseText('ndv.execute.stopListening');
		}

		if (isChatNode.value) {
			return i18n.baseText('chat.open');
		}

		if (isWebhookNode.value) {
			return i18n.baseText('ndv.execute.listenForTestEvent');
		}

		if (isFormTriggerNode.value) {
			return i18n.baseText('ndv.execute.testStep');
		}

		if (isPollingTypeNode.value || nodeType.value?.mockManualExecution) {
			return i18n.baseText('ndv.execute.fetchEvent');
		}

		return i18n.baseText('ndv.execute.testNode');
	});

	const buttonIcon = computed((): IconName | undefined => {
		if (!isListening.value) return 'flask-conical';
		return undefined;
	});

	async function stopWaitingForWebhook() {
		try {
			await workflowsStore.removeTestWebhook(workflowDocumentStore.value.workflowId);
		} catch (error) {
			toast.showError(error, 'Error stopping webhook');
		}
	}

	async function execute(): Promise<ExecuteAction> {
		if (!nodeRef.value) return 'noop';

		const nodeName = nodeRef.value.name;

		// Chat nodes — open chat when: it's a chat trigger itself, or it's a child of
		// a chat trigger that has no execution/pin data yet (needs chat input first).
		if (isChatNode.value || (isChatChild.value && !chatTriggerHasInputData())) {
			ndvStore.value.unsetActiveNodeName();
			await runWorkflow({
				destinationNode: { nodeName, mode: toValue(executionMode) },
				source,
			});
			return 'opened-chat';
		}

		// Stop webhook listening
		if (isListening.value) {
			await stopWaitingForWebhook();
			return 'stopped-webhook';
		}

		// Stop workflow execution
		if (isListeningForWorkflowEvents.value) {
			await stopCurrentExecution();
			return 'stopped-execution';
		}

		// Handle pinned data
		let shouldUnpinAndExecute = false;
		if (pinnedData.hasData.value) {
			const confirmResult = await message.confirm(
				i18n.baseText('ndv.pinData.unpinAndExecute.description'),
				i18n.baseText('ndv.pinData.unpinAndExecute.title'),
				{
					confirmButtonText: i18n.baseText('ndv.pinData.unpinAndExecute.confirm'),
					cancelButtonText: i18n.baseText('ndv.pinData.unpinAndExecute.cancel'),
				},
			);
			shouldUnpinAndExecute = confirmResult === MODAL_CONFIRM;

			if (shouldUnpinAndExecute) {
				pinnedData.unsetData('unpin-and-execute-modal');
			}
		}

		if (!pinnedData.hasData.value || shouldUnpinAndExecute) {
			// Handle nodes that need agent input
			if (needsAgentInput(nodeRef.value)) {
				uiStore.openModalWithData({
					name: FROM_AI_PARAMETERS_MODAL_KEY,
					data: {
						nodeName,
					},
				});
				return 'opened-modal';
			}

			// Normal execution
			const telemetryPayload = {
				node_type: nodeType.value ? nodeType.value.name : null,
				workflow_id: workflowDocumentStore.value.workflowId,
				source: telemetrySource,
				push_ref: ndvStore.value.pushRef,
			};

			telemetry.track('User clicked execute node button', telemetryPayload);
			await externalHooks.run('nodeExecuteButton.onClick', telemetryPayload);

			await runWorkflow({
				destinationNode: { nodeName, mode: toValue(executionMode) },
				source,
			});

			return 'executed';
		}

		return 'cancelled';
	}

	async function stopExecution(): Promise<void> {
		// While the run waits for a test webhook there is no execution to stop.
		if (workflowExecutionStateStore.value.executionWaitingForWebhook) {
			await stopWaitingForWebhook();
		} else {
			await stopCurrentExecution();
		}
	}

	return {
		isExecuting,
		isListening,
		isListeningForWorkflowEvents,
		buttonLabel,
		buttonIcon,
		disabledReason,
		isTriggerNode,
		hasIssues,
		execute,
		stopExecution,
	};
}
