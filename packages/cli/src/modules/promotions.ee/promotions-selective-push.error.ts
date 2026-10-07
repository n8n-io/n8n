import {
	PROMOTIONS_CONTAINER_TARGET_IN_USE_CODE,
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsContainerTargetInUseMeta,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@n8n/errors';
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

/**
 * Another container still occupies a renamed container's new path: a folder
 * the selection did not stage, or one the instance deleted. The editor
 * translates the meta; the message serves the public API and logs.
 */
export class PromotionsContainerTargetInUseError extends BadRequestError {
	override readonly meta: PromotionsContainerTargetInUseMeta;

	constructor(kind: PromotionsContainerTargetInUseMeta['kind'], target: string) {
		super(
			`Another ${kind === 'folders' ? 'folder' : 'project'} on the branch still uses the path "${target}".`,
		);
		this.meta = { code: PROMOTIONS_CONTAINER_TARGET_IN_USE_CODE, kind, target };
	}
}
