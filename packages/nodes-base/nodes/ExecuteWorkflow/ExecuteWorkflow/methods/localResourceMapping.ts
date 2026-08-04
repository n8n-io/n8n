import type { ILocalLoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';

import { loadWorkflowInputMappings } from '@utils/workflowInputsResourceMapping/GenericFunctions';

export async function loadSubWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const { fields, dataMode, subworkflowInfo } = await loadWorkflowInputMappings.bind(this)();
	let emptyFieldsNotice: string | undefined;
	if (fields.length === 0) {
		const { triggerId, workflowId } = subworkflowInfo ?? {};
		const path = (workflowId ?? '') + (triggerId ? `/${triggerId.slice(0, 6)}` : '');
		const subworkflowLink = workflowId
			? `<a href="/workflow/${path}" target="_blank">sub-workflow’s trigger</a>`
			: 'sub-workflow’s trigger';

		switch (dataMode) {
			case 'passthrough':
				emptyFieldsNotice = `This sub-workflow will consume all input data passed to it. You can define specific expected input in the ${subworkflowLink}.`;
				break;
			default:
				emptyFieldsNotice = `The sub-workflow isn't set up to accept any inputs. Change this in the ${subworkflowLink}.`;
				break;
		}
	}
	return { fields, emptyFieldsNotice };
}
