import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

/**
 * Declarative webhook trigger for e2e testing: no `webhookMethods`, no
 * `webhook()`; the loader builds both from `description.trigger`. Registers
 * itself against a mock "hook registry" API and emits every delivery whose
 * `event` matches the selected events.
 */
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
					'Base URL of the hook registry: GET /hooks lists registrations, POST /hooks registers this webhook, DELETE /hooks/{webhookId} deregisters it',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				default: ['created'],
				options: [
					{ name: 'All', value: '*' },
					{ name: 'Created', value: 'created' },
					{ name: 'Deleted', value: 'deleted' },
					{ name: 'Updated', value: 'updated' },
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
					store: { webhookId: '={{ $item.id }}' },
				},
				create: {
					routing: {
						request: {
							method: 'POST',
							url: '={{ $parameter.url }}/hooks',
							body: {
								target_url: '={{ $webhookUrl }}',
								events: '={{ $parameter.events }}',
								secret: '={{ $generated.webhookSecret }}',
							},
						},
					},
					generate: { webhookSecret: { type: 'hex', length: 32 } },
					store: {
						webhookId: '={{ $response.id }}',
						webhookSecret: '={{ $generated.webhookSecret }}',
					},
				},
				delete: {
					routing: {
						request: {
							method: 'DELETE',
							url: '={{ $parameter.url + "/hooks/" + $staticData.webhookId }}',
						},
					},
				},
			},
			handler: {
				// Asana-style secret exchange, for testing handshake `store`: a delivery
				// carrying x-hook-secret is answered with the echoed header and its value
				// replaces the registration-time secret in static data.
				handshake: {
					when: '={{ $request.headers["x-hook-secret"] !== undefined }}',
					store: { webhookSecret: '={{ $request.headers["x-hook-secret"] }}' },
					respond: { headers: { 'X-Hook-Secret': '={{ $request.headers["x-hook-secret"] }}' } },
				},
				// The registry signs each delivery with the secret it received at
				// registration; an unsigned or tampered delivery is answered 401.
				verification: {
					algorithm: 'hmac-sha256',
					signatureHeader: 'x-registry-signature',
					secret: '={{ $staticData.webhookSecret }}',
					prefix: 'sha256=',
				},
				filter: {
					allowed: '={{ $parameter.events }}',
					actual: '={{ $request.body.event }}',
					wildcard: '*',
				},
			},
		},
	};
}
