import type {
	ConnectSkillSourceDto,
	CreateSkillDto,
	DiscoverSkillSourceDto,
	SaveSkillDto,
	SkillAgentOption,
	SkillDetail,
	SkillListResponse,
	SkillNewNameResponse,
	SkillSaveResponse,
	SkillSortOption,
	AcceptSkillUpdatesDto,
	ReviewSkillUpdateDto,
	SkillSourceCheckResponse,
	SkillSourceListItem,
	SkillSourceUpdates,
	SkillUpdateAcceptResponse,
	SkillUpdateReview,
	SkillUpdatesAcceptResponse,
	SkillSourceConnectResponse,
	SkillSourceCredentialOption,
	SkillSourceDiscovery,
	SkillSourceRepositoryList,
	SkillUserDto,
	ListSkillSourceCredentialsQueryDto,
	ListSkillSourceRepositoriesQueryDto,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

const ENDPOINT = '/skills';
const SOURCES_ENDPOINT = '/skill-sources';

/** The request side of `ListSkillsQueryDto`, with numbers as the client holds them. */
export type SkillListQuery = {
	skip?: number;
	take?: number;
	search?: string;
	scope?: CreateSkillDto['scope'];
	projectId?: string;
	agentId?: string;
	createdById?: string;
	sortBy?: SkillSortOption;
};

export async function getSkills(
	context: IRestApiContext,
	query: SkillListQuery = {},
): Promise<SkillListResponse> {
	return await makeRestApiRequest<SkillListResponse>(context, 'GET', ENDPOINT, { ...query });
}

/** The users who created a skill that the current user can see. */
export async function getSkillCreators(context: IRestApiContext): Promise<SkillUserDto[]> {
	return await makeRestApiRequest<SkillUserDto[]>(context, 'GET', `${ENDPOINT}/creators`);
}

/** The agents the current user can read, searched by name, for the agent filter. */
export async function getSkillAgents(
	context: IRestApiContext,
	query: { search?: string; take?: number } = {},
): Promise<SkillAgentOption[]> {
	return await makeRestApiRequest<SkillAgentOption[]>(context, 'GET', `${ENDPOINT}/agents`, {
		...query,
	});
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

/** The scope of a source, as the credential and repository lists take it. */

/** The credentials that a source in the scope accepts and that the user can use. */
export async function getSkillSourceCredentials(
	context: IRestApiContext,
	query: ListSkillSourceCredentialsQueryDto,
): Promise<SkillSourceCredentialOption[]> {
	return await makeRestApiRequest<SkillSourceCredentialOption[]>(
		context,
		'GET',
		`${SOURCES_ENDPOINT}/credentials`,
		{ ...query },
	);
}

/** The repositories that a credential can read, for the owner and repository selects. */
export async function getSkillSourceRepositories(
	context: IRestApiContext,
	query: ListSkillSourceRepositoriesQueryDto,
): Promise<SkillSourceRepositoryList> {
	return await makeRestApiRequest<SkillSourceRepositoryList>(
		context,
		'GET',
		`${SOURCES_ENDPOINT}/repositories`,
		{ ...query },
	);
}

/** Reads a link, with a credential for a private one, and lists the skills in it. Writes nothing. */
export async function discoverSkillSource(
	context: IRestApiContext,
	payload: DiscoverSkillSourceDto,
): Promise<SkillSourceDiscovery> {
	return await makeRestApiRequest<SkillSourceDiscovery>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/discover`,
		payload,
	);
}

/** Connects the source in the scope and imports the picked skills as synced skills. */
export async function connectSkillSource(
	context: IRestApiContext,
	payload: ConnectSkillSourceDto,
): Promise<SkillSourceConnectResponse> {
	return await makeRestApiRequest<SkillSourceConnectResponse>(
		context,
		'POST',
		SOURCES_ENDPOINT,
		payload,
	);
}

/** Stops syncing one skill: it keeps its versions and becomes a normal, editable skill. */
/** Check now: checks the whole source of a synced skill for updates. */
export async function checkSkillForUpdates(
	context: IRestApiContext,
	skillId: string,
): Promise<SkillSourceCheckResponse> {
	return await makeRestApiRequest<SkillSourceCheckResponse>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/skills/${skillId}/check`,
	);
}

export async function stopSyncingSkill(context: IRestApiContext, skillId: string): Promise<void> {
	await makeRestApiRequest<{ ok: true }>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/skills/${skillId}/stop-syncing`,
	);
}

/** The sources that the user can see, for the Sources tab. */
export async function listSkillSources(context: IRestApiContext): Promise<SkillSourceListItem[]> {
	return await makeRestApiRequest<SkillSourceListItem[]>(context, 'GET', SOURCES_ENDPOINT);
}

/** Check now from the Sources tab. */
export async function checkSkillSource(
	context: IRestApiContext,
	sourceId: string,
): Promise<SkillSourceCheckResponse> {
	return await makeRestApiRequest<SkillSourceCheckResponse>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/${sourceId}/check`,
	);
}

/** The "Updates from" dialog of one source. */
export async function getSkillSourceUpdates(
	context: IRestApiContext,
	sourceId: string,
): Promise<SkillSourceUpdates> {
	return await makeRestApiRequest<SkillSourceUpdates>(
		context,
		'GET',
		`${SOURCES_ENDPOINT}/${sourceId}/updates`,
	);
}

/** Update all: accepts each reviewed update of the source. */
export async function acceptSkillSourceUpdates(
	context: IRestApiContext,
	sourceId: string,
	payload: AcceptSkillUpdatesDto,
): Promise<SkillUpdatesAcceptResponse> {
	return await makeRestApiRequest<SkillUpdatesAcceptResponse>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/${sourceId}/updates/accept`,
		payload,
	);
}

/** The review of the update of one synced skill. */
export async function getSkillUpdate(
	context: IRestApiContext,
	skillId: string,
): Promise<SkillUpdateReview> {
	return await makeRestApiRequest<SkillUpdateReview>(
		context,
		'GET',
		`${SOURCES_ENDPOINT}/skills/${skillId}/update`,
	);
}

/** Accept: the reviewed update becomes the next version. */
export async function acceptSkillUpdate(
	context: IRestApiContext,
	skillId: string,
	payload: ReviewSkillUpdateDto,
): Promise<SkillUpdateAcceptResponse> {
	return await makeRestApiRequest<SkillUpdateAcceptResponse>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/skills/${skillId}/update/accept`,
		payload,
	);
}

/** Skip: hides the update until the source changes again. */
export async function skipSkillUpdate(
	context: IRestApiContext,
	skillId: string,
	payload: ReviewSkillUpdateDto,
): Promise<void> {
	await makeRestApiRequest<{ ok: true }>(
		context,
		'POST',
		`${SOURCES_ENDPOINT}/skills/${skillId}/update/skip`,
		payload,
	);
}
