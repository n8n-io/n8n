import type {
	AgentConfigMutationResponse,
	AgentConfigResponse,
	AgentListItemDto,
	SkillListItem,
	SkillListResponse,
	TaskBoardComment,
	TaskBoardDetail,
	TaskBoardSummary,
	TaskBoardTask,
	TaskBoardTaskDetail,
} from '@n8n/api-types';
import {
	getFullApiResponse,
	getProject,
	makeRestApiRequest,
	type IRestApiContext,
	type Project,
	type ProjectSharingData,
} from '@n8n/rest-api-client';

import { AGENTS_PAGE_LIMIT } from './task-board.constants';
import type {
	AgentModelCatalog,
	CreateAgentPayload,
	CreateCommentPayload,
	CreateTaskBoardPayload,
	CreateTaskPayload,
	SkillListScope,
	TaskBoardAgentDetail,
	TaskBoardCredentialOption,
	TaskBoardRef,
	TaskRef,
	UpdateAgentConfigPayload,
	UpdateTaskPayload,
} from './task-board.types';

function boardPath({ projectId, boardId }: TaskBoardRef) {
	return `/projects/${projectId}/task-boards/${boardId}`;
}

function taskPath(ref: TaskRef) {
	return `${boardPath(ref)}/tasks/${ref.taskId}`;
}

export async function fetchAllTaskBoards(context: IRestApiContext): Promise<TaskBoardSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/task-boards');
}

export async function createTaskBoardFromTemplate(
	context: IRestApiContext,
	projectId: string,
	payload: CreateTaskBoardPayload,
): Promise<TaskBoardDetail> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/projects/${projectId}/task-boards/from-template`,
		payload,
	);
}

export async function fetchTaskBoard(
	context: IRestApiContext,
	ref: TaskBoardRef,
): Promise<TaskBoardDetail> {
	return await makeRestApiRequest(context, 'GET', boardPath(ref));
}

export async function deleteTaskBoard(context: IRestApiContext, ref: TaskBoardRef): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', boardPath(ref));
}

/** Puts an agent of the project on the team of the board. */
export async function addTaskBoardAgent(
	context: IRestApiContext,
	ref: TaskBoardRef,
	agentId: string,
): Promise<void> {
	await makeRestApiRequest(context, 'PUT', `${boardPath(ref)}/agents/${agentId}`);
}

export async function createTask(
	context: IRestApiContext,
	ref: TaskBoardRef,
	payload: CreateTaskPayload,
): Promise<TaskBoardTask> {
	return await makeRestApiRequest(context, 'POST', `${boardPath(ref)}/tasks`, payload);
}

export async function updateTask(
	context: IRestApiContext,
	ref: TaskRef,
	payload: UpdateTaskPayload,
): Promise<TaskBoardTask> {
	return await makeRestApiRequest(context, 'PATCH', taskPath(ref), payload);
}

export async function fetchTask(
	context: IRestApiContext,
	ref: TaskRef,
): Promise<TaskBoardTaskDetail> {
	return await makeRestApiRequest(context, 'GET', taskPath(ref));
}

export async function createTaskComment(
	context: IRestApiContext,
	ref: TaskRef,
	payload: CreateCommentPayload,
): Promise<TaskBoardComment> {
	return await makeRestApiRequest(context, 'POST', `${taskPath(ref)}/comments`, payload);
}

/** The projects of the current user, for project names and the personal project. */
export async function fetchMyProjects(context: IRestApiContext): Promise<ProjectSharingData[]> {
	return await makeRestApiRequest(context, 'GET', '/projects/my-projects');
}

/** The project with its members (`relations`). */
export async function fetchProjectWithMembers(
	context: IRestApiContext,
	projectId: string,
): Promise<Project> {
	return await getProject(context, projectId);
}

// The agents and skills modules own the endpoints below. The Team section stores each team
// member as a normal agent, so it uses the same endpoints as the agent editor
// (`editor-ui/src/features/agents/composables/useAgentApi.ts`).

function agentsPath(projectId: string) {
	return `/projects/${projectId}/agents/v2`;
}

export type TaskBoardAgentListItem = Pick<AgentListItemDto, 'id' | 'name' | 'isArchived'>;

/** The agents of a project. */
export async function fetchProjectAgents(
	context: IRestApiContext,
	projectId: string,
): Promise<TaskBoardAgentListItem[]> {
	const { data } = await getFullApiResponse<TaskBoardAgentListItem[]>(
		context,
		'GET',
		agentsPath(projectId),
		{ offset: 0, limit: AGENTS_PAGE_LIMIT },
	);
	return data;
}

/** One agent with its draft config and its publish state. */
export async function fetchAgent(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TaskBoardAgentDetail> {
	return await makeRestApiRequest(context, 'GET', `${agentsPath(projectId)}/${agentId}`);
}

/** Creates a draft agent. Without `config.model` the server resolves a default model. */
export async function createAgent(
	context: IRestApiContext,
	projectId: string,
	payload: CreateAgentPayload,
): Promise<TaskBoardAgentDetail> {
	return await makeRestApiRequest(context, 'POST', agentsPath(projectId), payload);
}

/** The draft config and its hash. Send the hash back as `baseConfigHash` on save. */
export async function fetchAgentConfig(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentConfigResponse> {
	return await makeRestApiRequest(context, 'GET', `${agentsPath(projectId)}/${agentId}/config`);
}

/** Replaces the draft config. Skills attach through `config.skills` refs. */
export async function updateAgentConfig(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: UpdateAgentConfigPayload,
): Promise<AgentConfigMutationResponse> {
	return await makeRestApiRequest(
		context,
		'PUT',
		`${agentsPath(projectId)}/${agentId}/config`,
		payload,
	);
}

/** Publishes the current draft. Trigger runs (the board dispatcher) use the published version. */
export async function publishAgent(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<TaskBoardAgentDetail> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${agentsPath(projectId)}/${agentId}/publish`,
		{},
	);
}

/** The static model catalog, keyed by provider. */
export async function fetchAgentModelCatalog(
	context: IRestApiContext,
	projectId: string,
): Promise<AgentModelCatalog> {
	return await makeRestApiRequest(context, 'GET', `${agentsPath(projectId)}/catalog/models`);
}

/** The credentials that an agent of the project may use. */
export async function fetchAgentCredentials(
	context: IRestApiContext,
	projectId: string,
): Promise<TaskBoardCredentialOption[]> {
	return await makeRestApiRequest(context, 'GET', '/credentials/for-workflow', {
		projectId,
		forAgent: 'true',
	});
}

/** Skills from the skills library. */
export async function fetchSkills(
	context: IRestApiContext,
	scope: SkillListScope,
): Promise<SkillListItem[]> {
	const { data } = await makeRestApiRequest<SkillListResponse>(context, 'GET', '/skills', scope);
	return data;
}
