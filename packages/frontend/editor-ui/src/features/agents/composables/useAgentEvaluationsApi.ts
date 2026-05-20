import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AgentEvaluationDatasetResponse,
	AgentEvaluationSuiteRunRequest,
	AgentEvaluationSuiteRunResponse,
	AgentEvaluationSuiteSetupRequest,
	AgentEvaluationSuiteSetupResponse,
} from '@n8n/api-types';

export const getAgentEvaluationDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	agentVersionId?: string,
): Promise<AgentEvaluationDatasetResponse> => {
	const query = agentVersionId ? `?agentVersionId=${encodeURIComponent(agentVersionId)}` : '';
	return await makeRestApiRequest<AgentEvaluationDatasetResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/evaluations/dataset${query}`,
	);
};

export const setupAgentEvaluationSuite = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload?: AgentEvaluationSuiteSetupRequest,
): Promise<AgentEvaluationSuiteSetupResponse> => {
	return await makeRestApiRequest<AgentEvaluationSuiteSetupResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/evaluations/suite`,
		payload,
	);
};

export const runAgentEvaluationSuite = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload?: AgentEvaluationSuiteRunRequest,
): Promise<AgentEvaluationSuiteRunResponse> => {
	return await makeRestApiRequest<AgentEvaluationSuiteRunResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/evaluations/suite/run`,
		payload,
	);
};
