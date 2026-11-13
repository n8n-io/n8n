import type { RunSkillTrialDto, SkillTrialPreview, SkillTrialResult } from '@n8n/api-types';
import { AiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, OperationalError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { randomUUID } from 'node:crypto';

import { CredentialsService } from '@/credentials/credentials.service';
import { SkillSourceService } from '@/modules/skills';
import { userHasScopes } from '@/permissions.ee/check-access';
import { modelStreamStallOptions } from '@/utils/model-stream-stall-options';

import { AgentDefaultModelResolverService } from './agent-default-model-resolver.service';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import { AgentsSettingsService } from './agents-settings.service';
import { withBudgetGuardrail } from './budget-guardrail';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';

/** One text-only trial. No skill, source connection, agent, or conversation is saved. */
@Service()
export class AgentSkillTrialService {
	private readonly runningUsers = new Set<string>();

	constructor(
		private readonly sources: SkillSourceService,
		private readonly settings: AgentsSettingsService,
		private readonly defaults: AgentDefaultModelResolverService,
		private readonly credentials: CredentialsService,
		private readonly reconstruction: AgentRuntimeReconstructionService,
		private readonly aiConfig: AiConfig,
	) {}

	private async assertAccess(user: User, projectId: string) {
		await this.settings.assertEnabled();
		if (
			!(await userHasScopes(user, ['agent:execute', 'projectSkill:list'], false, { projectId }))
		) {
			throw new ForbiddenError('You cannot try skills in this project. Select another project.');
		}
	}

	private async read(user: User, catalogId: string) {
		const [owner, repository, name] = catalogId.split('/');
		return await this.sources.readPublicSkill(
			user,
			`https://github.com/${owner}/${repository}`,
			name,
		);
	}

	async prepare(user: User, projectId: string, catalogId: string): Promise<SkillTrialPreview> {
		await this.assertAccess(user, projectId);
		const [skill, defaultModel] = await Promise.all([
			this.read(user, catalogId),
			this.defaults.resolve(user, projectId),
		]);
		return { ...skill, defaultModel };
	}

	async run(
		user: User,
		projectId: string,
		payload: RunSkillTrialDto,
		signal: AbortSignal,
	): Promise<SkillTrialResult> {
		await this.assertAccess(user, projectId);
		if (this.runningUsers.has(user.id)) {
			throw new ConflictError('A skill trial is still running. Wait for its result and try again.');
		}
		this.runningUsers.add(user.id);
		try {
			return await this.runOnce(user, projectId, payload, signal);
		} finally {
			this.runningUsers.delete(user.id);
		}
	}

	private async runOnce(
		user: User,
		projectId: string,
		payload: RunSkillTrialDto,
		signal: AbortSignal,
	): Promise<SkillTrialResult> {
		const abortSignal = AbortSignal.any([signal, AbortSignal.timeout(90_000)]);
		const fetched = await this.read(user, payload.catalogId);
		abortSignal.throwIfAborted();
		if (fetched.contentHash !== payload.contentHash) {
			throw new ConflictError(
				'This skill changed on GitHub. Close and reopen Try skill to review it.',
			);
		}
		const runId = randomUUID();
		const { agent, modelCredentialGatewayManaged } =
			await this.reconstruction.reconstructFromResolvedSource({
				config: {
					name: `Try ${fetched.skill.name}`,
					model: payload.model,
					credential: payload.credential,
					instructions:
						'Call load_skill with skillId "trial" before answering. Use it to perform the user task. ' +
						'This is a text-only trial. You can read the skill and its references, but you have no ' +
						'connected apps, shell, browser, or user files. Explain missing capabilities when needed. ' +
						'Do not claim to have performed external actions.',
					skills: [{ type: 'skill', id: 'trial' }],
				},
				skills: { trial: fetched.skill },
				toolDescriptors: {},
				toolCodeByName: {},
				memoryOwnerAgentId: `skill-trial:${user.id}`,
				projectId,
				user,
				credentialProvider: createAgentCredentialProvider(this.credentials, projectId, user),
				runtimeProfile: 'inline',
				runType: 'test',
				abortSignal,
			});
		const startedAt = Date.now();
		try {
			const result = await agent.generate(
				payload.message,
				withBudgetGuardrail(
					{
						abortSignal,
						maxIterations: 6,
						maxOutputTokens: 2048,
						...modelStreamStallOptions(this.aiConfig),
					},
					{
						sessionId: runId,
						budget: { enabled: true, sessionCostCapUsd: 0.25 },
						modelCredentialGatewayManaged,
					},
				),
			);
			if (
				result.error ||
				result.finishReason === 'error' ||
				result.guardrail ||
				abortSignal.aborted
			) {
				throw new OperationalError('The trial could not finish. Check the model and try again.', {
					cause: result.error,
				});
			}
			const answer = result.messages.findLast(
				(message) => message.type !== 'custom' && message.role === 'assistant',
			);
			const response =
				answer && answer.type !== 'custom'
					? answer.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n')
					: '';
			if (!response.trim()) {
				throw new OperationalError('The model returned no text. Try a more specific task.');
			}
			return {
				response,
				skillLoaded:
					result.toolCalls?.some(
						(call) =>
							call.tool === 'load_skill' &&
							!call.canceled &&
							isRecord(call.output) &&
							(call.output.type === 'content' ||
								(call.output.success === true &&
									call.output.skillId === 'trial' &&
									!call.output.filePath)),
					) ?? false,
				model: result.model ?? payload.model,
				durationMs: Date.now() - startedAt,
				totalTokens: result.usage?.totalTokens,
			};
		} finally {
			await agent.close();
		}
	}
}
