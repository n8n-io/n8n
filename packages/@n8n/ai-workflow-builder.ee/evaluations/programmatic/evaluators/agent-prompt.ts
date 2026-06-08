import type { SimpleWorkflow } from '@/types/index.js';
import { validateAgentPrompt } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateAgentPrompt(workflow: SimpleWorkflow): SingleEvaluatorResult {
	const violations = validateAgentPrompt(workflow);

	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
