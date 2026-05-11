import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateParameters } from '@/validation/checks';
import type { SingleEvaluatorResult } from '@/validation/types';

import { calcSingleEvaluatorScore } from '../score';

export function evaluateParameters(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations = validateParameters(workflow, nodeTypes);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
