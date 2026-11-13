import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

/** Has no `webhookMethods` or `webhook()`: the loader builds them from `description.trigger`. */
export class E2eTestDeclarativeWebhookTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'E2E Test Declarative Webhook Trigger',
		name: 'e2eTestDeclarativeWebhookTrigger',
		icon: 'fa:play',
		group: ['trigger'],
		version: 1,
		description: 'Dummy declarative webhook trigger for e2e testing',
		subtitle: '={{$parameter["url"]}}',
		defaults: {
			name: 'E2E Test Declarative Webhook Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
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
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				description:
					'Base URL of the hook registry. GET /hooks lists hooks, POST /hooks registers one, DELETE /hooks/{ID} removes it.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: ['created'],
				options: [
					{ name: 'Created', value: 'created' },
					{ name: 'Deleted', value: 'deleted' },
				],
			},
		],
		trigger: {
			type: 'webhook',
			lifecycle: {
				checkExists: {
					routing: {
						request: { method: 'GET', url: '={{ $parameter.url }}/hooks' },
						output: { postReceive: [{ type: 'rootProperty', properties: { property: 'hooks' } }] },
					},
					matchOn: [{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' }],
					store: { webhookId: '={{ $hook.id }}' },
				},
				create: {
					routing: {
						request: {
							method: 'POST',
							url: '={{ $parameter.url }}/hooks',
							body: { target_url: '={{ $webhookUrl }}', events: '={{ $parameter.events }}' },
						},
					},
					store: { webhookId: '={{ $response.id }}' },
				},
				delete: {
					routing: {
						request: {
							method: 'DELETE',
							url: '={{ $parameter.url }}/hooks/{{ $staticData.webhookId }}',
						},
					},
				},
			},
			handler: {
				ping: { when: '={{ $webhookRequest.body.type === "ping" }}', response: 'pong' },
				filter: {
					allowed: '={{ $parameter.events }}',
					actual: '={{ $webhookRequest.body.event }}',
				},
				output: {
					postReceive: [{ type: 'rootProperty', properties: { property: 'data' } }],
					includeMeta: true,
				},
			},
		},
	};
}
