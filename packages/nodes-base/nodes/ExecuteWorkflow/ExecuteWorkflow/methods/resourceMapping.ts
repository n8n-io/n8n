import type {
	ILocalLoadOptionsFunctions,
	INode,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

export async function getWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const executeWorkflowTriggerNode = (await this.getExecuteWorkflowTriggerNode()) as INode;

	// const fieldValues = getFieldEntries(executeWorkflowTriggerNode);

	const workflowInputFields = [
		{ name: 'field1', type: 'string' as const },
		{ name: 'field2', type: 'number' as const },
		{ name: 'field3', type: 'boolean' as const },
		{ name: 'field4', type: 'any' as const },
	];

	const fields: ResourceMapperField[] = workflowInputFields.map((currentWorkflowInput) => {
		const field: ResourceMapperField = {
			id: currentWorkflowInput.name,
			displayName: currentWorkflowInput.name,
			required: false,
			defaultMatch: true,
			display: true,
			canBeUsedToMatch: true,
		};

		if (currentWorkflowInput.type !== 'any') {
			field.type = currentWorkflowInput.type;
		}

		return field;
	});
	return { fields };
}
