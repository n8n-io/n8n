import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import get from 'lodash/get';

import { type NodeParameterValueType, type INode, type INodeProperties } from 'n8n-workflow';
import { useWorkflowsStore } from './workflows.store';

type FocusedNodeParameter = {
	nodeId: string;
	parameter: INodeProperties;
	parameterPath: string;
};

export type RichFocusedNodeParameter = FocusedNodeParameter & {
	node: INode;
	value: NodeParameterValueType;
};

export const useFocusPanelStore = defineStore(STORES.FOCUS_PANEL, () => {
	const workflowsStore = useWorkflowsStore();

	const focusPanelActive = ref(false);
	const _focusedNodeParameters = ref<FocusedNodeParameter[]>([]);

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

	const setFocusedNodeParameter = (nodeParameter: FocusedNodeParameter) => {
		_focusedNodeParameters.value = [
			nodeParameter,
			// Uncomment when tabs are implemented
			// ...focusedNodeParameters.value.filter((p) => p.parameterPath !== nodeParameter.parameterPath),
		];
	};

	const closeFocusPanel = () => {
		focusPanelActive.value = false;
	};

	const toggleFocusPanel = () => {
		focusPanelActive.value = !focusPanelActive.value;
	};

	const reset = () => {
		focusPanelActive.value = false;
		_focusedNodeParameters.value = [];
	};

	function isRichParameter(
		p: RichFocusedNodeParameter | FocusedNodeParameter,
	): p is RichFocusedNodeParameter {
		return 'value' in p && 'node' in p;
	}

	return {
		focusPanelActive,
		focusedNodeParameters,
		setFocusedNodeParameter,
		isRichParameter,
		closeFocusPanel,
		toggleFocusPanel,
		reset,
	};
});
