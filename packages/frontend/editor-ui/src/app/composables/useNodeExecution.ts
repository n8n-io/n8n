import { computed, ref, toValue, type ComputedRef, type MaybeRef } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

import {
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
	AI_TRANSFORM_NODE_TYPE,
} from 'n8n-workflow';

import type { INodeUi, IUpdateInformation } from '@/Interface';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useUIStore } from '@/app/stores/ui.store';

import { useRunWorkflow } from '@/app/composables/useRunWorkflow';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useMessage } from '@/app/composables/useMessage';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';

import { needsAgentInput } from '@/app/utils/nodes/nodeTransforms';
import { generateCodeForAiTransform } from '@/features/ndv/parameters/utils/buttonParameter.utils';

import { nodeViewEventBus } from '@/app/event-bus';

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
	onCodeGenerated?: (update: IUpdateInformation) => void;
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
	shouldGenerateCode: ComputedRef<boolean>;
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
	const ndvStore = useNDVStore();
	const uiStore = useUIStore();
	const workflowState = injectWorkflowState();

	const { runWorkflow, stopCurrentExecution } = useRunWorkflow({ router });

	const codeGenerationInProgress = ref(false);

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
		nodeRef.value ? workflowsStore.checkIfNodeHasChatParent(nodeRef.value.name) : false,
	);

	const isFormTriggerNode = computed(() => nodeType.value?.name === FORM_TRIGGER_NODE_TYPE);

	const isPollingTypeNode = computed(() => !!nodeType.value?.polling);

	const isScheduleTrigger = computed(() => !!nodeType.value?.group.includes('schedule'));

	const isWebhookNode = computed(() => nodeType.value?.name === WEBHOOK_NODE_TYPE);

	const isNodeRunning = computed(() => {
		if (!workflowsStore.isWorkflowRunning || codeGenerationInProgress.value) return false;
		const triggeredNode = workflowsStore.executedNode;
		return (
			workflowState.executingNode.isNodeExecuting(nodeRef.value?.name ?? '') ||
			triggeredNode === nodeRef.value?.name
		);
	});

	const isListening = computed(() => {
		const waitingOnWebhook = workflowsStore.executionWaitingForWebhook;
		const executedNode = workflowsStore.executedNode;

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
		() =>
			codeGenerationInProgress.value ||
			(isNodeRunning.value && !isListening.value && !isListeningForWorkflowEvents.value),
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

		if (codeGenerationInProgress.value) {
			return i18n.baseText('ndv.execute.generatingCode');
		}

		if (nodeRef.value?.disabled) {
			return i18n.baseText('ndv.execute.nodeIsDisabled');
		}

		if (isTriggerNode.value && hasIssues.value) {
			return i18n.baseText('ndv.execute.requiredFieldsMissing');
		}

		if (workflowsStore.isWorkflowRunning && !isNodeRunning.value) {
			return i18n.baseText('ndv.execute.workflowAlreadyRunning');
		}

		return '';
	});

	const buttonLabel = computed(() => {
		if (isListening.value || isListeningForWorkflowEvents.value) {
			return i18n.baseText('ndv.execute.stopListening');
		}

		if (shouldGenerateCode.value) {
			return i18n.baseText('ndv.execute.generateCodeAndTestNode.description');
		}

		if (isChatNode.value) {
			return i18n.baseText('ndv.execute.testChat');
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
		if (shouldGenerateCode.value) return 'terminal';
		if (!isListening.value) return 'flask-conical';
		return undefined;
	});

	const shouldGenerateCode = computed(() => {
		if (nodeRef.value?.type !== AI_TRANSFORM_NODE_TYPE) {
			return false;
		}
		if (!nodeRef.value?.parameters?.instructions) {
			return false;
		}
		if (!nodeRef.value?.parameters?.jsCode) {
			return true;
		}
		if (
			nodeRef.value?.parameters[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] &&
			(nodeRef.value?.parameters?.instructions as string).trim() !==
				(nodeRef.value?.parameters?.[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] as string).trim()
		) {
			return true;
		}
		return false;
	});

	async function stopWaitingForWebhook() {
		try {
			await workflowsStore.removeTestWebhook(workflowsStore.workflowId);
		} catch (error) {
			toast.showError(error, 'Error stopping webhook');
		}
	}

	async function handleCodeGeneration(): Promise<boolean> {
		if (!shouldGenerateCode.value || !nodeRef.value) return true;

		codeGenerationInProgress.value = true;
		try {
			toast.showMessage({
				title: i18n.baseText('ndv.execute.generateCode.title'),
				message: i18n.baseText('ndv.execute.generateCode.message', {
					interpolate: { nodeName: nodeRef.value.name },
				}),
				type: 'success',
			});

			const prompt = nodeRef.value.parameters?.instructions as string;
			const updateInformation = await generateCodeForAiTransform(
				prompt,
				`parameters.${AI_TRANSFORM_JS_CODE}`,
				5,
			);

			if (!updateInformation) {
				codeGenerationInProgress.value = false;
				return false;
			}

			// Update node with generated code
			workflowState.updateNodeProperties({
				name: nodeRef.value.name,
				properties: {
					parameters: {
						...nodeRef.value.parameters,
						[AI_TRANSFORM_JS_CODE]: updateInformation.value,
						[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT]: prompt,
					},
				},
			});

			options.onCodeGenerated?.({
				name: `parameters.${AI_TRANSFORM_JS_CODE}`,
				value: updateInformation.value,
			});
			options.onCodeGenerated?.({
				name: `parameters.${AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT}`,
				value: prompt,
			});

			telemetry.trackAiTransform('generationFinished', {
				prompt,
				code: updateInformation.value,
			});
		} catch (error) {
			telemetry.trackAiTransform('generationFinished', {
				prompt: nodeRef.value?.parameters?.instructions as string,
				code: '',
				hasError: true,
			});
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
				message: (error as Error).message,
			});
			codeGenerationInProgress.value = false;
			return false;
		}
		codeGenerationInProgress.value = false;
		return true;
	}

	async function execute(): Promise<ExecuteAction> {
		if (!nodeRef.value) return 'noop';

		const nodeName = nodeRef.value.name;

		// AI Transform code generation
		if (shouldGenerateCode.value) {
			const success = await handleCodeGeneration();
			if (!success) return 'cancelled';
		}

		// Chat nodes
		if (isChatNode.value || (isChatChild.value && ndvStore.isInputPanelEmpty)) {
			ndvStore.unsetActiveNodeName();
			workflowsStore.chatPartialExecutionDestinationNode = nodeName;
			nodeViewEventBus.emit('openChat');
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
				workflow_id: workflowsStore.workflowId,
				source: telemetrySource,
				push_ref: ndvStore.pushRef,
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
		if (isListening.value) {
			await stopWaitingForWebhook();
		} else if (isListeningForWorkflowEvents.value) {
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
		shouldGenerateCode,
		execute,
		stopExecution,
	};
}
