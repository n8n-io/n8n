import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription } from "n8n-workflow";
import { MovePipelineStageManager } from "./MovePipelineStage.manager";
export class MovePipelineStage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HB Move Pipeline Stage (Project)',
		name: 'movePipelineStage',
		icon: 'file:honeybook.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume HB API',
		defaults: {
			name: 'HoneyBook',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'honeyBookApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create a task',
						value: 'createTask',
						description: 'Create a task',
						action: 'Create a task',
					},
				],
				default: 'createTask',
			},
			{
				displayName: 'Description',
				name: 'taskDescription',
				type: 'string',
				displayOptions: {
					show: {
						action: ['createTask'],
					},
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnValue: INodeExecutionData[][] = [];
		// user might create 5 tasks at once as all nodes support batching out of the box
		const userRequests = this.getInputData();
		for (let userRequestIndex = 0; userRequestIndex < userRequests.length; userRequestIndex++) {
			const manager = new MovePipelineStageManager(this, userRequestIndex);
			const responseData = await manager.movePipelineStage();
			returnValue.push([{json: responseData}]);
		}

		return returnValue;
	}
}
