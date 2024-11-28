import type {
	FieldType,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { getWorkflowInfo } from '../GenericFunctions';

export async function getWorkflowInputs(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const source = this.getNodeParameter('source', 0) as string;

	const executeWorkflowInfo = await getWorkflowInfo.call(this, source);

	if (executeWorkflowInfo.code === undefined) {
		// executeWorkflowInfo.code = await getWorkflowById.call(this, executeWorkflowInfo.id as string);
	}

	const workflowInputs = (
		Array.isArray(
			executeWorkflowInfo.code?.nodes.find(
				(node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
			)?.parameters.workflowInputs,
		)
			? executeWorkflowInfo.code?.nodes.find(
					(node) => node.type === 'n8n-nodes-base.executeWorkflowTrigger',
				)?.parameters.workflowInputs
			: []
	) as Array<{ name: string; type: FieldType }>;

	const fields: ResourceMapperField[] = workflowInputs.map((currentWorkflowInput) => ({
		id: currentWorkflowInput.name,
		displayName: currentWorkflowInput.name,
		required: false,
		defaultMatch: true,
		display: true,
		type: currentWorkflowInput.type || 'string',
		canBeUsedToMatch: true,
	}));

	return { fields };
}
