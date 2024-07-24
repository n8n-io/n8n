import { WorkflowOperationError } from 'n8n-workflow';
import type { INode } from 'n8n-workflow';

export type SubworkflowPolicyDenialErrorParams = {
	subworkflowId: string;
	subworkflowProjectName: string;
	areOwnedBySameProject?: boolean;
	node?: INode;
};

export class SubworkflowPolicyDenialError extends WorkflowOperationError {
	constructor({
		subworkflowId,
		subworkflowProjectName,
		areOwnedBySameProject,
		node,
	}: SubworkflowPolicyDenialErrorParams) {
		const description = areOwnedBySameProject
			? 'Change the settings of the sub-workflow so it can be called by this one.'
			: `An admin for the ${subworkflowProjectName} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflowId}`;

		super(`Target workflow ID ${subworkflowId} may not be called`, node, description);
	}
}
