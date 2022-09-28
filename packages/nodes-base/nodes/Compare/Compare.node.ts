import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class Compare implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Compare',
		name: 'compare',
		icon: 'fa:code-branch',
		group: ['transform'],
		version: 1,
		description: 'Compare two inputs for changes',
		defaults: {
			name: 'Compare',
			color: '#506000',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['main', 'main'],
		inputNames: ['Input 1', 'Input 2'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main', 'main', 'main'],
		// outputNames: ['In 1st only', 'Same', 'Different', 'In 2nd only'],
		outputNames: ['1st', 'same', 'diff', '2nd'],
		properties: [],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData1stOnly: INodeExecutionData[] = [];
		const returnDataSame: INodeExecutionData[] = [];
		const returnDataDifferent: INodeExecutionData[] = [];
		const returnData2ndOnly: INodeExecutionData[] = [];
		const dataInput1 = this.getInputData(0);
		const dataInput2 = this.getInputData(1);

		returnData1stOnly.push(...dataInput1);
		returnData2ndOnly.push(...dataInput2);
		returnDataSame.push({ json: { data: 'same' } });
		returnDataDifferent.push({ json: { data: 'different' } });

		return [returnData1stOnly, returnDataSame, returnDataDifferent, returnData2ndOnly];
	}
}
