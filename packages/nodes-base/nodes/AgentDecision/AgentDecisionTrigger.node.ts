import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
} from 'n8n-workflow';

export class AgentDecisionTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Agent decision Trigger',
		name: 'agentDecisionTrigger',
		icon: 'node:ai-agent',
		group: ['trigger'],
		version: 1,
		description: 'Start a workflow when an Agent requests tool approval',
		defaults: { name: 'Agent decision' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'Add review steps, then return one item with an approved boolean. Send-and-wait approval nodes can return this result directly.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		return {};
	}

	async execute(this: IExecuteFunctions) {
		return [this.getInputData()];
	}
}
