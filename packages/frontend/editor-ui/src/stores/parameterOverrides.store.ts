import { type INodeParameters, type NodeParameterValueType } from 'n8n-workflow';
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

	function parsePath(path: string): string[] {
		return path.split('.').reduce((acc: string[], part) => {
			if (part.includes('[')) {
				const [arrayName, index] = part.split('[');
				if (arrayName) acc.push(arrayName);
				if (index) acc.push(index.replace(']', ''));
			} else {
				acc.push(part);
			}
			return acc;
		}, []);
	}

	function buildOverrideObject(path: string[], value: NodeParameterValueType): INodeParameters {
		const result: INodeParameters = {};
		let current = result;

		for (let i = 0; i < path.length - 1; i++) {
			const part = path[i];
			const nextPart = path[i + 1];
			const isArrayIndex = nextPart && !isNaN(Number(nextPart));

			if (isArrayIndex) {
				if (!current[part]) {
					current[part] = [];
				}
				while ((current[part] as NodeParameterValueType[]).length <= Number(nextPart)) {
					(current[part] as NodeParameterValueType[]).push({});
				}
			} else if (!current[part]) {
				current[part] = {};
			}

			current = current[part] as INodeParameters;
		}

		current[path[path.length - 1]] = value;
		return result;
	}

	// Helper function to deep merge objects
	function deepMerge(target: INodeParameters, source: INodeParameters): INodeParameters {
		const result = { ...target };

		for (const key in source) {
			if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
				// Recursively merge nested objects
				result[key] = deepMerge(
					(result[key] as INodeParameters) || {},
					source[key] as INodeParameters,
				);
			} else if (Array.isArray(source[key])) {
				// For arrays, merge by index
				if (Array.isArray(result[key])) {
					const targetArray = result[key] as NodeParameterValueType[];
					const sourceArray = source[key] as NodeParameterValueType[];

					// Ensure target array has enough elements
					while (targetArray.length < sourceArray.length) {
						targetArray.push({});
					}

					// Merge each array item
					sourceArray.forEach((item, index) => {
						if (item && typeof item === 'object') {
							targetArray[index] = deepMerge(
								(targetArray[index] as INodeParameters) || {},
								item as INodeParameters,
							) as NodeParameterValueType;
						} else {
							targetArray[index] = item;
						}
					});
				} else {
					result[key] = source[key];
				}
			} else {
				// For primitive values, use source value
				result[key] = source[key];
			}
		}

		return result;
	}

	const substituteParameters = (
		workflowId: string,
		nodeId: string,
		nodeParameters: INodeParameters,
	): INodeParameters => {
		if (!nodeParameters) return {};

		const nodeOverrides = parameterOverrides.value[workflowId]?.[nodeId] || {};

		const overrideParams = Object.entries(nodeOverrides).reduce(
			(acc, [path, value]) => deepMerge(acc, buildOverrideObject(parsePath(path), value)),
			{} as INodeParameters,
		);

		return deepMerge(nodeParameters, overrideParams);
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
