import type {
	FieldValueOption,
	ILocalLoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

export async function getWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const workflowInputFields = (await this.getWorkflowInputValues()) as FieldValueOption[];

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
