import { Container } from '@n8n/di';
import { AgentsConfig } from '@n8n/config';
import {
	NodeConnectionTypes,
	NodeOperationError,
	type INodeExecutionData,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type ITriggerFunctions,
	type ITriggerResponse,
} from 'n8n-workflow';

export class AgentDecisionTrigger implements INodeType {
	description: INodeTypeDescription = {
		// eslint-disable-next-line n8n-nodes-base/node-class-description-display-name-unsuffixed-trigger-node -- Use the Human review product name.
		displayName: 'Request from agent',
		name: 'agentDecisionTrigger',
		icon: 'node:agent-decision-trigger',
		iconColor: 'purple',
		group: ['trigger'],
		version: 1,
		description: 'Start a workflow when an Agent requests tool approval',
		eventTriggerDescription: '',
		mockManualExecution: true,
		defaults: { name: 'Request from agent' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		properties: [
			{
				displayName:
					'The Agent sends the tool input in <code>$json.toolInput</code>. Use it in your review steps, then return one item with an <code>approved</code> boolean. Send-and-wait approval nodes can return this result directly.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		if (!Container.get(AgentsConfig).humanReviewEnabled)
			throw new NodeOperationError(this.getNode(), 'Human review is not enabled on this instance');
		return {};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		if (!Container.get(AgentsConfig).humanReviewEnabled)
			throw new NodeOperationError(this.getNode(), 'Human review is not enabled on this instance');
		const items = this.getInputData();
		if (
			this.getMode() === 'manual' &&
			(items.length === 0 ||
				(items.length === 1 &&
					Object.keys(items[0].json).length === 0 &&
					items[0].binary === undefined))
		) {
			const requestedAt = new Date();
			const expiresAt = new Date(requestedAt);
			expiresAt.setUTCHours(expiresAt.getUTCHours() + 1);
			return [
				[
					{
						json: {
							requestId: 'test-run:test-call',
							agentId: 'test-agent',
							toolName: 'send_email',
							requester: { id: 'test-user', name: 'Alex Example', source: 'preview' },
							description: 'Send an order confirmation email.',
							toolInput: {
								to: ['customer@example.com'],
								subject: 'Order confirmation',
								body: { text: 'Your order is confirmed.' },
							},
							requestedAt: requestedAt.toISOString(),
							expiresAt: expiresAt.toISOString(),
						},
					},
				],
			];
		}
		return [items];
	}
}
