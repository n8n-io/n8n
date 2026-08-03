import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { process } from './process';
import type { GuardrailsOptions } from './types';
import { hasLLMGuardrails } from '../helpers/configureNodeInputs';
import { getChatModel } from '../helpers/model';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const operation = this.getNodeParameter('operation', 0) as 'classify' | 'sanitize';
	const model = hasLLMGuardrails(this.getNodeParameter('guardrails', 0) as GuardrailsOptions)
		? await getChatModel.call(this)
		: null;

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
