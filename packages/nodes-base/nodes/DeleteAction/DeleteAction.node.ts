import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';


export class DeleteAction implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'DeleteAction',
		name: 'DeleteAction',
		icon: 'fa:file-code',
		group: ['transform'],
		version: 1,
		// subtitle: 'DeleteAction',
		description: 'Delete Action',
		defaults: {
			name: 'DeleteAction',
			color: '#333377',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				options: [
					{
						name: 'Delete Execution Record',
						value: 'Delete Execution Record',
						description: 'Delete Execution Record',
					},
					// {
					// 	name: 'Nothing',
					// 	value: 'Nothing',
					// 	description: 'Nothing',
					// },
				],
				default: 'Delete Execution Record',
				description: 'If this node is executed, the deletion mode of execution',
			},

		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		// Physical deletion or Logical deletion
		const mode = this.getNodeParameter('mode', 0) as string;

		let itemIndex = 0;
		if(mode === 'Delete Execution Record') {
			// Do not take any action and use it as a marker.
		} else {
			throw new NodeOperationError(this.getNode(), `The operation "${mode}" is not known!`, {
				itemIndex,
			});
		}

		// return [];
		const returnData: INodeExecutionData[] = [];
		return [returnData];
	}
}
