import type { INodeTypeDescription } from 'n8n-workflow';

import type { SimpleWorkflow } from '@/types';
import { validateConnections } from '@/validation/checks';
import type { SingleEvaluatorResult } from '@/validation/types';

import { calcSingleEvaluatorScore } from '../score';

export function evaluateConnections(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
): SingleEvaluatorResult {
	const violations = validateConnections(workflow, nodeTypes);
	return { violations, score: calcSingleEvaluatorScore({ violations }) };
}
