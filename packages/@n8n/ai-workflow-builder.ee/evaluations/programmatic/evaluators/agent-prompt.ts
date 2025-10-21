import type { SimpleWorkflow } from '@/types';
import { validateAgentPrompt } from '@/validation/checks';
import type { SingleEvaluatorResult } from '@/validation/types';

import { calcSingleEvaluatorScore } from '../../utils/score';

export function evaluateAgentPrompt(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateAgentPrompt(workflow);

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
