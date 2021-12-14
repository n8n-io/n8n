import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';


export class CombineSplitInBatches implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'CombineSplitInBatches',
		name: 'combineSplitInBatches',
		icon: 'fa:map-signs',
		group: ['transform'],
		version: 1,
		description: 'Combines data from SplitInBatches Node',
		defaults: {
			name: 'CombineSplitInBatches',
			color: '#408000',
		},
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['done', 'continue'],
		properties: [
			{
				displayName: 'SplitInBatches Node',
				name: 'splitInBatchesNode',
				type: 'string',
				default: '',
				placeholder: 'SplitInBatches',
				required: true,
				description: 'The name of the SplitInBatches Node to operate on.',
			},
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const incomingItems = this.getInputData();

		const splitInBatchesNode = this.getNodeParameter('splitInBatchesNode', 0) as string;

		const proxy = this.getWorkflowDataProxy(0);

		const noItemsLeft = proxy.$node[splitInBatchesNode].context["noItemsLeft"];

		if (noItemsLeft === false) {
			// Output data on "continue" branch
			return [[], incomingItems];
		}

		// Output data on "done" branch
		const allData: INodeExecutionData[] = [];

		let counter = 0;
		do {
			try {
				// @ts-ignore
				const items = proxy.$items(this.getNode().name, 1, counter).map(item => item);
				allData.push(...items);
			} catch (error) {
				allData.push(...incomingItems);
				return [allData, []];
			}

			counter++;
		} while(true);

	}
}
