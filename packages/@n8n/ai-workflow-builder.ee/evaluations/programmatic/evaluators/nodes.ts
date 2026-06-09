import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types/index.js';
import { validateNodes } from '@/validation/checks/index.js';
import type { SingleEvaluatorResult } from '@/validation/types.js';

import { calcSingleEvaluatorScore } from '../score.js';

export function evaluateNodes(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations = validateNodes(workflow, nodeTypes);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
