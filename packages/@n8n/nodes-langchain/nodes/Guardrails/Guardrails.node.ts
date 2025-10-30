import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';

import { process } from './actions/process';
import { versionDescription } from './description';
import { getChatModel } from './helpers/model';

export class Guardrails implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0) as 'classify' | 'sanitize';
		const model = operation === 'classify' ? await getChatModel.call(this) : null;

		const failedItems: INodeExecutionData[] = [];
		const passedItems: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const responseData = await process.call(this, i, model);
				if (responseData.passed) {
					passedItems.push({
						json: { guardrailsInput: responseData.guardrailsInput, ...responseData.passed },
						pairedItem: { item: i },
					});
				}
				if (responseData.failed) {
					failedItems.push({
						json: { guardrailsInput: responseData.guardrailsInput, ...responseData.failed },
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					failedItems.push({
						json: { error: error.message, guardrailsInput: '' },
						pairedItem: { item: i },
					});
				} else {
					throw error;
				}
			}
		}

		if (operation === 'classify') {
			return [passedItems, failedItems];
		}

		return [passedItems];
	}
}
