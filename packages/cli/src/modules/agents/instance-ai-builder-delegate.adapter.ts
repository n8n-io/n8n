import { createPlannerTodosTool, type BuiltTool, type CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	instanceAiBuilderThreadPrefix,
	type AgentBuilderToolsOptions,
	type InstanceAiBuilderDelegate,
	type InstanceAiCredentialService,
} from '@n8n/instance-ai';
import { type Scope } from '@n8n/permissions';
import { Like } from '@n8n/typeorm';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentConfigService } from './agent-config.service';
import { AGENT_CAPABILITIES, AGENT_LIMITATIONS } from './agent-capabilities';
import { AgentIntegrationPersistenceService } from './agent-integration-persistence.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsService } from './agents.service';
import { buildAgentPreviewPath } from './builder/agent-builder-preview-path';
import { AgentsBuilderToolsService } from './builder/agents-builder-tools.service';
import {
	BUILDER_PLANNER_TODOS_DESCRIPTION,
	BUILDER_PLANNER_TODOS_SYSTEM_INSTRUCTION,
} from './builder/prompts/planner-todos.prompt';
import { getAgentBuilderRuntimeSkills } from './builder/skills';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { getAgentConfigHash } from './utils/agent-config-hash';

/** Builds tool schemas before a target exists; handlers never see it. */
const SCHEMA_ONLY_AGENT_ID = 'schema-only';

/**
 * Host implementation of the instance-ai builder-delegate port. Instance AI
 * builds Agents itself: this adapter supplies the Agent Builder tools, bound
 * per call to the target Agent that Instance AI resolves, plus the builder
 * guidance as runtime skills. `createDelegate` returns a per-request object
 * bound to the calling user + project.
 */
@Service()
export class InstanceAiBuilderDelegateAdapterService {
	constructor(
		private readonly agentsService: AgentsService,
		private readonly agentsBuilderToolsService: AgentsBuilderToolsService,
		private readonly n8nMemory: N8nMemory,
		private readonly agentThreadRepository: AgentThreadRepository,
		private readonly agentConfig: AgentConfigService,
		private readonly agentSkills: AgentSkillsService,
		private readonly agentIntegrationPersistenceService: AgentIntegrationPersistenceService,
	) {}

	createDelegate(
		user: User,
		projectId: string,
		// Built per target agent id, not once up front: in the build-new-agent flow
		// the agent does not exist when the delegate is created, so a provider
		// captured here would tag Gateway spend with an undefined agent id.
		credentialProviderFor: (agentId: string) => CredentialProvider,
		credentialService: InstanceAiCredentialService,
		options: { useEvalModelCatalog?: boolean } = {},
	): InstanceAiBuilderDelegate {
		// Mirrors the `@ProjectScope('agent:*')` guards on the agent-builder REST
		// routes. The delegate calls the agents services directly, bypassing the
		// controller middleware, so a user reaching agent-building via Instance AI
		// must still hold the corresponding project scope before any agent mutation.
		const assertProjectScope = async (...scopes: Scope[]): Promise<void> => {
			if (!(await userHasScopes(user, scopes, false, { projectId }))) {
				throw new ForbiddenError('You do not have permission to access agents in this project.');
			}
		};

		return {
			createAgent: async (name, options) => {
				// Adopting also needs `agent:update` — see the port's `adoptOnCollision` docs.
				await assertProjectScope(
					...(options?.adoptOnCollision
						? (['agent:create', 'agent:update'] as const)
						: (['agent:create'] as const)),
				);
				const { agent, adopted } = await this.agentsService.createOrAdopt(
					projectId,
					name,
					options ?? {},
				);
				// An adopted row keeps the winner's name, so report the persisted one.
				return { agentId: agent.id, projectId, name: agent.name, adopted };
			},

			createBuilderTools: (toolsOptions) =>
				this.createBuilderTools(toolsOptions, {
					buildTools: (agentId) =>
						this.agentsBuilderToolsService.getTools(
							agentId,
							projectId,
							credentialProviderFor(agentId),
							credentialService,
							user,
							{
								threadId: toolsOptions.threadId,
								runId: toolsOptions.runId,
								...(options.useEvalModelCatalog ? { useEvalModelCatalog: true } : {}),
							},
						),
					assertCanEdit: async () => await assertProjectScope('agent:update'),
				}),

			getRuntimeSkills: async () => await getAgentBuilderRuntimeSkills(),

			getAgentPreviewPath: (agentId) => buildAgentPreviewPath(projectId, agentId),

			listAgents: async () => {
				await assertProjectScope('agent:read');
				const agents = await this.agentsService.findByProjectId(projectId);
				return agents.map((agent) => ({
					agentId: agent.id,
					name: agent.name,
					published: agent.activeVersionId !== null,
					updatedAt: agent.updatedAt.toISOString(),
				}));
			},

			listAgentCapabilities: async () => {
				await assertProjectScope('agent:read');
				// Channels come from the registry (same source the builder's
				// `list_integration_types` projects); agent-level capabilities and
				// limitations come from this module's constants, so the registry
				// and the agent config schema stay the single sources of truth as
				// channels, tools, or limits are added or removed.
				const channels = this.agentIntegrationPersistenceService.listChatIntegrations();
				return {
					channels,
					agentCapabilities: [...AGENT_CAPABILITIES],
					limitations: [...AGENT_LIMITATIONS],
				};
			},

			resolveAgentName: async (agentId) => {
				await assertProjectScope('agent:read');
				return (await this.agentsService.findById(agentId, projectId))?.name;
			},
			readAgentArtifact: async (agentId) => {
				await assertProjectScope('agent:read');
				// No JSON config yet (freshly created) is an empty snapshot, not an error.
				// Anything else propagates: the callers already treat a throw as "no
				// snapshot", and it gets logged there instead of vanishing here.
				const config = await this.agentConfig.getConfig(agentId, projectId).catch((error) => {
					if (error instanceof UserError) return null;
					throw error;
				});
				if (!config) return null;
				return {
					config,
					skills: await this.agentSkills.listSkills(agentId, projectId),
					// The same hash `read_config` hands the model, so consumers can dedupe.
					configHash: getAgentConfigHash(config),
				};
			},
		};
	}

	/**
	 * The builder tools are built for one agent id, while Instance AI resolves
	 * its target on every call. Each returned tool keeps the schemas of a
	 * schema-only build and routes its handler to the tool built for the
	 * current target. The per-agent builds are cached for this request.
	 */
	private createBuilderTools(
		{ resolveTargetAgentId }: AgentBuilderToolsOptions,
		deps: {
			buildTools: (agentId: string) => ReturnType<AgentsBuilderToolsService['getTools']>;
			assertCanEdit: () => Promise<void>;
		},
	): BuiltTool[] {
		const toolsByAgent = new Map<string, Map<string, BuiltTool>>();
		const toolFor = (agentId: string, name: string): BuiltTool | undefined => {
			let tools = toolsByAgent.get(agentId);
			if (!tools) {
				const built = deps.buildTools(agentId);
				tools = new Map([...built.json, ...built.shared].map((tool) => [tool.name, tool]));
				toolsByAgent.set(agentId, tools);
			}
			return tools.get(name);
		};

		const templates = deps.buildTools(SCHEMA_ONLY_AGENT_ID);
		const targeted = [...templates.json, ...templates.shared].map(
			(template): BuiltTool => ({
				...template,
				handler: async (input, ctx) => {
					// Mirrors the `@ProjectScope('agent:update')` guard on the agent
					// builder routes, which these calls bypass.
					await deps.assertCanEdit();
					const agentId = await resolveTargetAgentId();
					if (!agentId)
						throw new UnexpectedError('Agent Builder tool called without a target agent');
					const handler = toolFor(agentId, template.name)?.handler;
					if (!handler) throw new UnexpectedError(`Unknown Agent Builder tool: ${template.name}`);
					return await handler(input, ctx);
				},
			}),
		);

		return [
			...targeted,
			createPlannerTodosTool({
				description: BUILDER_PLANNER_TODOS_DESCRIPTION,
				systemInstruction: BUILDER_PLANNER_TODOS_SYSTEM_INSTRUCTION,
			}),
		];
	}

	/**
	 * Delete every session that the retired builder sub-agent stored for one
	 * instance-AI thread: the `ia-builder:<threadId>:<agentId>` rows in the
	 * agents-module memory tables (thread, messages, observations, orphaned
	 * episodic entries). Threads from before the move can still hold them.
	 * Called by the instance-AI host when the thread is deleted or TTL-pruned;
	 * access control happened there. Instance-AI thread ids are UUIDs, so the
	 * prefix carries no LIKE metacharacters.
	 */
	async deleteBuilderSessions(instanceAiThreadId: string): Promise<void> {
		const prefix = instanceAiBuilderThreadPrefix(instanceAiThreadId);
		const threads = await this.agentThreadRepository.find({
			select: { id: true },
			where: { id: Like(`${prefix}%`) },
		});
		for (const { id } of threads) {
			// The target agent id is the suffix; memory impls are agent-scoped.
			const memory = this.n8nMemory.getImplementation(id.slice(prefix.length));
			await memory.deleteMessagesByThread(id);
			await memory.deleteThread(id);
		}
	}
}
