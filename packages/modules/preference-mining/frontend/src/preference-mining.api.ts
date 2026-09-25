import type {
	PreferenceMiningOptions,
	PreferenceMiningRecall,
	PreferenceMiningRun,
	RecallPreferenceMiningDto,
	StartPreferenceMiningDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export function miningApi(context: IRestApiContext, projectId: string) {
	const path = `/projects/${encodeURIComponent(projectId)}/preference-mining`;
	return {
		options: async () =>
			await makeRestApiRequest<PreferenceMiningOptions>(context, 'GET', `${path}/options`),
		start: async (body: StartPreferenceMiningDto) =>
			await makeRestApiRequest<PreferenceMiningRun>(context, 'POST', `${path}/runs`, body),
		get: async (id: string) =>
			await makeRestApiRequest<PreferenceMiningRun>(
				context,
				'GET',
				`${path}/runs/${encodeURIComponent(id)}`,
			),
		cancel: async (id: string) =>
			await makeRestApiRequest<PreferenceMiningRun>(
				context,
				'POST',
				`${path}/runs/${encodeURIComponent(id)}/cancel`,
			),
		recall: async (id: string, body: RecallPreferenceMiningDto) =>
			await makeRestApiRequest<PreferenceMiningRecall[]>(
				context,
				'POST',
				`${path}/runs/${encodeURIComponent(id)}/recall`,
				body,
			),
	};
}

export async function getMiningProjects(context: IRestApiContext) {
	return await makeRestApiRequest<Array<{ id: string; name: string; scopes?: string[] }>>(
		context,
		'GET',
		'/projects/my-projects',
	);
}
