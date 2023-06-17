import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class ExecuteWorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow Trigger',
		name: 'executeWorkflowTrigger',
		icon: 'fa:sign-out-alt',
		group: ['trigger'],
		version: 1,
		description:
			'Helpers for calling other n8n workflows. Used for designing modular, microservice-like workflows.',
		eventTriggerDescription: '',
		maxNodes: 1,
		defaults: {
			name: 'Execute Workflow Trigger',
			color: '#ff6d5a',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main'],
		properties: [
			{
				displayName:
					"When an ‘execute workflow’ node calls this workflow, the execution starts here. Any data passed into the 'execute workflow' node will be output by this node.",
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'hidden',
				noDataExpression: true,
				options: [
					{
						name: 'Workflow Call',
						value: 'worklfow_call',
						description: 'When called by another workflow using Execute Workflow Trigger',
						action: 'When Called by Another Workflow',
					},
				],
				default: 'worklfow_call',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
