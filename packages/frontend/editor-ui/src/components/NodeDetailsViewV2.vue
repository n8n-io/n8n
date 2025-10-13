<script setup lang="ts">
import type {
	IRunDataDisplayMode,
	IUpdateInformation,
	MainPanelType,
	NodePanelType,
	TargetItem,
} from '@/Interface';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IRunData, NodeConnectionType, Workflow } from 'n8n-workflow';
import { jsonParse, NodeConnectionTypes, NodeHelpers } from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';

import NDVHeader from '@/components/NDVHeader.vue';
import NodeSettings from '@/components/NodeSettings.vue';

import { useExternalHooks } from '@/composables/useExternalHooks';
import { useKeybindings } from '@/composables/useKeybindings';
import { useMessage } from '@/composables/useMessage';
import { useNdvLayout } from '@/composables/useNdvLayout';
import { useNodeDocsUrl } from '@/composables/useNodeDocsUrl';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { usePinnedData } from '@/composables/usePinnedData';
import { useStyles } from '@/composables/useStyles';
import { useTelemetry } from '@/composables/useTelemetry';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import {
	APP_MODALS_ELEMENT_ID,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MODAL_CONFIRM,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
} from '@/constants';
import type { DataPinningDiscoveryEvent } from '@/event-bus';
import { dataPinningEventBus } from '@/event-bus';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { getNodeIconSource } from '@/utils/nodeIcon';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import InputPanel from './InputPanel.vue';
import OutputPanel from './OutputPanel.vue';
import PanelDragButtonV2 from './PanelDragButtonV2.vue';
import TriggerPanel from './TriggerPanel.vue';
import { useTelemetryContext } from '@/composables/useTelemetryContext';

import { N8nResizeWrapper } from '@n8n/design-system';
import NDVFloatingNodes from '@/components/NDVFloatingNodes.vue';
const emit = defineEmits<{
	saveKeyboardShortcut: [event: KeyboardEvent];
	valueChanged: [parameterData: IUpdateInformation];
	switchSelectedNode: [nodeTypeName: string];
	openConnectionNodeCreator: [nodeTypeName: string, connectionType: NodeConnectionType];
	renameNode: [nodeName: string];
	stopExecution: [];
}>();

const props = withDefaults(
	defineProps<{
		workflowObject: Workflow;
		readOnly?: boolean;
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
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const deviceSupport = useDeviceSupport();
const telemetry = useTelemetry();
const telemetryContext = useTelemetryContext({ view_shown: 'ndv' });
const i18n = useI18n();
const message = useMessage();
const { APP_Z_INDEXES } = useStyles();

const settingsEventBus = createEventBus();
const runInputIndex = ref(-1);
const runOutputIndex = ref(-1);
const isLinkingEnabled = ref(true);
const selectedInput = ref<string | undefined>();
const triggerWaitingWarningEnabled = ref(false);
const isDragging = ref(false);
const mainPanelPosition = ref(0);
const pinDataDiscoveryTooltipVisible = ref(false);
const avgInputRowHeight = ref(0);
const avgOutputRowHeight = ref(0);
const isInputPaneActive = ref(false);
const isOutputPaneActive = ref(false);
const isPairedItemHoveringEnabled = ref(true);
const dialogRef = ref<HTMLDialogElement>();
const containerRef = useTemplateRef('containerRef');
const mainPanelRef = useTemplateRef('mainPanelRef');

// computed
const pushRef = computed(() => ndvStore.pushRef);

const activeNodeType = computed(() => {
	if (activeNode.value) {
		return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
	}
	return null;
});

const { docsUrl } = useNodeDocsUrl({ nodeType: activeNodeType });

const workflowRunning = computed(() => uiStore.isActionActive.workflowRunning);

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
		return (
			props.workflowObject
				.getParentNodesByDepth(activeNode.value.name, 1)
				.map(({ name }) => name) || []
		);
	} else {
		return [];
	}
});

const parentNode = computed(() => {
	for (const parentNodeName of parentNodes.value) {
		if (workflowsStore?.pinnedWorkflowData?.[parentNodeName]) {
			return parentNodeName;
		}

		if (workflowRunData.value?.[parentNodeName]) {
			return parentNodeName;
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
	return selectedInput.value || parentNode.value;
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

const inputRun = computed(() => {
	if (isLinkingEnabled.value && maxOutputRun.value === maxInputRun.value) {
		return outputRun.value;
	}
	if (runInputIndex.value === -1) {
		return maxInputRun.value;
	}

	return Math.min(runInputIndex.value, maxInputRun.value);
});

const canLinkRuns = computed(
	() => maxOutputRun.value > 0 && maxOutputRun.value === maxInputRun.value,
);

const linked = computed(() => isLinkingEnabled.value && canLinkRuns.value);

const outputPanelEditMode = computed(() => ndvStore.outputPanelEditMode);

const isWorkflowRunning = computed(() => uiStore.isActionActive.workflowRunning);

const isExecutionWaitingForWebhook = computed(() => workflowsStore.executionWaitingForWebhook);

const blockUi = computed(() => isWorkflowRunning.value || isExecutionWaitingForWebhook.value);

const foreignCredentials = computed(() =>
	nodeHelpers.getForeignCredentialsIfSharingEnabled(activeNode.value?.credentials),
);

const hasForeignCredential = computed(() => foreignCredentials.value.length > 0);

const inputPanelDisplayMode = computed(() => ndvStore.inputPanelDisplayMode);

const outputPanelDisplayMode = computed(() => ndvStore.outputPanelDisplayMode);

const hasInputPanel = computed(() => !isTriggerNode.value || showTriggerPanel.value);

const supportedResizeDirections = computed<Array<'left' | 'right'>>(() =>
	hasInputPanel.value ? ['left', 'right'] : ['right'],
);

const currentNodePaneType = computed((): MainPanelType => {
	if (!hasInputPanel.value) return 'inputless';
	return activeNodeType.value?.parameterPane ?? 'regular';
});

const { containerWidth, onDrag, onResize, onResizeEnd, panelWidthPercentage, panelWidthPixels } =
	useNdvLayout({ container: containerRef, hasInputPanel, paneType: currentNodePaneType });

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

const onDragEnd = () => {
	onResizeEnd();
	isDragging.value = false;
	telemetry.track('User moved parameters pane', {
		// example method for tracking
		window_width: containerWidth.value,
		start_position: mainPanelPosition.value,
		// TODO:
		// end_position: mainPanelDimensions.value.relativeLeft,
		node_type: activeNodeType.value ? activeNodeType.value.name : '',
		push_ref: pushRef.value,
		workflow_id: workflowsStore.workflowId,
	});
};

const onDragStart = () => {
	isDragging.value = true;
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
		if (!activeNode.value || !workflowRunning.value) {
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
	runOutputIndex.value = runInputIndex.value;
	isLinkingEnabled.value = true;
	trackLinking('input');
};

const onSwitchSelectedNode = (nodeTypeName: string) => {
	emit('switchSelectedNode', nodeTypeName);
};

const onOpenConnectionNodeCreator = (nodeTypeName: string, connectionType: NodeConnectionType) => {
	emit('openConnectionNodeCreator', nodeTypeName, connectionType);
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

useKeybindings({ Escape: close });

const trackRunChange = (run: number, pane: string) => {
	telemetry.track('User changed ndv run dropdown', {
		push_ref: pushRef.value,
		run_index: run,
		node_type: activeNodeType.value ? activeNodeType.value?.name : '',
		pane,
	});
};

const onRunOutputIndexChange = (run: number) => {
	runOutputIndex.value = run;
	trackRunChange(run, 'output');
};

const onRunInputIndexChange = (run: number) => {
	runInputIndex.value = run;
	if (linked.value) {
		runOutputIndex.value = run;
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

const onRename = (name: string) => {
	emit('renameNode', name);
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
			dialogRef.value?.show();
		} else if (!node) {
			unregisterKeyboardListener();
		}

		if (node && node.name !== oldNode?.name && !isActiveStickyNode.value) {
			runInputIndex.value = -1;
			runOutputIndex.value = -1;
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
						selected_view_inputs: isTriggerNode.value ? 'trigger' : ndvStore.inputPanelDisplayMode,
						selected_view_outputs: ndvStore.outputPanelDisplayMode,
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
	runOutputIndex.value = -1;
});

watch(maxInputRun, () => {
	runInputIndex.value = -1;
});

watch(inputNodeName, (nodeName) => {
	setTimeout(() => {
		ndvStore.setInputNodeName(nodeName);
	}, 0);
});

watch(inputRun, (run) => {
	setTimeout(() => {
		ndvStore.setInputRunIndex(run);
	}, 0);
});

watch(mainPanelRef, (mainPanel) => {
	if (!mainPanel) return;

	// Based on https://github.com/unovue/reka-ui/blob/v2/packages/core/src/FocusScope/utils.ts
	// Should use FocusScope here from Reka UI when we have it
	function getTabbableCandidates(element: HTMLElement) {
		const nodes: HTMLElement[] = [];
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, {
			acceptNode: (node: HTMLInputElement) => {
				const isHiddenInput = node.tagName === 'INPUT' && node.type === 'hidden';
				if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
				// `.tabIndex` is not the same as the `tabindex` attribute. It works on the
				// runtime's understanding of tabbability, so this automatically accounts
				// for any kind of element that could be tabbed to.
				return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
			},
		});
		while (walker.nextNode()) nodes.push(walker.currentNode as HTMLElement);
		// we do not take into account the order of nodes with positive `tabIndex` as it
		// hinders accessibility to have tab order different from visual order.
		return nodes;
	}

	const firstFocusableElement = getTabbableCandidates(mainPanel)[0];
	if (firstFocusableElement) {
		firstFocusableElement.focus();
	}
});

onMounted(() => {
	dialogRef.value?.show();
	dataPinningEventBus.on('data-pinning-discovery', setIsTooltipVisible);
});

onBeforeUnmount(() => {
	dataPinningEventBus.off('data-pinning-discovery', setIsTooltipVisible);
	unregisterKeyboardListener();
});
</script>

<template>
	<Teleport
		v-if="activeNode && activeNodeType && !isActiveStickyNode"
		:to="`#${APP_MODALS_ELEMENT_ID}`"
	>
		<div :class="$style.backdrop" :style="{ zIndex: APP_Z_INDEXES.NDV }" @click="close"></div>

		<dialog
			ref="dialogRef"
			open
			aria-modal="true"
			data-test-id="ndv"
			:class="$style.dialog"
			:style="{ zIndex: APP_Z_INDEXES.NDV }"
		>
			<NDVFloatingNodes :root-node="activeNode" @switch-selected-node="onSwitchSelectedNode" />
			<div ref="containerRef" :class="$style.container">
				<NDVHeader
					:class="$style.header"
					:node-name="activeNode.name"
					:node-type-name="activeNodeType.defaults.name ?? activeNodeType.displayName"
					:icon="getNodeIconSource(activeNodeType)"
					:docs-url="docsUrl"
					@close="close"
					@rename="onRename"
				/>
				<main :class="$style.main">
					<div
						v-if="hasInputPanel"
						:class="[$style.column, $style.dataColumn]"
						:style="{ width: `${panelWidthPercentage.left}%` }"
					>
						<TriggerPanel
							v-if="showTriggerPanel"
							:node-name="activeNode.name"
							:push-ref="pushRef"
							:class="$style.input"
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
							:class="$style.input"
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
					</div>

					<N8nResizeWrapper
						:width="panelWidthPixels.main"
						:min-width="260"
						:supported-directions="supportedResizeDirections"
						:grid-size="8"
						:class="$style.column"
						:style="{ width: `${panelWidthPercentage.main}%` }"
						outset
						@resize="onResize"
						@resizestart="onDragStart"
						@resizeend="onDragEnd"
					>
						<div ref="mainPanelRef" :class="$style.main">
							<PanelDragButtonV2
								v-if="hasInputPanel"
								:class="$style.draggable"
								:can-move-left="true"
								:can-move-right="true"
								@drag="onDrag"
								@dragstart="onDragStart"
								@dragend="onDragEnd"
							/>
							<NodeSettings
								:event-bus="settingsEventBus"
								:dragging="isDragging"
								:push-ref="pushRef"
								:node-type="activeNodeType"
								:foreign-credentials="foreignCredentials"
								:read-only="readOnly"
								:block-u-i="blockUi && showTriggerPanel"
								:executable="!readOnly"
								:input-size="inputSize"
								:class="$style.settings"
								is-ndv-v2
								@execute="onNodeExecute"
								@stop-execution="onStopExecution"
								@activate="onWorkflowActivate"
								@switch-selected-node="onSwitchSelectedNode"
								@open-connection-node-creator="onOpenConnectionNodeCreator"
							/>
						</div>
					</N8nResizeWrapper>

					<div
						:class="[$style.column, $style.dataColumn]"
						:style="{ width: `${panelWidthPercentage.right}%` }"
					>
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
							:class="$style.output"
							@activate-pane="activateOutputPane"
							@link-run="onLinkRunToOutput"
							@unlink-run="() => onUnlinkRun('output')"
							@run-change="onRunOutputIndexChange"
							@open-settings="openSettings"
							@table-mounted="onOutputTableMounted"
							@item-hover="onOutputItemHover"
							@search="onSearch"
							@execute="onNodeExecute"
							@display-mode-change="handleChangeDisplayMode('output', $event)"
						/>
					</div>
				</main>
			</div>
		</dialog>
	</Teleport>
</template>

<style lang="scss" module>
.backdrop {
	position: absolute;
	z-index: var(--z-index-ndv);
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--color-dialog-overlay-background-dark);
}

.dialog {
	position: absolute;
	z-index: var(--z-index-ndv);
	width: calc(100% - var(--spacing--2xl));
	height: calc(100% - var(--spacing--2xl));
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	border: none;
	background: none;
	padding: 0;
	margin: 0;
	display: flex;
	outline: none;
}

.container {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	background: var(--border-color);
	border: var(--border);
	border-radius: var(--radius--lg);
	color: var(--color--text);
	min-width: 0;
}

.main {
	width: 100%;
	flex-grow: 1;
	display: flex;
	align-items: stretch;
	height: 100%;
	min-height: 0;
	position: relative;
}

.column {
	min-width: 0;

	+ .column {
		border-left: var(--border);
	}

	&:first-child > div {
		border-bottom-left-radius: var(--radius--lg);
	}

	&:last-child {
		border-bottom-right-radius: var(--radius--lg);
	}
}

.input,
.output {
	min-width: 280px;
}

.dataColumn {
	overflow-x: auto;
}

.header {
	border-bottom: var(--border);
	border-top-left-radius: var(--radius--lg);
	border-top-right-radius: var(--radius--lg);
}

.settings {
	overflow: hidden;
	flex-grow: 1;
}

.draggable {
	--draggable-height: 18px;
	position: absolute;
	top: calc(-1 * var(--draggable-height));
	left: 50%;
	transform: translateX(-50%);
	height: var(--draggable-height);
}
</style>
