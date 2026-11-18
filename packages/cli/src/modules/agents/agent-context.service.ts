import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { AgentJsonConfigBaseSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	AgentContextLookup,
	AgentSessionList,
	AgentSessionListOptions,
	AgentSessionSummary,
	AgentContextReader,
	AgentContextResult,
	AgentProductionTrace,
	AgentProductionTraceSummary,
	AgentProductionTraceWindow,
	AgentProjectListItem,
	AgentPublishedVersion,
	AgentSessionDetail,
} from './agent-context.contracts';

import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ForbiddenError, NotFoundError, UserError } from '@n8n/errors';

import {
	AgentExecutionService,
	toSessionStatus,
	type ThreadDetail,
	type ThreadListItem,
} from './agent-execution.service';
import { listAgentTasks, readAgentSkill } from './agent-context-readers';
import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentConfigService } from './agent-config.service';
import { AgentTaskService } from './agent-task.service';
import { AgentsSettingsService } from './agents-settings.service';
import { AgentsToolsService } from './agents-tools.service';
import { AgentsService } from './agents.service';
import { AttachableWorkflowsService } from './attachable-workflows.service';
import { AGENT_CAPABILITIES, AGENT_LIMITATIONS } from './agent-capabilities';
import { toAgentSessionDetail, toSessionTitle } from './agent-session-read';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import type { AgentExecution } from './entities/agent-execution.entity';
import { AgentPublishHistoryRepository } from './repositories/agent-publish-history.repository';
import { composeJsonConfig } from './json-config/agent-config-composition';
import { jsonSchemaToCompactText } from './json-config/schema-text-serializer';
import { getAgentConfigHash } from './utils/agent-config-hash';
import { isAgentDraftClean } from './utils/agent-draft-clean';

/** Keeps a list of session summaries small enough for a model to read. */
const TRACE_USER_MESSAGE_MAX_LENGTH = 500;

/** Each listed session loads the timelines of its turns, so one page must stay small. */
const TRACE_LIST_MAX_LIMIT = 100;

const toWholeNumber = (value: number, min: number, max: number): number =>
	Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), min), max) : min;

/** Null when no turn has a value. */
const sumOrNull = (values: Array<number | null>): number | null => {
	const present = values.flatMap((value) => (value === null ? [] : [value]));
	return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null;
};

/** `turns` holds the turns of the session in the window, oldest first. It is not empty. */
const toProductionTraceSummary = (
	sessionId: string,
	turns: AgentExecution[],
): AgentProductionTraceSummary => ({
	sessionId,
	source: turns.find(({ source }) => source)?.source ?? null,
	lastActivityAt: turns[turns.length - 1].createdAt.toISOString(),
	turnCount: turns.length,
	firstUserMessage: turns[0].userMessage?.slice(0, TRACE_USER_MESSAGE_MAX_LENGTH) ?? null,
	toolNames: turns.flatMap(({ timeline }) =>
		(timeline ?? []).flatMap((event) => (event.type === 'tool-call' ? [event.name] : [])),
	),
	failure:
		turns
			.map((turn) => turn.error ?? turn.failureSummary?.latest.message ?? null)
			.find((failure) => failure !== null) ?? null,
	cost: sumOrNull(turns.map(({ cost }) => cost)),
	totalTokens: sumOrNull(turns.map(({ totalTokens }) => totalTokens)),
	durationMs: sumOrNull(turns.map(({ duration }) => duration)),
});

const toSessionSummary = (thread: ThreadListItem): AgentSessionSummary => ({
	threadId: thread.id,
	agentId: thread.agentId,
	agentName: thread.agentName,
	title: toSessionTitle(thread.title, thread.sessionNumber),
	sessionNumber: thread.sessionNumber,
	createdAt: thread.createdAt.toISOString(),
	updatedAt: thread.updatedAt.toISOString(),
	status: thread.status,
	origin: thread.source,
	failureCount: thread.failureSummary?.count ?? 0,
	totalPromptTokens: thread.totalPromptTokens,
	totalCompletionTokens: thread.totalCompletionTokens,
	totalDuration: thread.totalDuration,
});

const toSessionDetailSummary = (detail: ThreadDetail): AgentSessionSummary => {
	const failureCount = detail.executions.reduce(
		(count, execution) => count + (execution.failureSummary?.count ?? 0),
		0,
	);
	const latestStatus = detail.executions.at(-1)?.status;
	const status = toSessionStatus(latestStatus);

	return {
		threadId: detail.thread.id,
		agentId: detail.thread.agentId,
		agentName: detail.thread.agentName,
		title: toSessionTitle(detail.thread.title, detail.thread.sessionNumber),
		sessionNumber: detail.thread.sessionNumber,
		createdAt: detail.thread.createdAt.toISOString(),
		updatedAt: detail.thread.updatedAt.toISOString(),
		status,
		origin: detail.executions.find((execution) => execution.source)?.source ?? null,
		failureCount,
		totalPromptTokens: detail.thread.totalPromptTokens,
		totalCompletionTokens: detail.thread.totalCompletionTokens,
		totalDuration: detail.thread.totalDuration,
	};
};

@Service()
export class AgentContextService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly agentTaskService: AgentTaskService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentIntegrationService: AgentIntegrationPersistenceService,
		private readonly attachableWorkflowsService: AttachableWorkflowsService,
		private readonly mcpRegistryService: McpRegistryService,
		private readonly agentsToolsService: AgentsToolsService,
		private readonly agentSkillRefs: AgentSkillRefsService,
		private readonly agentsSettingsService: AgentsSettingsService,
		private readonly agentConfigService: AgentConfigService,
		private readonly agentPublishHistoryRepository: AgentPublishHistoryRepository,
	) {}

	private async assertReadAccess(user: User, projectId: string): Promise<void> {
		await this.agentsSettingsService.assertEnabled();
		if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to access agents in this project.');
		}
	}

	async resolveAgentName(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<string | undefined> {
		await this.assertReadAccess(user, projectId);
		return (await this.agentsService.findById(agentId, projectId))?.name;
	}

	async readArtifact(user: User, projectId: string, agentId: string) {
		await this.assertReadAccess(user, projectId);
		const config = await this.agentConfigService
			.getConfig(agentId, projectId)
			.catch((error: unknown) => {
				if (error instanceof UserError) return null;
				throw error;
			});
		if (!config) return null;
		return {
			config,
			skills: await this.agentSkillsService.listSkills(agentId, projectId),
			configHash: getAgentConfigHash(config),
		};
	}

	async readSession(
		user: User,
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<AgentSessionDetail | null> {
		await this.assertReadAccess(user, projectId);
		const detail = await this.agentExecutionService.getThreadDetail(
			threadId,
			projectId,
			agentId,
			user.id,
		);
		if (!detail) return null;
		return toAgentSessionDetail(detail);
	}

	async listSessions(
		user: User,
		projectId: string,
		agentId: string,
		options: AgentSessionListOptions,
	): Promise<AgentSessionList> {
		await this.assertReadAccess(user, projectId);
		return await this.findSessions(user, projectId, agentId, options);
	}

	private async findSessions(
		user: User,
		projectId: string,
		agentId: string,
		options: AgentSessionListOptions,
	): Promise<AgentSessionList> {
		const result = await this.agentExecutionService.getThreads(
			projectId,
			agentId,
			user.id,
			options.limit ?? 20,
			options.cursor,
			{
				...(options.status ? { status: options.status } : {}),
				...(options.origin ? { origin: options.origin } : {}),
				...(options.updatedAfter ? { updatedAfter: new Date(options.updatedAfter) } : {}),
				...(options.updatedBefore ? { updatedBefore: new Date(options.updatedBefore) } : {}),
			},
		);
		return {
			sessions: result.threads.map(toSessionSummary),
			nextCursor: result.nextCursor,
		};
	}

	/**
	 * The agents of a project that are not archived. It does not check a user:
	 * the caller must check access to the project first.
	 */
	async listProjectAgents(projectId: string): Promise<AgentProjectListItem[]> {
		if (!(await this.agentsSettingsService.getEnabled())) return [];
		const agents = await this.agentsService.findByProjectId(projectId);
		return agents
			.filter((agent) => !agent.isArchived)
			.map((agent) => ({
				id: agent.id,
				name: agent.name,
				published: agent.activeVersionId !== null,
			}));
	}

	/**
	 * The published version of an agent, for a background job without a user.
	 * Returns null when the agent does not exist, is archived, or is not published.
	 */
	async getPublishedVersion(
		projectId: string,
		agentId: string,
	): Promise<AgentPublishedVersion | null> {
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent || agent.isArchived || agent.activeVersionId === null) return null;
		const versionId = agent.activeVersionId;

		const publications = await this.agentPublishHistoryRepository.findLatestForVersions(
			agent.id,
			[versionId],
			{},
		);
		// A version without a publication row falls back to its save time.
		const publishedAt =
			publications.get(versionId)?.createdAt ?? agent.activeVersion?.createdAt ?? agent.updatedAt;

		// A draft that refers to a deleted skill cannot be compared. It is not clean.
		const clean = await isAgentDraftClean(agent, this.agentSkillRefs).catch((error: unknown) => {
			if (error instanceof UserError) return false;
			throw error;
		});
		return { versionId, publishedAt, agentName: agent.name, clean };
	}

	/** Counts the production sessions that have a turn in the window. */
	/** When a version of an agent was last published. Null when it has no publication row. */
	async getVersionPublishedAt(agentId: string, versionId: string): Promise<Date | null> {
		const publications = await this.agentPublishHistoryRepository.findLatestForVersions(
			agentId,
			[versionId],
			{},
		);
		return publications.get(versionId)?.createdAt ?? null;
	}

	async countProductionTraces(
		user: User,
		projectId: string,
		agentId: string,
		window: AgentProductionTraceWindow,
	): Promise<number> {
		await this.assertReadAccess(user, projectId);
		return await this.agentExecutionService.countProductionTraceSessions({
			projectId,
			agentId,
			readerId: user.id,
			...window,
		});
	}

	/**
	 * Production sessions that have a turn in the window, newest activity first.
	 * One page holds 100 sessions at most.
	 */
	async listProductionTraces(
		user: User,
		projectId: string,
		agentId: string,
		window: AgentProductionTraceWindow,
		options: { limit: number; offset: number },
	): Promise<AgentProductionTraceSummary[]> {
		await this.assertReadAccess(user, projectId);
		const sessions = await this.agentExecutionService.listProductionTraceSessions(
			{ projectId, agentId, readerId: user.id, ...window },
			{
				limit: toWholeNumber(options.limit, 1, TRACE_LIST_MAX_LIMIT),
				offset: toWholeNumber(options.offset, 0, Number.MAX_SAFE_INTEGER),
			},
		);
		return sessions.map(({ threadId, turns }) => toProductionTraceSummary(threadId, turns));
	}

	/**
	 * The full conversation of a production session. Returns null when the
	 * session has no production turn in the window.
	 */
	async readProductionTrace(
		user: User,
		projectId: string,
		agentId: string,
		sessionId: string,
		window: AgentProductionTraceWindow,
	): Promise<AgentProductionTrace | null> {
		await this.assertReadAccess(user, projectId);
		const detail = await this.agentExecutionService.getProductionTraceSession(
			{ projectId, agentId, readerId: user.id, ...window },
			sessionId,
		);
		if (!detail) return null;
		return {
			...toProductionTraceSummary(sessionId, detail.turns),
			session: toAgentSessionDetail(detail),
		};
	}

	createReader(user: User, projectId: string): AgentContextReader {
		return {
			lookup: async (input) => {
				// Checked on every lookup, so a run loses access as soon as Agents are turned off.
				await this.agentsSettingsService.assertEnabled().catch((error: unknown) => {
					throw error instanceof ForbiddenError ? new UserError(error.message) : error;
				});
				if (!(await userHasScopes(user, ['agent:read'], false, { projectId }))) {
					throw new UserError("You don't have permission to read Agents in this project.");
				}
				try {
					return await this.lookup(user, projectId, input);
				} catch (error) {
					if (error instanceof NotFoundError || error instanceof ForbiddenError) {
						throw new UserError(error.message);
					}
					throw error;
				}
			},
		};
	}

	private async lookup(
		user: User,
		projectId: string,
		input: AgentContextLookup,
	): Promise<AgentContextResult> {
		if (input.type === 'agents') {
			const agents = await this.agentsService.findByProjectId(projectId);
			return {
				agents: agents
					.filter((agent) => !agent.isArchived)
					.map((agent) => ({
						agentId: agent.id,
						name: agent.name,
						published: agent.activeVersionId !== null,
						updatedAt: agent.updatedAt.toISOString(),
					})),
			};
		}

		if (input.type === 'config-schema') {
			return {
				configurableProperties: jsonSchemaToCompactText(
					zodSchemaToJsonSchema(AgentJsonConfigBaseSchema),
				),
			};
		}

		if (input.type === 'capabilities') {
			return {
				channels: await this.agentIntegrationService.listBuilderChatIntegrations(user),
				agentCapabilities: [...AGENT_CAPABILITIES],
				limitations: [...AGENT_LIMITATIONS],
			};
		}

		if (input.type === 'integrations') {
			if (!input.queries) {
				return { channels: await this.agentIntegrationService.listBuilderChatIntegrations(user) };
			}
			const mcpResults = (await this.mcpRegistryService.search(input.queries)).filter(
				(result) => !result.isTemplated,
			);
			if (mcpResults.length > 0) return { kind: 'mcp', results: mcpResults };
			const nodeResults = await this.agentsToolsService.searchAgentToolNodes(input.queries);
			return {
				kind: 'node',
				results: nodeResults.results,
				queriesWithNoResults: nodeResults.queriesWithNoResults,
			};
		}

		if (input.type === 'attachable-workflows') {
			return {
				workflows: await this.attachableWorkflowsService.list(user, projectId, input.searchTerm),
			};
		}

		const agent = await this.agentsService.findById(input.agentId, projectId);
		if (!agent) throw new UserError('Agent not found.');
		// Refs only: the skill bodies are read in the `skills` case, which needs them.
		const skillRefs = await this.agentSkillRefs.refsForDraft(agent, {});
		const config = composeJsonConfig(agent, skillRefs);

		switch (input.type) {
			case 'config':
				return {
					agent: {
						id: agent.id,
						name: agent.name,
						published: agent.activeVersionId !== null,
						draftVersionId: agent.versionId,
						activeVersionId: agent.activeVersionId,
						updatedAt: agent.updatedAt.toISOString(),
					},
					configState: 'current-draft',
					config,
					configHash: getAgentConfigHash(config),
				};
			case 'skills': {
				// The skills module keeps no skill on an agent that is not attached.
				const skills = await this.agentSkillRefs.skillsForRefs(skillRefs, {});
				return {
					skills: Object.entries(skills).map(([id, skill]) => ({
						id,
						name: skill.name,
						description: skill.description,
						attached: true,
					})),
				};
			}
			case 'skill': {
				return await readAgentSkill(
					this.agentSkillsService,
					agent.id,
					projectId,
					input.skillId,
					input.referencePaths,
				);
			}
			case 'tasks': {
				return { tasks: await listAgentTasks(this.agentTaskService, agent) };
			}
			case 'custom-tools':
				return {
					tools: Object.entries(agent.tools ?? {}).map(([id, tool]) => ({
						id,
						name: tool.descriptor.name,
						description: tool.descriptor.description,
						attached: (config?.tools ?? []).some((ref) => ref.type === 'custom' && ref.id === id),
					})),
				};
			case 'custom-tool': {
				const tool = agent.tools?.[input.toolId];
				if (!tool) throw new UserError('Custom tool not found.');
				return { id: input.toolId, ...tool };
			}
			case 'sessions':
				return await this.findSessions(user, projectId, agent.id, input);
			case 'session': {
				const detail = await this.agentExecutionService.getThreadDetail(
					input.threadId,
					projectId,
					agent.id,
					user.id,
				);
				if (!detail) return { notFound: true };
				return {
					session: toSessionDetailSummary(detail),
					sessionDetail: toAgentSessionDetail(detail),
				};
			}
		}
	}
}
