import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	DependencyGraph,
	WorkflowDependencyInfo,
	CredentialUsageInfo,
	ImpactAnalysis,
} from './dependencyGraph.types';

export const fetchDependencyGraph = async (context: IRestApiContext): Promise<DependencyGraph> =>
	await makeRestApiRequest(context, 'GET', '/dependency-graph');

export const fetchWorkflowDependencies = async (
	context: IRestApiContext,
	workflowId: string,
): Promise<WorkflowDependencyInfo> =>
	await makeRestApiRequest(context, 'GET', `/dependency-graph/workflows/${workflowId}`);

export const fetchCredentialUsage = async (
	context: IRestApiContext,
	credentialId: string,
): Promise<CredentialUsageInfo> =>
	await makeRestApiRequest(context, 'GET', `/dependency-graph/credentials/${credentialId}/usage`);

export const fetchImpactAnalysis = async (
	context: IRestApiContext,
	resourceType: 'credential' | 'workflow',
	resourceId: string,
): Promise<ImpactAnalysis> =>
	await makeRestApiRequest(
		context,
		'GET',
		`/dependency-graph/impact/${resourceType}/${resourceId}`,
	);
