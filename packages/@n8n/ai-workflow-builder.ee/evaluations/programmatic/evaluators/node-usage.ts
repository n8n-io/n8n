import type { SimpleWorkflow } from '@/types/index.js';
import { validateWebhookResponse } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateNodeUsage(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateWebhookResponse(workflow);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
