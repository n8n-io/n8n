import { STORES } from '@n8n/stores';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { INodeProperties } from 'n8n-workflow';

type FocusedNodeParameter = {
	nodeName: string;
	parameter: INodeProperties;
	parameterPath: string;
	value: string;
};

export const useFocusPanelStore = defineStore(STORES.FOCUS_PANEL, () => {
	const focusPanelActive = ref(false);
	const focusedNodeParameters = ref<FocusedNodeParameter[]>([]);

	const setFocusedNodeParameter = (nodeParameter: FocusedNodeParameter) => {
		focusedNodeParameters.value = [
			nodeParameter,
			// Uncomment when tabs are implemented
			// ...focusedNodeParameters.value.filter((p) => p.parameterPath !== nodeParameter.parameterPath),
		];
	};

	const closeFocusPanel = () => {
		focusPanelActive.value = false;
	};

	return {
		focusPanelActive,
		focusedNodeParameters,
		setFocusedNodeParameter,
		closeFocusPanel,
	};
});
