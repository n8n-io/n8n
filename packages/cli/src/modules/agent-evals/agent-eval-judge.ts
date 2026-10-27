import type { AgentEvalVerdict } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';
import { resolveCredentialAwareModelConfig } from '@/modules/agents/json-config/model-config';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';

type JudgeDependencies = {
	agentConfigService: AgentConfigService;
	credentialsService: CredentialsService;
	logger: Logger;
};

type JudgeSubject = {
	/** The message the agent received. */
	input: string;
	/** The agent's answer. */
	output: string;
	/** A rule the answer must satisfy. Wins over `expectedOutput` when both are set. */
	criteria: string | null;
	/** A gold answer the answer must match. */
	expectedOutput: string | null;
};

/**
 * Grades an agent's answer against a rule (`criteria`) or a gold answer
 * (`expectedOutput`). Returns `status: 'skipped'` when the case has neither, so
 * nothing is graded and no model call is made. A rule is judged as something
 * the answer must satisfy; a gold answer as something it must match.
 *
 * The judge's model is resolved the way the agent's own execution and case
 * generation resolve theirs: the agent's real (project-scoped, BYOK) credential
 * through `resolveCredentialAwareModelConfig`. `Eval.model()` accepts that
 * resolved config directly. A bare credential name passed to `.credential()` is
 * only a display name and never becomes an API key for the judge.
 *
 * A failure to resolve the model or to call it is returned as `status: 'error'`
 * and never thrown. Grading is best-effort on top of a case that already ran.
 */
export async function judgeAgentAnswer(
	{ agentConfigService, credentialsService, logger }: JudgeDependencies,
	{ input, output, criteria, expectedOutput }: JudgeSubject,
	ctx: { agentId: string; projectId: string; user: User },
): Promise<AgentEvalVerdict> {
	if (!criteria && !expectedOutput) return { status: 'skipped', outcome: null, reasoning: null };

	try {
		const config = await agentConfigService.getConfig(ctx.agentId, ctx.projectId);
		if (!config.model || !config.credential) {
			throw new BadRequestError('This agent has no configured model and credential to judge with.');
		}

		// The agent id attributes gateway-credential usage to this agent, as it is on a
		// normal agent execution.
		const credentialProvider = createAgentCredentialProvider(
			credentialsService,
			ctx.projectId,
			ctx.user,
			ctx.agentId,
		);
		const modelConfig = await resolveCredentialAwareModelConfig(
			config.model,
			config.credential,
			credentialProvider,
		);

		// Lazy-loaded: `@n8n/agents` is heavy, and judging only runs for cases that
		// have something to grade against.
		const { evals } = await import('@n8n/agents');
		const score = criteria
			? await evals.criteria().model(modelConfig).run({ input, output, criteria })
			: await evals
					.correctness()
					.model(modelConfig)
					.run({ input, output, expected: expectedOutput ?? undefined });

		return {
			status: 'completed',
			outcome: score.pass ? 'pass' : 'fail',
			reasoning: score.reasoning,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error('[AgentEvalJudge] Judging failed', { error: message });
		return { status: 'error', outcome: null, reasoning: message };
	}
}
