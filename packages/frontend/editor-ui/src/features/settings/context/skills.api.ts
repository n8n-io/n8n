import type {
	AcceptSkillGitUpdateDto,
	CheckSkillContentDto,
	CreateSkillDto,
	DiscoverGitHubSkillsDto,
	DiscoverGitHubSkillsResponse,
	ImportGitHubSkillsDto,
	ImportGitHubSkillsResponse,
	ImportSharedSkillDto,
	SkillCheckResult,
	SkillGitUpdateDetail,
	SaveSkillDto,
	SkillDetail,
	SkillListResponse,
	SkillNewNameResponse,
	SkillSaveResponse,
	SkillVersionDetail,
	SkillVersionListResponse,
	SkillVersionSummary,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

const ENDPOINT = '/skills';

/** The request side of `ListSkillsQueryDto`, with numbers as the client holds them. */
export type SkillListQuery = {
	skip?: number;
	take?: number;
	search?: string;
	scope?: CreateSkillDto['scope'];
	projectId?: string;
};

export async function getSkills(
	context: IRestApiContext,
	query: SkillListQuery = {},
): Promise<SkillListResponse> {
	return await makeRestApiRequest<SkillListResponse>(context, 'GET', ENDPOINT, { ...query });
}

/** A name that no skill in the scope has yet: the requested name, or the name with a number. */
export async function getNewSkillName(
	context: IRestApiContext,
	query: {
		scope: CreateSkillDto['scope'];
		projectId?: string;
		agentId?: string;
		name: string;
	},
): Promise<string> {
	const response = await makeRestApiRequest<SkillNewNameResponse>(
		context,
		'GET',
		`${ENDPOINT}/new-name`,
		{ ...query },
	);
	return response.name;
}

export async function getSkill(context: IRestApiContext, id: string): Promise<SkillDetail> {
	return await makeRestApiRequest<SkillDetail>(context, 'GET', `${ENDPOINT}/${id}`);
}

export async function createSkill(
	context: IRestApiContext,
	payload: CreateSkillDto,
): Promise<SkillDetail> {
	return await makeRestApiRequest<SkillDetail>(context, 'POST', ENDPOINT, payload);
}

/** Saves the next version. Answers `created: false` when the content matches the latest one. */
export async function saveSkill(
	context: IRestApiContext,
	id: string,
	payload: SaveSkillDto,
): Promise<SkillSaveResponse> {
	return await makeRestApiRequest<SkillSaveResponse>(
		context,
		'PATCH',
		`${ENDPOINT}/${id}`,
		payload,
	);
}

export async function deleteSkill(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}`);
}

/** Every saved version of a skill, newest first. */
export async function getSkillVersions(
	context: IRestApiContext,
	id: string,
): Promise<SkillVersionSummary[]> {
	const response = await makeRestApiRequest<SkillVersionListResponse>(
		context,
		'GET',
		`${ENDPOINT}/${id}/versions`,
	);
	return response.data;
}

export async function getSkillVersion(
	context: IRestApiContext,
	id: string,
	version: number,
): Promise<SkillVersionDetail> {
	return await makeRestApiRequest<SkillVersionDetail>(
		context,
		'GET',
		`${ENDPOINT}/${id}/versions/${version}`,
	);
}

/** Names one saved version. A null label removes the name. */
export async function updateSkillVersionLabel(
	context: IRestApiContext,
	id: string,
	version: number,
	label: string | null,
): Promise<SkillVersionSummary> {
	return await makeRestApiRequest<SkillVersionSummary>(
		context,
		'PATCH',
		`${ENDPOINT}/${id}/versions/${version}`,
		{ label },
	);
}

/** Runs the security check on skill content. Nothing is stored. */
export async function checkSkillContent(
	context: IRestApiContext,
	payload: CheckSkillContentDto,
): Promise<SkillCheckResult> {
	return await makeRestApiRequest<SkillCheckResult>(context, 'POST', `${ENDPOINT}/check`, payload);
}

/** Adds a skill from a share link. The server runs the check again before it stores it. */
export async function importSharedSkill(
	context: IRestApiContext,
	payload: ImportSharedSkillDto,
): Promise<SkillDetail> {
	return await makeRestApiRequest<SkillDetail>(
		context,
		'POST',
		`${ENDPOINT}/import-shared`,
		payload,
	);
}

/** Reads a public GitHub link and lists the skills in it. Nothing is stored. */
export async function discoverGitHubSkills(
	context: IRestApiContext,
	payload: DiscoverGitHubSkillsDto,
): Promise<DiscoverGitHubSkillsResponse> {
	return await makeRestApiRequest<DiscoverGitHubSkillsResponse>(
		context,
		'POST',
		`${ENDPOINT}/github/discover`,
		payload,
	);
}

/** Imports the chosen skills at the commit that discover returned. */
export async function importGitHubSkills(
	context: IRestApiContext,
	payload: ImportGitHubSkillsDto,
): Promise<ImportGitHubSkillsResponse> {
	return await makeRestApiRequest<ImportGitHubSkillsResponse>(
		context,
		'POST',
		`${ENDPOINT}/github/import`,
		payload,
	);
}

export async function getSkillGitUpdate(
	context: IRestApiContext,
	id: string,
): Promise<SkillGitUpdateDetail> {
	return await makeRestApiRequest<SkillGitUpdateDetail>(
		context,
		'GET',
		`${ENDPOINT}/${id}/github/update`,
	);
}

export async function acceptSkillGitUpdate(
	context: IRestApiContext,
	id: string,
	payload: AcceptSkillGitUpdateDto,
): Promise<{ version: number; created: boolean }> {
	return await makeRestApiRequest<{ version: number; created: boolean }>(
		context,
		'POST',
		`${ENDPOINT}/${id}/github/update/accept`,
		payload,
	);
}

export async function skipSkillGitUpdate(
	context: IRestApiContext,
	id: string,
	toCommitSha: string,
): Promise<void> {
	await makeRestApiRequest(context, 'POST', `${ENDPOINT}/${id}/github/update/skip`, {
		toCommitSha,
	});
}

/** Checks GitHub for this skill now. Answers the skill as it is after the check. */
export async function checkSkillGitHub(context: IRestApiContext, id: string): Promise<SkillDetail> {
	return await makeRestApiRequest<SkillDetail>(context, 'POST', `${ENDPOINT}/${id}/github/check`);
}

/** Stop syncing: the skill and its versions stay and become editable. */
export async function stopSkillGitSync(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${ENDPOINT}/${id}/github`);
}
