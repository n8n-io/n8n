import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@n8n/errors';
export class PromotionsWorkflowsMovedCrossProjectError extends BadRequestError {
	override readonly meta: PromotionsWorkflowsMovedCrossProjectMeta;

	/** `details` says, per workflow id, where the workflow is, for example `now in project "Ops"`. */
	constructor(workflowIds: string[], details: ReadonlyMap<string, string> = new Map()) {
		const moved = workflowIds.map((id) => {
			const detail = details.get(id);
			return detail ? `${id} (${detail})` : id;
		});
		super(
			`These workflows moved to another project: ${moved.join(', ')}. A project promote can't move a workflow between projects. Move them back on this instance, or promote all projects from the instance environment settings.`,
		);
		this.meta = {
			code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
			workflowIds,
		};
	}
}
