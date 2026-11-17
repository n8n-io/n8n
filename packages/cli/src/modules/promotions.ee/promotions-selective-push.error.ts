import {
	PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
	type PromotionsWorkflowsMovedCrossProjectMeta,
} from '@n8n/api-types';

import { BadRequestError } from '@n8n/errors';
export class PromotionsWorkflowsMovedCrossProjectError extends BadRequestError {
	override readonly meta: PromotionsWorkflowsMovedCrossProjectMeta;

	/**
	 * `detail` says where the workflow is, for example `in project "Ops" on the branch`.
	 * `personal-project`: the workflows are in a personal project now. The message never names a
	 * personal project, because its name holds the email of its owner.
	 */
	constructor(
		moved: ReadonlyArray<{ id: string; detail?: string }>,
		reason: 'between-projects' | 'personal-project' = 'between-projects',
	) {
		const described = moved.map(({ id, detail }) => (detail ? `${id} (${detail})` : id));
		super(
			reason === 'personal-project'
				? `These workflows moved into a personal project: ${described.join(', ')}. Promote can't move a workflow into a personal project. A personal project is never on the branch, so the destination would delete the workflow. Move them to a team project or delete them on this instance, then promote again.`
				: `These workflows moved between projects: ${described.join(', ')}. Promote can't move a workflow between projects. Move them back on this instance, then promote again.`,
		);
		this.meta = {
			code: PROMOTIONS_WORKFLOWS_MOVED_CROSS_PROJECT_CODE,
			workflowIds: moved.map(({ id }) => id),
		};
	}
}

/**
 * One message for every selected workflow that the selected project does not hold: one that
 * does not exist, one of a project that the user cannot read, and one of another project of
 * the branch. So the answer does not tell these cases apart.
 */
export function workflowsNotInSelectedProjectError(
	workflowIds: readonly string[],
): BadRequestError {
	return new BadRequestError(
		`The following workflows are not in the selected project: ${workflowIds.join(', ')}`,
	);
}
