import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@n8n/errors';
export class PromotionsWorkflowsMovedCrossProjectError extends BadRequestError {
	override readonly meta: PromotionsWorkflowsMovedCrossProjectMeta;

	/** `detail` says where the workflow is, for example `now in project "Ops" here`. */
	constructor(moved: ReadonlyArray<{ id: string; detail?: string }>) {
		const described = moved.map(({ id, detail }) => (detail ? `${id} (${detail})` : id));
		super(
			`These workflows moved between projects: ${described.join(', ')}. Promote can't move a workflow between projects. Move them back on this instance, then promote again.`,
		);
		this.meta = {
			code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
			workflowIds: moved.map(({ id }) => id),
		};
	}
}
