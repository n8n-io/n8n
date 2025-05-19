import type { INodeParameters, NodeParameterValueType } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

interface IAgentRequestStoreState {
	[workflowId: string]: {
		[nodeName: string]: INodeParameters;
	};
}

const STORAGE_KEY = 'n8n-agent-requests';

export const useAgentRequestStore = defineStore('agentRequest', () => {
	// State
	const agentRequests = ref<IAgentRequestStoreState>(loadFromLocalStorage());

	// Load initial state from localStorage
	function loadFromLocalStorage(): IAgentRequestStoreState {
		try {
			const storedData = localStorage.getItem(STORAGE_KEY);
			return storedData ? JSON.parse(storedData) : {};
		} catch (error) {
			return {};
		}
	}

	// Save state to localStorage whenever it changes
	watch(
		agentRequests,
		(newValue) => {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
			} catch (error) {
				console.error('Failed to save agent requests to localStorage:', error);
			}
		},
		{ deep: true },
	);

	// Helper function to ensure workflow and node entries exist
	const ensureWorkflowAndNodeExist = (workflowId: string, nodeId: string): void => {
		if (!agentRequests.value[workflowId]) {
			agentRequests.value[workflowId] = {};
		}

		if (!agentRequests.value[workflowId][nodeId]) {
			agentRequests.value[workflowId][nodeId] = {};
		}
	};

	// Getters
	const getAgentRequests = (workflowId: string, nodeId: string): INodeParameters => {
		return agentRequests.value[workflowId]?.[nodeId] || {};
	};

	const getAgentRequest = (
		workflowId: string,
		nodeId: string,
		paramName: string,
	): NodeParameterValueType | undefined => {
		return agentRequests.value[workflowId]?.[nodeId]?.[paramName];
	};

	// Actions
	const addAgentRequest = (
		workflowId: string,
		nodeId: string,
		paramName: string,
		paramValues: NodeParameterValueType,
	): INodeParameters => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		agentRequests.value[workflowId][nodeId] = {
			...agentRequests.value[workflowId][nodeId],
			[paramName]: paramValues,
		};

		return agentRequests.value[workflowId][nodeId];
	};

	const addAgentRequests = (workflowId: string, nodeId: string, params: INodeParameters): void => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		agentRequests.value[workflowId][nodeId] = {
			...agentRequests.value[workflowId][nodeId],
			...params,
		};
	};

	const clearAgentRequests = (workflowId: string, nodeId: string): void => {
		if (agentRequests.value[workflowId]) {
			agentRequests.value[workflowId][nodeId] = {};
		}
	};

	const clearAllAgentRequests = (workflowId?: string): void => {
		if (workflowId) {
			// Clear requests for a specific workflow
			agentRequests.value[workflowId] = {};
		} else {
			// Clear all requests
			agentRequests.value = {};
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

	function buildRequestObject(path: string[], value: NodeParameterValueType): INodeParameters {
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

	const generateAgentRequest = (workflowId: string, nodeId: string): INodeParameters => {
		const nodeRequests = agentRequests.value[workflowId]?.[nodeId] || {};

		return Object.entries(nodeRequests).reduce(
			(acc, [path, value]) => deepMerge(acc, buildRequestObject(parsePath(path), value)),
			{} as INodeParameters,
		);
	};

	return {
		agentRequests,
		getAgentRequests,
		getAgentRequest,
		addAgentRequest,
		addAgentRequests,
		clearAgentRequests,
		clearAllAgentRequests,
		generateAgentRequest,
	};
});
