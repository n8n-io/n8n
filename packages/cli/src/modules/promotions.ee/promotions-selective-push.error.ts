import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class PromotionsWorkflowsMovedCrossProjectError extends BadRequestError {
	override readonly meta: PromotionsWorkflowsMovedCrossProjectMeta;

	constructor(workflowIds: string[]) {
		super(
			`These workflows moved to another project: ${workflowIds.join(', ')}. A selective push cannot move them. Push all projects instead.`,
		);
		this.meta = {
			code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
			workflowIds,
		};
	}
}
