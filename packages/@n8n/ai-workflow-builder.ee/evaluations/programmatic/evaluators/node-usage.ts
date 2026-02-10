import type { SimpleWorkflow } from '@/types';
import { validateWebhookResponse } from '@/validation/checks';
import type { SingleEvaluatorResult } from '@/validation/types';

import { calcSingleEvaluatorScore } from '../score';

export function evaluateNodeUsage(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateWebhookResponse(workflow);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
