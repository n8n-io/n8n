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
import type { AgentSkillRefs } from '../json-config/agent-document';
import { AgentRepository } from '../repositories/agent.repository';
import { createAgentCredentialProvider } from '../utils/agent-credential-provider';
import type {
	AgentRuntimeInstrumentation,
	AgentEvaluationPreparationResult,
	AgentEvaluationSkippedFeature,
} from './agent-evaluation.contracts';
import { pruneConfigForEval, summarizeTools } from './evaluation-config';

@Service()
export class AgentEvaluationService {
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

	async prepare(
		user: User,
		projectId: string,
		agentId: string,
	): Promise<AgentEvaluationPreparationResult> {
		const error = await this.accessError(user, projectId, agentId);
		if (error) return { error };
		const saved = await this.repository.findByIdAndProjectId(agentId, projectId);
		if (!saved) return { error: `Agent ${agentId} not found or not accessible` };
		if (!saved.schema) return { error: `Agent ${agentId} has no JSON config to run.` };

		const refs = await this.skillRefs.refsForDraft(saved, {});
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
						{ agent: detached, skillRefs: pruned.skillRefs },
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
		snapshot: { agent: ProjectAgent; skillRefs: AgentSkillRefs },
		skippedFeatures: AgentEvaluationSkippedFeature[],
		instrumentation: Omit<AgentRuntimeInstrumentation, 'transformDelegatedAgentConfig'>,
		abortSignal?: AbortSignal,
	) {
		const error = await this.accessError(user, projectId, snapshot.agent.id, abortSignal);
		if (error) throw new UserError(error);
		const skills = await raceWithAbort(
			async () => await this.skillRefs.skillsForRefs(snapshot.agent, snapshot.skillRefs, {}),
			abortSignal,
		);
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
