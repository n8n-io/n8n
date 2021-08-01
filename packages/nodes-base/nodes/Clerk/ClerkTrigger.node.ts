import { IWebhookFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
    NodeOperationError
} from 'n8n-workflow';
import { Webhook, WebhookRequiredHeaders } from 'svix';

export class ClerkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Clerk Trigger',
		name: 'clerkTrigger',
		icon: 'file:clerk.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Handle Clerk events via webhooks',
		defaults: {
			name: 'Clerk Trigger',
			color: '#335bf1'
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'clerkApi',
				required: true
			}
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook'
			}
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'In which Clerk events to trigger the webhook',
				options: [
                    {
						name: '*',
						value: '*',
						description: 'Any time any event is triggered (Wildcard Event).',
					},
					{
						name: 'Session Created',
						value: 'session.created',
						description: 'Triggered when a session is created.'
					},
					{
						name: 'Session Ended',
						value: 'session.ended',
						description: 'Triggered when a session ends.'
					},
					{
						name: 'Session Removed',
						value: 'session.removed',
						description: 'Triggered when a session is removed.'
					},
					{
						name: 'Session Revoked',
						value: 'session.revoked',
						description: 'Triggered when a session is revoked.'
					},
					{
						name: 'User Created',
						value: 'user.created',
						description: 'Triggered when a user is created.'
					},
					{
						name: 'User Deleted',
						value: 'user.deleted',
						description: 'Triggered when a user is deleted.'
					},
					{
						name: 'User Updated',
						value: 'user.updated',
						description: 'Triggered when a user object is updated.'
					}
				]
			}
		]
	};
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
        const request = this.getRequestObject()
		const events = this.getNodeParameter('event', []) as string[];

		const credentials = this.getCredentials('clerkApi');

        if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}

        const webhook = new Webhook(credentials.webhookSecret as string);
        
        // Throws on error, returns the verified content on success
        let payload;

        try{
            // @ts-ignore
            payload = webhook.verify((req.rawBody).toString(), request.headers as unknown as WebhookRequiredHeaders) as Record<string, string>;
        }catch(_){
            throw new NodeOperationError(this.getNode(), 'Unverified webhook call!');
        }

        const triggerType = payload.type as string | undefined;

		if (triggerType === undefined || !events.includes('*') && !events.includes(triggerType)) {
			// If triggerType does not match the workflow, do not start.
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body)]
		};
	}
}
