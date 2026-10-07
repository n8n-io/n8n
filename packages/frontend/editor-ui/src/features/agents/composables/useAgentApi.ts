import type { AgentTaskCancellationState, AgentTaskCancellationDto } from '@n8n/api-types';
import type {
	AgentApproval,
	AgentBudgetSpend,
	AgentBackgroundJobsResponse,
	AgentCapabilitySummary,
	AgentChatListItem,
	AgentChatListResponse,
	AgentChatMessagesResponse,
	AgentChatQueueResponse,
	AgentChatQueueUpdateDto,
	AgentChatQueueSteerDto,
	AgentChatQueueReorderDto,
	AgentChatResumeDto,
	AgentConfigMutationResponse,
	AgentConfigResponse,
	AgentConfigValidationResponse,
	AgentDisconnectIntegrationResponse,
	AgentFileDto,
	AgentIntegrationConnectResponse,
	AgentIntegrationStatusResponse,
	AgentWhatsAppVerifyTokenResponse,
	AgentJsonVectorStoreConfig,
	AgentN8nChatThreadSummary,
	AgentN8nChatThreadsResponse,
	AgentSkill,
	AgentsSettingsDto,
	AgentSkillMutationResponse,
	AgentTaskConfig,
	AgentTaskDto,
	AgentIntegrationSettings,
	AgentCatalogModel,
	AgentProviderModelsResponse,
	AgentVersionListItemDto,
	ChatIntegrationDescriptor,
	VectorStoreTestResult,
} from '@n8n/api-types';
import { getFullApiResponse, makeRestApiRequest, request } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { isRecord } from '@n8n/utils/is-record';
import { UnexpectedError } from 'n8n-workflow';
import type { AgentResource, AgentJsonConfig, CustomToolEntry } from '../types';

export async function getAgentsSettings(context: IRestApiContext): Promise<AgentsSettingsDto> {
	return await makeRestApiRequest(context, 'GET', '/agents/settings');
}

export async function updateAgentsSettings(
	context: IRestApiContext,
	settings: AgentsSettingsDto,
): Promise<AgentsSettingsDto> {
	return await makeRestApiRequest(context, 'PUT', '/agents/settings', settings);
}

/**
 * Which chat backend a request targets — the value is the URL segment
 * itself. `'chat'` (default) is the agent builder's draft/test chat;
 * `'n8n-chat'` is the published n8n Chat channel (see `useAgentChatStream`'s
 * `capabilities` for what that channel cannot do).
 */
export type AgentChatChannel = 'chat' | 'n8n-chat';

/**
 * Relative path for a chat route on either channel: `/projects/<projectId>/agents/v2/<agentId>/<channel>`.
 * Use this for every `makeRestApiRequest` call — it prepends `context.baseUrl` itself,
 * so passing an already-absolute URL there doubles it (e.g. `/rest/rest/...`).
 */
export const agentChatPath = (
	projectId: string,
	agentId: string,
	channel: AgentChatChannel = 'chat',
): string =>
	`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/${channel}`;

/**
 * Absolute URL for a chat route on either channel. Only for callers that need a full
 * URL themselves — a `fetch()` call, or a download/`<img>` URL — never pass this to
 * `makeRestApiRequest`, which prepends `context.baseUrl` on its own.
 */
export const agentChatBaseUrl = (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	channel: AgentChatChannel = 'chat',
): string => `${context.baseUrl}${agentChatPath(projectId, agentId, channel)}`;

export type ListAgentsSortBy =
	| 'name:asc'
	| 'name:desc'
	| 'createdAt:asc'
	| 'createdAt:desc'
	| 'updatedAt:asc'
	| 'updatedAt:desc';

export type ListAgentsOptions = {
	skip?: number;
	take?: number;
	sortBy?: ListAgentsSortBy;
	filter?: {
		query?: string;
		availableInMCP?: boolean;
	};
};

const AGENTS_LIST_PAGE_SIZE = 250;

export const listAgentsPage = async (
	context: IRestApiContext,
	projectId: string,
	options: ListAgentsOptions,
): Promise<{ count: number; data: AgentResource[] }> => {
	return await getFullApiResponse<AgentResource[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2`,
		options,
	);
};

export const listAgentsPageGlobal = async (
	context: IRestApiContext,
	options: ListAgentsOptions,
): Promise<{ count: number; data: AgentResource[] }> => {
	return await getFullApiResponse<AgentResource[]>(context, 'GET', '/agents/v2', options);
};

/** One agent as the n8n Chat page needs it (see the backend route's doc for why `getAgent` won't do). */
export const getN8nChatAgent = async (
	context: IRestApiContext,
	agentId: string,
): Promise<AgentChatListItem> => {
	return await makeRestApiRequest<AgentChatListItem>(
		context,
		'GET',
		`/agents/v2/n8n-chat/agents/${encodeURIComponent(agentId)}`,
	);
};

/** Ranks by the requesting user's own n8n Chat usage, then newest created. */
export type N8nChatAgentsSortBy = 'usage:desc';

export type ListN8nChatAgentsOptions = {
	query?: string;
	skip?: number;
	take?: number;
	sortBy?: N8nChatAgentsSortBy;
};

/**
 * Agents available to chat with over n8n Chat — the n8n Chat page's agent library.
 * Trims `query` and omits it when blank — the only place that does, so callers
 * can pass the raw search input straight through.
 */
export const listN8nChatAgents = async (
	context: IRestApiContext,
	options: ListN8nChatAgentsOptions,
): Promise<AgentChatListResponse> => {
	const { query, skip, take, sortBy } = options;
	const trimmedQuery = query?.trim();
	return await getFullApiResponse<AgentChatListItem[]>(context, 'GET', '/agents/v2', {
		filter: { availableInChat: true, ...(trimmedQuery ? { query: trimmedQuery } : {}) },
		skip,
		take,
		sortBy,
	});
};

/** Options for {@link listN8nChatThreads}. `cursor` is a thread's `updatedAt` ISO string. */
export type ListN8nChatThreadsOptions = {
	limit: number;
	cursor?: string;
	/** Filters threads to one agent. */
	agentId?: string;
};

/** Narrows the raw response body — `request` returns `unknown`, and this avoids an `as` cast. */
function isN8nChatThreadsResponse(body: unknown): body is AgentN8nChatThreadsResponse {
	return (
		isRecord(body) &&
		Array.isArray(body.data) &&
		(body.nextCursor === null || typeof body.nextCursor === 'string')
	);
}

/**
 * The user's own n8n Chat threads across every agent they can reach, newest first.
 * The controller writes `{ data, nextCursor }` directly, without the usual `data`-key
 * envelope — `makeRestApiRequest` would unwrap `data` and drop `nextCursor`, so this
 * reads the full response instead (same reasoning as `evaluation.api.ts`'s raw `request` calls).
 */
export const listN8nChatThreads = async (
	context: IRestApiContext,
	options: ListN8nChatThreadsOptions,
): Promise<AgentN8nChatThreadsResponse> => {
	const response: unknown = await request({
		method: 'GET',
		baseURL: context.baseUrl,
		endpoint: '/agents/v2/n8n-chat/threads',
		headers: { 'push-ref': context.pushRef },
		data: { limit: options.limit, cursor: options.cursor, agentId: options.agentId },
	});
	if (!isN8nChatThreadsResponse(response)) {
		throw new UnexpectedError('Unexpected n8n Chat threads response shape');
	}
	return response;
};

/** One of the user's own n8n Chat threads, for the chat page to read a title outside the recent-threads page. */
export const getN8nChatThread = async (
	context: IRestApiContext,
	threadId: string,
): Promise<AgentN8nChatThreadSummary> => {
	return await makeRestApiRequest<AgentN8nChatThreadSummary>(
		context,
		'GET',
		`/agents/v2/n8n-chat/threads/${encodeURIComponent(threadId)}`,
	);
};

export const listAgents = async (
	context: IRestApiContext,
	projectId: string,
): Promise<AgentResource[]> => {
	const agents: AgentResource[] = [];
	let total = 0;

	do {
		const { count, data } = await listAgentsPage(context, projectId, {
			skip: agents.length,
			take: AGENTS_LIST_PAGE_SIZE,
		});
		agents.push(...data);
		total = count;

		if (data.length === 0) break;
	} while (agents.length < total);

	return agents;
};

export const getAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}`,
	);
};

export const createAgent = async (
	context: IRestApiContext,
	projectId: string,
	name: string,
	/** Creates the agent under an already-minted id, so a surface that referenced
	 *  it while unsaved keeps pointing at the same agent. Pass `schema`/`tools`/
	 *  `skills` to seed a full agent in a duplicate operation). */
	options: {
		id?: string;
		schema?: AgentJsonConfig;
		tools?: Record<string, CustomToolEntry>;
		skills?: Record<string, AgentSkill>;
	} = {},
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2`,
		{
			name,
			...(options.id ? { id: options.id } : {}),
			...(options.schema ? { schema: options.schema } : {}),
			...(options.tools ? { tools: options.tools } : {}),
			...(options.skills ? { skills: options.skills } : {}),
		},
	);
};

export const duplicateAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	name: string,
): Promise<AgentResource> => {
	const [agent, configResponse] = await Promise.all([
		getAgent(context, projectId, agentId),
		getAgentConfig(context, projectId, agentId),
	]);
	// Task bodies live in a separate table we don't copy, so drop the refs —
	// otherwise the clone carries dangling task ids and cannot be published.
	// Channels are copied without their credential: the claim check ignores
	// publish state, so keeping the source's credentialId would 409 at publish
	// time (and break the source's channel). Blank to drafts so the builder
	// opens the copy with a "connect a channel" chip instead.
	const { tasks: _tasks, integrations: sourceIntegrations, ...rest } = configResponse.config;
	const draftIntegrations = (sourceIntegrations ?? []).map((integration) =>
		integration.type === 'n8n_chat' ? integration : { ...integration, credentialId: '' },
	);
	return await createAgent(context, projectId, name, {
		schema: { ...rest, name, integrations: draftIntegrations },
		tools: agent.tools,
		skills: agent.skills,
	});
};

export const deleteAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/projects/${projectId}/agents/v2/${agentId}`);
};

export const listAgentFiles = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentFileDto[]> => {
	return await makeRestApiRequest<AgentFileDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/files`,
	);
};

export const uploadAgentFiles = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	files: File[],
): Promise<AgentFileDto[]> => {
	const formData = new FormData();
	for (const file of files) {
		formData.append('files', file);
	}

	return await makeRestApiRequest<AgentFileDto[]>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/files`,
		formData,
	);
};

export const deleteAgentFile = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	fileId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/files/${fileId}`,
	);
};

export const warmAgentKnowledgeSandbox = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<{ accepted: true }> => {
	return await makeRestApiRequest<{ accepted: true }>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/sandbox/knowledge/warmup`,
	);
};

/** `replaces` swaps a same-type channel in the same request instead of a follow-up disconnect. */
export interface ConnectIntegrationOptions {
	replaces?: { credentialId: string };
	/** Channel actions that need approval before they run. */
	approval?: AgentApproval;
}

export const connectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
	settings?: AgentIntegrationSettings,
	options?: ConnectIntegrationOptions,
): Promise<AgentIntegrationConnectResponse> => {
	return await makeRestApiRequest<AgentIntegrationConnectResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/connect`,
		{
			type,
			credentialId,
			...(settings ? { settings } : {}),
			...(options?.replaces ? { replaces: options.replaces } : {}),
			...(options?.approval ? { approval: options.approval } : {}),
		},
	);
};

export const disconnectIntegration = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	type: string,
	credentialId: string,
	deleteExternalResource?: boolean,
): Promise<AgentDisconnectIntegrationResponse> => {
	return await makeRestApiRequest<AgentDisconnectIntegrationResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/disconnect`,
		{ type, credentialId, deleteExternalResource },
	);
};

export const getIntegrationStatus = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentIntegrationStatusResponse> => {
	return await makeRestApiRequest<AgentIntegrationStatusResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/status`,
	);
};

export const getWhatsAppVerifyToken = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentWhatsAppVerifyTokenResponse> => {
	return await makeRestApiRequest<AgentWhatsAppVerifyTokenResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/integrations/whatsapp/verify-token`,
	);
};

export const getAgentTasks = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentTaskDto[]> => {
	return await makeRestApiRequest<AgentTaskDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/tasks`,
	);
};

export const createAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: AgentTaskConfig & { enabled?: boolean },
): Promise<AgentTaskDto> => {
	return await makeRestApiRequest<AgentTaskDto>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/tasks`,
		payload,
	);
};

export const updateAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
	payload: Partial<AgentTaskConfig>,
): Promise<AgentTaskDto> => {
	return await makeRestApiRequest<AgentTaskDto>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}`,
		payload,
	);
};

export const deleteAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
): Promise<{ success: true }> => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}`,
	);
};

export const runAgentTask = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	taskId: string,
): Promise<{ success: true }> => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/tasks/${taskId}/run`,
	);
};

export type ModelInfo = AgentCatalogModel;

export interface ProviderInfo {
	id: string;
	name: string;
	models: Record<string, ModelInfo>;
}

export type ProviderCatalog = Record<string, ProviderInfo>;

export const getModelCatalog = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ProviderCatalog> => {
	return await makeRestApiRequest<ProviderCatalog>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/models`,
	);
};

export const getProviderModels = async (
	context: IRestApiContext,
	projectId: string,
	provider: string,
	credentialId?: string,
): Promise<AgentProviderModelsResponse> => {
	return await makeRestApiRequest<AgentProviderModelsResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/models/${provider}`,
		credentialId ? { credentialId } : undefined,
	);
};

export const publishAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	versionId?: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/publish`,
		versionId ? { versionId } : undefined,
	);
};

export const unpublishAgent = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/unpublish`,
	);
};

export const revertAgentToPublished = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/revert-to-published`,
	);
};

export const revertAgentToVersion = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	versionId: string,
): Promise<AgentResource> => {
	return await makeRestApiRequest<AgentResource>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/revert-to-version`,
		{ versionId },
	);
};

export const listAgentVersions = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	params: { take: number; skip: number },
): Promise<AgentVersionListItemDto[]> => {
	return await makeRestApiRequest<AgentVersionListItemDto[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/versions`,
		params,
	);
};

export const getAgentBudgetSpend = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentBudgetSpend> => {
	return await makeRestApiRequest<AgentBudgetSpend>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/budget`,
	);
};

export const getAgentConfig = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentConfigResponse> => {
	return await makeRestApiRequest<AgentConfigResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/config`,
	);
};

/**
 * Static, authoritative readiness check for the current draft. Never
 * performs live/network validation — safe to call frequently. The publish
 * endpoint re-checks this independently, so this is purely for UI feedback
 * (disabled Publish tooltip, invalid capability chips).
 */
export const getAgentConfigValidation = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentConfigValidationResponse> => {
	return await makeRestApiRequest<AgentConfigValidationResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/validation`,
	);
};

export const getAgentCapabilitySummary = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentCapabilitySummary> => {
	return await makeRestApiRequest<AgentCapabilitySummary>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/summary`,
	);
};

export const updateAgentConfig = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	config: AgentJsonConfig,
	baseConfigHash: string | null,
): Promise<AgentConfigMutationResponse> => {
	return await makeRestApiRequest<AgentConfigMutationResponse>(
		context,
		'PUT',
		`/projects/${projectId}/agents/v2/${agentId}/config`,
		{ config, baseConfigHash },
	);
};

export const createAgentSkill = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skill: AgentSkill,
): Promise<AgentSkillMutationResponse> => {
	return await makeRestApiRequest<AgentSkillMutationResponse>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/${agentId}/skills`,
		skill,
	);
};

export const updateAgentSkill = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skillId: string,
	updates: Partial<AgentSkill>,
	baseSkillHash?: string,
): Promise<AgentSkillMutationResponse> => {
	return await makeRestApiRequest<AgentSkillMutationResponse>(
		context,
		'PATCH',
		`/projects/${projectId}/agents/v2/${agentId}/skills/${skillId}`,
		{ ...updates, baseSkillHash },
	);
};

export const getAgentBackgroundJobs = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
): Promise<AgentBackgroundJobsResponse> => {
	return await makeRestApiRequest<AgentBackgroundJobsResponse>(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/background-tasks`,
	);
};

export const resumeAgentBackgroundJob = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	payload: AgentChatResumeDto,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/background-tasks/resume`,
		payload,
	);
};

export const stopAgentBackgroundJobs = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
): Promise<AgentBackgroundJobsResponse> => {
	return await makeRestApiRequest<AgentBackgroundJobsResponse>(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/background-tasks/stop`,
	);
};

export const getAgentChatQueue = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	channel: AgentChatChannel = 'chat',
): Promise<AgentChatQueueResponse> => {
	return await makeRestApiRequest(
		context,
		'GET',
		`${agentChatPath(projectId, agentId, channel)}/${encodeURIComponent(threadId)}/queue`,
	);
};

export const updateAgentQueuedMessage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	queueId: string,
	payload: AgentChatQueueUpdateDto,
	channel: AgentChatChannel = 'chat',
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'PATCH',
		`${agentChatPath(projectId, agentId, channel)}/${encodeURIComponent(threadId)}/queue/${encodeURIComponent(queueId)}`,
		payload,
	);
};

export const reorderAgentQueuedMessage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	queueId: string,
	payload: AgentChatQueueReorderDto,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/queue/${encodeURIComponent(queueId)}/reorder`,
		payload,
	);
};

export const removeAgentQueuedMessage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	queueId: string,
	channel: AgentChatChannel = 'chat',
): Promise<{ removed: boolean }> => {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`${agentChatPath(projectId, agentId, channel)}/${encodeURIComponent(threadId)}/queue/${encodeURIComponent(queueId)}`,
	);
};

export const steerAgentQueuedMessage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	queueId: string,
	payload: AgentChatQueueSteerDto,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'POST',
		`${agentChatPath(projectId, agentId)}/${encodeURIComponent(threadId)}/queue/${encodeURIComponent(queueId)}/steer`,
		payload,
	);
};

export const getChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	channel: AgentChatChannel = 'chat',
): Promise<AgentChatMessagesResponse> => {
	return await makeRestApiRequest<AgentChatMessagesResponse>(
		context,
		'GET',
		`${agentChatPath(projectId, agentId, channel)}/${encodeURIComponent(threadId)}/messages`,
	);
};

/** Builds the download/thumbnail URL for a chat attachment on either channel. */
export const getChatAttachmentUrl = (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	attachmentId: string,
	channel: AgentChatChannel = 'chat',
): string =>
	`${agentChatBaseUrl(context, projectId, agentId, channel)}/attachments/${encodeURIComponent(attachmentId)}`;

export const getTestChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentChatMessagesResponse> => {
	return await makeRestApiRequest<AgentChatMessagesResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/chat/messages`,
	);
};

export const clearTestChatMessages = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/chat/messages`,
	);
};

export const cancelAgentChatRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
	channel: AgentChatChannel = 'chat',
): Promise<{ cancelled: boolean }> => {
	return await makeRestApiRequest<{ cancelled: boolean }>(
		context,
		'DELETE',
		`${agentChatPath(projectId, agentId, channel)}/runs/${encodeURIComponent(runId)}`,
		...(channel === 'chat' ? [{ scope: 'foreground' }] : []),
	);
};

export const cancelAgentChatExecution = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	executionId: string,
	channel: AgentChatChannel = 'chat',
): Promise<{ cancelRequested: boolean }> => {
	return await makeRestApiRequest(
		context,
		'DELETE',
		`${agentChatPath(projectId, agentId, channel)}/${encodeURIComponent(threadId)}/executions/${encodeURIComponent(executionId)}`,
		...(channel === 'chat' ? [{ scope: 'foreground' }] : []),
	);
};

export const deleteCustomTool = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	toolId: string,
): Promise<void> => {
	await makeRestApiRequest(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/tools/${toolId}`,
	);
};

export const testAgentVectorStore = async (
	context: IRestApiContext,
	projectId: string,
	vectorStore: AgentJsonVectorStoreConfig,
): Promise<VectorStoreTestResult> => {
	return await makeRestApiRequest<VectorStoreTestResult>(
		context,
		'POST',
		`/projects/${projectId}/agents/v2/vector-stores/test`,
		{ vectorStore },
	);
};

export const listAgentIntegrations = async (
	context: IRestApiContext,
	projectId: string,
): Promise<ChatIntegrationDescriptor[]> => {
	return await makeRestApiRequest<ChatIntegrationDescriptor[]>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/catalog/integrations`,
	);
};

export const getAgentWriteLock = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<{ clientId: string; userId: string } | null> => {
	return await makeRestApiRequest<{ clientId: string; userId: string } | null>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/collaboration/write-lock`,
	);
};

export const getAgentTaskCancellation = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
): Promise<AgentTaskCancellationState | null> =>
	await makeRestApiRequest(
		context,
		'GET',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/task-cancellation`,
	);

export const cancelAgentTasks = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	payload: AgentTaskCancellationDto,
): Promise<AgentTaskCancellationState> =>
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/task-cancellation`,
		payload,
	);

export const sendHeldAgentMessage = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	threadId: string,
	queueId: string,
): Promise<void> =>
	await makeRestApiRequest(
		context,
		'POST',
		`/projects/${encodeURIComponent(projectId)}/agents/v2/${encodeURIComponent(agentId)}/chat/${encodeURIComponent(threadId)}/queue/${encodeURIComponent(queueId)}/send`,
	);
