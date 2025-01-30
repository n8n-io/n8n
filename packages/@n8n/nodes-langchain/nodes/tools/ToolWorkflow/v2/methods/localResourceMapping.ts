import { loadWorkflowInputMappings } from 'n8n-nodes-base/dist/utils/workflowInputsResourceMapping/GenericFunctions';
import type { ILocalLoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

export async function loadSubWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const { fields, subworkflowInfo } = await loadWorkflowInputMappings.bind(this)();
	let emptyFieldsNotice: string | undefined;
	if (fields.length === 0) {
		const subworkflowLink = subworkflowInfo?.id
			? `<a href="/workflow/${subworkflowInfo?.id}" target="_blank">sub-workflow’s trigger</a>`
			: 'sub-workflow’s trigger';

		emptyFieldsNotice = `This sub-workflow will not receive any input when called by your AI node. Define your expected input in the ${subworkflowLink}.`;
	}
	return { fields, emptyFieldsNotice };
}
