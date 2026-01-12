import { useLocalStorage } from '@vueuse/core';
import type { AgentRequestQuery } from 'n8n-workflow';
import { defineStore } from 'pinia';

const LOCAL_STORAGE_AGENT_REQUESTS = 'N8N_AGENT_REQUESTS';

export interface IAgentRequest {
	query: AgentRequestQuery;
	toolName?: string;
}

export interface IAgentRequestStoreState {
	[workflowId: string]: {
		[nodeName: string]: IAgentRequest;
	};
}

export const useAgentRequestStore = defineStore('agentRequest', () => {
	// State
	const agentRequests = useLocalStorage<IAgentRequestStoreState>(LOCAL_STORAGE_AGENT_REQUESTS, {});

	// Helper function to ensure workflow and node entries exist
	const ensureWorkflowAndNodeExist = (workflowId: string, nodeId: string): void => {
		if (!agentRequests.value[workflowId]) {
			agentRequests.value[workflowId] = {};
		}

		if (!agentRequests.value[workflowId][nodeId]) {
			agentRequests.value[workflowId][nodeId] = { query: {} };
		}
	};

	// Getters
	const getAgentRequests = (workflowId: string, nodeId: string): IAgentRequest['query'] => {
		return agentRequests.value[workflowId]?.[nodeId]?.query || {};
	};

	const getQueryValue = (
		workflowId: string,
		nodeId: string,
		nodeName: string,
		paramName?: string,
	): unknown => {
		const query = agentRequests.value[workflowId]?.[nodeId]?.query?.[nodeName];
		if (typeof query === 'string' || !paramName) {
			return query;
		}
		return query?.[paramName];
	};

	const setAgentRequestForNode = (
		workflowId: string,
		nodeId: string,
		request: IAgentRequest,
	): void => {
		ensureWorkflowAndNodeExist(workflowId, nodeId);

		agentRequests.value[workflowId][nodeId] = {
			...request,
			query: { ...request.query },
		};
	};

	const clearAgentRequests = (workflowId: string, nodeId: string): void => {
		if (agentRequests.value[workflowId]) {
			agentRequests.value[workflowId][nodeId] = { query: {} };
		}
	};

	const clearAllAgentRequests = (workflowId?: string): void => {
		if (workflowId) {
			agentRequests.value[workflowId] = {};
		} else {
			agentRequests.value = {};
		}
	};

	const getAgentRequest = (workflowId: string, nodeId: string): IAgentRequest | undefined => {
		if (agentRequests.value[workflowId]) return agentRequests.value[workflowId]?.[nodeId];
		return undefined;
	};

	return {
		agentRequests,
		getAgentRequests,
		getQueryValue,
		setAgentRequestForNode,
		clearAgentRequests,
		clearAllAgentRequests,
		getAgentRequest,
	};
});
