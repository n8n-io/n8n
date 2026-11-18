import type {
	ProjectPublishJudge,
	PublishJudgeMode,
	PublishJudgeReviewItem,
	PublishJudgeReviewSummary,
	PublishJudgeEvent,
	PublishJudgeOnUnavailable,
	PublishJudgeSettings,
	PublishJudgeType,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { JUDGE_TRIGGER_NODE_TYPES } from './publish-judge.constants';

export type JudgeOption = { id: string; name: string };

export type PublishJudgeUpdate = {
	judgeType: PublishJudgeType;
	judgeId: string | null;
	onUnavailable: PublishJudgeOnUnavailable;
	events: PublishJudgeEvent[];
	mode: PublishJudgeMode;
};

type AgentListItem = JudgeOption & { activeVersionId: string | null };

/** `null` is the instance scope. */
const endpointFor = (projectId: string | null) =>
	projectId === null ? '/publish-judge' : `/projects/${projectId}/publish-judge`;

export async function fetchPublishJudge(
	context: IRestApiContext,
	projectId: string | null,
): Promise<PublishJudgeSettings | null> {
	return await makeRestApiRequest(context, 'GET', endpointFor(projectId));
}

export async function savePublishJudge(
	context: IRestApiContext,
	projectId: string | null,
	update: PublishJudgeUpdate,
): Promise<PublishJudgeSettings | null> {
	return await makeRestApiRequest(context, 'PUT', endpointFor(projectId), update);
}

/** Workflows that start with a judge trigger. `projectId` keeps the search to the judges project. */
export async function searchJudgeWorkflows(
	context: IRestApiContext,
	query: string,
	projectId: string | null,
): Promise<JudgeOption[]> {
	return await makeRestApiRequest(context, 'GET', '/workflows', {
		filter: {
			isArchived: false,
			triggerNodeTypes: JUDGE_TRIGGER_NODE_TYPES,
			...(projectId ? { projectId } : {}),
			...(query ? { query } : {}),
		},
		select: JSON.stringify(['id', 'name']),
		// The default sort needs a column that the narrow select leaves out.
		sortBy: 'name:asc',
		take: 50,
	});
}

/** Only a published agent can run, so only those can be a judge. */
export async function fetchJudgeAgents(
	context: IRestApiContext,
	projectId: string | null,
): Promise<JudgeOption[]> {
	const endpoint = projectId ? `/projects/${projectId}/agents/v2` : '/agents/v2';
	const agents = await makeRestApiRequest<AgentListItem[]>(context, 'GET', endpoint, {
		limit: 100,
	});

	return agents
		.filter((agent) => agent.activeVersionId !== null)
		.map(({ id, name }) => ({ id, name }));
}

type JudgeLibrary = { projectId: string | null };

/** The project that holds the judge workflows and agents. `null` until an admin creates it. */
export async function fetchJudgeLibrary(context: IRestApiContext): Promise<string | null> {
	return (await makeRestApiRequest<JudgeLibrary>(context, 'GET', '/publish-judge/library'))
		.projectId;
}

export async function createJudgeLibrary(context: IRestApiContext): Promise<string> {
	const library = await makeRestApiRequest<{ projectId: string }>(
		context,
		'POST',
		'/publish-judge/library',
	);

	return library.projectId;
}

export async function fetchProjectJudges(context: IRestApiContext): Promise<ProjectPublishJudge[]> {
	return await makeRestApiRequest(context, 'GET', '/publish-judge/projects');
}

export type JudgeProjectOption = {
	id: string;
	name: string | null;
	type: string;
	icon?: { type: 'icon' | 'emoji'; value: string } | null;
};

/** A judge is set for a team project. A personal project follows the instance judge only. */
export async function fetchTeamProjects(context: IRestApiContext): Promise<JudgeProjectOption[]> {
	const projects = await makeRestApiRequest<JudgeProjectOption[]>(context, 'GET', '/projects');

	return projects.filter((project) => project.type === 'team');
}

export async function fetchJudgeReviews(
	context: IRestApiContext,
): Promise<PublishJudgeReviewItem[]> {
	return await makeRestApiRequest(context, 'GET', '/publish-judge/reviews');
}

export async function fetchJudgeReviewSummary(
	context: IRestApiContext,
): Promise<PublishJudgeReviewSummary> {
	return await makeRestApiRequest(context, 'GET', '/publish-judge/reviews/summary');
}
