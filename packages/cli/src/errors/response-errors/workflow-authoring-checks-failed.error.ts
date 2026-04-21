import type { WorkflowCheckResult } from '@/modules/workflow-authoring-checks/workflow-authoring-checks.types';

import { BadRequestError } from './bad-request.error';

/**
 * Thrown when workflow activation is refused by authoring checks. The
 * `results` payload lets the frontend render which rules failed and highlight
 * the offending nodes.
 */
export class WorkflowAuthoringChecksFailedError extends BadRequestError {
	constructor(
		message: string,
		readonly meta: { results: WorkflowCheckResult[] },
	) {
		super(message);
		this.name = 'WorkflowAuthoringChecksFailedError';
	}
}
