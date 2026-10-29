import {
	NodeConnectionTypes,
	NodeOperationError,
	jsonParse,
	type IDataObject,
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
		icon: 'node:agent-decision-trigger',
		iconColor: 'purple',
		group: ['trigger'],
		version: 1,
		description: 'Start a workflow when an Agent requests tool approval',
		defaults: { name: 'Agent decision' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'The Agent sends the tool input in <code>$json.arguments</code>. Use it in your review steps, then return one item with an <code>approved</code> boolean. Send-and-wait approval nodes can return this result directly.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName:
					'Each request includes <code>requestId</code>, <code>agentId</code>, <code>toolName</code>, and <code>requestedAt</code>. It can also include <code>description</code> and <code>expiresAt</code>. Tool arguments keep nested objects and arrays. Secret values are hidden. If the caller hides request details, <code>arguments</code> and <code>description</code> are omitted and <code>argumentsRedacted</code> is true.',
				name: 'requestFieldsNotice',
				type: 'notice',
				default: '',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: 'Test request',
				name: 'testRequest',
				type: 'json',
				noDataExpression: true,
				default: JSON.stringify(
					{
						requestId: 'test-run:test-call',
						agentId: 'test-agent',
						toolName: 'send_email',
						description: 'Send an order confirmation email.',
						arguments: {
							to: 'customer@example.com',
							subject: 'Order confirmation',
							body: 'Your order is confirmed.',
						},
						requestedAt: '2026-01-01T12:00:00.000Z',
					},
					null,
					2,
				),
				description:
					'Use this example request when you test the workflow manually. Agent approval requests always use the actual tool input.',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		if (this.getMode() !== 'manual') return {};
		return {
			manualTriggerFunction: async () => {
				const example = this.getNodeParameter('testRequest', 0);
				if (typeof example !== 'string')
					throw new NodeOperationError(this.getNode(), 'Set Test request to a JSON object');
				const request = jsonParse<IDataObject>(example, {
					errorMessage: 'Test request is not valid JSON. Enter a JSON object.',
				});
				if (!request || typeof request !== 'object' || Array.isArray(request))
					throw new NodeOperationError(this.getNode(), 'Set Test request to a JSON object');
				this.emit([[{ json: request }]]);
			},
		};
	}

	async execute(this: IExecuteFunctions) {
		return [this.getInputData()];
	}
}
