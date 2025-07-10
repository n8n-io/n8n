import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed } from 'vue';
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

	const focusPanelActive = computed(() => currentFocusPanelData.value.isActive);
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

	const _setOptions = ({
		parameters,
		isActive,
		wid = workflowsStore.workflowId,
		removeEmpty = false,
	}: {
		isActive?: boolean;
		parameters?: FocusedNodeParameter[];
		wid?: string;
		removeEmpty?: boolean;
	}) => {
		const focusPanelDataCurrent = focusPanelData.value;

		if (removeEmpty && PLACEHOLDER_EMPTY_WORKFLOW_ID in focusPanelDataCurrent) {
			delete focusPanelDataCurrent[PLACEHOLDER_EMPTY_WORKFLOW_ID];
		}

		focusPanelStorage.value = JSON.stringify({
			...focusPanelData.value,
			[wid]: {
				isActive: isActive ?? focusPanelActive.value,
				parameters: parameters ?? _focusedNodeParameters.value,
			},
		});
	};

	// When a new workflow is saved, we should update the focus panel data with the new workflow ID
	const onNewWorkflowSave = (wid: string) => {
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
	};

	const openWithFocusedNodeParameter = (nodeParameter: FocusedNodeParameter) => {
		const parameters = [nodeParameter];
		// TODO: uncomment when tabs are implemented
		// ...focusedNodeParameters.value.filter((p) => p.parameterPath !== nodeParameter.parameterPath),

		_setOptions({ parameters, isActive: true });
	};

	const closeFocusPanel = () => {
		_setOptions({ isActive: false });
	};

	const toggleFocusPanel = () => {
		_setOptions({ isActive: !focusPanelActive.value });
	};

	const isRichParameter = (
		p: RichFocusedNodeParameter | FocusedNodeParameter,
	): p is RichFocusedNodeParameter => {
		return 'value' in p && 'node' in p;
	};

	return {
		focusPanelActive,
		focusedNodeParameters,
		openWithFocusedNodeParameter,
		isRichParameter,
		closeFocusPanel,
		toggleFocusPanel,
		onNewWorkflowSave,
	};
});
