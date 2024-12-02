import type {
	FieldType,
	IWorkflowInputsLoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

export async function getWorkflowInputs(
	this: IWorkflowInputsLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const workflowInputs = this.getWorkflowInputValues() as Array<{ name: string; type: FieldType }>;

	const fields: ResourceMapperField[] = workflowInputs.map((currentWorkflowInput) => ({
		id: currentWorkflowInput.name,
		displayName: currentWorkflowInput.name,
		required: false,
		defaultMatch: true,
		display: true,
		type: currentWorkflowInput.type,
		canBeUsedToMatch: true,
	}));

	return { fields };
}
