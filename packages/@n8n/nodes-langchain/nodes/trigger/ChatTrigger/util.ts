import {
	CHAT_NODE_TYPE,
	NodeOperationError,
	RESPOND_TO_WEBHOOK_NODE_TYPE,
	UserError,
	WAIT_INDEFINITELY,
} from 'n8n-workflow';
import type { IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';
import { RESPONSE_NODES_MODE } from './constants';

export function configureWaitTillDate(context: IExecuteFunctions) {
	let waitTill = WAIT_INDEFINITELY;

	const limitOptions = context.getNodeParameter('options.limitWaitTime.values', 0, {}) as {
		limitType?: string;
		resumeAmount?: number;
		resumeUnit?: string;
		maxDateAndTime?: string;
	};

	if (Object.keys(limitOptions).length) {
		try {
			if (limitOptions.limitType === 'afterTimeInterval') {
				let waitAmount = limitOptions.resumeAmount as number;

				if (limitOptions.resumeUnit === 'minutes') {
					waitAmount *= 60;
				}
				if (limitOptions.resumeUnit === 'hours') {
					waitAmount *= 60 * 60;
				}
				if (limitOptions.resumeUnit === 'days') {
					waitAmount *= 60 * 60 * 24;
				}

				waitAmount *= 1000;
				waitTill = new Date(new Date().getTime() + waitAmount);
			} else {
				waitTill = new Date(limitOptions.maxDateAndTime as string);
			}

			if (isNaN(waitTill.getTime())) {
				throw new UserError('Invalid date format');
			}
		} catch (error) {
			throw new NodeOperationError(context.getNode(), 'Could not configure Limit Wait Time', {
				description: error.message,
			});
		}
	}

	return waitTill;
}

export const configureInputs = (parameters: { options?: { memoryConnection?: boolean } }) => {
	const inputs = [
		{
			type: 'main',
			displayName: 'User Response',
		},
	];
	if (parameters.options?.memoryConnection) {
		return [
			...inputs,
			{
				type: 'ai_memory',
				displayName: 'Memory',
				maxConnections: 1,
			},
		];
	}

	return inputs;
};

export function checkResponseModeConfig(ctx: IWebhookFunctions, responseMode: string | undefined) {
	const node = ctx.getNode();
	const connectedNodes = ctx.getChildNodes(node.name);
	const respondToChatConnected = connectedNodes.some(
		(node) => node.type === CHAT_NODE_TYPE && !node.disabled,
	);

	if (node.typeVersion < 1.3 && respondToChatConnected) {
		throw new NodeOperationError(
			node,
			'This version of the chat trigger node does not support the Respond to Chat node. Please use latest version of the node.',
		);
	}

	if (respondToChatConnected && responseMode !== RESPONSE_NODES_MODE) {
		throw new NodeOperationError(
			node,
			'Respond to Chat node is connected to this node, but "Response Mode" is not set to "Using Response Nodes". Please set "Response Mode" to "Using Response Nodes".',
		);
	}

	if (responseMode === RESPONSE_NODES_MODE && !respondToChatConnected) {
		const respondToWebhookConnected = connectedNodes.some(
			(node) => node.type === RESPOND_TO_WEBHOOK_NODE_TYPE && !node.disabled,
		);

		if (!respondToWebhookConnected) {
			throw new NodeOperationError(
				node,
				"No nodes capable of sending responses to the chat are currently connected. Please add a 'Respond to Chat' or 'Respond to Webhook' node.",
			);
		}
	}
}
