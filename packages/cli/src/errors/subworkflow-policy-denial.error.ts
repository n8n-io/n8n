import { WorkflowOperationError } from 'n8n-workflow';
import type { Project } from '@/databases/entities/project';
import type { INode } from 'n8n-workflow';

type Options = {
	/** ID of the subworkflow whose execution was denied. */
	subworkflowId: string;

	/** Project that owns the subworkflow whose execution was denied. */
	subworkflowProject: Project;

	/** Whether the user has access to the subworkflow via project and scope. */
	hasAccess: boolean;

	/** Name of the user (if any) who owns the project that owns the subworkflow. */
	subworkflowProjectOwnerName?: string;

	/** Node that triggered the execution of the subworkflow. */
	node?: INode;
};

export const SUBWORKFLOW_DENIAL_EXPLANATION =
	'The sub-workflow you’re trying to execute limits which workflows it can be called by.';

export class SubworkflowPolicyDenialError extends WorkflowOperationError {
	constructor({
		subworkflowId,
		subworkflowProject,
		hasAccess,
		subworkflowProjectOwnerName,
		node,
	}: Options) {
		const descriptions = {
			default: SUBWORKFLOW_DENIAL_EXPLANATION,
			accessible: [
				SUBWORKFLOW_DENIAL_EXPLANATION,
				'Update sub-workflow settings to allow other workflows to call it.',
			].join(' '),
			inaccessiblePersonalProject: [
				SUBWORKFLOW_DENIAL_EXPLANATION,
				`You will need ${subworkflowProjectOwnerName} to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			].join(' '),
			inaccesibleTeamProject: [
				SUBWORKFLOW_DENIAL_EXPLANATION,
				`You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this workflow to call it.`,
			].join(' '),
		};

		const description = () => {
			if (hasAccess) return descriptions.accessible;
			if (subworkflowProject.type === 'personal') return descriptions.inaccessiblePersonalProject;
			if (subworkflowProject.type === 'team') return descriptions.inaccesibleTeamProject;

			return descriptions.default;
		};

		super(
			`The sub-workflow (${subworkflowId}) cannot be called by this workflow`,
			node,
			description(),
		);
	}
}
