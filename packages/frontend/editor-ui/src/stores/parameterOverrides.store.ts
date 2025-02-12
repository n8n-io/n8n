import { type INodeParameters, type NodeParameterValueType } from "n8n-workflow";
import { defineStore } from "pinia";
import { ref } from "vue";

interface IParameterOverridesStoreState {
	[keys: string]: INodeParameters;

}

export const useParameterOverridesStore = defineStore('parameterOverrides', () => {
	// State
	const parameterOverrides = ref<IParameterOverridesStoreState>({});

	// Getters
	const getParameterOverrides = (nodeName: string) => parameterOverrides.value[nodeName] || {};
	const getParameterOverride = (nodeName: string, paramName: string) => parameterOverrides.value[nodeName]?.[paramName] || undefined;

	// Actions
	const addParameterOverride = (nodeName: string, paramName: string, paramValues: NodeParameterValueType) => {
		parameterOverrides.value[nodeName] = {
			...parameterOverrides.value[nodeName],
			[paramName]: paramValues,
		};
		return parameterOverrides.value[nodeName];
	};
	const addParameterOverrides = (nodeName: string, params: INodeParameters) => {
		parameterOverrides.value[nodeName] = {
			...parameterOverrides.value[nodeName],
			...params,
		};
	};
	const clearParameterOverrides = (nodeName: string) => {
		parameterOverrides.value[nodeName] = {};
	};


	return {
		parameterOverrides,
		getParameterOverrides,
		getParameterOverride,
		addParameterOverride,
		addParameterOverrides,
		clearParameterOverrides,
	};
});
