import { zodSchemaToJsonSchema } from '@n8n/ai-utilities/json-schema';
import { AgentJsonConfigBaseSchema } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	AgentContextLookup,
	AgentSessionSummary,
	AgentContextReader,
	AgentContextResult,
	AgentSessionDetail,
} from './agent-context.contracts';
import { UserError } from 'n8n-workflow';

import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import { userHasScopes } from '@/permissions.ee/check-access';
import { ForbiddenError, NotFoundError } from '@n8n/errors';

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
import { toAgentSessionDetail } from './agent-session-read';
import { AgentSkillRefsService } from './agent-skill-refs.service';
import { composeJsonConfig } from './json-config/agent-config-composition';
import { jsonSchemaToCompactText } from './json-config/schema-text-serializer';
import { getAgentConfigHash } from './utils/agent-config-hash';

const toSessionSummary = (thread: ThreadListItem): AgentSessionSummary => ({
	threadId: thread.id,
	agentId: thread.agentId,
	agentName: thread.agentName,
	title: thread.title?.trim() || `Session #${thread.sessionNumber}`,
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
		title: detail.thread.title?.trim() || `Session #${detail.thread.sessionNumber}`,
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
				agents: agents.map((agent) => ({
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
				channels: this.agentIntegrationService.listChatIntegrations(),
				agentCapabilities: [...AGENT_CAPABILITIES],
				limitations: [...AGENT_LIMITATIONS],
			};
		}

		if (input.type === 'integrations') {
			if (!input.queries) {
				return { channels: this.agentIntegrationService.listChatIntegrations() };
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
				// The skills hub keeps no skill on an agent that is not attached.
				const skills = await this.agentSkillRefs.skillsForRefs(agent, skillRefs, {});
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
			case 'sessions': {
				const result = await this.agentExecutionService.getThreads(
					projectId,
					agent.id,
					user.id,
					input.limit ?? 20,
					input.cursor,
					{
						...(input.status ? { status: input.status } : {}),
						...(input.origin ? { origin: input.origin } : {}),
						...(input.updatedAfter ? { updatedAfter: new Date(input.updatedAfter) } : {}),
						...(input.updatedBefore ? { updatedBefore: new Date(input.updatedBefore) } : {}),
					},
				);
				return {
					sessions: result.threads.map(toSessionSummary),
					nextCursor: result.nextCursor,
				};
			}
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
