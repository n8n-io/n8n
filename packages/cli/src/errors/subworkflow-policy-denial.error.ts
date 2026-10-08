import type { Project } from '@n8n/db';
import { WorkflowOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

type CallerType = 'workflow' | 'agent';

type Options = {
	/** ID of the subworkflow whose execution was denied. */
	subworkflowId: string;

	/** Project that owns the subworkflow whose execution was denied. */
	subworkflowProject: Project;

	/** Whether the user has read access to the subworkflow based on their project and scope. */
	hasReadAccess: boolean;

	/** URL of the n8n instance. */
	instanceUrl: string;

	/** Full name of the user who owns the personal project that owns the subworkflow. Absent if team project. */
	ownerName?: string;

	/** Node that triggered the execution of the subworkflow whose execution was denied. */
	node?: INode;

	callerType?: CallerType;
};

export const SUBWORKFLOW_DENIAL_BASE_DESCRIPTION =
	'The sub-workflow you’re trying to execute limits which workflows it can be called by.';
export const SUBWORKFLOW_AGENT_DENIAL_BASE_DESCRIPTION =
	'The sub-workflow you’re trying to execute doesn’t allow this agent to call it.';

function getCallerDescription(callerType: CallerType) {
	return {
		agent: {
			caller: 'agent',
			accessibleCaller: 'this agent',
			baseDescription: SUBWORKFLOW_AGENT_DENIAL_BASE_DESCRIPTION,
		},
		workflow: {
			caller: 'workflow',
			accessibleCaller: 'other workflows',
			baseDescription: SUBWORKFLOW_DENIAL_BASE_DESCRIPTION,
		},
	}[callerType];
}

export class SubworkflowPolicyDenialError extends WorkflowOperationError {
	constructor({
		subworkflowId,
		subworkflowProject,
		instanceUrl,
		hasReadAccess,
		ownerName,
		node,
		callerType = 'workflow',
	}: Options) {
		const { caller, accessibleCaller, baseDescription } = getCallerDescription(callerType);
		const descriptions = {
			default: baseDescription,
			accessible: [
				baseDescription,
				`<a href="${instanceUrl}/workflow/${subworkflowId}" target="_blank">Update sub-workflow settings</a> to allow ${accessibleCaller} to call it.`,
			].join(' '),
			inaccessiblePersonalProject: [
				baseDescription,
				`You will need ${ownerName} to update the sub-workflow (${subworkflowId}) settings to allow this ${caller} to call it.`,
			].join(' '),
			inaccesibleTeamProject: [
				baseDescription,
				`You will need an admin from the ${subworkflowProject.name} project to update the sub-workflow (${subworkflowId}) settings to allow this ${caller} to call it.`,
			].join(' '),
		};

		const description = () => {
			if (hasReadAccess) return descriptions.accessible;
			if (subworkflowProject.type === 'personal') return descriptions.inaccessiblePersonalProject;
			if (subworkflowProject.type === 'team') return descriptions.inaccesibleTeamProject;

			return descriptions.default;
		};

		super(
			`The sub-workflow (${subworkflowId}) cannot be called by this ${caller}`,
			node,
			description(),
		);
	}
}
