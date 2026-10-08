import type { CredentialProvider } from '@n8n/agents';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	instanceAiBuilderThreadPrefix,
	type InstanceAiBuilderDelegate,
	type InstanceAiCredentialService,
} from '@n8n/instance-ai';
import { type Scope } from '@n8n/permissions';
import { Like } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { ForbiddenError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentConfigService } from './agent-config.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentsService } from './agents.service';
import { AgentsSettingsService } from './agents-settings.service';
import { buildBuilderSessionContext } from './builder/agent-builder-session-context';
import { AgentsBuilderToolsService } from './builder/agents-builder-tools.service';
import { getBuilderRuntimeSkills } from './builder/skills';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { getAgentConfigHash } from './utils/agent-config-hash';

/** Instance AI has its own `agent-context` tool, which covers the builder's. */
const TOOLS_PROVIDED_BY_INSTANCE_AI = ['agent-context'];

/**
 * Host implementation of the instance-ai builder-delegate port. The Instance
 * AI orchestrator runs the agents-module builder tools itself; each tool call
 * resolves the target agent that the thread selected. `createDelegate` returns
 * a per-request object bound to the calling user + project.
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
		private readonly agentsSettingsService: AgentsSettingsService,
	) {}

	createDelegate(
		user: User,
		projectId: string,
		// Built per tool call from the resolved target agent id: the target can
		// change during a run, and Gateway spend must carry the concrete agent id.
		credentialProviderFor: (agentId: string) => CredentialProvider,
		credentialService: InstanceAiCredentialService,
		options: { useEvalModelCatalog?: boolean; resumeAgentBuild?: boolean } = {},
	): InstanceAiBuilderDelegate {
		// Mirrors the `@ProjectScope('agent:*')` guards on the agent-builder REST
		// routes. The delegate calls the builder services directly, bypassing the
		// controller middleware, so a user reaching agent-building via Instance AI
		// must still hold the corresponding project scope before any agent mutation.
		const assertProjectScope = async (...scopes: Scope[]): Promise<void> => {
			if (!(await userHasScopes(user, scopes, false, { projectId }))) {
				throw new ForbiddenError('You do not have permission to access agents in this project.');
			}
		};

		return {
			createAgent: async (name, createOptions) => {
				// Adopting also needs `agent:update` — see the port's `adoptOnCollision` docs.
				await assertProjectScope(
					...(createOptions?.adoptOnCollision
						? (['agent:create', 'agent:update'] as const)
						: (['agent:create'] as const)),
				);
				const { agent, adopted } = await this.agentsService.createOrAdopt(projectId, name, {
					...createOptions,
					actor: { kind: 'user', user },
				});
				// An adopted row keeps the winner's name, so report the persisted one.
				return { agentId: agent.id, projectId, name: agent.name, adopted };
			},

			getBuilderTools: (resolveTargetAgentId, session) =>
				this.agentsBuilderToolsService.getToolsForResolvedTarget(
					async () => {
						// A build admitted before Agents were disabled may finish its resume.
						if (!options.resumeAgentBuild) await this.agentsSettingsService.assertEnabled();
						await assertProjectScope('agent:update');
						const agentId = await resolveTargetAgentId();
						if (!agentId) {
							throw new UserError(
								'No agent is selected. Call agent_builder_select_agent before using the builder tools.',
							);
						}
						return agentId;
					},
					projectId,
					credentialProviderFor,
					credentialService,
					user,
					{
						threadId: session.threadId,
						runId: session.runId,
						...(options.useEvalModelCatalog ? { useEvalModelCatalog: true } : {}),
						excludeToolNames: TOOLS_PROVIDED_BY_INSTANCE_AI,
					},
				),

			getRuntimeSkills: () => getBuilderRuntimeSkills(),

			getBuilderSessionContext: async (agentId) =>
				await buildBuilderSessionContext(projectId, agentId),

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
					// The same hash `agent-context` hands the model, so consumers can dedupe.
					configHash: getAgentConfigHash(config),
				};
			},
		};
	}

	/**
	 * Delete every legacy builder sub-agent session spawned by one instance-AI
	 * thread: the `ia-builder:<threadId>:<agentId>` rows in the agents-module
	 * memory tables (thread, messages, observations, orphaned episodic entries).
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
			await memory.deleteThread(id);
		}
	}
}
