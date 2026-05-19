import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AgentEvaluationDatasetResponse,
	AgentEvaluationSuiteRunRequest,
	AgentEvaluationSuiteRunResponse,
	AgentEvaluationSuiteSetupResponse,
} from '@n8n/api-types';

export const getAgentEvaluationDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentEvaluationDatasetResponse> => {
	return await makeRestApiRequest<AgentEvaluationDatasetResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/evaluations/dataset`,
	);
};

export const setupAgentEvaluationSuite = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentEvaluationSuiteSetupResponse> => {
	return await makeRestApiRequest<AgentEvaluationSuiteSetupResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/evaluations/suite`,
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
