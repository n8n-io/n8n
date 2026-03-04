import { runWithOptionalLimiter, withTimeout } from '../../../harness/evaluation-helpers';
import { createEvaluatorChain, invokeEvaluatorChain } from '../../llm-judge/evaluators/base';
import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';
import { binaryJudgeResultSchema } from './schemas';

const REASONING_FIRST_SUFFIX = `

IMPORTANT: Write your full reasoning FIRST. Only AFTER completing your analysis, decide on pass or fail based on what you wrote. Do not decide pass/fail before reasoning.`;

export function createLlmCheck(options: {
	name: string;
	systemPrompt: string;
	humanTemplate: string;
}): BinaryCheck {
	const systemPrompt = options.systemPrompt + REASONING_FIRST_SUFFIX;

	return {
		name: options.name,
		kind: 'llm',
		async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
			if (!ctx.llm) {
				return { pass: true, comment: 'Skipped: no LLM' };
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
						generatedWorkflow: workflow,
					}),
					timeoutMs: ctx.timeoutMs,
					label: `binary-checks:${options.name}`,
				});
			}, ctx.llmCallLimiter);

			return { pass: result.pass, comment: result.reasoning };
		},
	};
}
