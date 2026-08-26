import type {
	InstanceAiLearning,
	InstanceAiLearningReviewStatus,
	InstanceAiLearningRun,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

const basePath = (projectId: string) => `/projects/${projectId}/ai-learnings`;

export async function startLearningRun(
	context: IRestApiContext,
	projectId: string,
	payload: { workflowIds: string[]; publishedOnly: boolean },
) {
	return await makeRestApiRequest<InstanceAiLearningRun>(
		context,
		'POST',
		`${basePath(projectId)}/runs`,
		payload,
	);
}

export async function getLearningRun(context: IRestApiContext, projectId: string, runId: string) {
	return await makeRestApiRequest<InstanceAiLearningRun>(
		context,
		'GET',
		`${basePath(projectId)}/runs/${runId}`,
	);
}

export async function getLearnings(
	context: IRestApiContext,
	projectId: string,
	query?: { query?: string; reviewStatus?: InstanceAiLearningReviewStatus },
) {
	return await makeRestApiRequest<InstanceAiLearning[]>(context, 'GET', basePath(projectId), query);
}

export async function updateLearning(
	context: IRestApiContext,
	projectId: string,
	learningId: string,
	payload: {
		reviewStatus?: InstanceAiLearningReviewStatus;
		enabled?: boolean;
		statement?: string;
		appliesWhen?: string;
	},
) {
	return await makeRestApiRequest<InstanceAiLearning>(
		context,
		'PATCH',
		`${basePath(projectId)}/${learningId}`,
		payload,
	);
}

export async function deleteLearning(
	context: IRestApiContext,
	projectId: string,
	learningId: string,
) {
	await makeRestApiRequest(context, 'DELETE', `${basePath(projectId)}/${learningId}`);
}
