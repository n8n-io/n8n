import { runWithOptionalLimiter, withTimeout } from '../../../harness/evaluation-helpers';
import { createEvaluatorChain, invokeEvaluatorChain } from '../../llm-judge/evaluators/base';
import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';
import { binaryJudgeResultSchema } from './schemas';

const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your full reasoning FIRST. Only AFTER completing your analysis, decide on pass or fail based on what you wrote. Do not decide pass/fail before reasoning.`;

interface LlmCheckOptions {
	name: string;
	systemPrompt: string;
	humanTemplate: string;
	/**
	 * Optional early-exit check. Return a skip message to skip the check,
	 * or undefined to proceed with evaluation.
	 */
	skipIf?: (workflow: SimpleWorkflow, ctx: BinaryCheckContext) => string | undefined;
}

export function createLlmCheck(options: LlmCheckOptions): BinaryCheck {
	const systemPrompt = options.systemPrompt + REASONING_FIRST_SUFFIX;

	return {
		name: options.name,
		kind: 'llm',
		async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
			if (!ctx.llm) {
				return { pass: true, comment: 'Skipped: no LLM' };
			}

			if (options.skipIf) {
				const skipMessage = options.skipIf(workflow, ctx);
				if (skipMessage) {
					return { pass: true, comment: skipMessage };
				}
			}

			const chain = createEvaluatorChain(
				ctx.llm,
				binaryJudgeResultSchema,
				systemPrompt,
				options.humanTemplate,
			);

			const result = await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: invokeEvaluatorChain(chain, {
						userPrompt: ctx.prompt,
						existingWorkflow: ctx.existingWorkflow,
						generatedWorkflow: workflow,
						agentTextResponse: ctx.agentTextResponse,
					}),
					timeoutMs: ctx.timeoutMs,
					label: `binary-checks:${options.name}`,
				});
			}, ctx.llmCallLimiter);

			return { pass: result.pass, comment: result.reasoning };
		},
	};
}
