import { SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

import { runWithOptionalLimiter, withTimeout } from '../../../harness/evaluation-helpers';
import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';
import { binaryJudgeResultSchema, type BinaryJudgeResult } from './schemas';

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

/**
 * Build template variables from the BinaryCheckContext.
 * All fields are available as template placeholders in humanTemplate.
 */
function buildTemplateVars(
	workflow: SimpleWorkflow,
	ctx: BinaryCheckContext,
): Record<string, string> {
	return {
		userPrompt: ctx.prompt,
		generatedWorkflow: JSON.stringify(workflow, null, 2),
		referenceSection: '',
		agentTextResponse: ctx.agentTextResponse ?? '',
		workflowBefore: ctx.existingWorkflow
			? JSON.stringify(ctx.existingWorkflow, null, 2)
			: '{"nodes": [], "connections": {}}',
	};
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

			const chatPrompt = ChatPromptTemplate.fromMessages([
				new SystemMessage(systemPrompt),
				HumanMessagePromptTemplate.fromTemplate(options.humanTemplate),
			]);
			const llmWithStructuredOutput =
				ctx.llm.withStructuredOutput<BinaryJudgeResult>(binaryJudgeResultSchema);
			const chain = RunnableSequence.from<Record<string, string>, BinaryJudgeResult>([
				chatPrompt,
				llmWithStructuredOutput,
			]);

			const result = await runWithOptionalLimiter(async () => {
				return await withTimeout({
					promise: chain.invoke(buildTemplateVars(workflow, ctx)),
					timeoutMs: ctx.timeoutMs,
					label: `binary-checks:${options.name}`,
				});
			}, ctx.llmCallLimiter);

			return { pass: result.pass, comment: result.reasoning };
		},
	};
}
