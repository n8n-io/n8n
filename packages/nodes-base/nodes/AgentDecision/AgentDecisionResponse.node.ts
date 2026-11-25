import {
	NodeConnectionTypes,
	NodeOperationError,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

export class AgentDecisionResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Respond to agent',
		name: 'agentDecisionResponse',
		icon: 'node:agent-decision-response',
		iconColor: 'purple',
		group: ['transform'],
		version: 1,
		description: 'Return approval or rejection to the Agent',
		defaults: { name: 'Respond to agent' },
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
				// An expression can resolve to any type. Accept only a string or no value.
				const reason = this.getNodeParameter('reason', index, '') ?? '';
				if (typeof reason !== 'string')
					throw new NodeOperationError(this.getNode(), 'Reason must be a string', {
						itemIndex: index,
					});
				return {
					json: { approved, reason },
					pairedItem: { item: index },
				};
			}),
		];
	}
}
