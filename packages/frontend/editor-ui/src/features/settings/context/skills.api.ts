import type {
	CreateSkillDto,
	SaveSkillDto,
	SkillDetail,
	SkillListResponse,
	SkillSaveResponse,
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
