import type { RunSkillTrialDto, SkillTrialPreview, SkillTrialResult } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

export async function prepareSkillTrial(
	context: IRestApiContext,
	projectId: string,
	catalogId: string,
) {
	return await makeRestApiRequest<SkillTrialPreview>(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/agent-skill-trials`,
		{ catalogId },
	);
}

export async function runSkillTrial(
	context: IRestApiContext,
	projectId: string,
	payload: RunSkillTrialDto,
) {
	return await makeRestApiRequest<SkillTrialResult>(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agent-skill-trials`,
		{ ...payload },
	);
}
