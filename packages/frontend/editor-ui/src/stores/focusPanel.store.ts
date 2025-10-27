import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import get from 'lodash/get';

import {
	type NodeParameterValueType,
	type INode,
	type INodeProperties,
	jsonParse,
} from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';
import { LOCAL_STORAGE_FOCUS_PANEL, PLACEHOLDER_EMPTY_WORKFLOW_ID } from '@/constants';
import { useStorage } from '@/composables/useStorage';
import { watchOnce } from '@vueuse/core';
import { isFromAIOverrideValue } from '@/utils/fromAIOverrideUtils';

// matches NodeCreator to ensure they fully overlap by default when both are open
const DEFAULT_PANEL_WIDTH = 500;

type FocusedNodeParameter = {
	nodeId: string;
	parameter: INodeProperties;
	parameterPath: string;
};

export type RichFocusedNodeParameter = FocusedNodeParameter & {
	node: INode;
	value: NodeParameterValueType;
};

type FocusPanelData = {
	isActive: boolean;
	parameters: FocusedNodeParameter[];
	width?: number;
};

type FocusPanelDataByWid = Record<string, FocusPanelData>;

const DEFAULT_FOCUS_PANEL_DATA: FocusPanelData = { isActive: false, parameters: [] };

export const useFocusPanelStore = defineStore(STORES.FOCUS_PANEL, () => {
	const workflowsStore = useWorkflowsStore();
	const focusPanelStorage = useStorage(LOCAL_STORAGE_FOCUS_PANEL);

	const focusPanelData = computed((): FocusPanelDataByWid => {
		const defaultValue: FocusPanelDataByWid = {
			[workflowsStore.workflowId]: DEFAULT_FOCUS_PANEL_DATA,
		};

		return focusPanelStorage.value
			? jsonParse(focusPanelStorage.value, { fallbackValue: defaultValue })
			: defaultValue;
	});

	const currentFocusPanelData = computed(
		(): FocusPanelData =>
			focusPanelData.value[workflowsStore.workflowId] ?? DEFAULT_FOCUS_PANEL_DATA,
	);

	const lastFocusTimestamp = ref(0);

	const focusPanelActive = computed(() => currentFocusPanelData.value.isActive);
	const focusPanelWidth = computed(() => currentFocusPanelData.value.width ?? DEFAULT_PANEL_WIDTH);
	const _focusedNodeParameters = computed(() => currentFocusPanelData.value.parameters);

	// An unenriched parameter indicates a missing nodeId or an otherwise unfocusable parameter
	const focusedNodeParameters = computed<Array<RichFocusedNodeParameter | FocusedNodeParameter>>(
		() =>
			_focusedNodeParameters.value.map((x) => {
				const node = workflowsStore.getNodeById(x.nodeId);
				if (!node) return x;

				const value = get(node?.parameters ?? {}, x.parameterPath.replace(/parameters\./, ''));

				// For overridden parameters we pretend they are gone
				// To avoid situations where we show the raw value of a newly overridden, previously focused parameter
				if (typeof value === 'string' && isFromAIOverrideValue(value)) {
					return x;
				}

				return {
					...x,
					node,
					value,
				} satisfies RichFocusedNodeParameter;
			}),
	);

	const resolvedParameter = computed(() =>
		focusedNodeParameters.value[0] && isRichParameter(focusedNodeParameters.value[0])
			? focusedNodeParameters.value[0]
			: undefined,
	);

	function _setOptions({
		parameters,
		isActive,
		wid = workflowsStore.workflowId,
		width = undefined,
		removeEmpty = false,
	}: {
		isActive?: boolean;
		parameters?: FocusedNodeParameter[];
		wid?: string;
		width?: number;
		removeEmpty?: boolean;
	}) {
		const focusPanelDataCurrent = focusPanelData.value;

		if (removeEmpty && PLACEHOLDER_EMPTY_WORKFLOW_ID in focusPanelDataCurrent) {
			delete focusPanelDataCurrent[PLACEHOLDER_EMPTY_WORKFLOW_ID];
		}

		focusPanelStorage.value = JSON.stringify({
			...focusPanelData.value,
			[wid]: {
				isActive: isActive ?? focusPanelActive.value,
				parameters: parameters ?? _focusedNodeParameters.value,
				width: width ?? focusPanelWidth.value,
			},
		});

		if (isActive) {
			lastFocusTimestamp.value = Date.now();
		}
	}

	// When a new workflow is saved, we should update the focus panel data with the new workflow ID
	function onNewWorkflowSave(wid: string) {
		if (!currentFocusPanelData.value || !(PLACEHOLDER_EMPTY_WORKFLOW_ID in focusPanelData.value)) {
			return;
		}

		const latestWorkflowData = focusPanelData.value[PLACEHOLDER_EMPTY_WORKFLOW_ID];
		_setOptions({
			wid,
			parameters: latestWorkflowData.parameters,
			isActive: latestWorkflowData.isActive,
			removeEmpty: true,
		});
	}

	function openWithFocusedNodeParameter(nodeParameter: FocusedNodeParameter) {
		const parameters = [nodeParameter];
		// TODO: uncomment when tabs are implemented
		// ...focusedNodeParameters.value.filter((p) => p.parameterPath !== nodeParameter.parameterPath),

		_setOptions({ parameters, isActive: true });
	}

	function closeFocusPanel() {
		_setOptions({ isActive: false });
	}

	function unsetParameters() {
		_setOptions({ parameters: [] });
	}

	function toggleFocusPanel() {
		_setOptions({ isActive: !focusPanelActive.value });
	}

	function updateWidth(width: number) {
		_setOptions({ width });
	}

	function isRichParameter(
		p: RichFocusedNodeParameter | FocusedNodeParameter,
	): p is RichFocusedNodeParameter {
		return 'value' in p && 'node' in p;
	}

	const focusedNodeParametersInTelemetryFormat = computed<
		Array<{ parameterPath: string; nodeType: string; nodeId: string }>
	>(() =>
		focusedNodeParameters.value.map((x) => ({
			parameterPath: x.parameterPath,
			nodeType: isRichParameter(x) ? x.node.type : 'unresolved',
			nodeId: x.nodeId,
		})),
	);

	// Ensure lastFocusTimestamp is set on initial load if panel is already active (e.g. after reload)
	watchOnce(
		() => currentFocusPanelData.value,
		(value) => {
			if (value.isActive && value.parameters.length > 0) {
				lastFocusTimestamp.value = Date.now();
			}
		},
	);

	return {
		focusPanelActive,
		focusedNodeParameters,
		focusedNodeParametersInTelemetryFormat,
		lastFocusTimestamp,
		focusPanelWidth,
		resolvedParameter,
		openWithFocusedNodeParameter,
		isRichParameter,
		closeFocusPanel,
		toggleFocusPanel,
		onNewWorkflowSave,
		updateWidth,
		unsetParameters,
	};
});
