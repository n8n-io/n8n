import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { versionDescription } from './description';
import { process } from './actions/process';
import { getChatModel } from './helpers/model';

export class Guardrails implements INodeType {
	description = versionDescription;

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const model = await getChatModel.call(this);

		const failedItems: INodeExecutionData[] = [];
		const passedItems: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const responseData = await process.call(this, i, model);
				if (responseData.passed) {
					passedItems.push({ json: { ...responseData.passed }, pairedItem: { item: i } });
				}
				if (responseData.failed) {
					failedItems.push({ json: { ...responseData.failed }, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					failedItems.push({ json: { error: error.message }, pairedItem: { item: i } });
				} else {
					throw error;
				}
			}
		}

		return [passedItems, failedItems];
	}
}
