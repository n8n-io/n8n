import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/index.js';
import { validateFromAi } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateFromAi(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations = validateFromAi(workflow, nodeTypes);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
