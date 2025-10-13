<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IRunData, Workflow, NodeConnectionType, IConnectedNode } from 'n8n-workflow';
import { jsonParse, NodeHelpers, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IRunDataDisplayMode,
	IUpdateInformation,
	NodePanelType,
	TargetItem,
} from '@/Interface';

import NodeSettings from '@/components/NodeSettings.vue';
import NDVDraggablePanels from './NDVDraggablePanels.vue';

import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import {
	APP_MODALS_ELEMENT_ID,
	BASE_NODE_SURVEY_URL,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MODAL_CONFIRM,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import type { DataPinningDiscoveryEvent } from '@/event-bus';
import { dataPinningEventBus, ndvEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useMessage } from '@/composables/useMessage';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { useStyles } from '@/composables/useStyles';
import { useTelemetryContext } from '@/composables/useTelemetryContext';

import { ElDialog } from 'element-plus';
import { N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
const emit = defineEmits<{
	saveKeyboardShortcut: [event: KeyboardEvent];
	valueChanged: [parameterData: IUpdateInformation];
	switchSelectedNode: [nodeTypeName: string];
	openConnectionNodeCreator: [
		nodeTypeName: string,
		connectionType: NodeConnectionType,
		connectionIndex?: number,
	];
	stopExecution: [];
}>();

const props = withDefaults(
	defineProps<{
		workflowObject: Workflow;
		readOnly?: boolean;
		renaming?: boolean;
		isProductionExecutionPreview?: boolean;
	}>(),
	{
		isProductionExecutionPreview: false,
		readOnly: false,
	},
);

const ndvStore = useNDVStore();
const externalHooks = useExternalHooks();
const nodeHelpers = useNodeHelpers();
const { activeNode } = storeToRefs(ndvStore);
const pinnedData = usePinnedData(activeNode);
const workflowActivate = useWorkflowActivate();
const nodeTypesStore = useNodeTypesStore();
const workflowsStore = useWorkflowsStore();
const deviceSupport = useDeviceSupport();
const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext({ view_shown: 'ndv' });
const i18n = useI18n();
const message = useMessage();
const { APP_Z_INDEXES } = useStyles();

const settingsEventBus = createEventBus();
const runInputIndex = ref(-1);
const runOutputIndex = computed(() => ndvStore.output.run ?? -1);
const selectedInput = ref<string | undefined>();
const isLinkingEnabled = ref(true);
const triggerWaitingWarningEnabled = ref(false);
const isDragging = ref(false);
const mainPanelPosition = ref(0);
const pinDataDiscoveryTooltipVisible = ref(false);
const avgInputRowHeight = ref(0);
const avgOutputRowHeight = ref(0);
const isInputPaneActive = ref(false);
const isOutputPaneActive = ref(false);
const isPairedItemHoveringEnabled = ref(true);

// computed

const pushRef = computed(() => ndvStore.pushRef);

const activeNodeType = computed(() => {
	if (activeNode.value) {
		return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
	}
	return null;
});

const showTriggerWaitingWarning = computed(
	() =>
		triggerWaitingWarningEnabled.value &&
		!!activeNodeType.value &&
		!activeNodeType.value.group.includes('trigger') &&
		workflowsStore.isWorkflowRunning &&
		workflowsStore.executionWaitingForWebhook,
);

const workflowRunData = computed(() => {
	if (workflowExecution.value === null) {
		return null;
	}

	const executionData = workflowExecution.value.data;

	if (executionData?.resultData) {
		return executionData.resultData.runData;
	}

	return null;
});

const parentNodes = computed(() => {
	if (activeNode.value) {
		return props.workflowObject.getParentNodesByDepth(activeNode.value.name, 1);
	}
	return [];
});

const parentNode = computed<IConnectedNode | undefined>(() => {
	for (const parent of parentNodes.value) {
		if (workflowsStore?.pinnedWorkflowData?.[parent.name]) {
			return parent;
		}

		if (workflowRunData.value?.[parent.name]) {
			return parent;
		}
	}
	return parentNodes.value[0];
});

const inputNodeName = computed<string | undefined>(() => {
	const nodeOutputs =
		activeNode.value && activeNodeType.value
			? NodeHelpers.getNodeOutputs(props.workflowObject, activeNode.value, activeNodeType.value)
			: [];

	const nonMainOutputs = nodeOutputs.filter((output) => {
		if (typeof output === 'string') return output !== NodeConnectionTypes.Main;

		return output.type !== NodeConnectionTypes.Main;
	});

	const isSubNode = nonMainOutputs.length > 0;

	if (isSubNode && activeNode.value) {
		// For sub-nodes, we need to get their connected output node to determine the input
		// because sub-nodes use specialized outputs (e.g. NodeConnectionTypes.AiTool)
		// instead of the standard Main output type
		const connectedOutputNode = props.workflowObject.getChildNodes(
			activeNode.value.name,
			'ALL_NON_MAIN',
		)?.[0];
		return connectedOutputNode;
	}
	return selectedInput.value ?? parentNode.value?.name;
});

const inputNode = computed(() => {
	if (inputNodeName.value) {
		return workflowsStore.getNodeByName(inputNodeName.value);
	}
	return null;
});

const inputSize = computed(() => ndvStore.ndvInputDataWithPinnedData.length);

const isTriggerNode = computed(
	() =>
		!!activeNodeType.value &&
		(activeNodeType.value.group.includes('trigger') ||
			activeNodeType.value.name === START_NODE_TYPE),
);

const showTriggerPanel = computed(() => {
	const override = !!activeNodeType.value?.triggerPanel;
	if (typeof activeNodeType.value?.triggerPanel === 'boolean') {
		return override;
	}

	const isWebhookBasedNode = !!activeNodeType.value?.webhooks?.length;
	const isPollingNode = activeNodeType.value?.polling;

	return (
		!props.readOnly && isTriggerNode.value && (isWebhookBasedNode || isPollingNode || override)
	);
});

const isExecutableTriggerNode = computed(() => {
	if (!activeNodeType.value) return false;

	return EXECUTABLE_TRIGGER_NODE_TYPES.includes(activeNodeType.value.name);
});

const isActiveStickyNode = computed(
	() => !!ndvStore.activeNode && ndvStore.activeNode.type === STICKY_NODE_TYPE,
);

const workflowExecution = computed(() => workflowsStore.getWorkflowExecution);

const maxOutputRun = computed(() => {
	if (activeNode.value === null) {
		return 0;
	}

	const runData = workflowRunData.value;

	if (!runData?.[activeNode.value.name]) {
		return 0;
	}

	if (runData[activeNode.value.name].length) {
		return runData[activeNode.value.name].length - 1;
	}

	return 0;
});

const outputRun = computed(() =>
	runOutputIndex.value === -1
		? maxOutputRun.value
		: Math.min(runOutputIndex.value, maxOutputRun.value),
);

const maxInputRun = computed(() => {
	if (inputNode.value === null || activeNode.value === null) {
		return 0;
	}

	const workflowNode = props.workflowObject.getNode(activeNode.value.name);

	if (!workflowNode || !activeNodeType.value) {
		return 0;
	}

	const outputs = NodeHelpers.getNodeOutputs(
		props.workflowObject,
		workflowNode,
		activeNodeType.value,
	);

	let node = inputNode.value;

	const runData: IRunData | null = workflowRunData.value;

	if (outputs.some((output) => output !== NodeConnectionTypes.Main)) {
		node = activeNode.value;
	}

	if (!node || !runData?.hasOwnProperty(node.name)) {
		return 0;
	}

	if (runData[node.name].length) {
		return runData[node.name].length - 1;
	}

	return 0;
});

const connectedCurrentNodeOutputs = computed(() => {
	return parentNodes.value.find(({ name }) => name === inputNodeName.value)?.indicies;
});

const inputRun = computed(() => {
	if (isLinkingEnabled.value && maxOutputRun.value === maxInputRun.value) {
		return outputRun.value;
	}
	const currentInputNodeName = inputNodeName.value;
	if (runInputIndex.value === -1 && currentInputNodeName) {
		return (
			connectedCurrentNodeOutputs.value
				?.map((outputIndex) =>
					nodeHelpers.getLastRunIndexWithData(currentInputNodeName, outputIndex),
				)
				.find((runIndex) => runIndex !== -1) ?? maxInputRun.value
		);
	}

	return Math.min(runInputIndex.value, maxInputRun.value);
});

const canLinkRuns = computed(
	() => maxOutputRun.value > 0 && maxOutputRun.value === maxInputRun.value,
);

const linked = computed(() => isLinkingEnabled.value && canLinkRuns.value);

const featureRequestUrl = computed(() => {
	if (!activeNodeType.value) {
		return '';
	}
	return `${BASE_NODE_SURVEY_URL}${activeNodeType.value.name}`;
});

const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

const blockUi = computed(
	() => workflowsStore.isWorkflowRunning || isExecutionWaitingForWebhook.value,
);

const foreignCredentials = computed(() =>
	nodeHelpers.getForeignCredentialsIfSharingEnabled(activeNode.value?.credentials),
);

const hasForeignCredential = computed(() => foreignCredentials.value.length > 0);

const inputPanelDisplayMode = computed(() => ndvStore.inputPanelDisplayMode);

const outputPanelDisplayMode = computed(() => ndvStore.outputPanelDisplayMode);

//methods

const setIsTooltipVisible = ({ isTooltipVisible }: DataPinningDiscoveryEvent) => {
	pinDataDiscoveryTooltipVisible.value = isTooltipVisible;
};

const onKeyDown = (e: KeyboardEvent) => {
	if (e.key === 's' && deviceSupport.isCtrlKeyPressed(e)) {
		onSaveWorkflow(e);
	}
};

const onSaveWorkflow = (e: KeyboardEvent) => {
	e.stopPropagation();
	e.preventDefault();

	if (props.readOnly) return;

	emit('saveKeyboardShortcut', e);
};

const onInputItemHover = (e: { itemIndex: number; outputIndex: number } | null) => {
	if (e === null || !inputNodeName.value || !isPairedItemHoveringEnabled.value) {
		ndvStore.setHoveringItem(null);
		return;
	}

	const item = {
		nodeName: inputNodeName.value,
		runIndex: inputRun.value,
		outputIndex: e.outputIndex,
		itemIndex: e.itemIndex,
	};
	ndvStore.setHoveringItem(item);
};

const onInputTableMounted = (e: { avgRowHeight: number }) => {
	avgInputRowHeight.value = e.avgRowHeight;
};

const onWorkflowActivate = () => {
	ndvStore.unsetActiveNodeName();
	setTimeout(() => {
		void workflowActivate.activateCurrentWorkflow('ndv');
	}, 1000);
};

const onOutputItemHover = (e: { itemIndex: number; outputIndex: number } | null) => {
	if (e === null || !activeNode.value || !isPairedItemHoveringEnabled.value) {
		ndvStore.setHoveringItem(null);
		return;
	}

	const item: TargetItem = {
		nodeName: activeNode.value?.name,
		runIndex: outputRun.value,
		outputIndex: e.outputIndex,
		itemIndex: e.itemIndex,
	};
	ndvStore.setHoveringItem(item);
};

const onFeatureRequestClick = () => {
	window.open(featureRequestUrl.value, '_blank');
	if (activeNode.value) {
		telemetry.track('User clicked ndv link', {
			node_type: activeNode.value.type,
			workflow_id: workflowsStore.workflowId,
			push_ref: pushRef.value,
			pane: NodeConnectionTypes.Main,
			type: 'i-wish-this-node-would',
		});
	}
};

const onDragEnd = (e: { windowWidth: number; position: number }) => {
	isDragging.value = false;
	telemetry.track('User moved parameters pane', {
		// example method for tracking
		window_width: e.windowWidth,
		start_position: mainPanelPosition.value,
		end_position: e.position,
		node_type: activeNodeType.value ? activeNodeType.value.name : '',
		push_ref: pushRef.value,
		workflow_id: workflowsStore.workflowId,
	});
	mainPanelPosition.value = e.position;
};

const onDragStart = (e: { position: number }) => {
	isDragging.value = true;
	mainPanelPosition.value = e.position;
};

const onPanelsInit = (e: { position: number }) => {
	mainPanelPosition.value = e.position;
};

const onLinkRunToOutput = () => {
	isLinkingEnabled.value = true;
	trackLinking('output');
};

const onUnlinkRun = (pane: string) => {
	runInputIndex.value = runOutputIndex.value;
	isLinkingEnabled.value = false;
	trackLinking(pane);
};

const onNodeExecute = () => {
	setTimeout(() => {
		if (!activeNode.value || !workflowsStore.isWorkflowRunning) {
			return;
		}
		triggerWaitingWarningEnabled.value = true;
	}, 1000);
};

const openSettings = () => {
	settingsEventBus.emit('openSettings');
};

const trackLinking = (pane: string) => {
	telemetry.track('User changed ndv run linking', {
		node_type: activeNodeType.value ? activeNodeType.value.name : '',
		push_ref: pushRef.value,
		linked: linked.value,
		pane,
	});
};

const onLinkRunToInput = () => {
	ndvStore.setOutputRunIndex(runInputIndex.value);
	isLinkingEnabled.value = true;
	trackLinking('input');
};

const valueChanged = (parameterData: IUpdateInformation) => {
	emit('valueChanged', parameterData);
};

const onSwitchSelectedNode = (nodeTypeName: string) => {
	emit('switchSelectedNode', nodeTypeName);
};

const onOpenConnectionNodeCreator = (
	nodeTypeName: string,
	connectionType: NodeConnectionType,
	connectionIndex: number = 0,
) => {
	emit('openConnectionNodeCreator', nodeTypeName, connectionType, connectionIndex);
};

const close = async () => {
	if (isDragging.value) {
		return;
	}

	if (outputPanelEditMode.value.enabled && activeNode.value) {
		const shouldPinDataBeforeClosing = await message.confirm(
			'',
			i18n.baseText('ndv.pinData.beforeClosing.title'),
			{
				confirmButtonText: i18n.baseText('ndv.pinData.beforeClosing.confirm'),
				cancelButtonText: i18n.baseText('ndv.pinData.beforeClosing.cancel'),
			},
		);

		if (shouldPinDataBeforeClosing === MODAL_CONFIRM) {
			const { value } = outputPanelEditMode.value;
			try {
				pinnedData.setData(jsonParse(value), 'on-ndv-close-modal');
			} catch (error) {
				console.error(error);
			}
		}

		ndvStore.setOutputPanelEditModeEnabled(false);
	}

	await externalHooks.run('dataDisplay.nodeEditingFinished');
	telemetry.track('User closed node modal', {
		node_type: activeNodeType.value ? activeNodeType.value?.name : '',
		push_ref: pushRef.value,
		workflow_id: workflowsStore.workflowId,
	});
	triggerWaitingWarningEnabled.value = false;
	ndvStore.unsetActiveNodeName();
	ndvStore.resetNDVPushRef();
};

const trackRunChange = (run: number, pane: string) => {
	telemetry.track('User changed ndv run dropdown', {
		push_ref: pushRef.value,
		run_index: run,
		node_type: activeNodeType.value ? activeNodeType.value?.name : '',
		pane,
	});
};

const onRunOutputIndexChange = (run: number) => {
	ndvStore.setOutputRunIndex(run);
	trackRunChange(run, 'output');
};

const onRunInputIndexChange = (run: number) => {
	runInputIndex.value = run;
	if (linked.value) {
		ndvStore.setOutputRunIndex(run);
	}
	trackRunChange(run, 'input');
};

const onOutputTableMounted = (e: { avgRowHeight: number }) => {
	avgOutputRowHeight.value = e.avgRowHeight;
};

const onInputNodeChange = (value: string, index: number) => {
	runInputIndex.value = -1;
	isLinkingEnabled.value = true;
	selectedInput.value = value;

	telemetry.track('User changed ndv input dropdown', {
		node_type: activeNode.value ? activeNode.value.type : '',
		push_ref: pushRef.value,
		workflow_id: workflowsStore.workflowId,
		selection_value: index,
		input_node_type: inputNode.value ? inputNode.value.type : '',
	});
};

const onStopExecution = () => {
	emit('stopExecution');
};

const activateInputPane = () => {
	isInputPaneActive.value = true;
	isOutputPaneActive.value = false;
};

const activateOutputPane = () => {
	isInputPaneActive.value = false;
	isOutputPaneActive.value = true;
};

const onSearch = (search: string) => {
	isPairedItemHoveringEnabled.value = !search;
};

const registerKeyboardListener = () => {
	document.addEventListener('keydown', onKeyDown, true);
};

const unregisterKeyboardListener = () => {
	document.removeEventListener('keydown', onKeyDown, true);
};

const setSelectedInput = (value: string | undefined) => {
	selectedInput.value = value;
};

const handleChangeDisplayMode = (pane: NodePanelType, mode: IRunDataDisplayMode) => {
	ndvStore.setPanelDisplayMode({ pane, mode });
};

//watchers

watch(
	activeNode,
	(node, oldNode) => {
		if (node && !oldNode) {
			registerKeyboardListener();
		} else if (!node) {
			unregisterKeyboardListener();
		}

		if (node && node.name !== oldNode?.name && !isActiveStickyNode.value) {
			runInputIndex.value = -1;
			ndvStore.setOutputRunIndex(-1);
			isLinkingEnabled.value = true;
			selectedInput.value = undefined;
			triggerWaitingWarningEnabled.value = false;
			avgOutputRowHeight.value = 0;
			avgInputRowHeight.value = 0;

			setTimeout(() => ndvStore.setNDVPushRef(), 0);

			if (!activeNodeType.value) {
				return;
			}

			void externalHooks.run('dataDisplay.nodeTypeChanged', {
				nodeSubtitle: nodeHelpers.getNodeSubtitle(node, activeNodeType.value, props.workflowObject),
			});

			setTimeout(() => {
				if (activeNode.value) {
					const outgoingConnections = workflowsStore.outgoingConnectionsByNodeName(
						activeNode.value?.name,
					);

					telemetry.track('User opened node modal', {
						node_id: activeNode.value?.id,
						node_type: activeNodeType.value ? activeNodeType.value?.name : '',
						workflow_id: workflowsStore.workflowId,
						push_ref: pushRef.value,
						is_editable: !hasForeignCredential.value,
						parameters_pane_position: mainPanelPosition.value,
						input_first_connector_runs: maxInputRun.value,
						output_first_connector_runs: maxOutputRun.value,
						selected_view_inputs: isTriggerNode.value ? 'trigger' : inputPanelDisplayMode.value,
						selected_view_outputs: outputPanelDisplayMode.value,
						input_connectors: parentNodes.value.length,
						output_connectors: outgoingConnections?.main?.length,
						input_displayed_run_index: inputRun.value,
						output_displayed_run_index: outputRun.value,
						data_pinning_tooltip_presented: pinDataDiscoveryTooltipVisible.value,
						input_displayed_row_height_avg: avgInputRowHeight.value,
						output_displayed_row_height_avg: avgOutputRowHeight.value,
						source: telemetryContext.ndv_source?.value ?? 'other',
					});
				}
			}, 2000); // wait for RunData to mount and present pindata discovery tooltip
		}
		if (window.top && !isActiveStickyNode.value) {
			window.top.postMessage(JSON.stringify({ command: node ? 'openNDV' : 'closeNDV' }), '*');
		}
	},
	{ immediate: true },
);

watch(maxOutputRun, () => {
	ndvStore.setOutputRunIndex(-1);
});

watch(maxInputRun, () => {
	runInputIndex.value = -1;
});

watch(inputNodeName, (nodeName) => {
	setTimeout(() => {
		ndvStore.setInputNodeName(nodeName);
	}, 0);
});

watch(inputRun, (inputRun) => {
	setTimeout(() => {
		ndvStore.setInputRunIndex(inputRun);
	}, 0);
});

onMounted(() => {
	dataPinningEventBus.on('data-pinning-discovery', setIsTooltipVisible);
	ndvEventBus.on('updateInputNodeName', setSelectedInput);
});

onBeforeUnmount(() => {
	dataPinningEventBus.off('data-pinning-discovery', setIsTooltipVisible);
	ndvEventBus.off('updateInputNodeName', setSelectedInput);
	unregisterKeyboardListener();
});
</script>

<template>
	<ElDialog
		id="ndv"
		:model-value="(!!activeNode || renaming) && !isActiveStickyNode"
		:before-close="close"
		:show-close="false"
		class="data-display-wrapper ndv-wrapper"
		overlay-class="data-display-overlay"
		width="auto"
		:append-to="`#${APP_MODALS_ELEMENT_ID}`"
		data-test-id="ndv"
		:z-index="APP_Z_INDEXES.NDV"
	>
		<N8nTooltip
			placement="bottom-start"
			:visible="showTriggerWaitingWarning"
			:disabled="!showTriggerWaitingWarning"
		>
			<template #content>
				<div :class="$style.triggerWarning">
					{{ i18n.baseText('ndv.backToCanvas.waitingForTriggerWarning') }}
				</div>
			</template>
			<div :class="$style.backToCanvas" data-test-id="back-to-canvas" @click="close">
				<N8nIcon icon="arrow-left" color="text-xlight" size="medium" />
				<N8nText color="text-xlight" size="medium" :bold="true">
					{{ i18n.baseText('ndv.backToCanvas') }}
				</N8nText>
			</div>
		</N8nTooltip>

		<div
			v-if="activeNode"
			ref="container"
			class="data-display"
			data-test-id="ndv-modal"
			tabindex="0"
		>
			<div :class="$style.modalBackground" @click="close"></div>
			<NDVDraggablePanels
				:key="activeNode.name"
				:is-trigger-node="isTriggerNode"
				:hide-input-and-output="activeNodeType === null"
				:position="isTriggerNode && !showTriggerPanel ? 0 : undefined"
				:is-draggable="!isTriggerNode"
				:has-double-width="activeNodeType?.parameterPane === 'wide'"
				:node-type="activeNodeType"
				@switch-selected-node="onSwitchSelectedNode"
				@open-connection-node-creator="onOpenConnectionNodeCreator"
				@close="close"
				@init="onPanelsInit"
				@dragstart="onDragStart"
				@dragend="onDragEnd"
			>
				<template v-if="showTriggerPanel || !isTriggerNode" #input>
					<TriggerPanel
						v-if="showTriggerPanel"
						:node-name="activeNode.name"
						:push-ref="pushRef"
						@execute="onNodeExecute"
						@activate="onWorkflowActivate"
					/>
					<InputPanel
						v-else-if="!isTriggerNode"
						:workflow-object="workflowObject"
						:can-link-runs="canLinkRuns"
						:run-index="inputRun"
						:linked-runs="linked"
						:active-node-name="activeNode.name"
						:current-node-name="inputNodeName"
						:push-ref="pushRef"
						:read-only="readOnly || hasForeignCredential"
						:is-production-execution-preview="isProductionExecutionPreview"
						:search-shortcut="isInputPaneActive ? '/' : undefined"
						:display-mode="inputPanelDisplayMode"
						:is-mapping-onboarded="ndvStore.isMappingOnboarded"
						:focused-mappable-input="ndvStore.focusedMappableInput"
						@activate-pane="activateInputPane"
						@link-run="onLinkRunToInput"
						@unlink-run="() => onUnlinkRun('input')"
						@run-change="onRunInputIndexChange"
						@open-settings="openSettings"
						@change-input-node="onInputNodeChange"
						@execute="onNodeExecute"
						@table-mounted="onInputTableMounted"
						@item-hover="onInputItemHover"
						@search="onSearch"
						@display-mode-change="handleChangeDisplayMode('input', $event)"
					/>
				</template>
				<template #output>
					<OutputPanel
						data-test-id="output-panel"
						:workflow-object="workflowObject"
						:can-link-runs="canLinkRuns"
						:run-index="outputRun"
						:linked-runs="linked"
						:push-ref="pushRef"
						:is-read-only="readOnly || hasForeignCredential"
						:block-u-i="blockUi && isTriggerNode && !isExecutableTriggerNode"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isOutputPaneActive"
						:display-mode="outputPanelDisplayMode"
						@activate-pane="activateOutputPane"
						@link-run="onLinkRunToOutput"
						@unlink-run="() => onUnlinkRun('output')"
						@run-change="onRunOutputIndexChange"
						@open-settings="openSettings"
						@table-mounted="onOutputTableMounted"
						@item-hover="onOutputItemHover"
						@search="onSearch"
						@display-mode-change="handleChangeDisplayMode('output', $event)"
					/>
				</template>
				<template #main>
					<NodeSettings
						:event-bus="settingsEventBus"
						:dragging="isDragging"
						:push-ref="pushRef"
						:foreign-credentials="foreignCredentials"
						:read-only="readOnly"
						:block-u-i="blockUi && showTriggerPanel"
						:executable="!readOnly"
						:input-size="inputSize"
						@value-changed="valueChanged"
						@execute="onNodeExecute"
						@stop-execution="onStopExecution"
						@activate="onWorkflowActivate"
						@switch-selected-node="onSwitchSelectedNode"
						@open-connection-node-creator="onOpenConnectionNodeCreator"
					/>
					<a
						v-if="featureRequestUrl"
						:class="$style.featureRequest"
						target="_blank"
						@click="onFeatureRequestClick"
					>
						<N8nIcon icon="lightbulb" />
						{{ i18n.baseText('ndv.featureRequest') }}
					</a>
				</template>
			</NDVDraggablePanels>
		</div>
	</ElDialog>
</template>

<style lang="scss">
.ndv-wrapper {
	overflow: visible;
	margin-top: 0;
}

.data-display-wrapper {
	height: 100%;
	margin-top: var(--spacing--xl) !important;
	margin-bottom: var(--spacing--xl) !important;
	width: 100%;
	background: none;
	border: none;

	.el-dialog__header {
		padding: 0 !important;
	}

	.el-dialog__body {
		padding: 0 !important;
		height: 100%;
		min-height: 400px;
		overflow: visible;
		border-radius: 8px;
	}
}

.data-display {
	height: 100%;
	width: 100%;
	display: flex;
}
</style>

<style lang="scss" module>
$main-panel-width: 360px;

.modalBackground {
	height: 100%;
	width: 100%;
}

.triggerWarning {
	max-width: 180px;
}

.backToCanvas {
	position: fixed;
	top: var(--spacing--xs);
	left: var(--spacing--lg);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	span {
		color: var(--color-ndv-back-font);
	}

	&:hover {
		cursor: pointer;
	}
}

@media (min-width: $breakpoint-lg) {
	.backToCanvas {
		top: var(--spacing--xs);
		left: var(--spacing--md);
	}
}

.featureRequest {
	position: absolute;
	bottom: var(--spacing--4xs);
	left: calc(100% + var(--spacing--sm));
	color: var(--color-feature-request-font);
	font-size: var(--font-size--2xs);
	white-space: nowrap;

	* {
		margin-right: var(--spacing--3xs);
	}
}
</style>
