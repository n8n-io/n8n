import { WorkflowOperationError } from 'n8n-workflow';
import type { Project } from '@/databases/entities/project';
import type { INode } from 'n8n-workflow';

type SubworkflowPolicyDenialErrorParams = {
	subworkflowId: string;
	subworkflowProject: Project;
	areOwnedBySameProject?: boolean;
	node?: INode;
};

export class SubworkflowPolicyDenialError extends WorkflowOperationError {
	constructor({
		subworkflowId,
		subworkflowProject,
		areOwnedBySameProject,
		node,
	}: SubworkflowPolicyDenialErrorParams) {
		const description = areOwnedBySameProject
			? 'Change the settings of the sub-workflow so it can be called by this one.'
			: `An admin for the ${subworkflowProject.name} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflowId}`;

		super(`Target workflow ID ${subworkflowId} may not be called`, node, description);
	}
}
