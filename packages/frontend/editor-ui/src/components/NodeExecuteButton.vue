<script lang="ts" setup>
import { ref, computed } from 'vue';
import {
	WEBHOOK_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MODAL_CONFIRM,
	FORM_TRIGGER_NODE_TYPE,
	CHAT_TRIGGER_NODE_TYPE,
	FROM_AI_PARAMETERS_MODAL_KEY,
} from '@/constants';
import {
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
	AI_TRANSFORM_NODE_TYPE,
	type INodeTypeDescription,
} from 'n8n-workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { nodeViewEventBus } from '@/event-bus';
import { usePinnedData } from '@/composables/usePinnedData';
import { useRunWorkflow } from '@/composables/useRunWorkflow';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/composables/useTelemetry';
import type { ButtonSize, IUpdateInformation } from '@/Interface';
import { generateCodeForAiTransform } from '@/components/ButtonParameter/utils';
import { needsAgentInput } from '@/utils/nodes/nodeTransforms';
import { useUIStore } from '@/stores/ui.store';
import type { ButtonType } from '@n8n/design-system';
import { type IconName } from '@n8n/design-system/components/N8nIcon/icons';

const NODE_TEST_STEP_POPUP_COUNT_KEY = 'N8N_NODE_TEST_STEP_POPUP_COUNT';
const MAX_POPUP_COUNT = 10;
const POPUP_UPDATE_DELAY = 3000;

const props = withDefaults(
	defineProps<{
		nodeName: string;
		telemetrySource: string;
		disabled?: boolean;
		label?: string;
		type?: ButtonType;
		size?: ButtonSize;
		icon?: IconName;
		square?: boolean;
		transparent?: boolean;
		hideIcon?: boolean;
		hideLabel?: boolean;
		tooltip?: string;
		tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
	}>(),
	{
		disabled: false,
		transparent: false,
		square: false,
	},
);

const emit = defineEmits<{
	stopExecution: [];
	execute: [];
	valueChanged: [value: IUpdateInformation];
}>();

defineOptions({
	inheritAttrs: false,
});

const lastPopupCountUpdate = ref(0);
const codeGenerationInProgress = ref(false);

const router = useRouter();
const { runWorkflow, stopCurrentExecution } = useRunWorkflow({ router });

const workflowsStore = useWorkflowsStore();
const externalHooks = useExternalHooks();
const toast = useToast();
const ndvStore = useNDVStore();
const nodeTypesStore = useNodeTypesStore();
const i18n = useI18n();
const message = useMessage();
const telemetry = useTelemetry();
const uiStore = useUIStore();

const node = computed(() => workflowsStore.getNodeByName(props.nodeName));
const pinnedData = usePinnedData(node);

const nodeType = computed((): INodeTypeDescription | null => {
	return node.value ? nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion) : null;
});

const isNodeRunning = computed(() => {
	if (!workflowsStore.isWorkflowRunning || codeGenerationInProgress.value) return false;
	const triggeredNode = workflowsStore.executedNode;
	return (
		workflowsStore.isNodeExecuting(node.value?.name ?? '') || triggeredNode === node.value?.name
	);
});

const isTriggerNode = computed(() => {
	return node.value ? nodeTypesStore.isTriggerNode(node.value.type) : false;
});

const isManualTriggerNode = computed(() =>
	nodeType.value ? nodeType.value.name === MANUAL_TRIGGER_NODE_TYPE : false,
);

const isChatNode = computed(() =>
	nodeType.value ? nodeType.value.name === CHAT_TRIGGER_NODE_TYPE : false,
);

const isChatChild = computed(() => workflowsStore.checkIfNodeHasChatParent(props.nodeName));

const isFormTriggerNode = computed(() =>
	nodeType.value ? nodeType.value.name === FORM_TRIGGER_NODE_TYPE : false,
);

const isPollingTypeNode = computed(() => !!nodeType.value?.polling);

const isScheduleTrigger = computed(() => !!nodeType.value?.group.includes('schedule'));

const isWebhookNode = computed(() =>
	nodeType.value ? nodeType.value.name === WEBHOOK_NODE_TYPE : false,
);

const isListeningForEvents = computed(() => {
	const waitingOnWebhook = workflowsStore.executionWaitingForWebhook;
	const executedNode = workflowsStore.executedNode;

	return (
		!!node.value &&
		!node.value.disabled &&
		isTriggerNode.value &&
		waitingOnWebhook &&
		(!executedNode || executedNode === props.nodeName)
	);
});

const isListeningForWorkflowEvents = computed(() => {
	return (
		isNodeRunning.value &&
		isTriggerNode.value &&
		!isScheduleTrigger.value &&
		!isManualTriggerNode.value
	);
});

const hasIssues = computed(() =>
	Boolean(node.value?.issues && (node.value.issues.parameters || node.value.issues.credentials)),
);

const disabledHint = computed(() => {
	if (isListeningForEvents.value) {
		return '';
	}

	if (codeGenerationInProgress.value) {
		return i18n.baseText('ndv.execute.generatingCode');
	}

	if (node?.value?.disabled) {
		return i18n.baseText('ndv.execute.nodeIsDisabled');
	}

	if (isTriggerNode.value && hasIssues.value) {
		const activeNode = ndvStore.activeNode;
		if (activeNode && activeNode.name !== props.nodeName) {
			return i18n.baseText('ndv.execute.fixPrevious');
		}

		return i18n.baseText('ndv.execute.requiredFieldsMissing');
	}

	if (workflowsStore.isWorkflowRunning && !isNodeRunning.value) {
		return i18n.baseText('ndv.execute.workflowAlreadyRunning');
	}

	return '';
});

const tooltipText = computed(() => {
	if (shouldGenerateCode.value) {
		return i18n.baseText('ndv.execute.generateCodeAndTestNode.description');
	}
	if (disabledHint.value) return disabledHint.value;
	if (props.tooltip && !isLoading.value && testStepButtonPopupCount() < MAX_POPUP_COUNT) {
		return props.tooltip;
	}
	return '';
});

const buttonLabel = computed(() => {
	if (props.hideLabel) {
		return '';
	}

	if (isListeningForEvents.value || isListeningForWorkflowEvents.value) {
		return i18n.baseText('ndv.execute.stopListening');
	}

	if (props.label) {
		return props.label;
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

const isLoading = computed(
	() =>
		codeGenerationInProgress.value ||
		(isNodeRunning.value && !isListeningForEvents.value && !isListeningForWorkflowEvents.value),
);

const buttonIcon = computed((): IconName | undefined => {
	if (props.icon) return props.icon;
	if (shouldGenerateCode.value) return 'terminal';
	if (!isListeningForEvents.value && !props.hideIcon) return 'flask-conical';
	return undefined;
});

const shouldGenerateCode = computed(() => {
	if (node.value?.type !== AI_TRANSFORM_NODE_TYPE) {
		return false;
	}
	if (!node.value?.parameters?.instructions) {
		return false;
	}
	if (!node.value?.parameters?.jsCode) {
		return true;
	}
	if (
		node.value?.parameters[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] &&
		(node.value?.parameters?.instructions as string).trim() !==
			(node.value?.parameters?.[AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT] as string).trim()
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

function testStepButtonPopupCount() {
	return Number(localStorage.getItem(NODE_TEST_STEP_POPUP_COUNT_KEY));
}

function onMouseOver() {
	const count = testStepButtonPopupCount();

	if (count < MAX_POPUP_COUNT && !disabledHint.value && tooltipText.value) {
		const now = Date.now();
		if (!lastPopupCountUpdate.value || now - lastPopupCountUpdate.value >= POPUP_UPDATE_DELAY) {
			localStorage.setItem(NODE_TEST_STEP_POPUP_COUNT_KEY, `${count + 1}`);
			lastPopupCountUpdate.value = now;
		}
	}
}

async function onClick() {
	if (shouldGenerateCode.value) {
		// Generate code if user hasn't clicked 'Generate Code' button
		// and update parameters
		codeGenerationInProgress.value = true;
		try {
			toast.showMessage({
				title: i18n.baseText('ndv.execute.generateCode.title'),
				message: i18n.baseText('ndv.execute.generateCode.message', {
					interpolate: { nodeName: node.value?.name as string },
				}),
				type: 'success',
			});
			const prompt = node.value?.parameters?.instructions as string;
			const updateInformation = await generateCodeForAiTransform(
				prompt,
				`parameters.${AI_TRANSFORM_JS_CODE}`,
				5,
			);
			if (!updateInformation) return;

			emit('valueChanged', updateInformation);

			emit('valueChanged', {
				name: `parameters.${AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT}`,
				value: prompt,
			});

			useTelemetry().trackAiTransform('generationFinished', {
				prompt,
				code: updateInformation.value,
			});
		} catch (error) {
			useTelemetry().trackAiTransform('generationFinished', {
				prompt,
				code: '',
				hasError: true,
			});
			toast.showMessage({
				type: 'error',
				title: i18n.baseText('codeNodeEditor.askAi.generationFailed'),
				message: error.message,
			});
		}
		codeGenerationInProgress.value = false;
	}

	if (isChatNode.value || (isChatChild.value && ndvStore.isInputPanelEmpty)) {
		ndvStore.setActiveNodeName(null);
		workflowsStore.chatPartialExecutionDestinationNode = props.nodeName;
		nodeViewEventBus.emit('openChat');
	} else if (isListeningForEvents.value) {
		await stopWaitingForWebhook();
	} else if (isListeningForWorkflowEvents.value) {
		await stopCurrentExecution();
		emit('stopExecution');
	} else {
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

			if (shouldUnpinAndExecute && node.value) {
				pinnedData.unsetData('unpin-and-execute-modal');
			}
		}

		if (!pinnedData.hasData.value || shouldUnpinAndExecute) {
			if (node.value && needsAgentInput(node.value)) {
				uiStore.openModalWithData({
					name: FROM_AI_PARAMETERS_MODAL_KEY,
					data: {
						nodeName: props.nodeName,
					},
				});
			} else {
				const telemetryPayload = {
					node_type: nodeType.value ? nodeType.value.name : null,
					workflow_id: workflowsStore.workflowId,
					source: props.telemetrySource,
					push_ref: ndvStore.pushRef,
				};

				telemetry.track('User clicked execute node button', telemetryPayload);
				await externalHooks.run('nodeExecuteButton.onClick', telemetryPayload);

				await runWorkflow({
					destinationNode: props.nodeName,
					source: 'RunData.ExecuteNodeButton',
				});

				emit('execute');
			}
		}
	}
}
</script>

<template>
	<N8nTooltip
		:placement="tooltipPlacement ?? 'right'"
		:disabled="!tooltipText"
		:content="tooltipText"
	>
		<N8nButton
			v-bind="$attrs"
			:loading="isLoading"
			:disabled="disabled || !!disabledHint"
			:label="buttonLabel"
			:type="type"
			:size="size"
			:icon="buttonIcon"
			:square="square"
			:transparent-background="transparent"
			:title="
				!isTriggerNode && !tooltipText ? i18n.baseText('ndv.execute.testNode.description') : ''
			"
			@mouseover="onMouseOver"
			@click="onClick"
		/>
	</N8nTooltip>
</template>
