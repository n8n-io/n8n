import { IExecuteFunctions } from 'n8n-core';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class ExecuteWorkflowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow Trigger',
		name: 'executeWorkflowTrigger',
		icon: 'fa:sign-out-alt',
		group: ['trigger'],
		version: 1,
		description: 'Runs the flow when called by the Execute Workflow node from a different workflow',
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		return this.prepareOutputData(items);
	}
}
