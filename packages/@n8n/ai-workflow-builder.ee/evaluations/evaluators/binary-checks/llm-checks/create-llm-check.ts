import { runWithOptionalLimiter, withTimeout } from '../../../harness/evaluation-helpers';
import { createEvaluatorChain, invokeEvaluatorChain } from '../../llm-judge/evaluators/base';
import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';
import { binaryJudgeResultSchema } from './schemas';

export function createLlmCheck(options: {
	name: string;
	systemPrompt: string;
	humanTemplate: string;
}): BinaryCheck {
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
				options.systemPrompt,
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
