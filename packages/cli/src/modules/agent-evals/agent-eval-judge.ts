import type { AgentEvalToolCheck, AgentEvalVerdict } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { BadRequestError } from '@n8n/errors';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { AgentConfigService } from '@/modules/agents/agent-config.service';
import { resolveCredentialAwareModelConfig } from '@/modules/agents/json-config/model-config';
import { createAgentCredentialProvider } from '@/modules/agents/utils/agent-credential-provider';

/** Shown to the user in place of a verdict when the judge's reply has none. */
export const INCONCLUSIVE_REASONING =
	'The checker did not give a clear pass or fail, so this check was not graded. Run it again.';

export type JudgeDependencies = {
	agentConfigService: AgentConfigService;
	credentialsService: CredentialsService;
	logger: Logger;
};

export type JudgeSubject = {
	/** The message the agent received. */
	input: string;
	/** The agent's answer. */
	output: string;
	/** A rule the answer must satisfy. Wins over `expectedOutput` when both are set. */
	criteria: string | null;
	/** A gold answer the answer must match. */
	expectedOutput: string | null;
	/** Tool names that the agent must call. A name with a `!` prefix must not be called. */
	expectedTools?: string[];
	/**
	 * The tool calls of the run, in call order. The tool check reads the names.
	 * The judge of a rule gets the full record.
	 */
	toolCalls?: JudgedToolCall[];
};

export type JudgedToolCall = { tool: string; input?: unknown; output?: unknown; error?: string };

const MAX_JUDGED_TOOL_CALLS = 20;
const MAX_JUDGED_TOOL_CALL_CHARS = 1_500;

/**
 * Adds the recorded tool calls to the answer that the judge of a rule reads.
 * A rule can be about what the agent did ("looks up the account"). The answer
 * text does not show that, so the judge cannot grade such a rule from the
 * answer alone.
 */
export function withToolCallRecord(output: string, toolCalls: JudgedToolCall[]): string {
	const header =
		'[Record from the test system, not part of the answer text. It lists each tool call of this run.]';
	if (toolCalls.length === 0) return `${output}\n\n${header}\nThe agent called no tools.`;
	const lines = toolCalls.slice(0, MAX_JUDGED_TOOL_CALLS).map((call, index) => {
		const record = JSON.stringify({
			tool: call.tool,
			input: call.input,
			output: call.output,
			...(call.error ? { note: call.error } : {}),
		});
		const text =
			record.length > MAX_JUDGED_TOOL_CALL_CHARS
				? `${record.slice(0, MAX_JUDGED_TOOL_CALL_CHARS)}... [truncated]`
				: record;
		return `${index + 1}. ${text}`;
	});
	const omitted = toolCalls.length - lines.length;
	if (omitted > 0) lines.push(`(${omitted} more tool calls are not shown.)`);
	return [output, '', header, ...lines].join('\n');
}

/**
 * Compares the tool expectation of a case with the tools that the agent called.
 * Names are compared in lower case. A name with a `!` prefix must not be called.
 */
export function checkExpectedTools(
	expectedTools: string[],
	calledToolNames: string[],
): AgentEvalToolCheck {
	const called = new Set(calledToolNames.map((name) => name.toLowerCase()));
	const missing: string[] = [];
	const forbidden: string[] = [];
	for (const entry of expectedTools) {
		const trimmed = entry.trim();
		const mustNotCall = trimmed.startsWith('!');
		const name = (mustNotCall ? trimmed.slice(1) : trimmed).trim();
		if (!name) continue;
		const wasCalled = called.has(name.toLowerCase());
		if (mustNotCall && wasCalled) forbidden.push(name);
		if (!mustNotCall && !wasCalled) missing.push(name);
	}
	return { pass: missing.length === 0 && forbidden.length === 0, missing, forbidden };
}

function toolCheckReasoning(toolCheck: AgentEvalToolCheck): string {
	if (toolCheck.pass) return 'The agent called the expected tools.';
	const parts: string[] = [];
	if (toolCheck.missing.length > 0) {
		parts.push(`The agent did not call these expected tools: ${toolCheck.missing.join(', ')}.`);
	}
	if (toolCheck.forbidden.length > 0) {
		parts.push(
			`The agent called these tools that it must not call: ${toolCheck.forbidden.join(', ')}.`,
		);
	}
	return parts.join(' ');
}

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
 * A reply with no readable verdict is an `error` too: reporting it as a fail
 * would blame the agent for the judge's reply and trigger a fix suggestion.
 *
 * A case with `expectedTools` gets the tool check first. A failed tool check is
 * a `fail` without a model call. A passed tool check is on the verdict as
 * `toolCheck`, and is a `pass` when the case has no rule and no gold answer.
 *
 * The judge of a rule gets the answer and the record of the tool calls, when
 * the caller gives the tool calls. The judge of a gold answer gets only the answer.
 */
export async function judgeAgentAnswer(
	{ agentConfigService, credentialsService, logger }: JudgeDependencies,
	{ input, output, criteria, expectedOutput, expectedTools, toolCalls }: JudgeSubject,
	ctx: { agentId: string; projectId: string; user: User },
): Promise<AgentEvalVerdict> {
	const toolCheck =
		expectedTools && expectedTools.length > 0
			? checkExpectedTools(
					expectedTools,
					(toolCalls ?? []).map((call) => call.tool),
				)
			: undefined;
	if (toolCheck && (!toolCheck.pass || (!criteria && !expectedOutput))) {
		return {
			status: 'completed',
			outcome: toolCheck.pass ? 'pass' : 'fail',
			reasoning: toolCheckReasoning(toolCheck),
			toolCheck,
		};
	}
	if (!criteria && !expectedOutput) return { status: 'skipped', outcome: null, reasoning: null };
	const withToolCheck = (verdict: AgentEvalVerdict): AgentEvalVerdict =>
		toolCheck ? { ...verdict, toolCheck } : verdict;

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
			? await evals
					.criteria()
					.model(modelConfig)
					.run({
						input,
						output: toolCalls ? withToolCallRecord(output, toolCalls) : output,
						criteria,
					})
			: await evals
					.correctness()
					.model(modelConfig)
					.run({ input, output, expected: expectedOutput ?? undefined });

		if (score.inconclusive) {
			// The reply can quote the agent's answer, so it stays out of the log.
			logger.warn('[AgentEvalJudge] The judge gave no readable verdict', {
				agentId: ctx.agentId,
			});
			return withToolCheck({ status: 'error', outcome: null, reasoning: INCONCLUSIVE_REASONING });
		}

		return withToolCheck({
			status: 'completed',
			outcome: score.pass ? 'pass' : 'fail',
			reasoning: score.reasoning,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error('[AgentEvalJudge] Judging failed', { error: message });
		return withToolCheck({ status: 'error', outcome: null, reasoning: message });
	}
}
