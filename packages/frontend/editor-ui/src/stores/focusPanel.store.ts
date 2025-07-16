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

const DEFAULT_PANEL_WIDTH = 528;

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
	const focusPanelHidden = ref(false);
	const focusPanelWidth = computed(() => currentFocusPanelData.value.width ?? DEFAULT_PANEL_WIDTH);
	const _focusedNodeParameters = computed(() => currentFocusPanelData.value.parameters);

	// An unenriched parameter indicates a missing nodeId
	const focusedNodeParameters = computed<Array<RichFocusedNodeParameter | FocusedNodeParameter>>(
		() =>
			_focusedNodeParameters.value.map((x) => {
				const node = workflowsStore.getNodeById(x.nodeId);
				if (!node) return x;

				return {
					...x,
					node,
					value: get(node?.parameters ?? {}, x.parameterPath.replace(/parameters\./, '')),
				} satisfies RichFocusedNodeParameter;
			}),
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

		// Unhide the focus panel if it was hidden
		if (focusPanelHidden.value && focusPanelActive.value) {
			focusPanelHidden.value = false;
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

	function hideFocusPanel(hide: boolean = true) {
		if (focusPanelHidden.value === hide) {
			return;
		}

		focusPanelHidden.value = hide;
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
		lastFocusTimestamp,
		focusPanelHidden,
		focusPanelWidth,
		openWithFocusedNodeParameter,
		isRichParameter,
		hideFocusPanel,
		closeFocusPanel,
		toggleFocusPanel,
		onNewWorkflowSave,
		updateWidth,
	};
});
