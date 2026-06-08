import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/index.js';
import { validateTrigger } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateTrigger(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations = validateTrigger(workflow, nodeTypes);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
