import type { ExpressionEvaluatorClass } from '../src/index';
import { Tournament } from '../src/index';
import type { ExpressionTestEvaluation } from './ExpressionFixtures/base';
import { baseFixtures } from './ExpressionFixtures/base';

export const testExpressionsWithEvaluator = (Evaluator: ExpressionEvaluatorClass) => {
	const tourn = new Tournament(() => {}, undefined, Evaluator);
	const builtins = {
		String,
		parseFloat,
		parseInt,
	};
	for (const t of baseFixtures) {
		if (!t.tests.some((test) => test.type === 'evaluation')) {
			continue;
		}
		test(t.expression, () => {
			for (const test of t.tests.filter(
				(test_): test_ is ExpressionTestEvaluation => test_.type === 'evaluation',
			)) {
				expect(
					tourn.execute(t.expression.slice(1), {
						...builtins,
						$runIndex: 0,
						$json: test.input[0],
						$item: (i: number) => ({ $json: test.input[i] }),
					}),
				).toStrictEqual(test.output);
			}
		});
	}
};
