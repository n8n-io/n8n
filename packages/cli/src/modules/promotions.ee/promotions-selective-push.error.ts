import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

export class PromotionsWorkflowsMovedCrossProjectError extends BadRequestError {
	override readonly meta: PromotionsWorkflowsMovedCrossProjectMeta;

	constructor(workflowIds: string[]) {
		super('Workflows moved to another project');
		this.meta = {
			code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
			workflowIds,
		};
	}
}
