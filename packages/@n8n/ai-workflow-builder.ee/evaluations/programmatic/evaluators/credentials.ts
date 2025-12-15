import type { SimpleWorkflow } from '@/types';
import { validateCredentials } from '@/validation/checks';
import type { SingleEvaluatorResult } from '@/validation/types';

import { calcSingleEvaluatorScore } from '../../utils/score';

export function evaluateCredentials(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateCredentials(workflow);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
