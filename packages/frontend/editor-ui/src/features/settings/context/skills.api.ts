import type {
	AgentSkill,
	CreateHubSkillDto,
	HubSkillDetail,
	HubSkillEditLockResponse,
	HubSkillListResponse,
	HubSkillListQuery,
	HubSkillSaveResponse,
	UpdateAgentSkillDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

const ENDPOINT = '/skills-hub';

export async function getSkills(
	context: IRestApiContext,
	query: HubSkillListQuery = {},
): Promise<HubSkillListResponse> {
	return await makeRestApiRequest<HubSkillListResponse>(context, 'GET', ENDPOINT, { ...query });
}

export async function getSkill(context: IRestApiContext, id: string): Promise<HubSkillDetail> {
	return await makeRestApiRequest<HubSkillDetail>(context, 'GET', `${ENDPOINT}/${id}`);
}

export async function createSkill(
	context: IRestApiContext,
	payload: CreateHubSkillDto,
): Promise<HubSkillDetail> {
	return await makeRestApiRequest<HubSkillDetail>(context, 'POST', ENDPOINT, payload);
}

/** Autosave: writes the draft. Agents keep reading the saved version until `saveSkill`. */
export async function updateSkillDraft(
	context: IRestApiContext,
	id: string,
	payload: UpdateAgentSkillDto,
): Promise<{ skill: AgentSkill; skillHash: string }> {
	return await makeRestApiRequest(context, 'PATCH', `${ENDPOINT}/${id}`, payload);
}

/** Save: the draft becomes the version agents read. */
export async function saveSkill(
	context: IRestApiContext,
	id: string,
): Promise<HubSkillSaveResponse> {
	return await makeRestApiRequest<HubSkillSaveResponse>(context, 'POST', `${ENDPOINT}/${id}/save`);
}

export async function deleteSkill(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}`);
}

/** Takes or renews this tab's edit lock on the skill. */
export async function acquireSkillEditLock(
	context: IRestApiContext,
	id: string,
): Promise<HubSkillEditLockResponse> {
	return await makeRestApiRequest<HubSkillEditLockResponse>(
		context,
		'POST',
		`${ENDPOINT}/${id}/edit-lock`,
	);
}

export async function releaseSkillEditLock(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}/edit-lock`);
}
