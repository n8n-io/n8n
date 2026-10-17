import type {
	CreateSkillDto,
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
