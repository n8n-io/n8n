import {
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	type ResourceMapperField,
	type ILocalLoadOptionsFunctions,
	type ResourceMapperFields,
} from 'n8n-workflow';

import { getFieldEntries } from '../GenericFunctions';

// TODO: Export this so we can reuse in nodes-base
export async function loadWorkflowInputMappings(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const nodeLoadContext = await this.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	let fields: ResourceMapperField[] = [];
	if (nodeLoadContext) {
		const fieldValues = getFieldEntries(nodeLoadContext);
		fields = fieldValues.map((currentWorkflowInput) => {
			const field: ResourceMapperField = {
				id: currentWorkflowInput.name,
				displayName: currentWorkflowInput.name,
				required: false,
				defaultMatch: false,
				display: true,
				canBeUsedToMatch: true,
			};

			if (currentWorkflowInput.type !== 'any') {
				field.type = currentWorkflowInput.type;
			}

			return field;
		});
	}
	return { fields };
}
