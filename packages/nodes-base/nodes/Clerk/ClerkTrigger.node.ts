import {
	IWebhookFunctions,
} from 'n8n-core';

import {
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

import {
	verify,
} from './GenericFunctions';

import {
	ClerkCredentials,
	ClerkEvent,
	ClerkRequest,
	ClerkWebhookPayload,
} from './types';

export class ClerkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clerk Trigger',
		name: 'clerkTrigger',
		icon: 'file:clerk.svg',
		group: ['trigger'],
		version: 1,
		description: 'Listen to Clerk events',
		defaults: {
			name: 'Clerk Trigger',
			color: '#335bf1',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'clerkApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Events to listen to',
				options: [
					{
						name: 'All',
						value: '*',
					},
					{
						name: 'Session Created',
						value: 'session.created',
					},
					{
						name: 'Session Ended',
						value: 'session.ended',
					},
					{
						name: 'Session Removed',
						value: 'session.removed',
					},
					{
						name: 'Session Revoked',
						value: 'session.revoked',
					},
					{
						name: 'User Created',
						value: 'user.created',
					},
					{
						name: 'User Deleted',
						value: 'user.deleted',
					},
					{
						name: 'User Updated',
						value: 'user.updated',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const { rawBody, headers, body } = this.getRequestObject() as ClerkRequest;
		const events = this.getNodeParameter('events', []) as ClerkEvent[];
		const { webhookSecret } = this.getCredentials('clerkApi') as ClerkCredentials;

		let payload;

		try {
			payload = verify.call(this, rawBody.toString(), headers, webhookSecret) as ClerkWebhookPayload;
		} catch (_) {
			throw new NodeOperationError(this.getNode(), 'Unverified webhook call!');
		}

		if (
			payload.type === undefined ||
			(!events.includes('*') && !events.includes(payload.type))
		) {
			return {};
		}

		return {
			workflowData: [
				this.helpers.returnJsonArray(body),
			],
		};
	}
}
