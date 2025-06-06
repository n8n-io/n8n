<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { createEventBus } from '@n8n/utils/event-bus';
import type { IRunData, Workflow, NodeConnectionType } from 'n8n-workflow';
import { jsonParse, NodeHelpers, NodeConnectionTypes } from 'n8n-workflow';
import type {
	IRunDataDisplayMode,
	IUpdateInformation,
	MainPanelType,
	NodePanelType,
	ResizeData,
	TargetItem,
	XYPosition,
} from '@/Interface';

import NodeSettings from '@/components/NodeSettings.vue';

import OutputPanel from './OutputPanel.vue';
import InputPanel from './InputPanel.vue';
import TriggerPanel from './TriggerPanel.vue';
import PanelDragButtonV2 from './PanelDragButtonV2.vue';
import {
	EnterpriseEditionFeature,
	EXECUTABLE_TRIGGER_NODE_TYPES,
	MODAL_CONFIRM,
	START_NODE_TYPE,
	STICKY_NODE_TYPE,
	APP_MODALS_ELEMENT_ID,
} from '@/constants';
import { useWorkflowActivate } from '@/composables/useWorkflowActivate';
import type { DataPinningDiscoveryEvent } from '@/event-bus';
import { dataPinningEventBus } from '@/event-bus';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useDeviceSupport } from '@n8n/composables/useDeviceSupport';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useMessage } from '@/composables/useMessage';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { usePinnedData } from '@/composables/usePinnedData';
import { useTelemetry } from '@/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { useStyles } from '@/composables/useStyles';
import { getNodeIconSource } from '@/utils/nodeIcon';
import { useThrottleFn } from '@vueuse/core';
import { useKeybindings } from '@/composables/useKeybindings';

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

const MIN_MAIN_PANEL_WIDTH = 368;
const MIN_PANEL_WIDTH = 260;

const ndvStore = useNDVStore();
const externalHooks = useExternalHooks();
const nodeHelpers = useNodeHelpers();
const { activeNode } = storeToRefs(ndvStore);
const pinnedData = usePinnedData(activeNode);
const workflowActivate = useWorkflowActivate();
const nodeTypesStore = useNodeTypesStore();
const uiStore = useUIStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const deviceSupport = useDeviceSupport();
const telemetry = useTelemetry();
const i18n = useI18n();
const message = useMessage();
const { APP_Z_INDEXES } = useStyles();

const settingsEventBus = createEventBus();
const redrawRequired = ref(false);
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
const containerRect = ref<DOMRect>();
const containerRef = ref<HTMLDivElement>();
const mainPanelRef = ref<HTMLDivElement>();
const panelWidth = ref({ left: 40, main: 20, right: 40 });

// computed
const pushRef = computed(() => ndvStore.pushRef);

const activeNodeType = computed(() => {
	if (activeNode.value) {
		return nodeTypesStore.getNodeType(activeNode.value.type, activeNode.value.typeVersion);
	}
	return null;
});

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

	if (!node || !runData || !runData.hasOwnProperty(node.name)) {
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

const foreignCredentials = computed(() => {
	const credentials = activeNode.value?.credentials;
	const usedCredentials = workflowsStore.usedCredentials;

	const foreignCredentialsArray: string[] = [];
	if (credentials && settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing]) {
		Object.values(credentials).forEach((credential) => {
			if (
				credential.id &&
				usedCredentials[credential.id] &&
				!usedCredentials[credential.id].currentUserHasAccess
			) {
				foreignCredentialsArray.push(credential.id);
			}
		});
	}

	return foreignCredentialsArray;
});

const hasForeignCredential = computed(() => foreignCredentials.value.length > 0);

const inputPanelDisplayMode = computed(() => ndvStore.inputPanelDisplayMode);

const outputPanelDisplayMode = computed(() => ndvStore.outputPanelDisplayMode);

const isDraggable = computed(() => !isTriggerNode.value);

const hasInputPanel = computed(() => !isTriggerNode.value || showTriggerPanel.value);

const supportedResizeDirections = computed(() =>
	hasInputPanel.value ? ['left', 'right'] : ['right'],
);

const containerWidth = computed(() => containerRect.value?.width ?? MIN_MAIN_PANEL_WIDTH);

const mainPanelWidthPixels = computed(() => percentageToPixels(panelWidth.value.main));

const minMainPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_MAIN_PANEL_WIDTH));
const minPanelWidthPercentage = computed(() => pixelsToPercentage(MIN_PANEL_WIDTH));

const currentNodePaneType = computed((): MainPanelType => {
	if (!hasInputPanel.value) return 'inputless';
	if (!isDraggable.value) return 'dragless';
	return activeNodeType.value?.parameterPane ?? 'regular';
});

const defaultPanelSize = computed(() => {
	switch (currentNodePaneType.value) {
		case 'inputless': {
			const main = pixelsToPercentage(420);
			return { left: 0, main, right: 100 - main };
		}
		case 'wide': {
			const main = pixelsToPercentage(640);
			const panels = (100 - main) / 2;
			return { left: panels, main, right: panels };
		}
		case 'dragless':
		case 'unknown':
		case 'regular':
		default: {
			const main = pixelsToPercentage(380);
			const panels = (100 - main) / 2;
			return { left: panels, main, right: panels };
		}
	}
});

//methods

const percentageToPixels = (percentage: number) => {
	return (percentage / 100) * containerWidth.value;
};

const pixelsToPercentage = (pixels: number) => {
	return (pixels / containerWidth.value) * 100;
};

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
	ndvStore.activeNodeName = null;
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
	ndvStore.activeNodeName = null;
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

const onResize = (event: ResizeData) => {
	const newMain = Math.max(minMainPanelWidthPercentage.value, pixelsToPercentage(event.width));
	const initialLeft = panelWidth.value.left;
	const initialMain = panelWidth.value.main;
	const initialRight = panelWidth.value.right;
	const diffMain = newMain - initialMain;

	if (event.direction === 'left') {
		const newLeft = Math.max(minPanelWidthPercentage.value, initialLeft - diffMain);
		if (newLeft + newMain + initialRight <= 100) {
			panelWidth.value.left = newLeft;
			panelWidth.value.main = newMain;
			panelWidth.value.right = 100 - newLeft - newMain;
		}
	} else if (event.direction === 'right') {
		const newRight = Math.max(minPanelWidthPercentage.value, initialRight - diffMain);
		if (initialLeft + newMain + newRight <= 100) {
			panelWidth.value.main = newMain;
			panelWidth.value.right = newRight;
			panelWidth.value.left = 100 - newRight - newMain;
		}
	}
};

const onResizeThrottled = useThrottleFn(onResize, 16, true);

const onDrag = (position: XYPosition) => {
	const newLeft = Math.max(
		minPanelWidthPercentage.value,
		pixelsToPercentage(position[0]) - panelWidth.value.main / 2,
	);
	const newRight = Math.max(minPanelWidthPercentage.value, 100 - newLeft - panelWidth.value.main);

	if (newLeft + panelWidth.value.main + newRight > 100) {
		return;
	}

	panelWidth.value.left = newLeft;
	panelWidth.value.right = newRight;
};

const handleChangeDisplayMode = (pane: NodePanelType, mode: IRunDataDisplayMode) => {
	ndvStore.setPanelDisplayMode({ pane, mode });
};

const onDragThrottled = useThrottleFn(onDrag, 16, true);

const safePanelWidth = ({ left, main, right }: { left: number; main: number; right: number }) => {
	return {
		left: Math.max(hasInputPanel.value ? minPanelWidthPercentage.value : 0, left),
		main: Math.max(minMainPanelWidthPercentage.value, main),
		right: Math.max(minPanelWidthPercentage.value, right),
	};
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

watch(containerRef, (container) => {
	if (container) {
		containerRect.value = container.getBoundingClientRect();
		panelWidth.value = safePanelWidth(defaultPanelSize.value);
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
	<Teleport v-if="activeNode && activeNodeType" :to="`#${APP_MODALS_ELEMENT_ID}`">
		<div :class="$style.backdrop" :style="{ zIndex: APP_Z_INDEXES.NDV }" @click="close"></div>

		<dialog
			ref="dialogRef"
			open
			aria-modal="true"
			data-test-id="ndv-modal"
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
					@close="close"
					@rename="onRename"
				/>
				<main :class="$style.main">
					<div
						v-if="hasInputPanel"
						:class="$style.column"
						:style="{ width: `${panelWidth.left}%` }"
					>
						<TriggerPanel
							v-if="showTriggerPanel"
							:node-name="activeNode.name"
							:push-ref="pushRef"
							@execute="onNodeExecute"
							@activate="onWorkflowActivate"
						/>
						<InputPanel
							v-else-if="!isTriggerNode"
							:workflow="workflowObject"
							:can-link-runs="canLinkRuns"
							:run-index="inputRun"
							:linked-runs="linked"
							:current-node-name="inputNodeName"
							:push-ref="pushRef"
							:read-only="readOnly || hasForeignCredential"
							:is-production-execution-preview="isProductionExecutionPreview"
							:is-pane-active="isInputPaneActive"
							:display-mode="inputPanelDisplayMode"
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
						:width="mainPanelWidthPixels"
						:min-width="MIN_PANEL_WIDTH"
						:supported-directions="supportedResizeDirections"
						:grid-size="8"
						:class="$style.column"
						:style="{ width: `${panelWidth.main}%` }"
						outset
						@resize="onResizeThrottled"
						@resizestart="onDragStart"
						@resizeend="onDragEnd"
					>
						<div ref="mainPanelRef" :class="$style.main">
							<PanelDragButtonV2
								v-if="isDraggable"
								:class="$style.draggable"
								:can-move-left="true"
								:can-move-right="true"
								@drag="onDragThrottled"
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
								@execute="onNodeExecute"
								@stop-execution="onStopExecution"
								@redraw-required="redrawRequired = true"
								@activate="onWorkflowActivate"
								@switch-selected-node="onSwitchSelectedNode"
								@open-connection-node-creator="onOpenConnectionNodeCreator"
							/>
						</div>
					</N8nResizeWrapper>

					<OutputPanel
						data-test-id="output-panel"
						:workflow="workflowObject"
						:can-link-runs="canLinkRuns"
						:run-index="outputRun"
						:linked-runs="linked"
						:push-ref="pushRef"
						:is-read-only="readOnly || hasForeignCredential"
						:block-u-i="blockUi && isTriggerNode && !isExecutableTriggerNode"
						:is-production-execution-preview="isProductionExecutionPreview"
						:is-pane-active="isOutputPaneActive"
						:display-mode="outputPanelDisplayMode"
						:class="$style.column"
						:style="{ width: `${panelWidth.right}%` }"
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
				</main>
			</div>
		</dialog>
	</Teleport>
</template>

<style lang="scss" module>
.backdrop {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: var(--color-ndv-overlay-background);
}

.dialog {
	position: fixed;
	width: calc(100vw - var(--spacing-2xl));
	height: calc(100vh - var(--spacing-2xl));
	top: var(--spacing-l);
	left: var(--spacing-l);
	border: none;
	background: none;
	padding: 0;
	margin: 0;
	display: flex;
}

.container {
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	background: var(--border-color-base);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	color: var(--color-text-base);
}

.main {
	width: 0;
	flex-grow: 1;
	display: flex;
	align-items: stretch;
}

.column {
	+ .column {
		border-left: var(--border-base);
	}

	&:first-child > div {
		border-bottom-left-radius: var(--border-radius-large);
	}

	&:last-child {
		border-bottom-right-radius: var(--border-radius-large);
	}
}

.header {
	border-bottom: var(--border-base);
	border-top-left-radius: var(--border-radius-large);
	border-top-right-radius: var(--border-radius-large);
}

.main {
	display: flex;
	width: 100%;
	height: 100%;
	min-height: 0;
	position: relative;
}

.settings {
	overflow: hidden;
	flex-grow: 1;
}

.draggable {
	--draggable-height: 22px;
	position: absolute;
	top: calc(-1 * var(--draggable-height));
	left: 50%;
	transform: translateX(-50%);
	height: var(--draggable-height);
}
</style>

<style lang="scss">
// Hide notice(.ndv-connection-hint-notice) warning when node has output connection
[data-has-output-connection='true'] .ndv-connection-hint-notice {
	display: none;
}
</style>
