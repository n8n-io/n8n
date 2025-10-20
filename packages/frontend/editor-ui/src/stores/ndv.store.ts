import { useLocalStorage } from '@vueuse/core';
import type {
	Draggable,
	InputPanel,
	IRunDataDisplayMode,
	MainPanelDimensions,
	MainPanelType,
	NodePanelType,
	OutputPanel,
	TargetItem,
} from '@/Interface';
import { useStorage } from '@/composables/useStorage';
import {
	LOCAL_STORAGE_AUTOCOMPLETE_IS_ONBOARDED,
	LOCAL_STORAGE_MAPPING_IS_ONBOARDED,
	LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE,
	LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE,
	LOCAL_STORAGE_TABLE_HOVER_IS_ONBOARDED,
} from '@/constants';
import { STORES } from '@n8n/stores';
import type { INodeIssues } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { v4 as uuid } from 'uuid';
import { useWorkflowsStore } from './workflows.store';
import { computed, ref } from 'vue';
import type { TelemetryNdvSource } from '@/types/telemetry';
import { injectWorkflowState } from '@/composables/useWorkflowState';

const DEFAULT_MAIN_PANEL_DIMENSIONS = {
	relativeLeft: 1,
	relativeRight: 1,
	relativeWidth: 1,
};

export const useNDVStore = defineStore(STORES.NDV, () => {
	const localStorageMappingIsOnboarded = useStorage(LOCAL_STORAGE_MAPPING_IS_ONBOARDED);
	const localStorageTableHoverIsOnboarded = useStorage(LOCAL_STORAGE_TABLE_HOVER_IS_ONBOARDED);
	const localStorageAutoCompleteIsOnboarded = useStorage(LOCAL_STORAGE_AUTOCOMPLETE_IS_ONBOARDED);

	const activeNodeName = ref<string | null>(null);
	const mainPanelDimensions = ref<MainPanelDimensions>({
		unknown: { ...DEFAULT_MAIN_PANEL_DIMENSIONS },
		regular: { ...DEFAULT_MAIN_PANEL_DIMENSIONS },
		dragless: { ...DEFAULT_MAIN_PANEL_DIMENSIONS },
		inputless: { ...DEFAULT_MAIN_PANEL_DIMENSIONS },
		wide: { ...DEFAULT_MAIN_PANEL_DIMENSIONS },
	});
	const pushRef = ref('');
	const input = ref<InputPanel>({
		nodeName: undefined,
		run: undefined,
		branch: undefined,
		data: {
			isEmpty: true,
		},
	});
	const inputPanelDisplayMode = useLocalStorage<IRunDataDisplayMode>(
		LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE,
		'schema',
	);
	const output = ref<OutputPanel>({
		run: undefined,
		branch: undefined,
		data: {
			isEmpty: true,
		},
		editMode: {
			enabled: false,
			value: '',
		},
	});
	const outputPanelDisplayMode = useLocalStorage<IRunDataDisplayMode>(
		LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE,
		'table',
	);
	const focusedMappableInput = ref('');
	const focusedInputPath = ref('');
	const mappingTelemetry = ref<Record<string, string | number | boolean>>({});
	const hoveringItem = ref<null | TargetItem>(null);
	const expressionOutputItemIndex = ref(0);
	const draggable = ref<Draggable>({
		isDragging: false,
		type: '',
		data: '',
		dimensions: null,
		activeTarget: null,
	});
	const isMappingOnboarded = ref(localStorageMappingIsOnboarded.value === 'true');
	const isTableHoverOnboarded = ref(localStorageTableHoverIsOnboarded.value === 'true');

	const isAutocompleteOnboarded = ref(localStorageAutoCompleteIsOnboarded.value === 'true');

	const highlightDraggables = ref(false);
	const lastSetActiveNodeSource = ref<TelemetryNdvSource>();

	const workflowsStore = useWorkflowsStore();
	const workflowState = injectWorkflowState();

	const activeNode = computed(() => {
		return workflowsStore.getNodeByName(activeNodeName.value || '');
	});

	const ndvInputData = computed(() => {
		const executionData = workflowsStore.getWorkflowExecution;
		const inputNodeName: string | undefined = input.value.nodeName;
		const inputRunIndex: number = input.value.run ?? 0;
		const inputBranchIndex: number = input.value.branch ?? 0;

		if (
			!executionData ||
			!inputNodeName ||
			inputRunIndex === undefined ||
			inputBranchIndex === undefined
		) {
			return [];
		}

		return (
			executionData.data?.resultData?.runData?.[inputNodeName]?.[inputRunIndex]?.data?.main?.[
				inputBranchIndex
			] ?? []
		);
	});

	const ndvInputNodeName = computed(() => {
		return input.value.nodeName;
	});

	const ndvInputDataWithPinnedData = computed(() => {
		const data = ndvInputData.value;
		return ndvInputNodeName.value
			? (workflowsStore.pinDataByNodeName(ndvInputNodeName.value) ?? data)
			: data;
	});

	const hasInputData = computed(() => {
		return ndvInputDataWithPinnedData.value.length > 0;
	});

	const isDraggableDragging = computed(() => draggable.value.isDragging);

	const draggableType = computed(() => draggable.value.type);

	const draggableData = computed(() => draggable.value.data);

	const canDraggableDrop = computed(() => draggable.value.activeTarget !== null);

	const outputPanelEditMode = computed(() => output.value.editMode);

	const draggableStickyPos = computed(() => draggable.value.activeTarget?.stickyPosition ?? null);

	const ndvNodeInputNumber = computed(() => {
		const returnData: { [nodeName: string]: number[] } = {};
		const activeNodeConections = (
			workflowsStore.connectionsByDestinationNode[activeNode.value?.name || ''] ?? {}
		).main;

		if (!activeNodeConections || activeNodeConections.length < 2) return returnData;

		for (const [index, connection] of activeNodeConections.entries()) {
			for (const node of connection ?? []) {
				if (!returnData[node.node]) {
					returnData[node.node] = [];
				}
				returnData[node.node].push(index + 1);
			}
		}

		return returnData;
	});

	const ndvInputRunIndex = computed(() => input.value.run);

	const ndvInputBranchIndex = computed(() => input.value.branch);

	const isInputPanelEmpty = computed(() => input.value.data.isEmpty);

	const isOutputPanelEmpty = computed(() => output.value.data.isEmpty);

	const isInputParentOfActiveNode = computed(() => {
		const inputNodeName = ndvInputNodeName.value;
		if (!activeNode.value || !inputNodeName) {
			return false;
		}
		const parentNodes = workflowsStore.workflowObject.getParentNodes(
			activeNode.value.name,
			NodeConnectionTypes.Main,
			1,
		);
		return parentNodes.includes(inputNodeName);
	});

	const getHoveringItem = computed(() => {
		if (isInputParentOfActiveNode.value) {
			return hoveringItem.value;
		}

		return null;
	});

	const expressionTargetItem = computed(() => {
		if (getHoveringItem.value) {
			return getHoveringItem.value;
		}

		if (expressionOutputItemIndex.value && ndvInputNodeName.value) {
			return {
				nodeName: ndvInputNodeName.value,
				runIndex: ndvInputRunIndex.value ?? 0,
				outputIndex: ndvInputBranchIndex.value ?? 0,
				itemIndex: expressionOutputItemIndex.value,
			};
		}

		return null;
	});

	const isNDVOpen = computed(() => activeNodeName.value !== null);

	const unsetActiveNodeName = (): void => {
		activeNodeName.value = null;
		lastSetActiveNodeSource.value = undefined;
	};

	const setActiveNodeName = (nodeName: string, source: TelemetryNdvSource): void => {
		if (activeNodeName.value === nodeName) {
			return;
		}

		activeNodeName.value = nodeName;
		lastSetActiveNodeSource.value = source;
	};

	const setInputNodeName = (nodeName: string | undefined): void => {
		input.value.nodeName = nodeName;
	};

	const setInputRunIndex = (run?: number): void => {
		input.value.run = run;
	};

	const setOutputRunIndex = (run?: number): void => {
		output.value.run = run;
	};

	const setMainPanelDimensions = (params: {
		panelType: MainPanelType;
		dimensions: { relativeLeft?: number; relativeRight?: number; relativeWidth?: number };
	}): void => {
		mainPanelDimensions.value[params.panelType] = {
			...mainPanelDimensions.value[params.panelType],
			...params.dimensions,
		};
	};

	const setNDVPushRef = (): void => {
		pushRef.value = `ndv-${uuid()}`;
	};

	const resetNDVPushRef = (): void => {
		pushRef.value = '';
	};

	const setPanelDisplayMode = (params: {
		pane: NodePanelType;
		mode: IRunDataDisplayMode;
	}): void => {
		if (params.pane === 'input') {
			inputPanelDisplayMode.value = params.mode;
		} else {
			outputPanelDisplayMode.value = params.mode;
		}
	};

	const setOutputPanelEditModeEnabled = (isEnabled: boolean): void => {
		output.value.editMode.enabled = isEnabled;
	};

	const setOutputPanelEditModeValue = (payload: string): void => {
		output.value.editMode.value = payload;
	};

	const setMappableNDVInputFocus = (paramName: string): void => {
		focusedMappableInput.value = paramName;
	};

	const draggableStartDragging = ({
		type,
		data,
		dimensions,
	}: {
		type: string;
		data: string;
		dimensions: DOMRect | null;
	}): void => {
		draggable.value = {
			isDragging: true,
			type,
			data,
			dimensions,
			activeTarget: null,
		};
	};

	const draggableStopDragging = (): void => {
		draggable.value = {
			isDragging: false,
			type: '',
			data: '',
			dimensions: null,
			activeTarget: null,
		};
	};

	const setDraggableTarget = (target: Draggable['activeTarget']): void => {
		draggable.value.activeTarget = target;
	};

	const setMappingTelemetry = (telemetry: { [key: string]: string | number | boolean }): void => {
		mappingTelemetry.value = { ...mappingTelemetry.value, ...telemetry };
	};

	const resetMappingTelemetry = (): void => {
		mappingTelemetry.value = {};
	};

	const setHoveringItem = (item: TargetItem | null): void => {
		if (item) setTableHoverOnboarded();
		hoveringItem.value = item;
	};

	const setNDVBranchIndex = (e: { pane: NodePanelType; branchIndex: number }): void => {
		if (e.pane === 'input') {
			input.value.branch = e.branchIndex;
		} else {
			output.value.branch = e.branchIndex;
		}
	};

	const setNDVPanelDataIsEmpty = (params: { panel: NodePanelType; isEmpty: boolean }): void => {
		if (params.panel === 'input') {
			input.value.data.isEmpty = params.isEmpty;
		} else {
			output.value.data.isEmpty = params.isEmpty;
		}
	};

	const setMappingOnboarded = () => {
		isMappingOnboarded.value = true;
		localStorageMappingIsOnboarded.value = 'true';
	};

	const setTableHoverOnboarded = () => {
		isTableHoverOnboarded.value = true;
		localStorageTableHoverIsOnboarded.value = 'true';
	};

	const setAutocompleteOnboarded = () => {
		isAutocompleteOnboarded.value = true;
		localStorageAutoCompleteIsOnboarded.value = 'true';
	};

	const setHighlightDraggables = (highlight: boolean) => {
		highlightDraggables.value = highlight;
	};

	const updateNodeParameterIssues = (issues: INodeIssues): void => {
		const activeNode = workflowsStore.getNodeByName(activeNodeName.value || '');

		if (activeNode) {
			const nodeIndex = workflowsStore.workflow.nodes.findIndex((node) => {
				return node.name === activeNode.name;
			});

			workflowState.updateNodeAtIndex(nodeIndex, {
				issues: {
					...activeNode.issues,
					...issues,
				},
			});
		}
	};

	const setFocusedInputPath = (path: string) => {
		focusedInputPath.value = path;
	};

	return {
		activeNode,
		ndvInputData,
		ndvInputNodeName,
		ndvInputDataWithPinnedData,
		hasInputData,
		inputPanelDisplayMode,
		outputPanelDisplayMode,
		isDraggableDragging,
		draggableType,
		draggableData,
		canDraggableDrop,
		outputPanelEditMode,
		draggableStickyPos,
		ndvNodeInputNumber,
		ndvInputRunIndex,
		ndvInputBranchIndex,
		isInputParentOfActiveNode,
		getHoveringItem,
		expressionTargetItem,
		isNDVOpen,
		isInputPanelEmpty,
		isOutputPanelEmpty,
		focusedMappableInput,
		isMappingOnboarded,
		pushRef,
		activeNodeName,
		focusedInputPath,
		input,
		output,
		hoveringItem,
		highlightDraggables,
		mappingTelemetry,
		draggable,
		isAutocompleteOnboarded,
		expressionOutputItemIndex,
		isTableHoverOnboarded,
		mainPanelDimensions,
		lastSetActiveNodeSource,
		setActiveNodeName,
		unsetActiveNodeName,
		setInputNodeName,
		setInputRunIndex,
		setOutputRunIndex,
		setMainPanelDimensions,
		setNDVPushRef,
		resetNDVPushRef,
		setPanelDisplayMode,
		setOutputPanelEditModeEnabled,
		setOutputPanelEditModeValue,
		setMappableNDVInputFocus,
		draggableStartDragging,
		draggableStopDragging,
		setDraggableTarget,
		setMappingTelemetry,
		resetMappingTelemetry,
		setHoveringItem,
		setNDVBranchIndex,
		setNDVPanelDataIsEmpty,
		setMappingOnboarded,
		setTableHoverOnboarded,
		setAutocompleteOnboarded,
		setHighlightDraggables,
		updateNodeParameterIssues,
		setFocusedInputPath,
	};
});
