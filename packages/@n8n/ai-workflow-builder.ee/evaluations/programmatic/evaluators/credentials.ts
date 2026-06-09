import type { SimpleWorkflow } from '@/types/index.js';
import { validateCredentials } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateCredentials(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateCredentials(workflow);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
