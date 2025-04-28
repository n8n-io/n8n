import { type IWorkflowData } from '@/Interface';
import { type INode, type INodeParameters, type NodeParameterValueType } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

interface IParameterOverridesStoreState {
	[workflowId: string]: {
		[nodeName: string]: INodeParameters;
	};
}

const STORAGE_KEY = 'n8n-parameter-overrides';

export const useParameterOverridesStore = defineStore('parameterOverrides', () => {
	// State
	const parameterOverrides = ref<IParameterOverridesStoreState>(loadFromLocalStorage());

	// Load initial state from localStorage
	function loadFromLocalStorage(): IParameterOverridesStoreState {
		try {
			const storedData = localStorage.getItem(STORAGE_KEY);
			return storedData ? JSON.parse(storedData) : {};
		} catch (error) {
			return {};
		}
	}

	// Save state to localStorage whenever it changes
	watch(
		parameterOverrides,
		(newValue) => {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
			} catch (error) {
				console.error('Failed to save parameter overrides to localStorage:', error);
			}
		},
		{ deep: true },
	);

	// Helper function to ensure workflow and node entries exist
	const ensureWorkflowAndNodeExist = (workflowId: string, nodeId: string): void => {
		if (!parameterOverrides.value[workflowId]) {
			parameterOverrides.value[workflowId] = {};
		}

		if (!parameterOverrides.value[workflowId][nodeId]) {
			parameterOverrides.value[workflowId][nodeId] = {};
		}
	};

	// Helper function to expand dotted keys into nested objects
	function expandDottedKeys(obj: INodeParameters): INodeParameters {
		const result: INodeParameters = {};

		for (const key in obj) {
			const value = obj[key];
			const parts = key.split('.');
			let current: INodeParameters = result;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];

				if (i === parts.length - 1) {
					current[part] = value;
				} else {
					if (!current[part] || typeof current[part] !== 'object') {
						current[part] = {};
					}
					current = current[part] as INodeParameters;
				}
			}
		}

		return result;
	}

	// Getters
	const getParameterOverrides = (workflowId: string, nodeId: string): INodeParameters => {
		return parameterOverrides.value[workflowId]?.[nodeId] || {};
	};

	const getParameterOverride = (
		workflowId: string,
		nodeId: string,
		paramName: string,
	): NodeParameterValueType | undefined => {
		return parameterOverrides.value[workflowId]?.[nodeId]?.[paramName];
	};

	// Actions
	const addParameterOverride = (
		workflowId: string,
		nodeId: string,
		paramName: string,
		paramValues: NodeParameterValueType,
	): INodeParameters => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		parameterOverrides.value[workflowId][nodeId] = {
			...parameterOverrides.value[workflowId][nodeId],
			[paramName]: paramValues,
		};

		return parameterOverrides.value[workflowId][nodeId];
	};

	const addParameterOverrides = (
		workflowId: string,
		nodeId: string,
		params: INodeParameters,
	): void => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		parameterOverrides.value[workflowId][nodeId] = {
			...parameterOverrides.value[workflowId][nodeId],
			...params,
		};
	};

	const clearParameterOverrides = (workflowId: string, nodeId: string): void => {
		if (parameterOverrides.value[workflowId]) {
			parameterOverrides.value[workflowId][nodeId] = {};
		}
	};

	const clearAllParameterOverrides = (workflowId?: string): void => {
		if (workflowId) {
			// Clear overrides for a specific workflow
			parameterOverrides.value[workflowId] = {};
		} else {
			// Clear all overrides
			parameterOverrides.value = {};
		}
	};

	const substituteParameters = (
		workflowId: string,
		nodeId: string,
		workflowData: IWorkflowData,
	): void => {
		const node = workflowData.nodes.find((n: INode) => n.id === nodeId);
		if (!node) return;

		const nodeOverrides = parameterOverrides.value[workflowId]?.[nodeId] || {};
		const expandedParameterOverrides = expandDottedKeys(nodeOverrides);

		node.parameters = {
			...node.parameters,
			...expandedParameterOverrides,
		};
	};

	return {
		parameterOverrides,
		getParameterOverrides,
		getParameterOverride,
		addParameterOverride,
		addParameterOverrides,
		clearParameterOverrides,
		clearAllParameterOverrides,
		substituteParameters,
	};
});
