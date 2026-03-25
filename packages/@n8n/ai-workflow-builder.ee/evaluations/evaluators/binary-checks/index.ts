import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/workflow';

import { DETERMINISTIC_CHECKS } from './checks';
import { LLM_CHECKS } from './llm-checks';
import type { BinaryCheck, BinaryCheckContext } from './types';
import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';

export interface BinaryChecksEvaluatorOptions {
	nodeTypes: INodeTypeDescription[];
	llm?: BaseChatModel;
	checks?: string[];
}

const EVALUATOR_NAME = 'binary-checks';

/**
 * Create a binary-checks evaluator that runs deterministic and optional LLM checks.
 *
 * Each check emits one Feedback with score 0 or 1.
 */
export function createBinaryChecksEvaluator(
	options: BinaryChecksEvaluatorOptions,
): Evaluator<EvaluationContext> {
	const allChecks: BinaryCheck[] = [...DETERMINISTIC_CHECKS, ...(options.llm ? LLM_CHECKS : [])];

	const allCheckNames = allChecks.map((c) => c.name);

	let selectedChecks: BinaryCheck[];

	if (options.checks && options.checks.length > 0) {
		const validNames = new Set(allCheckNames);
		const unrecognized = options.checks.filter((name) => !validNames.has(name));

		for (const name of unrecognized) {
			console.warn(`Warning: unrecognized check name "${name}" in --checks filter`);
		}

		selectedChecks = allChecks.filter((c) => options.checks!.includes(c.name));

		if (selectedChecks.length === 0) {
			throw new Error(
				`No valid checks after filtering. Requested: ${options.checks.join(', ')}. Available: ${allCheckNames.join(', ')}`,
			);
		}
	} else {
		selectedChecks = allChecks;
	}

	return {
		name: EVALUATOR_NAME,

		async evaluate(workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			const checkCtx: BinaryCheckContext = {
				prompt: ctx.prompt,
				nodeTypes: options.nodeTypes,
				annotations: ctx.annotations,
				llm: options.llm,
				// Intentionally omit llmCallLimiter: binary-checks LLM judges are small,
				// cheap calls that should run in parallel, not throttled by the shared limiter.
				timeoutMs: ctx.timeoutMs,
			};

			const results = await Promise.allSettled(
				selectedChecks.map(async (check) => {
					try {
						const result = await check.run(workflow, checkCtx);
						return { check, result };
					} catch (error) {
						const message = error instanceof Error ? error.message : String(error);
						return { check, result: { pass: false, comment: `Error: ${message}` } };
					}
				}),
			);

			return results.map((settled, i) => {
				if (settled.status === 'fulfilled') {
					const { check, result } = settled.value;
					return {
						evaluator: EVALUATOR_NAME,
						metric: check.name,
						score: result.pass ? 1 : 0,
						kind: 'metric' as const,
						...(result.comment ? { comment: result.comment } : {}),
					};
				}

				// Should not happen since we catch inside, but handle gracefully
				const check = selectedChecks[i];
				const reason =
					settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
				return {
					evaluator: EVALUATOR_NAME,
					metric: check.name,
					score: 0,
					kind: 'metric' as const,
					comment: `Unexpected error: ${reason}`,
				};
			});
		},
	};
}
