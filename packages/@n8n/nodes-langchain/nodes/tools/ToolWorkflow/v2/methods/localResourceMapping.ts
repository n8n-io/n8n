import { loadWorkflowInputMappings } from 'n8n-nodes-base/dist/utils/workflowInputsResourceMapping/GenericFunctions';
import type { ILocalLoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

export async function loadSubWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const { fields, subworkflowInfo, dataMode } = await loadWorkflowInputMappings.bind(this)();
	let emptyFieldsNotice: string | undefined;
	if (fields.length === 0) {
		const { triggerId, workflowId } = subworkflowInfo ?? {};
		const path = (workflowId ?? '') + (triggerId ? `/${triggerId.slice(0, 6)}` : '');
		const subworkflowLink = workflowId
			? `<a href="/workflow/${path}" target="_blank">sub-workflow’s trigger</a>`
			: 'sub-workflow’s trigger';

		switch (dataMode) {
			case 'passthrough':
				emptyFieldsNotice = `This sub-workflow is set up to receive all input data, without specific inputs the Agent will not be able to pass data to this tool. You can define specific inputs in the ${subworkflowLink}.`;
				break;
			default:
				emptyFieldsNotice = `This sub-workflow will not receive any input when called by your AI node. Define your expected input in the ${subworkflowLink}.`;
				break;
		}
	}
	return { fields, emptyFieldsNotice };
}
