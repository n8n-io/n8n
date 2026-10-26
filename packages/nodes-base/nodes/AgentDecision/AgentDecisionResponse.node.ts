import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class AgentDecisionResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to Agent decision',
		name: 'agentDecisionResponse',
		icon: 'node:ai-agent',
		group: ['transform'],
		version: 1,
		description: 'Return approval or rejection to the Agent',
		defaults: { name: 'Respond to Agent decision' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName: 'Approved',
				name: 'approved',
				type: 'boolean',
				default: false,
				required: true,
				description: 'Whether the Agent can run the tool',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'string',
				default: '',
				description: 'Explain the decision',
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		return [
			this.getInputData().map((_item, index) => {
				const approved = this.getNodeParameter('approved', index);
				if (typeof approved !== 'boolean')
					throw new NodeOperationError(this.getNode(), 'Approved must be a boolean', {
						itemIndex: index,
					});
				return {
					json: { approved, reason: this.getNodeParameter('reason', index, '') },
					pairedItem: { item: index },
				};
			}),
		];
	}
}
