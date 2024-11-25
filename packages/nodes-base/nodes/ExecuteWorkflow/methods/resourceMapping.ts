import type {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

export async function getWorkflowInputs(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	// TODO: take the columns from the workflow input
	const workflowInputs = ['uid', 'Test Field 2', 'Test Field 3'];

	const fields: ResourceMapperField[] = workflowInputs.map((col) => ({
		id: col,
		displayName: col,
		required: false,
		defaultMatch: col === 'id',
		display: true,
		type: 'string',
		canBeUsedToMatch: true,
	}));

	return { fields };
}
