import { raceWithAbort, throwIfAborted } from '@n8n/agents';
import { Service } from '@n8n/di';
import { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { hashAgentSandboxPrincipal } from '../agent-sandbox-principal';
import { AgentSkillRefsService } from '../agent-skill-refs.service';
import { AgentsSettingsService } from '../agents-settings.service';
import { Agent, type ProjectAgent } from '../entities/agent.entity';
import { sanitizeToolName } from '../json-config/agent-config-composition';
import { fromAgentDocument, toAgentDocument } from '../json-config/agent-document';
import { AgentRepository } from '../repositories/agent.repository';
import { createAgentCredentialProvider } from '../utils/agent-credential-provider';
import type { AgentRunSource } from '../utils/agent-published-snapshot';
import type {
	AgentRuntimeInstrumentation,
	AgentEvaluationPreparationResult,
	AgentEvaluationRunSource,
	AgentEvaluationSkippedFeature,
} from './agent-evaluation.contracts';
import { pruneConfigForEval, summarizeTools } from './evaluation-config';

@Service()
export class AgentEvaluationService {
	/** Captured batch content, keyed by the handle the caller holds. */
	private readonly runSources = new WeakMap<AgentEvaluationRunSource, AgentRunSource>();

	constructor(
		private readonly settings: AgentsSettingsService,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly repository: AgentRepository,
		private readonly skillRefs: AgentSkillRefsService,
		private readonly reconstruction: AgentRuntimeReconstructionService,
		private readonly credentials: CredentialsService,
	) {}

	private async accessError(
		user: User,
		projectId: string,
		agentId: string,
		abortSignal?: AbortSignal,
	) {
		if (this.executionsConfig.mode === 'queue') {
			return 'Agent eval execution requires main process mode — queue mode is not supported.';
		}
		if (!(await raceWithAbort(async () => await this.settings.getEnabled(), abortSignal))) {
			return 'Agents are disabled. Ask an instance admin to enable them in Settings > Agents.';
		}
		const canExecute = await raceWithAbort(
			async () => await userHasScopes(user, ['agent:execute'], false, { projectId }),
			abortSignal,
		);
		if (!canExecute) {
			return `Agent ${agentId} not found or not accessible`;
		}
		return undefined;
	}

	/** Keep the root agent and resolved skills fixed while a batch is in flight. */
	async captureRunSource(agent: ProjectAgent): Promise<AgentEvaluationRunSource> {
		const detached = {
			...agent,
			schema: structuredClone(agent.schema),
			tools: structuredClone(agent.tools),
			skills: structuredClone(agent.skills),
			integrations: structuredClone(agent.integrations),
		};
		const skills = await this.skillRefs.readDraft(detached, {});
		const handle = Object.freeze({}) as AgentEvaluationRunSource;
		this.runSources.set(handle, { agent: detached, ...structuredClone(skills) });
		return handle;
	}

	/**
	 * `source` is a batch's captured agent: every case of the batch runs the same
	 * content. Access and the agent's place in the project are still checked.
	 */
	async prepare(
		user: User,
		projectId: string,
		agentId: string,
		runSource?: AgentEvaluationRunSource,
	): Promise<AgentEvaluationPreparationResult> {
		const error = await this.accessError(user, projectId, agentId);
		if (error) return { error };
		const source = runSource && this.runSources.get(runSource);
		if (runSource && !source) return { error: `Agent ${agentId} not found or not accessible` };
		if (source && (source.agent.id !== agentId || source.agent.projectId !== projectId)) {
			return { error: `Agent ${agentId} not found or not accessible` };
		}
		const current = await this.repository.findByIdAndProjectId(agentId, projectId);
		if (!current) return { error: `Agent ${agentId} not found or not accessible` };
		const saved = source?.agent ?? current;
		if (!saved.schema) return { error: `Agent ${agentId} has no JSON config to run.` };

		const refs = source
			? structuredClone(source.skillRefs)
			: await this.skillRefs.refsForDraft(saved, {});
		const { config, skippedFeatures } = pruneConfigForEval(
			toAgentDocument(structuredClone(saved.schema), refs),
		);
		const pruned = fromAgentDocument(config);
		if ((saved.integrations ?? []).length > 0) {
			skippedFeatures.push({
				feature: 'integrations',
				reason:
					'Chat integrations are not attached in eval runs — the harness drives the agent directly.',
			});
		}
		const detached = Object.assign(new Agent(), saved, { schema: pruned.config, integrations: [] });
		return {
			preparation: {
				config: structuredClone(config),
				tools: summarizeTools(config, saved.tools ?? {}, sanitizeToolName),
				skippedFeatures,
				buildRuntime: async (instrumentation, abortSignal) =>
					await this.buildRuntime(
						user,
						projectId,
						{
							agent: detached,
							skillRefs: pruned.skillRefs,
							...(source ? { skills: structuredClone(source.skills) } : {}),
						},
						skippedFeatures,
						instrumentation,
						abortSignal,
					),
			},
		};
	}

	private async buildRuntime(
		user: User,
		projectId: string,
		snapshot: Omit<AgentRunSource, 'skills'> & { skills?: AgentRunSource['skills'] },
		skippedFeatures: AgentEvaluationSkippedFeature[],
		instrumentation: Omit<AgentRuntimeInstrumentation, 'transformDelegatedAgentConfig'>,
		abortSignal?: AbortSignal,
	) {
		const error = await this.accessError(user, projectId, snapshot.agent.id, abortSignal);
		if (error) throw new UserError(error);
		const skills =
			snapshot.skills ??
			(await raceWithAbort(
				async () => await this.skillRefs.skillsForRefs(snapshot.agent, snapshot.skillRefs, {}),
				abortSignal,
			));
		return await raceWithAbort(async () => {
			const { agent } = await this.reconstruction.reconstructFromAgentEntity(
				{ ...snapshot, skills },
				createAgentCredentialProvider(this.credentials, projectId, user, snapshot.agent.id),
				'test',
				undefined,
				user,
				this.runtimeInstrumentation(instrumentation, skippedFeatures),
				'manual',
				hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id }),
				{ abortSignal },
			);
			if (abortSignal?.aborted) await agent.close();
			throwIfAborted(abortSignal);
			return agent;
		}, abortSignal);
	}

	private runtimeInstrumentation(
		instrumentation: Omit<AgentRuntimeInstrumentation, 'transformDelegatedAgentConfig'>,
		skippedFeatures: AgentEvaluationSkippedFeature[],
	): AgentRuntimeInstrumentation {
		return {
			...instrumentation,
			transformDelegatedAgentConfig: (childConfig, context) => {
				const child = pruneConfigForEval(childConfig);
				skippedFeatures.push(
					...child.skippedFeatures.map((skip) => ({
						...skip,
						feature: `subAgent ${context.subAgentId}: ${skip.feature}`,
					})),
				);
				return child.config;
			},
		};
	}
}
