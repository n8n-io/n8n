/**
 * Code Typecheck Evaluator
 *
 * Validates generated TypeScript SDK code against SDK types using
 * the TypeScript compiler to catch type errors before execution.
 */

import type { EvaluationContext, Evaluator, Feedback } from '../../harness/harness-types';
import type { SimpleWorkflow } from '../../../src/types/workflow';
import { typeCheckCode } from './type-checker';
import type { CodeViolation } from './violations';

const EVALUATOR_NAME = 'code-typecheck';

function formatViolations(violations: CodeViolation[]): string | undefined {
	if (violations.length === 0) return undefined;
	return violations
		.map((v) => {
			const location = v.lineNumber ? `:${v.lineNumber}${v.column ? `:${v.column}` : ''}` : '';
			return `[${v.name}${location}] ${v.description}`;
		})
		.join('; ');
}

export function createCodeTypecheckEvaluator(): Evaluator<EvaluationContext> {
	const fb = (
		metric: string,
		score: number,
		kind: Feedback['kind'],
		comment?: string,
	): Feedback => ({
		evaluator: EVALUATOR_NAME,
		metric,
		score,
		kind,
		...(comment ? { comment } : {}),
	});

	return {
		name: EVALUATOR_NAME,

		async evaluate(_workflow: SimpleWorkflow, ctx: EvaluationContext): Promise<Feedback[]> {
			// Skip if no generated code available
			if (!ctx.generatedCode) {
				return [fb('skipped', 1, 'score', 'No generated code available for type checking')];
			}

			const result = typeCheckCode(ctx.generatedCode);

			const criticalViolations = result.violations.filter((v) => v.type === 'critical');
			const majorViolations = result.violations.filter((v) => v.type === 'major');
			const minorViolations = result.violations.filter((v) => v.type === 'minor');

			return [
				fb('overall', result.score, 'score', formatViolations(result.violations)),
				fb(
					'criticalErrors',
					criticalViolations.length === 0 ? 1 : 0,
					'metric',
					formatViolations(criticalViolations),
				),
				fb(
					'majorErrors',
					majorViolations.length === 0 ? 1 : 0.5,
					'metric',
					formatViolations(majorViolations),
				),
				fb(
					'minorWarnings',
					minorViolations.length === 0 ? 1 : 0.8,
					'metric',
					formatViolations(minorViolations),
				),
				fb('totalViolations', result.violations.length, 'detail'),
			];
		},
	};
}
