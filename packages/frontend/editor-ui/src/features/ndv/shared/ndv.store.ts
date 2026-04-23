import { useLocalStorage } from '@vueuse/core';
import type { Draggable, IRunDataDisplayMode, TargetItem } from '@/Interface';
import type {
	NodePanelType,
	InputPanel,
	OutputPanel,
	MainPanelDimensions,
	MainPanelType,
} from './ndv.types';
import { useStorage } from '@/app/composables/useStorage';
import {
	LOCAL_STORAGE_AUTOCOMPLETE_IS_ONBOARDED,
	LOCAL_STORAGE_MAPPING_IS_ONBOARDED,
	LOCAL_STORAGE_NDV_INPUT_PANEL_DISPLAY_MODE,
	LOCAL_STORAGE_NDV_OUTPUT_PANEL_DISPLAY_MODE,
	LOCAL_STORAGE_TABLE_HOVER_IS_ONBOARDED,
} from './ndv.constants';
import { STORES } from '@n8n/stores';
import type { INodeIssues } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { v4 as uuid } from 'uuid';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
	type WorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';
import { computed, hasInjectionContext, ref, shallowRef } from 'vue';
import type { TelemetryNdvSource } from '@/app/types/telemetry';
import { NDVStoreKey } from '@/app/constants/injectionKeys';
import { injectStrict } from '@/app/utils/injectStrict';

const DEFAULT_MAIN_PANEL_DIMENSIONS = {
	relativeLeft: 1,
	relativeRight: 1,
	relativeWidth: 1,
};

// Pinia internal type - _s is the store registry Map
type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export type NDVStoreId = WorkflowDocumentId;

/**
 * Gets the store ID for an NDV store.
 */
export function getNDVStoreId(id: NDVStoreId) {
	return `${STORES.NDV}/${id}`;
}

/**
 * Creates an NDV store for a specific workflow document ID.
 *
 * Note: We use a factory function rather than a module-level cache because
 * Pinia store instances must be tied to the active Pinia instance. A module-level
 * cache would cause test isolation issues where stale store references persist
 * across test runs with different Pinia instances.
 *
 * Pinia internally handles store deduplication per-instance via the store ID.
 */
export function useNDVStore(id: NDVStoreId) {
	return defineStore(getNDVStoreId(id), () => {
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
		const workflowDocumentStore = useWorkflowDocumentStore(id);

		const activeNode = computed(() => {
			return workflowDocumentStore.getNodeByName(activeNodeName.value || '') ?? null;
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
				? (workflowDocumentStore.pinData?.[ndvInputNodeName.value] ?? data)
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
				workflowDocumentStore.connectionsByDestinationNode[activeNode.value?.name || ''] ?? {}
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
			const parentNodes = workflowDocumentStore.getParentNodes(
				activeNode.value.name,
				NodeConnectionTypes.Main,
				1,
			);
			return parentNodes?.includes(inputNodeName) ?? false;
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
			const node = workflowDocumentStore.getNodeByName(activeNodeName.value || '');

			if (node?.id) {
				workflowDocumentStore.updateNodeById(node.id, {
					issues: {
						...node.issues,
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
	})();
}

/**
 * Disposes an NDV store by ID.
 * Call this when a workflow document is unloaded (e.g., when navigating away from NodeView).
 *
 * This removes the store from Pinia's internal registry, freeing memory and preventing
 * stale stores from accumulating over time.
 */
export function disposeNDVStore(id: NDVStoreId) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getNDVStoreId(id);

	if (pinia.state.value[storeId]) {
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		delete pinia.state.value[storeId];
	}
}

/**
 * Injects the NDV store from the current component tree.
 *
 * Always returns a valid store instance: uses the provided store when mounted under
 * WorkflowLayout/DemoLayout, and falls back to a store keyed by the current workflow
 * ID (or a default ID) otherwise — keeping callers free of null checks.
 */
export function injectNDVStore(): ReturnType<typeof useNDVStore> {
	const workflowsStore = useWorkflowsStore();
	const fallbackId = createWorkflowDocumentId(workflowsStore.workflowId || '__default__');
	const fallbackStore = useNDVStore(fallbackId);

	if (!hasInjectionContext()) return fallbackStore;

	const storeRef = injectStrict(NDVStoreKey, shallowRef(fallbackStore));
	return storeRef.value ?? fallbackStore;
}
